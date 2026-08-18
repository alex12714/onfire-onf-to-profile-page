import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * onf.to short-link resolver.
 *
 * Runs ahead of the `/[handle]` catch-all so that a path matching a live short
 * code redirects to its destination, while everything else (profiles, product
 * and service pages, checkout, API routes) reaches its normal route untouched.
 *
 * IMPORTANT: the database is the authority on what a valid code is — see the
 * `short_links_code_format_chk` CHECK constraint on `public.short_links`. The
 * pattern below is only a cheap PRE-FILTER that rejects what provably cannot
 * be a code; `resolve_short_code` decides everything else. Do not treat it as
 * validation, and keep it no stricter than the DB constraint: a pre-filter
 * that is tighter than the DB silently turns real links into dead ones.
 *
 * Codes come in two shapes, and this pattern is a superset of both:
 *   - auto-generated: 7 chars from a confusable-free alphabet (no 0/o/1/i/l)
 *   - custom/vanity:  3-32 chars, [a-z0-9] with internal hyphens
 *
 * A resolved link comes back in one of two modes:
 *   - `immediate` — 302 straight to the destination. The historical behaviour,
 *     and what every link does while the interstitial kill switch is off.
 *   - `delayed`   — render a branded interstitial that counts down, shows the
 *     destination honestly, and carries an ad, then hands the user on.
 *
 * The mode is decided entirely server-side inside `resolve_short_code`, which
 * owns the kill switch, the premium check and the grandfathering of links that
 * already existed. This file deliberately holds no policy: it renders whatever
 * mode it is told, and treats anything it does not recognise as `immediate`.
 */

// Superset pre-filter: 3-32 chars, alphanumeric ends, hyphens only internal.
// Double hyphens are rejected separately below (not expressible cheaply here).
const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/

const RESOLVE_ENDPOINT = "https://api2.onfire.so/rpc/resolve_short_code"
const RESOLVE_TIMEOUT_MS = 1500

// Single-segment paths that must never be treated as a short code.
const RESERVED = new Set(["favicon.ico", "robots.txt", "sitemap.xml"])

/**
 * Bounds on the configured countdown.
 *
 * A shortener that holds someone for a long time is precisely the pattern that
 * gets a domain flagged as malicious, so the ceiling is a safety rail rather
 * than a preference: a fat-fingered `600` in `system_config` cannot strand a
 * visitor for ten minutes. A non-positive delay degrades to a plain redirect,
 * which makes "set the delay to 0" a second, faster kill switch.
 */
const MIN_DELAY_SECONDS = 1
const MAX_DELAY_SECONDS = 15

/**
 * AdSense identifiers are public by design — the publisher id and slot id are
 * in the page source of every AdSense site on the web, and neither is a
 * credential. They are still shape-checked before being interpolated into the
 * document so that a malformed `system_config` value cannot break out of the
 * attribute it lands in.
 */
const AD_CLIENT_PATTERN = /^ca-pub-\d{10,25}$/
const AD_SLOT_PATTERN = /^\d{5,20}$/

/**
 * Negative-result cache.
 *
 * Widening the pre-filter to accept vanity codes means usernames match it too,
 * so an ordinary profile view now reaches the resolver. Two reasons that
 * matters here: the round trip measures ~139ms median / ~480ms p90 from this
 * container, and the Worker rate-limits `resolve_short_code` at 300 req/min
 * PER IP — and all onf.to traffic egresses from this one host, so profile
 * views would otherwise burn the same budget real codes need.
 *
 * Only genuine `{found:false}` answers are cached. Errors, timeouts and 429s
 * are never cached — caching a failure would extend an outage instead of
 * riding it out. Positive results are not cached either, so re-pointing a
 * short link takes effect immediately.
 */
const NEGATIVE_TTL_MS = 30_000
const NEGATIVE_MAX_ENTRIES = 500
const negativeCache = new Map<string, number>()

function isKnownMiss(code: string): boolean {
  const expiresAt = negativeCache.get(code)
  if (expiresAt === undefined) return false
  if (expiresAt <= Date.now()) {
    negativeCache.delete(code)
    return false
  }
  return true
}

function rememberMiss(code: string): void {
  // Bounded: drop the oldest entry once full. Map preserves insertion order.
  if (negativeCache.size >= NEGATIVE_MAX_ENTRIES) {
    const oldest = negativeCache.keys().next()
    if (!oldest.done) negativeCache.delete(oldest.value)
  }
  negativeCache.set(code, Date.now() + NEGATIVE_TTL_MS)
}

interface ResolveResult {
  found?: boolean
  destination_url?: string
  redirect_mode?: string
  delay_seconds?: number
  ad_client?: string
  ad_slot?: string
}

interface AdConfig {
  client: string
  slot: string
}

interface RedirectPlan {
  destination: URL
  /** Zero means "redirect immediately"; anything higher renders the wait. */
  delaySeconds: number
  /** Null whenever the ad cannot or should not render. */
  ad: AdConfig | null
}

/**
 * Only ever hand back an absolute http(s) destination. Guards against a stored
 * value like `javascript:` or `data:` turning the resolver into an XSS vector,
 * and against a relative value bouncing the request back into this middleware.
 */
function safeDestination(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length === 0) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  return parsed
}

/**
 * How long to hold the visitor. Anything the resolver cannot express as a sane
 * positive number collapses to 0, i.e. today's plain redirect — the failure
 * direction that cannot hurt anyone.
 */
function safeDelaySeconds(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(value)) return 0
  const whole = Math.floor(value)
  if (whole < MIN_DELAY_SECONDS) return 0
  return Math.min(whole, MAX_DELAY_SECONDS)
}

function safeAdConfig(client: unknown, slot: unknown): AdConfig | null {
  if (typeof client !== "string" || !AD_CLIENT_PATTERN.test(client)) return null
  if (typeof slot !== "string" || !AD_SLOT_PATTERN.test(slot)) return null
  return { client, slot }
}

async function resolveCode(code: string): Promise<RedirectPlan | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS)

  try {
    const response = await fetch(RESOLVE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ p_code: code }),
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      // Fail open: fall through to the normal route rather than error the user.
      console.warn(`[short-link] resolve failed for ${code}: HTTP ${response.status}`)
      return null
    }

    const data = (await response.json()) as ResolveResult
    if (!data?.found) {
      rememberMiss(code)
      return null
    }

    const destination = safeDestination(data.destination_url)
    if (!destination) {
      console.warn(`[short-link] rejected non-http destination for ${code}`)
      return null
    }

    // Unknown, absent or malformed modes all mean "behave exactly as before".
    // That keeps a partially-deployed or rolled-back resolver harmless, and it
    // is the reason the kill switch being off needs no support in this file.
    const delaySeconds = data.redirect_mode === "delayed" ? safeDelaySeconds(data.delay_seconds) : 0

    return {
      destination,
      delaySeconds,
      ad: delaySeconds > 0 ? safeAdConfig(data.ad_client, data.ad_slot) : null,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown"
    console.warn(`[short-link] resolve error for ${code}: ${reason}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Keep a pathological URL from blowing out the layout; the href stays whole. */
function truncateForDisplay(value: string, limit = 96): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`
}

/**
 * The interstitial.
 *
 * Rendered straight from middleware as one self-contained document. That is a
 * deliberate choice over rewriting to an App Router page:
 *
 *   1. It sits in the critical path of every free scan, frequently on mobile
 *      data off a printed QR code. This is a few KB with no framework runtime
 *      and no hydration, against ~90KB+ for a React route.
 *   2. It makes an open redirect structurally impossible rather than merely
 *      guarded. There is no route to address, so the destination is never
 *      carried in a URL, a query parameter or a request header where a caller
 *      could supply or tamper with it. It goes from the resolver's response
 *      into this response body and nowhere else.
 *
 * The destination is HTML-escaped even though the WHATWG URL parser already
 * percent-encodes the dangerous characters — the safety should be legible here
 * rather than resting on a reader knowing that detail of the URL spec. Nothing
 * is interpolated into script: the countdown reads the destination back off the
 * anchor's `href`, so there is no JavaScript string context to escape at all.
 */
function renderInterstitial(plan: RedirectPlan): NextResponse {
  const href = escapeHtml(plan.destination.href)
  const host = escapeHtml(plan.destination.host)
  const fullUrl = escapeHtml(truncateForDisplay(plan.destination.href))
  const delay = String(plan.delaySeconds)

  const adMarkup = plan.ad
    ? `
      <aside class="ad" aria-label="Advertisement">
        <p class="ad-label">Advertisement</p>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="${escapeHtml(plan.ad.client)}"
             data-ad-slot="${escapeHtml(plan.ad.slot)}"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      </aside>
      <script async crossorigin="anonymous"
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(plan.ad.client)}"></script>
      <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`
    : ""

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="origin">
<title>Taking you to ${host} &middot; OnFire</title>
<style>
:root{
  --brand:#FF6B1F; --brand-light:#FFCE54;
  --bg:#F7F7F8; --surface:#FFFFFF; --text:#222222; --muted:#707781; --border:#E6E7EA;
}
@media (prefers-color-scheme:dark){
  :root{ --bg:#0E0F11; --surface:#17181B; --text:#F4F4F5; --muted:#9AA0A8; --border:#2A2C31; }
}
*{box-sizing:border-box}
body{
  margin:0; min-height:100vh; padding:24px;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px;
  background:var(--bg); color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.card{
  width:100%; max-width:420px; background:var(--surface); border:1px solid var(--border);
  border-radius:20px; padding:28px 24px; text-align:center;
  box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06);
}
.brand{display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:22px}
.brand svg{display:block}
.brand span{font-size:15px; font-weight:600; letter-spacing:-.01em}
h1{margin:0 0 4px; font-size:15px; font-weight:500; color:var(--muted); letter-spacing:-.01em}
.host{
  margin:0 0 2px; font-size:22px; font-weight:600; letter-spacing:-.02em;
  overflow-wrap:anywhere;
}
.url{
  display:inline-block; margin:0 0 22px; font-size:12px; color:var(--muted);
  overflow-wrap:anywhere; text-decoration:underline; text-underline-offset:2px;
}
.url:hover,.url:focus-visible{color:var(--brand)}
#countdown{position:relative; width:76px; height:76px; margin:0 auto 20px}
#countdown svg{transform:rotate(-90deg)}
.ring-track{stroke:var(--border)}
.ring-fill{
  stroke:var(--brand); stroke-linecap:round;
  stroke-dasharray:207; stroke-dashoffset:0;
  animation:drain linear 1s forwards; animation-duration:${delay}s;
}
@keyframes drain{to{stroke-dashoffset:207}}
@media (prefers-reduced-motion:reduce){ .ring-fill{animation:none; stroke-dashoffset:0} }
#cd-num{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:26px; font-weight:600; font-variant-numeric:tabular-nums; letter-spacing:-.02em;
}
#nojs{display:none; margin:0 0 20px; font-size:13px; color:var(--muted)}
#cta{
  display:none; align-items:center; justify-content:center; gap:6px;
  width:100%; min-height:48px; padding:0 22px;
  border-radius:999px; border:0; background:var(--brand); color:#fff;
  font-size:16px; font-weight:600; font-family:inherit; text-decoration:none;
  cursor:pointer; transition:transform .15s cubic-bezier(.22,1,.36,1),filter .15s;
}
#cta:hover{filter:brightness(1.05)} #cta:active{transform:scale(.97)}
@media (prefers-reduced-motion:reduce){ #cta{transition:none} #cta:active{transform:none} }
:focus-visible{outline:2px solid var(--brand); outline-offset:3px; border-radius:6px}
.ad{width:100%; max-width:420px}
.ad-label{
  display:none;
  margin:0 0 6px; font-size:10px; font-weight:500; letter-spacing:.08em;
  text-transform:uppercase; color:var(--muted); text-align:center;
}
/* Only ever show the "Advertisement" label over an ad that actually exists.
   AdSense sets data-ad-status to "filled" or "unfilled"; an ad blocker leaves
   it unset and the <ins> at zero height. Labelling empty space reads as broken,
   and looking broken is exactly what gets an interstitial distrusted — so the
   label is opt-in on a real fill, and an unfilled slot collapses outright.
   Measured: unfilled -> .ad is 0px, blocked -> .ad is 0px, and neither
   affects the countdown or the redirect. */
.ad:has(ins[data-ad-status="filled"]) .ad-label{display:block}
.ad:has(ins[data-ad-status="unfilled"]){display:none}
.foot{margin:0; font-size:11px; color:var(--muted); text-align:center}
.sr{position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0}
</style>
<noscript><style>
  #countdown{display:none}
  #nojs{display:block}
  #cta{display:inline-flex !important}
</style></noscript>
</head>
<body>
  <main class="card">
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 180 180" aria-hidden="true">
        <rect width="180" height="180" rx="37" fill="var(--brand)"/>
        <g style="transform:scale(95%);transform-origin:center" fill="#fff">
          <path d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z"/>
          <path d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z"/>
        </g>
      </svg>
      <span>OnFire</span>
    </div>

    <h1>You're being taken to</h1>
    <p class="host">${host}</p>
    <a class="url" id="go" href="${href}" data-delay="${delay}" rel="noopener">${fullUrl}</a>

    <div id="countdown">
      <svg width="76" height="76" aria-hidden="true">
        <circle class="ring-track" cx="38" cy="38" r="33" fill="none" stroke-width="5"/>
        <circle class="ring-fill" cx="38" cy="38" r="33" fill="none" stroke-width="5"/>
      </svg>
      <div id="cd-num" aria-hidden="true">${delay}</div>
    </div>

    <p id="nojs">JavaScript is off, so this page won't move on by itself. Use the button below to continue.</p>

    <a id="cta" href="${href}" rel="noopener">Continue now</a>

    <p class="sr" id="cd-live" role="status" aria-live="polite"></p>
  </main>

  ${adMarkup}

  <p class="foot">Shortened with OnFire</p>

<script>
(function(){
  var go = document.getElementById("go");
  var num = document.getElementById("cd-num");
  var live = document.getElementById("cd-live");
  var cta = document.getElementById("cta");
  var ring = document.querySelector(".ring-fill");
  if (!go || !num || !live || !cta) return;

  // The destination is read back off the anchor the server already escaped, so
  // no URL is ever interpolated into this script.
  var target = go.href;
  var left = parseInt(go.getAttribute("data-delay"), 10);

  function finish(){
    num.textContent = "0";
    if (ring) ring.style.strokeDashoffset = "207";
    cta.style.display = "inline-flex";
    live.textContent = "Redirecting now.";
    // replace() rather than assign(): going Back from the destination must
    // return the visitor to wherever they came from, not to this page, which
    // would immediately throw them forward again.
    window.location.replace(target);
  }

  if (!(left > 0)) { finish(); return; }

  // Announced once at the start and once at the end. Reading every tick would
  // make a screen reader talk over the page for the whole countdown.
  live.textContent = "Redirecting in " + left + " seconds.";

  var timer = setInterval(function(){
    left -= 1;
    if (left > 0) { num.textContent = String(left); return; }
    clearInterval(timer);
    finish();
  }, 1000);
})();
</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never cache: a cached interstitial would keep serving a stale
      // destination after a link is re-pointed, and would stop the scan being
      // counted on repeat visits.
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-robots-tag": "noindex, nofollow",
    },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Exactly one path segment, e.g. "/abc2xyz" -> ["", "abc2xyz"].
  const segments = pathname.split("/")
  if (segments.length !== 2) return NextResponse.next()

  const candidate = segments[1]
  if (RESERVED.has(candidate)) return NextResponse.next()

  // Resolution is case-insensitive server-side, so normalise here too rather
  // than reject an uppercase variant someone typed off a printed QR code.
  const code = candidate.toLowerCase()
  if (!CODE_PATTERN.test(code) || code.includes("--")) return NextResponse.next()

  // Skip the round trip for a code we very recently confirmed does not exist.
  if (isKnownMiss(code)) return NextResponse.next()

  // Exactly one resolve per visit. `resolve_short_code` increments scan_count
  // as a side effect of resolving, so a second call anywhere in this request
  // would double-count the scan and corrupt the analytics users see in the
  // app. That is why the interstitial is rendered from the plan in hand rather
  // than re-resolving the code on a page of its own.
  const plan = await resolveCode(code)
  if (!plan) return NextResponse.next()

  if (plan.delaySeconds > 0) return renderInterstitial(plan)

  // 302 rather than 308 so a mapping stays changeable without poisoning caches.
  return NextResponse.redirect(plan.destination, 302)
}

export const config = {
  // Skip API routes, Next internals, and any path carrying a file extension.
  // The in-code checks above narrow this further to plausible codes only.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
}

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
 */

// Superset pre-filter: 3-32 chars, alphanumeric ends, hyphens only internal.
// Double hyphens are rejected separately below (not expressible cheaply here).
const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/

const RESOLVE_ENDPOINT = "https://api2.onfire.so/rpc/resolve_short_code"
const RESOLVE_TIMEOUT_MS = 1500

// Single-segment paths that must never be treated as a short code.
const RESERVED = new Set(["favicon.ico", "robots.txt", "sitemap.xml"])

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

async function resolveCode(code: string): Promise<URL | null> {
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
    return destination
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown"
    console.warn(`[short-link] resolve error for ${code}: ${reason}`)
    return null
  } finally {
    clearTimeout(timer)
  }
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

  const destination = await resolveCode(code)
  if (!destination) return NextResponse.next()

  // 302 rather than 308 so a mapping stays changeable without poisoning caches.
  return NextResponse.redirect(destination, 302)
}

export const config = {
  // Skip API routes, Next internals, and any path carrying a file extension.
  // The in-code checks above narrow this further to plausible codes only.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
}

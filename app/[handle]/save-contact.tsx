"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

/**
 * "Save contact" — the vCard download, its in-app-browser caveat, and the
 * fallback that has to work when the download does not.
 *
 * ── Why the link is a bare <a> with no `download` attribute ───────────────
 * This looks like an oversight and is not. On iOS, a `text/vcard` response
 * served `Content-Disposition: inline` and opened by an ordinary navigation
 * makes Safari render the card and offer "Add to Contacts". Add `download`
 * (or serve `attachment`) and Safari instead writes a .vcf into Files, where
 * it is inert — the user has "saved" something they cannot use. Android
 * Chrome puts the same link in Downloads, from where Contacts imports it.
 * So: no `download`, and the server must send `inline`. Do not "fix" either.
 *
 * ── Why there is a fallback at all ───────────────────────────────────────
 * Social in-app browsers (Instagram, Facebook, LinkedIn, TikTok) run stripped
 * WebViews that drop a vCard navigation on the floor: no download, no error,
 * no visible reaction. Since a large share of onf.to traffic arrives from a
 * link pasted into exactly those apps, the silent failure is the single most
 * likely way this feature "breaks". The fallback block below is therefore not
 * a consolation prize — it is the path a meaningful fraction of visitors will
 * actually take, and it is always rendered, never conditional on detection.
 */

/** Fields the public profile RPC actually exposes to an anonymous visitor. */
export interface ContactDetails {
  name: string
  handle: string
  website?: string
  location?: string
  occupation?: string
  /**
   * Absent from `get_public_user_profile` today — the RPC deliberately withholds
   * `users.email` / `users.phone_number` from anonymous callers. They are typed
   * here so that if the card service ever exposes them under its own privacy
   * rules, the tel:/mailto: rows light up with no further change. Until then
   * they stay undefined and those rows simply do not render: this page will not
   * offer a "Call" button that dials nothing.
   */
  phone?: string
  email?: string
}

interface SaveContactProps {
  /** Canonical public URL of this profile — what the QR encodes. */
  profileUrl: string
  /**
   * Pre-rendered QR SVG markup, generated on the server (see page.tsx).
   * Null when encoding failed — the block then renders without the code
   * rather than showing an empty white square pretending to be one.
   */
  qrSvg: string | null
  contact: ContactDetails
  /** User uuid used to build /card/<id>.vcf. Null hides the download entirely. */
  vcardId: string | null
  /** Runtime switch; off until the card service ships /card/:id.vcf. */
  vcardEnabled: boolean
  /**
   * The page's existing primary action (Send Message), rendered as the first
   * item of the button row so the two sit side by side. Passed in rather than
   * duplicated here: that button belongs to the profile page, and composing it
   * keeps this component from owning an action it has nothing to do with.
   */
  children?: ReactNode
}

/**
 * Known in-app browsers, matched on User-Agent.
 *
 * UA sniffing is a poor foundation and this list will go stale — a new app, or
 * an old one that restyles its UA, will not be recognised. That is designed for
 * rather than denied:
 *
 *   • It fails OPEN. An unrecognised WebView gets the ordinary button and no
 *     nag. The worst case is the status quo — never a working browser degraded
 *     by a warning it does not need.
 *   • The hint is an optimisation, not the mechanism. The fallback block renders
 *     for everyone regardless of what this list says, so a visitor in a WebView
 *     nobody has heard of still has a QR, a copy button and a link that works.
 *
 * There is deliberately no generic "is this a WebView?" heuristic. Those fire on
 * plenty of contexts that handle vCards fine (Gmail, Slack, an SFSafariViewController)
 * and turn an accurate hint into background noise. Only apps confirmed to swallow
 * the download are listed; the cost of that choice is a false negative, which the
 * two properties above already make harmless.
 */
const IN_APP_BROWSERS: ReadonlyArray<{ label: string; test: RegExp }> = [
  { label: "Instagram", test: /\bInstagram\b/i },
  // FBAN/FBAV (iOS), FB_IAB/FB4A (Android) — the family shares these tokens.
  { label: "Facebook", test: /\bFBAN\b|\bFBAV\b|\bFB_IAB\b|\bFB4A\b/i },
  { label: "LinkedIn", test: /\bLinkedInApp\b/i },
  // TikTok ships as musical_ly on iOS and a Bytedance WebView on Android.
  { label: "TikTok", test: /\bmusical_ly\b|Bytedance|\bByteLocale\b|\bTikTok\b/i },
  { label: "Snapchat", test: /\bSnapchat\b/i },
  { label: "Pinterest", test: /\bPinterest\b/i },
]

function detectInAppBrowser(ua: string): string | null {
  for (const app of IN_APP_BROWSERS) {
    if (app.test.test(ua)) return app.label
  }
  return null
}

/**
 * The plain-text block the copy button puts on the clipboard.
 *
 * Shaped to be pasted into a contact form or a notes app by a human, so it is
 * labelled lines rather than raw vCard syntax — a person who has just failed to
 * import a .vcf is not helped by being handed more of the same. Only fields the
 * profile actually has appear; no empty labels, no "Phone: —".
 */
function buildPlainText(contact: ContactDetails, profileUrl: string): string {
  const lines: string[] = [contact.name]
  if (contact.occupation) lines.push(contact.occupation)
  lines.push(contact.handle)
  if (contact.phone) lines.push(`Phone: ${contact.phone}`)
  if (contact.email) lines.push(`Email: ${contact.email}`)
  if (contact.website) lines.push(`Website: ${contact.website}`)
  if (contact.location) lines.push(`Location: ${contact.location}`)
  lines.push(profileUrl)
  return lines.join("\n")
}

/** Absolute, scheme-qualified href for a website that may be stored bare. */
function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

/**
 * Clipboard write with a fallback for WebViews that do not expose the async
 * Clipboard API. Returns success so the UI can tell the truth either way rather
 * than flashing "Copied!" over a clipboard that never changed.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path — permission denied, insecure context, etc.
  }
  try {
    const el = document.createElement("textarea")
    el.value = text
    el.setAttribute("readonly", "")
    el.style.position = "fixed"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export default function SaveContact({
  profileUrl,
  qrSvg,
  contact,
  vcardId,
  vcardEnabled,
  children,
}: SaveContactProps) {
  const [inAppBrowser, setInAppBrowser] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detection runs after mount: the server has no User-Agent-derived state, so
  // doing this during render would produce a hydration mismatch.
  useEffect(() => {
    setInAppBrowser(detectInAppBrowser(navigator.userAgent || ""))
  }, [])

  // A pending "Copied!" reset must not outlive the component.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const plainText = useMemo(() => buildPlainText(contact, profileUrl), [contact, profileUrl])
  const showDownload = vcardEnabled && Boolean(vcardId)

  const handleCopy = async () => {
    const ok = await copyText(plainText)
    setCopyState(ok ? "copied" : "failed")
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2500)
  }

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {children}
        {showDownload && (
          <a
            href={`/card/${vcardId}.vcf`}
            className={`inline-flex items-center justify-center gap-2 rounded-full border border-gray-500/70 bg-gray-700/50 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:border-orange-400/70 hover:bg-gray-700/80 ${focusRing}`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            SAVE CONTACT
          </a>
        )}
      </div>

      {showDownload && inAppBrowser && (
        <div className="mx-auto max-w-sm rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-left">
          <p className="text-sm text-amber-100">
            <span aria-hidden="true">⚠️ </span>
            The {inAppBrowser} in-app browser blocks contact downloads. Open this page
            in Safari or Chrome to save the card — or just use the details below.
          </p>
        </div>
      )}

      {/* Always rendered: the path that works when the vCard does not. */}
      <div className="mx-auto max-w-sm rounded-2xl border border-gray-600/50 bg-gray-900/40 p-4">
        <div className="flex items-start gap-4">
          {qrSvg && (
            <div
              role="img"
              aria-label={`QR code linking to ${profileUrl}`}
              className="shrink-0 rounded-lg bg-white p-2 [&>svg]:block [&>svg]:h-[104px] [&>svg]:w-[104px]"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-white">
              {qrSvg ? "Scan or copy" : "Copy details"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              {qrSvg
                ? "Point another phone at the code to open this profile, or copy the details to paste anywhere."
                : "Copy the details to paste anywhere."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  className={`inline-flex items-center rounded-full border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-orange-400/70 hover:text-white ${focusRing}`}
                >
                  Call
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className={`inline-flex items-center rounded-full border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-orange-400/70 hover:text-white ${focusRing}`}
                >
                  Email
                </a>
              )}
              {contact.website && (
                <a
                  href={websiteHref(contact.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center rounded-full border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-orange-400/70 hover:text-white ${focusRing}`}
                >
                  Website
                </a>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center rounded-full border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-orange-400/70 hover:text-white ${focusRing}`}
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Press and hold to copy"
                    : "Copy details"}
              </button>
            </div>

            {/* Announced to screen readers; the button label alone changes silently. */}
            <p aria-live="polite" className="sr-only">
              {copyState === "copied"
                ? "Contact details copied to clipboard"
                : copyState === "failed"
                  ? "Could not copy automatically. Select the details manually."
                  : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

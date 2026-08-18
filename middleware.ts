import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * onf.to short-link resolver.
 *
 * Runs ahead of the `/[handle]` catch-all so that a path matching a live short
 * code redirects to its destination, while everything else (profiles, product
 * and service pages, checkout, API routes) reaches its normal route untouched.
 *
 * Short codes are 7 characters drawn from a confusable-free alphabet
 * (no 0/o/1/i/l). The shape check below is deliberately cheap and runs before
 * any network call, so an ordinary profile view never pays for a lookup.
 */

// Mirrors the mint-side alphabet in the short_links schema.
const CODE_CHARSET = "abcdefghjkmnpqrstuvwxyz23456789"
const CODE_LENGTH = 7
const CODE_PATTERN = new RegExp(`^[${CODE_CHARSET}]{${CODE_LENGTH}}$`)

const RESOLVE_ENDPOINT = "https://api2.onfire.so/rpc/resolve_short_code"
const RESOLVE_TIMEOUT_MS = 1500

// Single-segment paths that must never be treated as a short code.
const RESERVED = new Set(["favicon.ico", "robots.txt", "sitemap.xml"])

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
    if (!data?.found) return null

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

  // Resolution is case-insensitive; the mint alphabet is lowercase.
  const code = candidate.toLowerCase()
  if (!CODE_PATTERN.test(code)) return NextResponse.next()

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

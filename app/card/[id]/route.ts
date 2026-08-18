/**
 * GET /card/<id>.vcf     vCard 3.0
 * GET /card/<id>.pkpass  Apple Wallet pass
 *
 * <id> is a handle or a user uuid. Both resolve through the same RPC; see
 * lib/card/model.ts.
 *
 * ROUTING NOTE: this path deliberately needs no change to middleware.ts. The
 * middleware matcher excludes any path containing a dot, so `.vcf`/`.pkpass`
 * never reach the short-code resolver, and middleware() returns early on
 * anything that is not exactly one path segment anyway.
 */

import { NextResponse } from "next/server"
import { fetchCard, cardFilename } from "@/lib/card/model"
import { renderVCard } from "@/lib/card/vcard"
import { buildPkPass } from "@/lib/card/apple"
import { WalletNotConfiguredError, walletAvailability } from "@/lib/card/credentials"

// Signing and the upstream RPC both need Node APIs, and the card must never be
// served from a stale edge cache after a user revokes a field.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function notFound() {
  return NextResponse.json(
    { error: "not_found", code: "CARD_NOT_FOUND" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  )
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const raw = params.id ?? ""
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return notFound()

  const id = raw.slice(0, dot)
  const ext = raw.slice(dot + 1).toLowerCase()
  if (ext !== "vcf" && ext !== "pkpass") return notFound()

  // Bound the work an enumerating client can provoke before any upstream call.
  if (id.length > 64) return notFound()

  let card
  try {
    card = await fetchCard(id)
  } catch {
    // Upstream unreachable is NOT "no such user" — returning 404 here would
    // teach caches and clients that a live profile had been deleted.
    return NextResponse.json(
      { error: "upstream_unavailable", code: "CARD_UPSTREAM_UNAVAILABLE" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
  if (!card) return notFound()

  if (ext === "vcf") {
    const body = renderVCard(card)
    return new NextResponse(body, {
      status: 200,
      headers: {
        // charset=utf-8 is what tells the importer how to decode the bytes;
        // vCard 3.0 has no per-property charset parameter.
        "Content-Type": "text/vcard; charset=utf-8",
        // `inline`, NOT `attachment`. This is what makes iOS Safari offer
        // "Add to Contacts" instead of saving a file the user cannot open.
        // Do not change this to attachment, and do not add a `download`
        // attribute to the link that points here.
        "Content-Disposition": `inline; filename="${cardFilename(card, "vcf")}"`,
        "Content-Length": String(Buffer.byteLength(body, "utf8")),
        "Cache-Control": "public, max-age=60, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  try {
    const pass = await buildPkPass(card)
    return new NextResponse(pass as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        // A .pkpass IS handed to Wallet as a download; unlike the vCard,
        // attachment is correct here.
        "Content-Disposition": `attachment; filename="${cardFilename(card, "pkpass")}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    if (err instanceof WalletNotConfiguredError) {
      // The expected state today. Typed and explicit so clients can hide the
      // button rather than surfacing an error, and so this is never mistaken
      // for a bug in the pass itself.
      return NextResponse.json(
        { error: "wallet_not_configured", code: err.code, provider: err.provider },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      )
    }
    return NextResponse.json(
      { error: "pass_generation_failed", code: "CARD_PASS_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

/**
 * HEAD is the availability probe: "would a GET give me a pass?"
 *
 * Next.js would otherwise answer HEAD by running GET and throwing the body
 * away, which once certificates exist means signing a full .pkpass per probe.
 * This handler reports the same status a GET would without doing any of that
 * work — it resolves the card (one indexed lookup) and asks whether signing
 * material loads, then stops.
 */
export async function HEAD(_req: Request, { params }: { params: { id: string } }) {
  const raw = params.id ?? ""
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return new NextResponse(null, { status: 404 })

  const id = raw.slice(0, dot)
  const ext = raw.slice(dot + 1).toLowerCase()
  if ((ext !== "vcf" && ext !== "pkpass") || id.length > 64) {
    return new NextResponse(null, { status: 404 })
  }

  let card
  try {
    card = await fetchCard(id)
  } catch {
    return new NextResponse(null, { status: 502 })
  }
  if (!card) return new NextResponse(null, { status: 404 })

  if (ext === "vcf") {
    return new NextResponse(null, {
      status: 200,
      headers: { "Content-Type": "text/vcard; charset=utf-8", "Cache-Control": "no-store" },
    })
  }

  const { apple } = await walletAvailability()
  return new NextResponse(null, {
    status: apple ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      ...(apple ? { "Content-Type": "application/vnd.apple.pkpass" } : {}),
    },
  })
}

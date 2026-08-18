/**
 * GET /card/<id>/jwt — Google Wallet save JWT.
 *
 * Returns { jwt }. The client opens https://pay.google.com/gp/v/save/<jwt>.
 *
 * Four path segments, so middleware() returns early without consulting the
 * short-code resolver; no middleware change is needed for this route either.
 */

import { NextResponse } from "next/server"
import { fetchCard, CardUpstreamError } from "@/lib/card/model"
import { buildWalletJwt } from "@/lib/card/google"
import { WalletNotConfiguredError, walletAvailability } from "@/lib/card/credentials"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Name the cause in the response body, so a 502 is not a mystery. */
function upstreamBody(err: unknown) {
  if (err instanceof CardUpstreamError && err.kind === "forbidden") {
    return {
      error: "upstream_forbidden",
      code: "CARD_UPSTREAM_FORBIDDEN",
      hint: "The API gateway rejected get_contact_card. Add /rpc/get_contact_card to PUBLIC_ROUTES in cf-api-gateway and redeploy the worker.",
    }
  }
  return { error: "upstream_unavailable", code: "CARD_UPSTREAM_UNAVAILABLE" }
}


export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id ?? ""
  if (!id || id.length > 64) {
    return NextResponse.json(
      { error: "not_found", code: "CARD_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    )
  }

  let card
  try {
    card = await fetchCard(id)
  } catch (err) {
    return NextResponse.json(upstreamBody(err), {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    })
  }
  if (!card) {
    return NextResponse.json(
      { error: "not_found", code: "CARD_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    )
  }

  try {
    const jwt = await buildWalletJwt(card)
    return NextResponse.json(
      { jwt, saveUrl: `https://pay.google.com/gp/v/save/${jwt}` },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    if (err instanceof WalletNotConfiguredError) {
      return NextResponse.json(
        { error: "wallet_not_configured", code: err.code, provider: err.provider },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      )
    }
    return NextResponse.json(
      { error: "jwt_generation_failed", code: "CARD_JWT_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

/**
 * HEAD is the availability probe. Short-circuiting it matters more here than on
 * the Apple route: buildWalletJwt() upserts a Wallet class and object into
 * Google's API before signing, so letting HEAD fall through to GET would make a
 * supposedly side-effect-free request perform remote writes — and burn Google's
 * 20 rps budget — every time a client decided whether to draw a button.
 */
export async function HEAD(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id ?? ""
  if (!id || id.length > 64) return new NextResponse(null, { status: 404 })

  let card
  try {
    card = await fetchCard(id)
  } catch {
    return new NextResponse(null, { status: 502 })
  }
  if (!card) return new NextResponse(null, { status: 404 })

  const { google } = await walletAvailability()
  return new NextResponse(null, {
    status: google ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  })
}

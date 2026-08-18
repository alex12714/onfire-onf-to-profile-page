/**
 * GET /card/<id>/jwt — Google Wallet save JWT.
 *
 * Returns { jwt }. The client opens https://pay.google.com/gp/v/save/<jwt>.
 *
 * Four path segments, so middleware() returns early without consulting the
 * short-code resolver; no middleware change is needed for this route either.
 */

import { NextResponse } from "next/server"
import { fetchCard } from "@/lib/card/model"
import { buildWalletJwt } from "@/lib/card/google"
import { WalletNotConfiguredError } from "@/lib/card/credentials"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
  } catch {
    return NextResponse.json(
      { error: "upstream_unavailable", code: "CARD_UPSTREAM_UNAVAILABLE" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
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

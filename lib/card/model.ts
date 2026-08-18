/**
 * The contact card model — the one data source behind all three renderings.
 *
 * There is deliberately no field mapping in this file beyond naming the shape.
 * Which of a user's columns belong on a card is decided once, in the
 * `get_contact_card` Postgres function (sql/migrations/20260818_contact_card_01_model.sql
 * in the OnFire monorepo). The vCard, Apple Wallet and Google Wallet renderers
 * all consume `CardModel` and nothing else, so a field added to the RPC shows up
 * in all three, and a field the RPC withholds cannot leak through any of them.
 */

export interface CardChannel {
  type: string
  value: string
}

export interface CardModel {
  /**
   * The user's uuid — never the handle, even when the card was requested by
   * handle. Handles are reassignable; anything durable (the vCard UID, the
   * Wallet object id) keys off this instead so a transferred handle can never
   * repoint an already-issued artifact at a different person.
   */
  uid: string
  handle: string
  profileUrl: string
  name: { full: string; first: string | null; last: string | null; middle: string | null }
  org: { title: string | null; company: string | null }
  avatarUrl: string | null
  note: string | null
  locality: string | null
  emails: CardChannel[]
  phones: CardChannel[]
  urls: CardChannel[]
  updatedAt: string | null
}

/** Why a card could not be produced. Callers map these onto status codes. */
export type CardMiss = "not_found" | "upstream_error"

const API_BASE = process.env.ONFIRE_API_BASE ?? "https://api2.onfire.so"
const RPC_TIMEOUT_MS = 5000

/**
 * Fetch the card model. Returns null when the user should be treated as
 * absent — which covers "no such user", "inactive", "profile not public" and
 * "card switched off" alike. Those are deliberately indistinguishable to the
 * caller: telling an anonymous scraper *why* a handle produced no card leaks
 * whether the handle exists at all.
 */
export async function fetchCard(id: string): Promise<CardModel | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_BASE}/rpc/get_contact_card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
      signal: controller.signal,
      cache: "no-store",
    })
  } catch {
    // Network failure or timeout. Distinct from "no such user": the caller
    // turns this into a 502 so a transient upstream blip is never cached or
    // mistaken for a deleted profile.
    throw new Error("upstream_unreachable")
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`upstream_status_${res.status}`)

  const raw = (await res.json()) as Record<string, unknown> | null
  if (!raw || raw.found !== true) return null

  return {
    uid: String(raw.uid),
    handle: String(raw.handle),
    profileUrl: String(raw.profile_url),
    name: {
      full: String((raw.name as any)?.full ?? ""),
      first: ((raw.name as any)?.first as string) ?? null,
      last: ((raw.name as any)?.last as string) ?? null,
      middle: ((raw.name as any)?.middle as string) ?? null,
    },
    org: {
      title: ((raw.org as any)?.title as string) ?? null,
      company: ((raw.org as any)?.company as string) ?? null,
    },
    avatarUrl: (raw.avatar_url as string) ?? null,
    note: (raw.note as string) ?? null,
    locality: (raw.locality as string) ?? null,
    emails: (raw.emails as CardChannel[]) ?? [],
    phones: (raw.phones as CardChannel[]) ?? [],
    urls: (raw.urls as CardChannel[]) ?? [],
    updatedAt: (raw.updated_at as string) ?? null,
  }
}

/**
 * A filename-safe rendering of the person's name, used for both the .vcf and
 * .pkpass downloads. Android in particular drops the file straight into
 * Downloads, so it needs to be something a human can recognise in a file list
 * rather than a uuid.
 */
export function cardFilename(card: CardModel, ext: string): string {
  const base =
    card.name.full
      .normalize("NFKD")
      // Strip combining marks so "José" becomes "Jose" rather than "Jos".
      .replace(/[\u0300-\u036f]/g, "")
      // Anything outside a conservative ASCII set becomes a separator: emoji,
      // CJK, quotes, and the path/quote characters that would otherwise let a
      // display name break out of the Content-Disposition header.
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || card.handle.replace(/[^A-Za-z0-9._-]+/g, "-")

  return `${base || "contact"}.${ext}`
}

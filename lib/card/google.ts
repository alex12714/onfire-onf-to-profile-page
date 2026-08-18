/**
 * Google Wallet (Generic pass) renderer.
 *
 * Consumes the same CardModel as the vCard and the Apple pass.
 *
 * Cannot produce anything today: there is no Google Wallet issuer account and
 * no service account. `loadGoogleCredentials()` throws WalletNotConfiguredError
 * and there is no unsigned fallback.
 *
 * IDEMPOTENCY
 * -----------
 * The Google Wallet REST API has no upsert: PUT and PATCH both require the
 * resource to exist, and a duplicate insert returns 409 AlreadyExistsException.
 * So idempotency is built from stable ids plus insert-then-409-is-success,
 * which is the pattern Google's own samples use:
 *
 *   class id  = <issuerId>.onfire_contact_v1     one shared template, forever
 *   object id = <issuerId>.onfire_contact_<uid>  one per user, keyed to the uuid
 *
 * Both are pure functions of the issuer id and the user uuid, so calling this
 * endpoint twice reuses the same class and the same object. It cannot create a
 * second class, and it cannot produce a divergent pass for the same user: the
 * second call PATCHes the existing object back to the current card model.
 *
 * The JWT carries only the object id, never the full class + object inline.
 * Google truncates save URLs beyond ~1800 characters, and an inline class plus
 * object exceeds that for any card with a bio.
 */

import type { CardModel } from "./model"
import { loadGoogleCredentials } from "./credentials"

/** Google ids allow only [A-Za-z0-9._-]; uuids are already within that set. */
function sanitizeSuffix(raw: string): string {
  return raw.replace(/[^A-Za-z0-9._-]/g, "_")
}

export function classId(issuerId: string): string {
  return `${issuerId}.onfire_contact_v1`
}

export function objectId(issuerId: string, uid: string): string {
  return `${issuerId}.onfire_contact_${sanitizeSuffix(uid)}`
}

export function buildGenericClass(issuerId: string): Record<string, unknown> {
  return {
    id: classId(issuerId),
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['title']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['company']" }] } },
            },
          },
        ],
      },
    },
  }
}

export function buildGenericObject(
  card: CardModel,
  issuerId: string,
): Record<string, unknown> {
  const text: Array<Record<string, string>> = []
  if (card.org.title) text.push({ id: "title", header: "Title", body: card.org.title })
  if (card.org.company) text.push({ id: "company", header: "Company", body: card.org.company })
  card.phones.forEach((p, i) => text.push({ id: `phone${i}`, header: "Phone", body: p.value }))
  card.emails.forEach((e, i) => text.push({ id: `email${i}`, header: "Email", body: e.value }))
  if (card.locality) text.push({ id: "location", header: "Location", body: card.locality })

  return {
    id: objectId(issuerId, card.uid),
    classId: classId(issuerId),
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "en-US", value: "OnFire" } },
    header: { defaultValue: { language: "en-US", value: card.name.full } },
    subheader: card.org.title
      ? { defaultValue: { language: "en-US", value: card.org.title } }
      : undefined,
    hexBackgroundColor: "#FF6B1F",
    logo: card.avatarUrl
      ? { sourceUri: { uri: card.avatarUrl }, contentDescription: { defaultValue: { language: "en-US", value: `${card.name.full} avatar` } } }
      : undefined,
    barcode: { type: "QR_CODE", value: card.profileUrl, alternateText: card.handle },
    textModulesData: text,
    linksModuleData: {
      uris: card.urls.map((u, i) => ({
        id: `link${i}`,
        uri: u.value,
        description: u.type === "profile" ? "OnFire profile" : "Website",
      })),
    },
  }
}

/**
 * Produce the "Add to Google Wallet" JWT. Throws WalletNotConfiguredError until
 * a service account and issuer id exist.
 */
export async function buildWalletJwt(card: CardModel): Promise<string> {
  const creds = await loadGoogleCredentials()

  // Reached only once credentials are installed; the dependency is added at the
  // same time. Until then loadGoogleCredentials() has already thrown.
  const { SignJWT, importPKCS8 } = await import("jose")

  await ensureClassAndObject(card, creds.issuerId)

  const key = await importPKCS8(creds.privateKey, "RS256")
  return new SignJWT({
    // Reference-only payload — the object was just upserted, so the JWT stays
    // far below the ~1800 character ceiling that truncates save URLs.
    payload: { genericObjects: [{ id: objectId(creds.issuerId, card.uid) }] },
    // The button does not render when `origins` is absent.
    origins: ["https://onf.to"],
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(creds.clientEmail)
    .setAudience("google")
    .setIssuedAt()
    .sign(key)
}

/**
 * Insert-or-update both resources. Insert first and treat 409 as success —
 * one round trip in the steady state, versus two for GET-then-decide.
 */
async function ensureClassAndObject(card: CardModel, issuerId: string): Promise<void> {
  const token = await accessToken()
  const base = "https://walletobjects.googleapis.com/walletobjects/v1"

  await upsert(`${base}/genericClass`, `${base}/genericClass/${classId(issuerId)}`, buildGenericClass(issuerId), token)
  await upsert(`${base}/genericObject`, `${base}/genericObject/${objectId(issuerId, card.uid)}`, buildGenericObject(card, issuerId), token)
}

async function upsert(
  insertUrl: string,
  resourceUrl: string,
  body: Record<string, unknown>,
  token: string,
): Promise<void> {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const created = await fetch(insertUrl, { method: "POST", headers, body: JSON.stringify(body) })
  if (created.ok) return

  // 409 means someone (probably a previous call for this same user) already
  // created it. That is the idempotent path, not an error: PATCH it back to the
  // current model so a second call converges rather than diverging.
  if (created.status === 409) {
    const patched = await fetch(resourceUrl, { method: "PATCH", headers, body: JSON.stringify(body) })
    if (!patched.ok) {
      throw new Error(`google_wallet_patch_failed_${patched.status}`)
    }
    return
  }

  throw new Error(`google_wallet_insert_failed_${created.status}`)
}

async function accessToken(): Promise<string> {
  const creds = await loadGoogleCredentials()
  const { SignJWT, importPKCS8 } = await import("jose")

  const key = await importPKCS8(creds.privateKey, "RS256")
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(creds.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key)

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`google_token_exchange_failed_${res.status}`)
  return ((await res.json()) as { access_token: string }).access_token
}

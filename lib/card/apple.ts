/**
 * Apple Wallet (.pkpass) renderer.
 *
 * Consumes the same CardModel as the vCard — no second field mapping.
 *
 * Cannot produce anything today: there is no Pass Type ID certificate and no
 * WWDR certificate anywhere in OnFire. `loadAppleCredentials()` throws
 * WalletNotConfiguredError and this module deliberately has no fallback path.
 * There is no such thing as a useful unsigned pass — iOS rejects it — so a
 * placeholder would only turn a clear 503 into a confusing client-side failure.
 */

import type { CardModel } from "./model"
import { loadAppleCredentials, WalletNotConfiguredError } from "./credentials"

/**
 * pass.json, built from the card model.
 *
 * Field layout is the spec agreed for this epic:
 *   primaryFields   name
 *   secondaryFields title, company
 *   backFields      phone, email, website
 *   barcode         QR carrying the profile URL
 */
export function buildPassJson(
  card: CardModel,
  passTypeIdentifier: string,
  teamIdentifier: string,
): Record<string, unknown> {
  const secondary: Array<Record<string, string>> = []
  if (card.org.title) secondary.push({ key: "title", label: "Title", value: card.org.title })
  if (card.org.company) secondary.push({ key: "company", label: "Company", value: card.org.company })

  const back: Array<Record<string, string>> = []
  card.phones.forEach((p, i) =>
    back.push({ key: `phone${i}`, label: "Phone", value: p.value }),
  )
  card.emails.forEach((e, i) =>
    back.push({ key: `email${i}`, label: "Email", value: e.value }),
  )
  card.urls.forEach((u, i) =>
    back.push({ key: `url${i}`, label: u.type === "profile" ? "OnFire" : "Website", value: u.value }),
  )
  if (card.note) back.push({ key: "note", label: "About", value: card.note })

  return {
    formatVersion: 1,
    passTypeIdentifier,
    teamIdentifier,
    // passTypeIdentifier + serialNumber is the pass's primary key on device.
    // Keying the serial to the uuid means re-issuing UPDATES the pass already
    // in the user's Wallet rather than adding a second one — and means a
    // reassigned handle can never repoint an issued pass at a different person.
    serialNumber: card.uid,
    organizationName: "OnFire",
    description: `${card.name.full} — OnFire contact card`,
    logoText: "OnFire",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(255, 107, 31)",
    labelColor: "rgb(255, 206, 84)",
    generic: {
      primaryFields: [{ key: "name", label: "Name", value: card.name.full }],
      secondaryFields: secondary,
      auxiliaryFields: card.locality
        ? [{ key: "location", label: "Location", value: card.locality }]
        : [],
      backFields: back,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: card.profileUrl,
        messageEncoding: "iso-8859-1",
      },
    ],
    // Kept for iOS 8 and earlier, which read `barcode` rather than `barcodes`.
    barcode: {
      format: "PKBarcodeFormatQR",
      message: card.profileUrl,
      messageEncoding: "iso-8859-1",
    },
  }
}

/**
 * Build a signed .pkpass. Throws WalletNotConfiguredError until certificates
 * exist — which is the only thing it can do today.
 */
export async function buildPkPass(card: CardModel): Promise<Buffer> {
  const creds = await loadAppleCredentials()

  // `passkit-generator` is installed as part of the credential rollout, not
  // before it: a build shipped today would otherwise carry a dependency it
  // cannot exercise (and whose pinned joi@17.4.2 has an open advisory) purely
  // to sit unreachable behind the throw above. webpackIgnore keeps it a runtime
  // resolution so the bundle does not need it to exist.
  // See docs/ops/contact-card/wallet_credentials.md §3.
  let PKPass: typeof import("passkit-generator").PKPass
  try {
    ;({ PKPass } = await import(/* webpackIgnore: true */ "passkit-generator"))
  } catch {
    // Certificates present but the library absent — still "not configured" from
    // the caller's point of view, and still a clean 503 rather than a 500.
    throw new WalletNotConfiguredError("apple", [
      "passkit-generator is not installed (pnpm add passkit-generator)",
    ])
  }

  const pass = new PKPass(
    {},
    {
      wwdr: creds.wwdrPem,
      signerCert: creds.signerCertPem,
      signerKey: creds.signerKeyPem,
      signerKeyPassphrase: creds.signerKeyPassphrase,
    },
    buildPassJson(card, creds.passTypeIdentifier, creds.teamIdentifier) as never,
  )

  pass.type = "generic"
  return pass.getAsBuffer()
}

/**
 * Wallet signing credentials.
 *
 * None of these exist yet. This module's job is to say so precisely, so the
 * Wallet routes fail closed with a typed error instead of emitting an unsigned
 * or placeholder pass. An unsigned .pkpass is not a degraded pass — it is a
 * file iOS refuses, and a pass signed with the wrong key would let anyone mint
 * something that looks like it came from OnFire.
 *
 * WHERE SECRETS LIVE, AND WHY NOT system_config
 * ---------------------------------------------
 * OnFire's convention is that API keys live in the `system_config` table. That
 * convention does not fit here, for a concrete reason: onf.to calls the API
 * anonymously (as `web_anon`), and the `authenticated_read_scoped` RLS policy
 * on `system_config` only exposes an allowlist of key prefixes to logged-in
 * users and everything else to admins alone. A web_anon caller cannot read a
 * signing key at all, and giving this container an admin credential so it could
 * would be a far worse trade than mounting a file.
 *
 * So: secrets are mounted read-only from the host, and only their PATHS are
 * configured via env. Nothing secret is ever baked into the image, committed,
 * or served to a client. See docs/ops/contact-card/wallet_credentials.md.
 */

import { readFile } from "node:fs/promises"

export class WalletNotConfiguredError extends Error {
  readonly code = "WALLET_NOT_CONFIGURED"
  constructor(
    readonly provider: "apple" | "google",
    readonly missing: string[],
  ) {
    super(`${provider} wallet is not configured: missing ${missing.join(", ")}`)
    this.name = "WalletNotConfiguredError"
  }
}

export interface AppleCredentials {
  signerCertPem: Buffer
  signerKeyPem: Buffer
  wwdrPem: Buffer
  signerKeyPassphrase: string | undefined
  passTypeIdentifier: string
  teamIdentifier: string
}

export interface GoogleCredentials {
  clientEmail: string
  privateKey: string
  issuerId: string
}

/** Absent or blank env var reads as "not configured", never as empty string. */
function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export async function loadAppleCredentials(): Promise<AppleCredentials> {
  const certPath = env("APPLE_PASS_CERT_PATH")
  const keyPath = env("APPLE_PASS_KEY_PATH")
  const wwdrPath = env("APPLE_WWDR_CERT_PATH")
  const passTypeIdentifier = env("APPLE_PASS_TYPE_ID")
  const teamIdentifier = env("APPLE_TEAM_ID")

  const missing: string[] = []
  if (!certPath) missing.push("APPLE_PASS_CERT_PATH")
  if (!keyPath) missing.push("APPLE_PASS_KEY_PATH")
  if (!wwdrPath) missing.push("APPLE_WWDR_CERT_PATH")
  if (!passTypeIdentifier) missing.push("APPLE_PASS_TYPE_ID")
  if (!teamIdentifier) missing.push("APPLE_TEAM_ID")
  if (missing.length) throw new WalletNotConfiguredError("apple", missing)

  // A configured-but-unreadable path is still "not configured" as far as the
  // caller is concerned — a 503 the operator can diagnose, never a 500.
  let signerCertPem: Buffer, signerKeyPem: Buffer, wwdrPem: Buffer
  try {
    ;[signerCertPem, signerKeyPem, wwdrPem] = await Promise.all([
      readFile(certPath!),
      readFile(keyPath!),
      readFile(wwdrPath!),
    ])
  } catch (err) {
    throw new WalletNotConfiguredError("apple", [
      `unreadable certificate file (${(err as NodeJS.ErrnoException).code ?? "read error"})`,
    ])
  }

  return {
    signerCertPem,
    signerKeyPem,
    wwdrPem,
    signerKeyPassphrase: env("APPLE_PASS_KEY_PASSPHRASE"),
    passTypeIdentifier: passTypeIdentifier!,
    teamIdentifier: teamIdentifier!,
  }
}

export async function loadGoogleCredentials(): Promise<GoogleCredentials> {
  const saPath = env("GOOGLE_WALLET_SA_PATH")
  const issuerId = env("GOOGLE_WALLET_ISSUER_ID")

  const missing: string[] = []
  if (!saPath) missing.push("GOOGLE_WALLET_SA_PATH")
  if (!issuerId) missing.push("GOOGLE_WALLET_ISSUER_ID")
  if (missing.length) throw new WalletNotConfiguredError("google", missing)

  let parsed: { client_email?: string; private_key?: string }
  try {
    parsed = JSON.parse(await readFile(saPath!, "utf8"))
  } catch (err) {
    throw new WalletNotConfiguredError("google", [
      `unreadable or malformed service account JSON (${(err as NodeJS.ErrnoException).code ?? "parse error"})`,
    ])
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new WalletNotConfiguredError("google", [
      "service account JSON missing client_email or private_key",
    ])
  }

  return { clientEmail: parsed.client_email, privateKey: parsed.private_key, issuerId: issuerId! }
}

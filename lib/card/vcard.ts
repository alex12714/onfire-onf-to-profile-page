/**
 * vCard 3.0 renderer (RFC 2426).
 *
 * 3.0 rather than 4.0 because iOS Contacts, Android Contacts and Outlook all
 * import 3.0 without argument, whereas 4.0 support is still patchy.
 *
 * Two details here are the usual source of mojibake and must not be "tidied":
 *
 *  1. Folding is done on UTF-8 OCTETS, not on JS string indices. RFC 2426 caps
 *     a line at 75 octets, and a JS `.slice(0, 75)` counts UTF-16 code units —
 *     so an accented name folds in the wrong place and an emoji (a surrogate
 *     pair, 4 octets) can be cut in half, which is exactly what produces the
 *     "" a user sees in Contacts. `foldLine` backs off any split that would
 *     land inside a multi-byte sequence.
 *  2. The charset is declared by the HTTP Content-Type (`text/vcard;
 *     charset=utf-8`), which is what RFC 2426 specifies. Per-property
 *     `CHARSET=UTF-8` parameters are a vCard 2.1 idiom and are not emitted.
 */

import type { CardModel } from "./model"

/** RFC 2426 §2: the value delimiters, plus the escape character itself. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

/**
 * Fold to <=75 octets per line, continuation lines prefixed with one space.
 * The split point is walked back off any UTF-8 continuation byte (0b10xxxxxx)
 * so a multi-byte codepoint is never severed.
 */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8")
  if (bytes.length <= 75) return line

  const parts: string[] = []
  let start = 0
  // The first line may use all 75 octets; every continuation spends one on the
  // leading space that marks it as a continuation.
  let limit = 75

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    while (end > start + 1 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--
    }
    parts.push((parts.length === 0 ? "" : " ") + bytes.subarray(start, end).toString("utf8"))
    start = end
    limit = 74
  }

  return parts.join("\r\n")
}

/** One `NAME[;PARAMS]:VALUE` line, escaped and folded. */
function line(name: string, value: string, params?: Record<string, string>): string | null {
  const v = escapeText(value).trim()
  if (!v) return null
  const p = params
    ? Object.entries(params)
        .map(([k, val]) => `;${k}=${val}`)
        .join("")
    : ""
  return foldLine(`${name}${p}:${v}`)
}

/** vCard TEL/EMAIL type parameters are uppercase in 3.0. */
function typeParam(type: string, fallback: string): Record<string, string> {
  const t = (type || fallback).toUpperCase().replace(/[^A-Z,]/g, "")
  return { TYPE: t || fallback }
}

export function renderVCard(card: CardModel): string {
  const out: (string | null)[] = []

  out.push("BEGIN:VCARD")
  out.push("VERSION:3.0")
  out.push("PRODID:-//OnFire//Contact Card//EN")

  // A stable identity for the contact record. Keyed to the uuid, so re-importing
  // after the user changes their handle updates the existing card in Contacts
  // instead of creating a duplicate person.
  out.push(line("UID", `urn:uuid:${card.uid}`))

  // N is structured and REQUIRED in 3.0: Family;Given;Additional;Prefix;Suffix.
  // Its components are escaped individually — escaping the joined string would
  // turn the structural semicolons into literal ones.
  const n = [card.name.last ?? "", card.name.first ?? "", card.name.middle ?? "", "", ""]
    .map((part) => escapeText(part))
    .join(";")
  out.push(foldLine(`N:${n}`))
  out.push(line("FN", card.name.full))

  out.push(line("NICKNAME", card.handle))
  if (card.org.company) out.push(line("ORG", card.org.company))
  if (card.org.title) out.push(line("TITLE", card.org.title))

  for (const tel of card.phones) {
    out.push(line("TEL", tel.value, typeParam(tel.type, "CELL")))
  }
  for (const mail of card.emails) {
    out.push(line("EMAIL", mail.value, typeParam(mail.type, "INTERNET")))
  }
  for (const url of card.urls) {
    out.push(line("URL", url.value))
  }

  // ADR is structured: PO;Ext;Street;Locality;Region;Postcode;Country. We only
  // ever hold a free-text location, so it goes in the locality slot and the
  // rest stay empty rather than being guessed at.
  if (card.locality) {
    out.push(foldLine(`ADR;TYPE=WORK:;;;${escapeText(card.locality)};;;`))
  }

  if (card.avatarUrl) out.push(foldLine(`PHOTO;VALUE=URI:${escapeText(card.avatarUrl)}`))
  if (card.note) out.push(line("NOTE", card.note))

  // X-SOCIALPROFILE is an Apple extension; iOS Contacts renders it as a tappable
  // row. Harmless everywhere else.
  out.push(foldLine(`X-SOCIALPROFILE;TYPE=onfire:${escapeText(card.profileUrl)}`))

  if (card.updatedAt) {
    const rev = new Date(card.updatedAt)
    if (!Number.isNaN(rev.getTime())) {
      out.push(`REV:${rev.toISOString().replace(/\.\d{3}Z$/, "Z")}`)
    }
  }

  out.push("END:VCARD")

  // CRLF throughout, including a trailing one — RFC 2426 lines are CRLF
  // terminated, and some Windows importers reject a file whose last line is not.
  return out.filter((l): l is string => l !== null).join("\r\n") + "\r\n"
}

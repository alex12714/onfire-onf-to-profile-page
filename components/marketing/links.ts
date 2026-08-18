/**
 * Every outbound link the landing page uses, in one place.
 *
 * Both were checked live before shipping. Deliberately absent: App Store and
 * Google Play buttons — OnFire Messenger is not publicly listed on either store
 * yet (`itunes.apple.com/lookup?id=6504518754` returns zero results and the
 * Play listing 404s), and a store badge that dead-ends is worse than no badge.
 * Add them here, and to `CtaBand`, once the listings are live.
 */

/** OnFire's marketing site — the "get the app" destination. */
export const ONFIRE_SITE = 'https://onfire.so'

/** The OnFire web app. Real, live, and usable without installing anything. */
export const ONFIRE_WEB_APP = 'https://app2.onfire.so'

/** In-app path where short links and their QR codes are created. */
export const APP_PATH = 'My Business → QR Codes'

export const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
]

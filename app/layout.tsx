import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

/**
 * Display face for the marketing landing page, matching the rest of the OnFire
 * web estate (calendar-web, events-web).
 *
 * Exposed as a CSS variable and applied through the `font-display` Tailwind
 * utility on the landing page alone — the `<body>` keeps Inter, so the
 * `/[handle]` profile pages render exactly as they always have.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
})

/**
 * Root defaults only. Every route under `/[handle]` supplies its own title,
 * description and Open Graph card from `generateMetadata`, and `/` supplies
 * its own in `app/page.tsx`, so nothing here leaks into a profile's share card.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://onf.to"),
  title: "OnFire",
  description:
    "OnFire short links, QR codes and public profiles at onf.to.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { LandingNav } from '@/components/marketing/LandingNav'
import { Hero } from '@/components/marketing/Hero'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Repoint } from '@/components/marketing/Repoint'
import { Faq } from '@/components/marketing/Faq'
import { CtaBand } from '@/components/marketing/CtaBand'
import { LandingFooter } from '@/components/marketing/LandingFooter'
import { ROOT_ID, THEME_SCRIPT } from '@/components/marketing/theme'

const TITLE = 'onf.to — short links & QR codes by OnFire'
const DESCRIPTION =
  'Shorten any link to onf.to, get a QR code with it, and change where it points long after the poster is printed. Made in the OnFire app.'

/**
 * Metadata is declared here rather than in the root layout because the root
 * layout is shared with `/[handle]` and its product, service and checkout
 * children, which build their own per-profile tags in `generateMetadata`.
 * Page-level metadata keeps this page's Open Graph card off theirs.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://onf.to' },
  openGraph: {
    type: 'website',
    url: 'https://onf.to',
    siteName: 'onf.to',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: 'https://onf.to/og-onf-to.png',
        width: 1200,
        height: 630,
        alt: 'onf.to — print it once, point it anywhere',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://onf.to/og-onf-to.png'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#FF6B1F',
}

/**
 * Mirrors the visible FAQ section one-for-one. Structured data that promises
 * more than the page shows is worse than none.
 */
const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    [
      'Can I create a link on this page?',
      'No. onf.to links are made inside the OnFire app, under My Business → QR Codes. This page is the front door, not the workshop.',
    ],
    [
      'Does someone need OnFire to open a link I share?',
      'No. An onf.to address opens in any browser and its QR code scans with any phone camera. Only making links needs the app.',
    ],
    [
      'What does a link actually look like?',
      'onf.to/ab3xk9r by default: seven characters drawn from an alphabet with the confusable ones removed. You can also claim your own, such as onf.to/my-shop.',
    ],
    [
      'Can I change where a link goes after it is printed?',
      'Yes, as often as you like. Editing a link changes its destination immediately; the code itself stays the same, so anything already printed keeps working.',
    ],
    [
      'What happens if I delete a link?',
      'It stops resolving, and anyone who scans it lands on an error. If the code is already out in the world, re-point it instead of deleting it.',
    ],
    [
      'Is it free?',
      'Links with an auto-generated code are unlimited on every plan. Custom links are limited on the free plan; premium removes the cap.',
    ],
  ].map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function HomePage() {
  return (
    <div
      id={ROOT_ID}
      className="font-display min-h-screen bg-white antialiased dark:bg-[#0B0B0C]"
      suppressHydrationWarning
    >
      {/*
        Runs during parse, before first paint, so the chosen theme is painted
        once instead of flashing light and correcting. It must stay the first
        child: it looks the root element up by id, which only exists from here.
      */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#FF6B1F] focus:px-5 focus:py-3 focus:text-[14px] focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      <LandingNav />

      <main id="main">
        <Hero />
        <HowItWorks />
        <Features />
        <Repoint />
        <Faq />
        <CtaBand />
      </main>

      <LandingFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
    </div>
  )
}

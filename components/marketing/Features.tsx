import type { ComponentType } from 'react'
import { Reveal } from './Reveal'
import { QrMark } from './QrMark'
import {
  ChartIcon,
  LinkIcon,
  PhoneIcon,
  QrIcon,
  RepointIcon,
  TagIcon,
} from './marketing-icons'
import { APP_PATH } from './links'

interface Feature {
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  /** Tailwind classes for the icon tile background. */
  tile: string
  /** Accent colour for the icon glyph. */
  glyph: string
}

const FEATURES: Feature[] = [
  {
    icon: QrIcon,
    title: 'A QR code with every link',
    body: 'Shorten a link and its QR code comes with it. Share it in a chat, or save it as an image for a poster, a menu, a business card or a shop window.',
    tile: 'bg-[#FFF3EA] dark:bg-[#FF6B1F]/15',
    glyph: 'text-[#B8480C] dark:text-[#FF6B1F]',
  },
  {
    icon: RepointIcon,
    title: 'Re-point it after you print',
    body: 'Send an existing code somewhere new whenever you want. Flyers, stickers and packaging already out in the world quietly follow along.',
    tile: 'bg-[#FFF8E7] dark:bg-[#FFCE54]/15',
    glyph: 'text-[#8A6500] dark:text-[#FFCE54]',
  },
  {
    icon: TagIcon,
    title: 'Claim a link worth reading out',
    body: 'onf.to/my-shop instead of a random code — the kind of link that survives being said out loud. Free plans include a custom link; premium unlocks as many as you like.',
    tile: 'bg-[#F3EDFE] dark:bg-[#7C3AED]/15',
    glyph: 'text-[#7C3AED]',
  },
  {
    icon: ChartIcon,
    title: 'Count the scans',
    body: 'Each link keeps a running scan count, so you can tell the poster that pulls its weight from the one nobody looks at.',
    tile: 'bg-[#EAF1FE] dark:bg-[#2D71EC]/15',
    glyph: 'text-[#2D71EC]',
  },
  {
    icon: LinkIcon,
    title: 'Point it at anything',
    body: 'Your OnFire profile, a product, a service, a booking page — or any address on the open web. If it has a URL, it can have an onf.to link.',
    tile: 'bg-[#E9F8EF] dark:bg-[#16A34A]/15',
    glyph: 'text-[#16A34A]',
  },
  {
    icon: PhoneIcon,
    title: 'No second dashboard',
    body: `Links are made and managed inside OnFire, under ${APP_PATH}, next to the business they belong to. Nothing else to sign up for.`,
    tile: 'bg-[#FFEEF0] dark:bg-[#FF3B30]/15',
    glyph: 'text-[#FF3B30]',
  },
]

/**
 * Feature bento. An oversized brand panel leads, followed by six feature
 * blocks — the same block-based grid the OnFire Calendar landing page uses,
 * with the photography swapped for the product's own artefact: a QR code.
 */
export function Features() {
  return (
    <section
      id="features"
      className="bg-[#FAF8F5] py-24 dark:bg-[#0B0B0C] sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#B8480C] dark:text-[#FF6B1F]">
            What you get
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#222222] dark:text-white sm:text-[2.7rem]">
            A short link that keeps its promises.
          </h2>
          <p className="mt-4 max-w-[54ch] text-[1.05rem] leading-relaxed text-[#707781] dark:text-[#9BA3AF]">
            Small enough to print, stable enough to trust, and editable long
            after the ink has dried.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Oversized brand panel */}
          <Reveal className="md:col-span-1 md:row-span-2">
            <div className="relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-[26px] bg-[#120D0A] p-7 text-white">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(75% 55% at 20% 100%, rgba(255,107,31,0.45) 0%, rgba(255,107,31,0) 70%), radial-gradient(60% 40% at 90% 0%, rgba(255,206,84,0.22) 0%, rgba(255,206,84,0) 70%)',
                }}
              />
              <div className="absolute -right-8 -top-8 w-40 opacity-[0.10] sm:w-48">
                <QrMark
                  className="h-auto w-full"
                  color="#ffffff"
                  plate="transparent"
                />
              </div>
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFCE54]" />
                  Built for print
                </span>
                <p className="mt-4 text-[1.5rem] font-extrabold leading-tight tracking-[-0.02em]">
                  Seven characters, no lookalikes.
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/75">
                  Auto-generated codes skip the characters people misread —
                  no 0 against O, no 1 against l. Read one off a poster and you
                  land in the right place first time.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Feature blocks */}
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={i * 60}>
                <div className="group h-full rounded-[22px] border border-black/[0.05] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF6B1F]/30 hover:shadow-[0_24px_50px_-24px_rgba(255,107,31,0.35)] dark:border-white/[0.06] dark:bg-[#141416]">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${f.tile}`}
                  >
                    <Icon className={`h-6 w-6 ${f.glyph}`} />
                  </div>
                  <h3 className="mt-5 text-[1.15rem] font-bold tracking-[-0.01em] text-[#222222] dark:text-white">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#707781] dark:text-[#9BA3AF]">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

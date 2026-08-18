import { Reveal } from './Reveal'
import { ArrowRightIcon } from './marketing-icons'
import { ONFIRE_SITE, ONFIRE_WEB_APP } from './links'

/**
 * Closing CTA on the orange→yellow brand gradient — the same treatment that
 * closes the OnFire Calendar landing page.
 *
 * Two real destinations and no store badges: OnFire Messenger is not publicly
 * listed on the App Store or Google Play yet, so a badge here would be a link
 * to nowhere. The web app, on the other hand, is live today.
 */
export function CtaBand() {
  return (
    <section className="bg-white px-5 py-20 dark:bg-[#111113] sm:px-8 sm:py-24">
      <Reveal className="mx-auto max-w-7xl">
        <div
          className="relative isolate overflow-hidden rounded-[32px] px-7 py-16 text-center sm:px-12 sm:py-20"
          style={{
            background:
              'linear-gradient(120deg, #FF6B1F 0%, #FF8A3D 55%, #FFCE54 130%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                'radial-gradient(45% 60% at 15% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%), radial-gradient(40% 55% at 90% 90%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)',
            }}
          />
          <h2 className="mx-auto max-w-[20ch] text-[2.3rem] font-extrabold leading-[1.05] tracking-[-0.02em] text-white sm:text-[3.1rem]">
            Give your next poster a link you can change.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[1.08rem] font-medium leading-relaxed text-white/90">
            Short links and QR codes come with OnFire, alongside your profile,
            products, services and bookings. Nothing extra to sign up for.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={ONFIRE_SITE}
              className="group inline-flex items-center gap-2 rounded-full bg-[#222222] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get OnFire
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href={ONFIRE_WEB_APP}
              className="inline-flex items-center rounded-full border border-white/50 bg-white/10 px-7 py-3.5 text-[15px] font-bold text-white backdrop-blur transition-colors duration-200 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open it in your browser
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

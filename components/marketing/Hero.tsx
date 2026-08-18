import { QrMark } from './QrMark'
import {
  ArrowRightIcon,
  CheckIcon,
  RepointIcon,
  ShareIcon,
} from './marketing-icons'
import { APP_PATH, ONFIRE_SITE } from './links'

const PROOF = [
  'Works with any link',
  'A QR code with every one',
  'Nothing to install to open one',
]

/**
 * Hero. Left: the promise, on a warm dark backdrop with the orange→yellow brand
 * glows used across the OnFire web estate. Right: a product collage built
 * around a real, scannable QR code, with the destination visibly swapped
 * underneath it — the whole pitch in one picture.
 *
 * Server component: the entrance is pure CSS animation, reduced-motion aware.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-[#120D0A] text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(58% 52% at 80% 12%, rgba(255,107,31,0.34) 0%, rgba(255,107,31,0) 60%), radial-gradient(46% 46% at 8% 90%, rgba(255,206,84,0.18) 0%, rgba(255,206,84,0) 65%), linear-gradient(180deg, #17100A 0%, #100B08 100%)',
        }}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-28 sm:px-8 lg:min-h-[92dvh] lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-24">
        {/* Copy */}
        <div className="lg:col-span-6">
          <span
            className="of-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 backdrop-blur"
            style={{ animationDelay: '0ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B1F]" />
            Short links &amp; QR codes by OnFire
          </span>

          <h1
            className="of-fade-up mt-6 max-w-[15ch] text-[2.75rem] font-extrabold leading-[1.03] tracking-[-0.03em] sm:text-6xl lg:text-[4.2rem]"
            style={{ animationDelay: '80ms' }}
          >
            Print it once.{' '}
            <span className="bg-gradient-to-r from-[#FF6B1F] to-[#FFCE54] bg-clip-text text-transparent">
              Point it anywhere.
            </span>
          </h1>

          <p
            className="of-fade-up mt-6 max-w-[50ch] text-[1.08rem] leading-relaxed text-white/70"
            style={{ animationDelay: '160ms' }}
          >
            Every link you shorten with OnFire gets an <strong className="font-semibold text-white/90">onf.to</strong> address
            and a QR code to go with it. Change where it lands whenever you
            like — the poster you already printed keeps working.
          </p>

          <div
            className="of-fade-up mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '240ms' }}
          >
            <a
              href={ONFIRE_SITE}
              className="group inline-flex items-center gap-2 rounded-full bg-[#FF6B1F] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_36px_-10px_rgba(255,107,31,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e55c14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get OnFire
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-[15px] font-bold text-white/90 backdrop-blur transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              See how it works
            </a>
          </div>

          <p
            className="of-fade-up mt-5 text-[13.5px] text-white/45"
            style={{ animationDelay: '280ms' }}
          >
            Already have the app? Links live under{' '}
            <span className="font-semibold text-white/70">{APP_PATH}</span>.
          </p>

          <ul
            className="of-fade-up mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-white/60"
            style={{ animationDelay: '320ms' }}
          >
            {PROOF.map((f) => (
              <li key={f} className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-[#FFCE54]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Product collage */}
        <div className="lg:col-span-6">
          <div className="relative mx-auto w-full max-w-[440px] px-2 sm:px-0">
            {/* The card */}
            <div
              className="of-fade-up relative rounded-[26px] border border-white/[0.06] bg-white p-6 text-[#222222] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] sm:p-7"
              style={{ animationDelay: '180ms' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold leading-tight">
                    Aroma Coffee — table card
                  </p>
                  <p className="mt-1 font-mono text-[13px] font-semibold text-[#B8480C]">
                    onf.to/aroma
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3EA] text-[#C4520F]">
                  <ShareIcon className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-5 rounded-[18px] bg-[#F6F4F1] p-4">
                <QrMark className="mx-auto block h-auto w-full max-w-[220px]" />
              </div>

              <div className="mt-5 border-t border-black/[0.07] pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#707781]">
                  Destination
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold">
                  <s className="text-[#A2A7AE] decoration-[#A2A7AE]/70">
                    Summer menu
                  </s>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-[#707781]" />
                  <span className="text-[#222222]">Autumn menu</span>
                </p>
              </div>
            </div>

            {/* Floating chips */}
            <div
              className="of-float absolute -right-2 top-8 flex items-center gap-2 rounded-full bg-[#FFCE54] px-3.5 py-2 text-[12.5px] font-bold text-[#3A2A00] shadow-xl sm:-right-5"
              style={{ animationDelay: '0.6s' }}
            >
              <RepointIcon className="h-4 w-4" />
              Same code
            </div>
            <div
              className="of-float absolute -bottom-5 left-2 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#222222] shadow-xl sm:-left-5"
              style={{ animationDelay: '1.4s' }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E9F8EF] text-[#16A34A]">
                <CheckIcon className="h-3 w-3" />
              </span>
              New destination
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

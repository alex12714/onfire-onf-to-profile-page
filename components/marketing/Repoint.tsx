import { Reveal } from './Reveal'
import { PrinterIcon, RepointIcon } from './marketing-icons'

/** One code, three destinations, in the order a small business actually uses it. */
const TIMELINE = [
  { when: 'March', where: 'Spring tasting menu', current: false },
  { when: 'July', where: 'Summer opening hours', current: false },
  { when: 'Today', where: 'Autumn menu & bookings', current: true },
]

/**
 * Spotlight on the feature that actually separates this from a plain
 * shortener: a printed code whose destination is still editable. Given a full
 * section because it is the one thing worth changing a habit for.
 */
export function Repoint() {
  return (
    <section className="relative isolate overflow-hidden bg-[#120D0A] py-24 text-white sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 60% at 12% 10%, rgba(255,107,31,0.28) 0%, rgba(255,107,31,0) 65%), radial-gradient(45% 55% at 88% 90%, rgba(255,206,84,0.16) 0%, rgba(255,206,84,0) 65%)',
        }}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 backdrop-blur">
            <PrinterIcon className="h-4 w-4 text-[#FFCE54]" />
            The reason to bother
          </span>
          <h2 className="mt-6 max-w-[18ch] text-[2.1rem] font-extrabold leading-[1.06] tracking-[-0.02em] sm:text-[2.7rem]">
            The poster outlives the promotion.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[1.05rem] leading-relaxed text-white/70">
            A printed QR code is a promise you have to keep for years. Point it
            straight at a page and you are stuck with that page — or with a
            recycling bin full of flyers.
          </p>
          <p className="mt-4 max-w-[52ch] text-[1.05rem] leading-relaxed text-white/70">
            An onf.to link sits in between. Rename it, send it somewhere else,
            do it again next season: every card, menu and window sticker you
            have ever handed out follows without being reprinted.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B1F]">
                <RepointIcon className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="font-mono text-[14px] font-bold text-[#FFCE54]">
                  onf.to/aroma
                </p>
                <p className="text-[12.5px] text-white/50">
                  Printed once, in March.
                </p>
              </div>
            </div>

            <ol className="mt-6 space-y-5">
              {TIMELINE.map((t) => (
                <li key={t.when} className="flex items-start gap-4">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      t.current ? 'bg-[#FFCE54]' : 'bg-white/25'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/40">
                      {t.when}
                    </p>
                    <p
                      className={`mt-0.5 text-[15px] font-semibold ${
                        t.current ? 'text-white' : 'text-white/55'
                      }`}
                    >
                      {t.where}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-7 rounded-2xl bg-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/60">
              Same seven characters throughout. Nobody had to reprint anything.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

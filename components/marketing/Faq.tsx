import type { ReactNode } from 'react'
import { Reveal } from './Reveal'
import { PlusIcon } from './marketing-icons'
import { APP_PATH } from './links'

interface Entry {
  q: string
  a: ReactNode
}

/**
 * Honest answers, including to the question this page invites by existing:
 * no, you cannot make a link here. Better to say so plainly than to leave
 * someone scrolling for a form.
 */
const ENTRIES: Entry[] = [
  {
    q: 'Can I create a link on this page?',
    a: (
      <>
        No. onf.to links are made inside the OnFire app, under{' '}
        <strong className="font-semibold text-[#222222] dark:text-white">
          {APP_PATH}
        </strong>
        . This page is the front door, not the workshop — there is no web form
        here, and we would rather tell you than let you hunt for one.
      </>
    ),
  },
  {
    q: 'Does someone need OnFire to open a link I share?',
    a: (
      <>
        No. An onf.to address opens in any browser and its QR code scans with
        any phone camera. Only <em>making</em> links needs the app.
      </>
    ),
  },
  {
    q: 'What does a link actually look like?',
    a: (
      <>
        <span className="font-mono">onf.to/ab3xk9r</span> by default: seven
        characters drawn from an alphabet with the confusable ones removed, so
        reading it off a printed poster gets you to the right place. Or claim
        your own — <span className="font-mono">onf.to/my-shop</span> — between
        three and thirty-two characters, lowercase letters, numbers and single
        hyphens.
      </>
    ),
  },
  {
    q: 'Can I change where a link goes after it is printed?',
    a: (
      <>
        Yes, as often as you like. Editing a link changes its destination
        immediately; the code itself stays exactly as it was, so anything
        already printed keeps working.
      </>
    ),
  },
  {
    q: 'What happens if I delete a link?',
    a: (
      <>
        It stops resolving, and anyone who scans it lands on an error. If the
        code is already out in the world, re-point it somewhere useful instead
        of deleting it.
      </>
    ),
  },
  {
    q: 'Is it free?',
    a: (
      <>
        Links with an auto-generated code are unlimited on every plan. Custom
        links like <span className="font-mono">onf.to/my-shop</span> are limited
        on the free plan; premium removes the cap.
      </>
    ),
  },
]

export function Faq() {
  return (
    <section
      id="faq"
      className="bg-[#FAF8F5] py-24 dark:bg-[#0B0B0C] sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#B8480C] dark:text-[#FF6B1F]">
            Questions
          </p>
          <h2 className="mt-3 text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#222222] dark:text-white sm:text-[2.7rem]">
            The bits worth knowing.
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.q} delay={i * 50}>
              <details className="group rounded-[20px] border border-black/[0.06] bg-white transition-colors duration-200 hover:border-[#FF6B1F]/30 dark:border-white/[0.07] dark:bg-[#141416]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[20px] px-6 py-5 text-[15.5px] font-bold text-[#222222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8480C] dark:text-white">
                  {e.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF3EA] text-[#B8480C] transition-transform duration-300 group-open:rotate-45 dark:bg-[#FF6B1F]/15 dark:text-[#FF6B1F]">
                    <PlusIcon className="h-4 w-4" />
                  </span>
                </summary>
                <div className="px-6 pb-6 text-[14.5px] leading-relaxed text-[#707781] dark:text-[#9BA3AF]">
                  {e.a}
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

import type { ComponentType, ReactNode } from 'react'
import { Reveal } from './Reveal'
import { LinkIcon, PlusIcon, ShareIcon } from './marketing-icons'
import { APP_PATH } from './links'

interface Step {
  n: string
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  /** A small in-app artefact that makes the step concrete. */
  artifact: ReactNode
}

/** Shared shell for the little faux-UI strip at the foot of each step card. */
function Artifact({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="mt-6 rounded-[16px] border border-black/[0.06] bg-white p-3.5 dark:border-white/[0.07] dark:bg-[#1B1B1E]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#9AA0A8] dark:text-[#6B7078]">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

const STEPS: Step[] = [
  {
    n: '01',
    icon: PlusIcon,
    title: 'Create it in the app',
    body: `Open ${APP_PATH} and tap Create. Give it a name you will still recognise in six months — "Front window", "Autumn flyer".`,
    artifact: (
      <Artifact label="Title">
        <p className="text-[14px] font-semibold text-[#222222] dark:text-white">
          Front window
        </p>
      </Artifact>
    ),
  },
  {
    n: '02',
    icon: LinkIcon,
    title: 'Say where it goes',
    body: 'Paste any address, or pick your OnFire profile in one tap. Leave the code to us, or claim your own while you are there.',
    artifact: (
      <Artifact label="Destination link">
        <p className="truncate font-mono text-[13px] text-[#222222] dark:text-white">
          https://aromacoffee.example/menu
        </p>
      </Artifact>
    ),
  },
  {
    n: '03',
    icon: ShareIcon,
    title: 'Share it, or print it',
    body: 'Copy the onf.to link, send the QR code straight into a chat, or save it as an image and hand it to whoever does your printing.',
    artifact: (
      <Artifact label="Your short link">
        <p className="font-mono text-[13px] font-semibold text-[#B8480C] dark:text-[#FF6B1F]">
          onf.to/aroma
        </p>
      </Artifact>
    ),
  },
]

/**
 * Three-step "how it works" band. Deliberately explicit that every step happens
 * inside the OnFire app — there is no way to make a link on this website, and
 * the page should never leave anyone hunting for a form that does not exist.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-white py-24 dark:bg-[#111113] sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#B8480C] dark:text-[#FF6B1F]">
            How it works
          </p>
          <h2 className="mt-3 text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#222222] dark:text-white sm:text-[2.7rem]">
            Three taps from long link to poster.
          </h2>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-[#707781] dark:text-[#9BA3AF]">
            All of it happens in the OnFire app — there is nothing to set up
            here, and no separate account to keep track of.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.n} delay={i * 90}>
                <div className="flex h-full flex-col rounded-[26px] border border-black/[0.05] bg-[#FAF8F5] p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-28px_rgba(0,0,0,0.22)] dark:border-white/[0.06] dark:bg-[#161618]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B1F] text-[15px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(255,107,31,0.9)]">
                      {s.n}
                    </span>
                    <Icon className="h-5 w-5 text-[#B8480C] dark:text-[#FF6B1F]" />
                  </div>
                  <h3 className="mt-5 text-[1.2rem] font-bold tracking-[-0.01em] text-[#222222] dark:text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#707781] dark:text-[#9BA3AF]">
                    {s.body}
                  </p>
                  <div className="mt-auto">{s.artifact}</div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

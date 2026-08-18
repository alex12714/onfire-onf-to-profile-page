import { FlameLogo } from '@/components/icons'
import { ArrowRightIcon } from './marketing-icons'
import { NAV_LINKS, ONFIRE_SITE, ONFIRE_WEB_APP } from './links'

const ONFIRE_LINKS = [
  { href: ONFIRE_SITE, label: 'OnFire app' },
  { href: ONFIRE_WEB_APP, label: 'OnFire on the web' },
]

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#0B0B0C] text-[#9BA3AF]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Brand + CTA */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <FlameLogo size={28} />
              <span className="text-[15px] font-bold text-white">
                OnFire <span className="text-[#FF6B1F]">onf.to</span>
              </span>
            </div>
            <p className="mt-4 max-w-[38ch] text-[0.97rem] leading-relaxed text-[#8A8F98]">
              Short links and QR codes you can re-point after they are printed —
              part of the all-in-one OnFire app.
            </p>
            <a
              href={ONFIRE_SITE}
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF6B1F] px-5 py-2.5 text-[13.5px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e55c14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Get OnFire
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-4">
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B7078]">
                This page
              </h2>
              <ul className="mt-4 space-y-2.5">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="rounded text-[0.95rem] text-[#9BA3AF] transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8480C]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B7078]">
                OnFire
              </h2>
              <ul className="mt-4 space-y-2.5">
                {ONFIRE_LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="rounded text-[0.95rem] text-[#9BA3AF] transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8480C]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Visitor pointer */}
          <div className="lg:col-span-3">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B7078]">
              Given an onf.to link?
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-[#8A8F98]">
              Just open it. onf.to/&#8203;<span className="font-mono">code</span>{' '}
              takes you straight to wherever it points — no app, no account,
              nothing to install.
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-white/[0.08] pt-8">
          <p className="text-[12.5px] text-[#5B5F66]">
            © {year} OnFire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { FlameLogo } from '@/components/icons'
import { ArrowRightIcon } from './marketing-icons'
import { ThemeToggle } from './ThemeToggle'
import { NAV_LINKS, ONFIRE_SITE } from './links'

/**
 * Marketing navigation. Floating and transparent over the dark hero, then
 * condensing into a frosted bar once the visitor scrolls past the fold —
 * the same behaviour as the OnFire Calendar landing page.
 *
 * Collapses to logo + theme toggle + CTA on small screens; the section links
 * stay reachable from the footer.
 */
export function LandingNav() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? 'border-b border-black/[0.06] bg-[#FAF8F5]/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B0B0C]/80'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8"
      >
        <a
          href="#top"
          aria-label="onf.to home"
          className="flex shrink-0 items-center gap-2.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8480C]"
        >
          <FlameLogo size={28} />
          <span
            className={`text-[15px] font-bold tracking-tight transition-colors duration-200 ${
              solid ? 'text-[#1A1A1A] dark:text-white' : 'text-white'
            }`}
          >
            OnFire{' '}
            <span className={solid ? 'text-[#B8480C] dark:text-[#FF6B1F]' : 'text-[#FF6B1F]'}>
              onf.to
            </span>
          </span>
        </a>

        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded text-[13.5px] font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8480C] ${
                solid
                  ? 'text-[#5B5B5B] hover:text-[#B8480C] dark:text-[#A4A4AC] dark:hover:text-[#FF6B1F]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0">
          <ThemeToggle solid={solid} />
          <a
            href={ONFIRE_SITE}
            className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13.5px] font-bold transition-all duration-200 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8480C] ${
              solid
                ? 'bg-[#FF6B1F] text-white shadow-[0_6px_18px_-6px_rgba(255,107,31,0.6)] hover:bg-[#e55c14]'
                : 'bg-white text-[#1A1A1A] hover:bg-white/90'
            }`}
          >
            Get OnFire
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>
      </nav>
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ROOT_ID, STORAGE_KEY } from './theme'

/**
 * Light/dark switch for the landing page.
 *
 * Reads its initial value from the DOM rather than from state, because the
 * inline theme script has already decided and applied it before React hydrates
 * — asking the DOM is the only way to stay in step with that decision.
 */
export function ThemeToggle({ solid }: { solid: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(
      document.getElementById(ROOT_ID)?.classList.contains('dark') ?? false,
    )
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.getElementById(ROOT_ID)?.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      /* storage may be unavailable; the toggle still works for this visit */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8480C] ${
        solid
          ? 'border-black/10 bg-white/70 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10'
          : 'border-white/25 bg-white/10 backdrop-blur hover:bg-white/20'
      }`}
    >
      {dark ? (
        <svg
          className="h-4 w-4 text-[#FFCE54]"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm7-5a1 1 0 0 1 1-1h1a1 1 0 1 1 0 2h-1a1 1 0 0 1-1-1zM3 11a1 1 0 0 1 1 1H3a1 1 0 0 1 0-2h1a1 1 0 0 1-1 1zM5.636 5.636a1 1 0 0 1 1.414 0l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414zm12.728 0a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM5.636 18.364a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0zm12.728 0a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414z" />
        </svg>
      ) : (
        <svg
          className={`h-4 w-4 ${solid ? 'text-[#707781]' : 'text-white'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      )}
    </button>
  )
}

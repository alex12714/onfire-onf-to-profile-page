/**
 * Inline SVG icon set for the onf.to marketing page.
 *
 * Hand-rolled rather than pulled from `lucide-react` so the landing page ships
 * only the handful of glyphs it actually draws — the icons are decorative and
 * always sit beside a text label, so every one is `aria-hidden`.
 */

type IconProps = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" />
    </svg>
  )
}

export function RepointIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 11a8 8 0 0 0-14.06-4.5M4 13a8 8 0 0 0 14.06 4.5" />
      <path d="M20 5v6h-6M4 19v-6h6" />
    </svg>
  )
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.83 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.58l7.2 7.2a2 2 0 0 1 0 2.82Z" />
      <circle cx="7.6" cy="7.6" r="1.4" />
    </svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 20h18" />
      <rect x="5" y="12" width="3.6" height="5" rx="1" />
      <rect x="10.2" y="8" width="3.6" height="9" rx="1" />
      <rect x="15.4" y="4" width="3.6" height="13" rx="1" />
    </svg>
  )
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10.5 13.5a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1.3 1.3" />
      <path d="M13.5 10.5a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 1 0 5.66 5.66l1.3-1.3" />
    </svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 5.6h3M11 18.4h2" />
    </svg>
  )
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </svg>
  )
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 9V3.5h10V9" />
      <path d="M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
      <rect x="7" y="14.5" width="10" height="6" rx="1.5" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15V3.5M8.5 7 12 3.5 15.5 7" />
      <path d="M5 13v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13" />
    </svg>
  )
}

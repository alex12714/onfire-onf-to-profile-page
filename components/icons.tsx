// Shared OnFire brand mark used across the onf.to marketing surface.
// Mirrors the mark used on the other OnFire web properties (calendar-web,
// events-web) so onf.to reads as part of the same family.

type FlameLogoProps = {
  size?: number
  className?: string
}

/**
 * OnFire flame logo — a rounded orange tile with a two-tone flame.
 */
export function FlameLogo({ size = 28, className }: FlameLogoProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        height: size,
        width: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #FF6B1F 0%, #FF8A3D 100%)',
        boxShadow: '0 6px 16px -6px rgba(255,107,31,0.7)',
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 36 36"
        fill="none"
      >
        <path
          d="M18 4C18 4 10 12 10 20C10 24.418 13.582 28 18 28C22.418 28 26 24.418 26 20C26 12 18 4 18 4Z"
          fill="white"
        />
        <path
          d="M18 16C18 16 14 20 14 23C14 25.209 15.791 27 18 27C20.209 27 22 25.209 22 23C22 20 18 16 18 16Z"
          fill="#FFCE54"
        />
      </svg>
    </span>
  )
}

'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react'

/**
 * Lightweight scroll-reveal primitive — no animation library. One
 * IntersectionObserver per element fades + rises its children into view once.
 *
 * Honours `prefers-reduced-motion`: when the user prefers reduced motion the
 * children render in their final state with no transform/opacity transition.
 * Animation is restricted to `transform` and `opacity` (GPU-friendly).
 *
 * Ported from the OnFire Calendar marketing surface so the two pages share the
 * same motion character.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as: Tag = 'div',
  amount = 0,
}: {
  children: ReactNode
  className?: string
  /** Delay in milliseconds before the transition starts. */
  delay?: number
  /** Initial translateY offset in px. */
  y?: number
  as?: ElementType
  /**
   * Fraction of the element that must be visible to trigger (0–1).
   *
   * Zero by default rather than a slice of the element: a block taller than the
   * viewport can never satisfy a percentage threshold, and would sit at
   * `opacity: 0` forever. The negative `rootMargin` below is what actually
   * delays the trigger until the element is meaningfully on screen.
   */
  amount?: number
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: amount, rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [amount])

  const style: CSSProperties = reduce
    ? {}
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  )
}

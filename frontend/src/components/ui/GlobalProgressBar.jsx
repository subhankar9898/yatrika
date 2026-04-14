import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

/**
 * Thin animated progress bar at the very top of the viewport.
 * Activates whenever React Query has in-flight requests.
 */
export default function GlobalProgressBar() {
  const isFetching = useIsFetching()
  const [width, setWidth]     = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)
  const hideRef  = useRef(null)

  useEffect(() => {
    if (isFetching > 0) {
      // Cancel any pending hide
      clearTimeout(hideRef.current)
      setVisible(true)
      setWidth(20)
      // Animate to ~85 %
      timerRef.current = setTimeout(() => setWidth(75), 100)
      timerRef.current = setTimeout(() => setWidth(90), 800)
    } else {
      // Finish the bar then fade out
      clearTimeout(timerRef.current)
      setWidth(100)
      hideRef.current = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 400)
    }
    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(hideRef.current)
    }
  }, [isFetching])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[99999] h-[3px] bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500 shadow-sm"
      style={{
        width: `${width}%`,
        transition: width === 100 ? 'width 0.2s ease-out' : 'width 0.6s ease',
      }}
    />
  )
}

import { useEffect, useRef } from 'react'
import { useSessionStore } from '../store/sessionStore'

export function useTimer({ paused = false, onExpire } = {}) {
  const timeRemaining = useSessionStore((s) => s.timeRemaining)
  const setTimeRemaining = useSessionStore((s) => s.setTimeRemaining)
  const intervalRef = useRef(null)
  // Use a ref so the interval callback always sees the latest value
  // without needing to be recreated every second
  const timeRef = useRef(timeRemaining)

  useEffect(() => {
    timeRef.current = timeRemaining
  }, [timeRemaining])

  useEffect(() => {
    if (paused) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    intervalRef.current = setInterval(() => {
      const next = timeRef.current - 1
      timeRef.current = next
      setTimeRemaining(next)
      if (next <= 0) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        onExpire?.()
      }
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [paused, setTimeRemaining, onExpire])

  const formatted = (() => {
    const total = Math.max(0, timeRemaining)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  })()

  return { timeRemaining, formatted }
}

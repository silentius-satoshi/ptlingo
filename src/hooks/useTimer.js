import { useCallback, useEffect, useRef } from 'react'
import { useSessionStore } from '../store/sessionStore'

/**
 * Wall-clock-anchored countdown.
 *
 * The previous implementation subtracted a literal 1 from the remaining
 * seconds on every setInterval tick. That is only correct if every tick
 * actually fires on schedule, and in a browser it does not. Chrome throttles
 * timers in a backgrounded tab to roughly once a second, and after five
 * minutes hidden it clamps them to roughly once a MINUTE. Every tick the
 * browser skips is a second the exam never charges. Across a 7.5-hour sitting
 * that hands back an unbounded amount of free time and quietly destroys the
 * pacing measurement the sitting exists to produce.
 *
 * This version stores an absolute expiry timestamp and derives the remaining
 * time from `deadline - Date.now()` on every tick, so skipped, coalesced, or
 * long-delayed ticks are self-correcting: the moment the tab wakes up it shows
 * the true remaining time. Machine sleep and tab suspension are charged
 * correctly too, which is what the clock at a real testing centre does.
 */

// Sub-second so a tab returning to the foreground snaps to the truth almost
// immediately rather than showing a stale value until the next whole second.
const TICK_MS = 250

export function useTimer({ paused = false, onExpire } = {}) {
  const timeRemaining    = useSessionStore((s) => s.timeRemaining)
  const setTimeRemaining = useSessionStore((s) => s.setTimeRemaining)

  const deadlineRef  = useRef(null)   // ms epoch; null while paused or stopped
  const lastWriteRef = useRef(null)   // last value THIS hook pushed to the store
  const expiredRef   = useRef(false)
  const onExpireRef  = useRef(onExpire)

  // The clock is only "armed" once it has actually been given time. The store
  // starts at 0 and is seeded asynchronously after the session loads, so
  // without this guard the very first tick would read zero and fire onExpire —
  // auto-submitting the exam the instant the page mounts.
  const armedRef = useRef(false)

  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  const anchor = useCallback((seconds) => {
    lastWriteRef.current = seconds
    deadlineRef.current  = Date.now() + seconds * 1000
    if (seconds > 0) {
      armedRef.current   = true
      expiredRef.current = false
    }
  }, [])

  // Pause / resume. Pausing drops the deadline so nothing is charged while the
  // mandatory break runs; resuming re-anchors from whatever is left.
  useEffect(() => {
    if (paused) {
      deadlineRef.current = null
      return
    }
    anchor(useSessionStore.getState().timeRemaining)
  }, [paused, anchor])

  // Re-anchor when the remaining time is written by something *other* than this
  // hook's own tick — session load, a resume from Supabase, a review-page seed.
  // Comparing against lastWriteRef is what distinguishes an external write from
  // our own, which is why the deadline never feeds back on itself.
  useEffect(() => {
    if (paused) return
    if (timeRemaining === lastWriteRef.current) return
    anchor(timeRemaining)
  }, [timeRemaining, paused, anchor])

  const tick = useCallback(() => {
    if (deadlineRef.current === null) return
    const secs = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
    if (secs !== lastWriteRef.current) {
      lastWriteRef.current = secs
      setTimeRemaining(secs)
    }
    if (secs <= 0 && armedRef.current && !expiredRef.current) {
      expiredRef.current   = true
      deadlineRef.current  = null
      onExpireRef.current?.()
    }
  }, [setTimeRemaining])

  useEffect(() => {
    if (paused) return
    tick()
    const id = setInterval(tick, TICK_MS)
    // A throttled tab can go a full minute between ticks. These fire the moment
    // it comes back so the clock never *displays* time it has already taken.
    const wake = () => tick()
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('pageshow', wake)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('pageshow', wake)
    }
  }, [paused, tick])

  const formatted = (() => {
    const total = Math.max(0, timeRemaining)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
  })()

  return { timeRemaining, formatted }
}

/**
 * Absolute expiry for the current remaining time, as an ISO string — what gets
 * written to sessions.deadline_at. Persisting the deadline rather than the
 * remaining seconds is what makes a reload or a crash mid-exam restore the
 * clock exactly, instead of rolling back to the last autosave and handing back
 * every minute since.
 */
export function deadlineFromSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(Date.now() + seconds * 1000).toISOString()
}

/**
 * Inverse of the above, used on load. A deadline already in the past means the
 * block expired while the tab was closed, which is a real zero — not a reason
 * to fall back to a stale remaining-seconds value.
 */
export function secondsFromDeadline(iso) {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.ceil((ms - Date.now()) / 1000))
}

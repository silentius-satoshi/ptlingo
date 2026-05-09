import { useState, useEffect, useRef, useCallback } from 'react'
import { unlockWithPasskey } from '../lib/webauthn'

const LS_ENABLED = 'biometric_lock_enabled'
const LS_TIMEOUT = 'biometric_lock_timeout'
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

function readEnabled() {
  try { return localStorage.getItem(LS_ENABLED) === 'true' } catch { return false }
}
function readTimeout() {
  try {
    const raw = localStorage.getItem(LS_TIMEOUT)
    const n = parseInt(raw ?? '5', 10)
    return Number.isFinite(n) && n > 0 ? n : 5
  } catch { return 5 }
}

export function useBiometricLock() {
  const [enabled, setEnabledState] = useState(readEnabled)
  const [timeoutMinutes, setTimeoutMinutesState] = useState(readTimeout)
  const [isLocked, setIsLocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState(null)
  const lastActivity = useRef(Date.now())

  const setEnabled = useCallback((val) => {
    try { localStorage.setItem(LS_ENABLED, String(val)) } catch {}
    setEnabledState(val)
    if (!val) setIsLocked(false)
  }, [])

  const setTimeoutMinutes = useCallback((val) => {
    try { localStorage.setItem(LS_TIMEOUT, String(val)) } catch {}
    setTimeoutMinutesState(val)
  }, [])

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now()
  }, [])

  useEffect(() => {
    if (!enabled) {
      setIsLocked(false)
      return
    }

    lastActivity.current = Date.now()
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))

    const ms = timeoutMinutes * 60 * 1000
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= ms) {
        setIsLocked(true)
      }
    }, 10_000)

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer))
      clearInterval(interval)
    }
  }, [enabled, timeoutMinutes, resetTimer])

  const unlock = useCallback(async () => {
    setUnlocking(true)
    setUnlockError(null)
    const { error } = await unlockWithPasskey()
    setUnlocking(false)
    if (error) {
      setUnlockError(error)
      return false
    }
    setIsLocked(false)
    lastActivity.current = Date.now()
    return true
  }, [])

  return {
    enabled,
    setEnabled,
    timeoutMinutes,
    setTimeoutMinutes,
    isLocked,
    unlock,
    unlocking,
    unlockError,
  }
}

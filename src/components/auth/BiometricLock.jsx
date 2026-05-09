import { useState } from 'react'
import { Lock, Fingerprint } from 'lucide-react'
import { useBiometricLock } from '../../hooks/useBiometricLock'
import { supabase } from '../../lib/supabase'

export default function BiometricLock({ children }) {
  const { isLocked, unlock, unlocking, unlockError } = useBiometricLock()
  const [showFallback, setShowFallback] = useState(false)

  if (!isLocked) return children

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
          <Lock className="w-9 h-9 text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">App Locked</h1>
        <p className="text-sm text-slate-400 text-center mb-8 max-w-xs">
          Your session is locked. Use your passkey to continue.
        </p>

        {unlockError && (
          <p className="text-sm text-red-400 mb-4 text-center max-w-xs">{unlockError}</p>
        )}

        <button
          onClick={unlock}
          disabled={unlocking}
          className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors mb-4"
        >
          <Fingerprint className="w-5 h-5" />
          {unlocking ? 'Verifying…' : 'Use Face ID / Touch ID'}
        </button>

        {!showFallback ? (
          <button
            onClick={() => setShowFallback(true)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Enter password instead
          </button>
        ) : (
          <div className="mt-4 text-center max-w-xs">
            <p className="text-sm text-slate-400 mb-3">
              Sign out to return to the login screen and sign in with your password.
            </p>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  )
}

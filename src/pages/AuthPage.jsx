import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Button from '../components/shared/Button'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import PasskeyLoginButton from '../components/auth/PasskeyLoginButton'
import { startConditionalPasskeyAuth } from '../lib/webauthn'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  // Conditional UI: surfaces registered passkeys as autofill suggestions
  // in the email field. Runs silently in background on mount.
  useEffect(() => {
    if (!window.PublicKeyCredential?.isConditionalMediationAvailable) return
    const controller = new AbortController()
    PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
      if (!available || controller.signal.aborted) return
      startConditionalPasskeyAuth({ signal: controller.signal }).then(({ error: err }) => {
        if (err || controller.signal.aborted) return
        navigate('/')
      })
    })
    return () => controller.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        navigate('/')
      } else {
        await signUp(email, password)
        setMessage('Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">NP</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            NPTE Prep
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          {/* Passkey login — signin mode only, hidden on unsupported browsers */}
          {mode === 'signin' && <PasskeyLoginButton email={email} />}

          {/* Google OAuth */}
          <div className="mb-5">
            <GoogleSignInButton />
            <div className="relative mt-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400">or</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username webauthn"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {message && (
              <p className="text-sm text-teal-600 dark:text-teal-400">{message}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-5 text-center">
            {mode === 'signin' ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                  className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(''); setMessage('') }}
                  className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

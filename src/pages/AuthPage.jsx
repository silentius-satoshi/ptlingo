import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import Button from '../components/shared/Button'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import PasskeyLoginButton from '../components/auth/PasskeyLoginButton'
import { startConditionalPasskeyAuth } from '../lib/webauthn'

function getPasswordStrength(password) {
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  }
  return { score: Object.values(checks).filter(Boolean).length, checks }
}

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setForgotMessage('Enter your email above first.')
      setTimeout(() => setForgotMessage(''), 3000)
      return
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotMessage(err ? 'Could not send reset email. Try again.' : 'Reset link sent! Check your inbox.')
    setTimeout(() => setForgotMessage(''), 5000)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/icons/manifest-icon-192.maskable.png"
            alt="PT Lingo"
            className="w-24 h-24 rounded-xl mb-3"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {mode === 'signin' ? 'Sign in to PT Lingo' : 'Create your account on PT Lingo'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username webauthn"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="Email or Username"
            />
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="Password"
            />
            {mode === 'signin' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 text-sm font-semibold bg-transparent border-0 cursor-pointer"
              >
                Forgot?
              </button>
            )}
          </div>

          {/* Password strength — signup mode only */}
          {mode === 'signup' && password.length > 0 && (() => {
            const { score, checks } = getPasswordStrength(password)
            const colors = ['', '#ef4444', '#ef4444', '#f59e0b', '#22c55e', '#14b8a6']
            const labels = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong']
            const color = colors[score]
            return (
              <div style={{ marginTop: '-4px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: i <= score ? color : '#1e2d4a',
                      transition: 'background 0.25s ease',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color, transition: 'color 0.25s' }}>
                    {labels[score]}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { key: 'length',    label: 'At least 8 characters' },
                    { key: 'uppercase', label: 'One uppercase letter' },
                    { key: 'lowercase', label: 'One lowercase letter' },
                    { key: 'number',    label: 'One number' },
                    { key: 'special',   label: 'One special character' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: checks[key] ? '#22c55e' : '#475569', transition: 'color 0.2s' }}>
                        {checks[key] ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: '12px', color: checks[key] ? '#94a3b8' : '#475569', transition: 'color 0.2s' }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {message && (
            <p className="text-sm text-teal-600 dark:text-teal-400">{message}</p>
          )}
          {mode === 'signin' && forgotMessage && (
            <p className="text-xs text-slate-400 text-right -mt-1">{forgotMessage}</p>
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
                onClick={() => { setMode('signup'); setError(''); setMessage(''); setForgotMessage('') }}
                className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setMessage(''); setForgotMessage('') }}
                className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* "or" divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-400">or</span>
          </div>
        </div>

        {/* OAuth buttons — side by side in signin; Google only in signup */}
        {mode === 'signin' ? (
          <div className="flex gap-3">
            <div className="flex-1"><PasskeyLoginButton email={email} /></div>
            <div className="flex-1"><GoogleSignInButton /></div>
          </div>
        ) : (
          <GoogleSignInButton />
        )}
      </div>
    </div>
  )
}

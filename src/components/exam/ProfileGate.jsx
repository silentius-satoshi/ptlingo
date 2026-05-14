import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

const INPUT_CLASS = "w-full px-4 py-3 rounded-xl text-white text-sm border border-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400"
const INPUT_STYLE = { background: '#1C1F2E', colorScheme: 'dark' }

export default function ProfileGate({ correctCount, totalQuestions, onLater, onSuccess, onSignIn }) {
  const [screen, setScreen] = useState('profile')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const handleCreateAccount = async () => {
    setFormLoading(true)
    setFormError('')
    try {
      const { error } = await supabase.auth.updateUser({ email, password })
      if (error) throw error
      if (name || username) {
        const user = useAuthStore.getState().user
        await supabase.from('profiles').upsert({
          id: user.id,
          ...(name && { name }),
          ...(username && { username }),
        }, { onConflict: 'id' })
      }
      onSuccess()
    } catch (err) {
      setFormError(err.message)
      setFormLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.linkIdentity({ provider: 'google' })
    // OAuth redirect takes over; auth listener handles navigation on return
  }

  if (screen === 'profile') {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-between px-6 py-16"
        style={{ background: '#080d18', zIndex: 100 }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <motion.img
            src="/mascots/sparky.png"
            alt="Sparky"
            className="w-40 h-40 object-contain"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />
          <div>
            <h2 className="text-2xl font-black text-white">Time to create a profile!</h2>
            <p className="text-slate-400 text-sm mt-2 px-4 leading-relaxed">
              Create a profile to save your progress and continue learning for free.
            </p>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setScreen('form')}
            className="w-full py-4 rounded-2xl text-white font-black text-base"
            style={{ background: '#38BDF8' }}
          >
            CREATE A PROFILE
          </button>
          <button
            onClick={onLater}
            className="w-full py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm font-medium"
          >
            LATER
          </button>
        </div>
      </div>
    )
  }

  // Screen B — form
  const canSubmit = email.trim() && password.length >= 1 && !formLoading
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#080d18', zIndex: 100 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 flex-shrink-0">
        <button
          onClick={() => setScreen('profile')}
          className="text-slate-400 text-lg p-1 leading-none"
        >
          ←
        </button>
        <button
          onClick={onSignIn}
          className="border border-slate-500 text-slate-300 text-sm px-4 py-1.5 rounded-xl"
        >
          LOGIN
        </button>
      </div>

      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 pb-8">
          <h2 className="text-xl font-black text-white text-center mt-6 mb-6">
            Create your profile
          </h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {formError && <p className="text-red-400 text-xs">{formError}</p>}

            <button
              onClick={handleCreateAccount}
              disabled={!canSubmit}
              className="w-full py-4 rounded-2xl text-white font-black text-base mt-4"
              style={{ background: canSubmit ? '#38BDF8' : '#374151' }}
            >
              {formLoading ? 'Creating…' : 'CREATE ACCOUNT'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3 rounded-2xl border border-slate-600 text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

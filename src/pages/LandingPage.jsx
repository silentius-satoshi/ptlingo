import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function LandingPage() {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()
  const [localLoading, setLocalLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) {
      if (localStorage.getItem('ptlingo_onboarding_complete')) {
        navigate('/path', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [user, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingSpinner size="lg" className="h-screen" />

  const handleGetStarted = async () => {
    setLocalLoading(true)
    const { error: err } = await supabase.auth.signInAnonymously()
    if (err) {
      setError('Something went wrong. Try again.')
      setLocalLoading(false)
    } else {
      navigate('/onboarding')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 pb-12"
      style={{ background: '#080d18' }}
    >
      {/* Logo wordmark */}
      <div className="w-full flex justify-center pt-12">
        <span className="text-white font-black text-xl tracking-tight">PT Lingo</span>
      </div>

      {/* Center: mascot + copy */}
      <div className="flex flex-col items-center gap-6 text-center">
        <motion.img
          src="/mascots/sparky.png"
          alt="Sparky"
          className="w-48 h-48 object-contain"
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        />
        <h1 className="text-2xl font-black text-white px-2 leading-tight">
          The smartest way to master physical therapy
        </h1>
        <p className="text-slate-400 text-sm">
          Practice questions, track progress, pass the NPTE.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Bottom: CTA buttons */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleGetStarted}
          disabled={localLoading}
          className="w-full py-4 rounded-2xl text-white font-black text-base transition-opacity"
          style={{ background: '#22C55E', opacity: localLoading ? 0.7 : 1 }}
        >
          {localLoading ? 'Starting…' : 'GET STARTED'}
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="w-full py-3 rounded-2xl border border-slate-600 text-slate-300 text-sm font-medium"
        >
          I already have an account
        </button>
      </div>
    </div>
  )
}

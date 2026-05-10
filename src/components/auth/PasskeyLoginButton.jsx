import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fingerprint } from 'lucide-react'
import { authenticateWithPasskey, platformAuthenticatorIsAvailable } from '../../lib/webauthn'

export default function PasskeyLoginButton({ email }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    platformAuthenticatorIsAvailable()
      .then((ok) => { if (!cancelled) setSupported(!!ok) })
      .catch(() => { if (!cancelled) setSupported(false) })
    return () => { cancelled = true }
  }, [])

  if (!supported) return null

  const handleClick = async () => {
    setLoading(true)
    setError('')
    const { error: err } = await authenticateWithPasskey()
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    navigate('/')
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        <Fingerprint className="w-5 h-5 text-teal-500 dark:text-teal-400" />
        {loading ? 'Authenticating…' : 'Sign in with Passkey'}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 text-center">{error}</p>}
    </div>
  )
}

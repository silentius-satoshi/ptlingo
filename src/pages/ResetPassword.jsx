import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage('Error updating password. Link may have expired.')
    } else {
      setMessage('Password updated! Redirecting…')
      setTimeout(() => navigate('/'), 2000)
    }
  }

  if (!ready) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
      Verifying reset link…
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-white mb-6">Set a new password</h1>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
        <button
          onClick={handleReset}
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition"
        >
          Update Password
        </button>
        {message && <p className="text-xs text-slate-400 text-center">{message}</p>}
      </div>
    </div>
  )
}

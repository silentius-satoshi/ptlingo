import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMFA } from '../../hooks/useMFA'

export default function MFAChallenge() {
  const navigate = useNavigate()
  const { verify, listFactors } = useMFA()
  const [factorId, setFactorId] = useState(null)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLostAccess, setShowLostAccess] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    listFactors().then(({ data, error: err }) => {
      if (err || !data?.totp?.length) return
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setTimeout(() => inputRefs.current[0]?.focus(), 100)
      }
    })
  }, [])

  const handleDigitChange = (i, value) => {
    const v = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleDigitKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = Array(6).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleVerify = async () => {
    const code = digits.join('')
    if (code.length !== 6 || !factorId) return
    setLoading(true)
    setError('')
    const { error: err } = await verify(factorId, code)
    setLoading(false)
    if (err) {
      setError(err.message || 'Invalid code. Please try again.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">NP</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Two-Factor Auth</h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 space-y-6">

          {/* 6-digit input */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-bold rounded-lg border border-slate-600 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading || digits.join('').length !== 6 || !factorId}
            className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          {/* Lost access */}
          <div className="text-center">
            {!showLostAccess ? (
              <button
                onClick={() => setShowLostAccess(true)}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                I lost access to my authenticator
              </button>
            ) : (
              <div className="text-sm bg-slate-800 rounded-lg p-4 text-left space-y-2">
                <p className="font-medium text-slate-300">Lost your authenticator?</p>
                <p className="text-slate-500">
                  Recovery codes are coming soon. For urgent account access, sign out and
                  contact support from the email address on your account.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

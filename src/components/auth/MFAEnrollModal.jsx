import { useState, useRef, useEffect } from 'react'
import Modal from '../shared/Modal'
import { useMFA } from '../../hooks/useMFA'

function SixDigitInput({ digits, onChange, onKeyDown, onPaste, inputRefs }) {
  return (
    <div className="flex gap-2 justify-center" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-11 h-12 text-center text-xl font-bold rounded-lg border border-slate-600 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      ))}
    </div>
  )
}

export default function MFAEnrollModal({ open, onClose, onSuccess }) {
  const { enroll, verify } = useMFA()
  const [step, setStep] = useState('enrolling') // 'enrolling' | 'verifying' | 'success'
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    if (!open) return
    setStep('enrolling')
    setDigits(['', '', '', '', '', ''])
    setError('')
    setQrCode('')
    setSecret('')

    enroll().then(({ data, error: err }) => {
      if (err) { setError(err.message); return }
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
    })
  }, [open])

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
    if (code.length !== 6) { setError('Enter all 6 digits'); return }
    setLoading(true)
    setError('')
    const { error: err } = await verify(factorId, code)
    setLoading(false)
    if (err) {
      setError(err.message || 'Invalid code. Try again.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    setStep('success')
    setTimeout(() => { onSuccess?.(); onClose() }, 1500)
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goToVerify = () => {
    setStep('verifying')
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  return (
    <Modal
      open={open}
      onClose={step === 'success' ? undefined : onClose}
      title={step === 'success' ? undefined : 'Set Up Two-Factor Authentication'}
    >
      {/* Step 1: QR code */}
      {step === 'enrolling' && (
        <div className="space-y-4">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : !qrCode ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Scan this QR code with Google Authenticator, Authy, or 1Password.
              </p>
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg bg-white p-1" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Or enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-slate-900 text-slate-300 px-3 py-2 rounded-lg break-all">
                    {secret}
                  </code>
                  <button
                    onClick={handleCopySecret}
                    className="text-xs text-teal-400 hover:text-teal-300 whitespace-nowrap transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                onClick={goToVerify}
                className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
              >
                I've scanned the code →
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Verify code */}
      {step === 'verifying' && (
        <div className="space-y-5">
          <p className="text-sm text-slate-400">
            Enter the 6-digit code from your authenticator app to confirm setup.
          </p>
          <SixDigitInput
            digits={digits}
            onChange={handleDigitChange}
            onKeyDown={handleDigitKeyDown}
            onPaste={handlePaste}
            inputRefs={inputRefs}
          />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading || digits.join('').length !== 6}
            className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Verifying…' : 'Enable 2FA'}
          </button>
          <button
            onClick={() => setStep('enrolling')}
            className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back to QR code
          </button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-teal-900/50 border border-teal-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">2FA Enabled</p>
          <p className="text-slate-400 text-sm text-center">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      )}
    </Modal>
  )
}

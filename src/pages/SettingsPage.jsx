import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, ShieldCheck, ShieldOff, KeyRound, Fingerprint, Trash2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useMFA } from '../hooks/useMFA'
import { usePasskey } from '../hooks/usePasskey'
import { useBiometricLock } from '../hooks/useBiometricLock'
import { supabase } from '../lib/supabase'
import MFAEnrollModal from '../components/auth/MFAEnrollModal'
import { ANIMATION } from '../constants/design'

// ── Helpers ────────────────────────────────────────────────────────────────

function maskEmail(email = '') {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return local.slice(0, 1) + '***@' + domain
}

function resizeImage(file, maxPx) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-6 pb-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function Row({ icon, label, value, chevron = true, onClick, children, last = false }) {
  return (
    <div>
      <div
        className={`flex items-center justify-between px-4 py-3.5 ${!last ? 'border-b border-white/5' : ''} ${onClick ? 'cursor-pointer active:opacity-70' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg w-6 flex-shrink-0 text-center">{icon}</span>}
          <span className="text-white text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm flex-shrink-0">
          {value && <span>{value}</span>}
          {chevron && <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
      style={{ backgroundColor: on ? '#22C55E' : '#374151' }}
    >
      <span className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function InlineEdit({ children }) {
  return (
    <div className="px-4 pb-4 pt-1 space-y-2 border-b border-white/5">
      {children}
    </div>
  )
}

function SaveBtn({ onClick, loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 transition-opacity"
      style={{ background: '#14B8A6' }}
    >
      {loading ? 'Saving…' : 'Save'}
    </button>
  )
}

function InputField({ value, onChange, type = 'text', placeholder = '', autoFocus = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm border border-slate-600 focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, examDate, loadProfile, updateExamDate } = useAuthStore()
  const { listFactors, unenroll } = useMFA()
  const { passkeys, loading: passkeyLoading, error: passkeyError, register: registerPasskey, remove: removePasskey } = usePasskey()
  const { enabled: bioEnabled, setEnabled: setBioEnabled, timeoutMinutes: bioTimeout, setTimeoutMinutes: setBioTimeout } = useBiometricLock()

  // Edit rows
  const [expandedRow, setExpandedRow] = useState(null)

  // Preferences
  const [quizMode, setQuizMode] = useState(() => localStorage.getItem('ptlingo_quiz_mode') ?? 'standard')
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [pendingQuizMode, setPendingQuizMode] = useState(quizMode)

  // Security
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [showMFAModal, setShowMFAModal] = useState(false)

  // Confirm dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Notification toast
  const [notif, setNotif] = useState(null)

  // Profile fields
  const [nameVal, setNameVal] = useState('')
  const [usernameVal, setUsernameVal] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [emailVal, setEmailVal] = useState(user?.email ?? '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  // Exam date
  const [examDateVal, setExamDateVal] = useState(examDate ?? '2026-07-29')

  // Notifications
  const [remindersOn, setRemindersOn] = useState(() => localStorage.getItem('ptlingo_reminders_enabled') === 'true')
  const [pushOn, setPushOn] = useState(() => localStorage.getItem('ptlingo_push_enabled') === 'true')
  const [emailRemindersOn, setEmailRemindersOn] = useState(() => localStorage.getItem('ptlingo_email_reminders') === 'true')

  // Avatar
  const fileInputRef = useRef(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // Init
  useEffect(() => {
    setNameVal(profile?.name ?? '')
    setUsernameVal(profile?.username ?? '')
    setExamDateVal(examDate ?? '2026-07-29')
    listFactors().then(({ data, error }) => {
      if (error || !data?.totp?.length) return
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id) }
    })
  }, [profile, examDate])

  // ── Notification helper ──

  function showNotif(msg, color = '#F59E0B') {
    setNotif({ msg, color })
    setTimeout(() => setNotif(null), 3000)
  }

  function toggleRow(key) {
    setExpandedRow((prev) => (prev === key ? null : key))
  }

  // ── Handlers ──

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const resized = await resizeImage(file, 400)
      console.log('Uploading to path:', `${user.id}/avatar.jpg`)
      console.log('Resized blob:', resized, 'size:', resized?.size)
      const { error } = await supabase.storage.from('avatars')
        .upload(`${user.id}/avatar.jpg`, resized, { upsert: true, contentType: 'image/jpeg' })
      if (error) {
        console.error('Avatar upload error:', error)
        showNotif(`Upload failed: ${error.message}`, '#EF4444')
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars')
        .getPublicUrl(`${user.id}/avatar.jpg`)
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: `${publicUrl}?t=${Date.now()}` })
      await loadProfile(user.id)
      showNotif('Avatar updated')
    } finally {
      setAvatarLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function handleSaveName() {
    if (!nameVal.trim()) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, name: nameVal.trim() })
    await loadProfile(user.id)
    setSaving(false)
    setExpandedRow(null)
    showNotif('Name updated')
  }

  async function handleSaveUsername() {
    setUsernameError('')
    if (!/^[a-z0-9_]{3,20}$/i.test(usernameVal)) {
      setUsernameError('3–20 characters, letters/numbers/underscores only')
      return
    }
    setSaving(true)
    const { data } = await supabase.from('profiles').select('id')
      .eq('username', usernameVal).neq('id', user.id).maybeSingle()
    if (data) { setSaving(false); setUsernameError('Username already taken'); return }
    await supabase.from('profiles').upsert({ id: user.id, username: usernameVal })
    await loadProfile(user.id)
    setSaving(false)
    setExpandedRow(null)
    showNotif('Username updated')
  }

  async function handleSaveEmail() {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: emailVal })
    setSaving(false)
    if (error) { showNotif(error.message, '#EF4444'); return }
    setExpandedRow(null)
    showNotif('Verification sent to both addresses')
  }

  async function handleSavePassword() {
    if (!currentPw) { showNotif('Enter your current password', '#EF4444'); return }
    if (newPw.length < 8) { showNotif('Minimum 8 characters', '#EF4444'); return }
    if (newPw !== confirmPw) { showNotif('Passwords do not match', '#EF4444'); return }
    setSaving(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
    if (signInError) { setSaving(false); showNotif('Current password is incorrect', '#EF4444'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSaving(false)
    if (error) { showNotif(error.message, '#EF4444'); return }
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setExpandedRow(null)
    showNotif('Password updated')
  }

  async function handleSaveExamDate() {
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, exam_date: examDateVal })
    updateExamDate(examDateVal)
    setSaving(false)
    setExpandedRow(null)
    showNotif('Test date updated')
  }

  async function handleDisableMFA() {
    setMfaLoading(true)
    const { error } = await unenroll(mfaFactorId)
    setMfaLoading(false)
    if (!error) { setMfaEnabled(false); setMfaFactorId(null) }
  }

  async function handleRemindersToggle(val) {
    if (val) {
      if (!('Notification' in window)) { showNotif('Notifications not supported in this browser'); return }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { showNotif('Enable notifications in your device settings'); return }
    }
    localStorage.setItem('ptlingo_reminders_enabled', String(val))
    setRemindersOn(val)
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData], c => c.charCodeAt(0))
  }

  async function handlePushToggle(val) {
    if (!val) {
      localStorage.setItem('ptlingo_push_enabled', 'false')
      setPushOn(false)
      return
    }
    if (!user?.id) {
      console.error('No user ID — cannot save subscription')
      return
    }
    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY
    console.log('VAPID key:', vapid)
    if (!vapid) {
      console.error('VAPID key missing from env')
      showNotif('Push not configured — missing VAPID key', '#6B7280')
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      let sub
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) })
      } catch (err) {
        console.error('Subscribe error:', err)
        throw err
      }
      const { data, error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, subscription: JSON.parse(JSON.stringify(sub)) }, { onConflict: 'user_id' })
      console.log('Upsert result:', data, error)
      localStorage.setItem('ptlingo_push_enabled', 'true')
      setPushOn(true)
      showNotif('Push notifications enabled')
    } catch {
      showNotif('Could not enable push — check browser support', '#EF4444')
    }
  }

  async function handleDeleteAccount() {
    setShowDeleteConfirm(false)
    await supabase.auth.signOut()
    navigate('/auth')
  }

  async function handleSignOut() {
    setShowSignOutConfirm(false)
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const today = new Date().toISOString().slice(0, 10)
  const quizModeLabel = quizMode === 'ptlingo' ? 'PT Lingo' : 'Standard'
  const avatarUrl = profile?.avatar_url
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()
  const formattedExamDate = new Date(examDate ?? '2026-07-29')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div className="min-h-screen flex flex-col bg-[#080d18]">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center px-4 py-4 border-b border-white/10 bg-[#080d18]">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-white font-bold text-base mx-auto">Settings</p>
          {/* Spacer to balance the back button */}
          <div className="w-9" />
        </div>

        {/* Notification toast */}
        <AnimatePresence>
          {notif && (
            <motion.div
              key="notif"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 mt-3 rounded-xl px-4 py-3 text-sm font-semibold text-center"
              style={{ background: '#1C1F2E', color: notif.color }}
            >
              {notif.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="pb-16">

          {/* ── SECTION 1: PREFERENCES ── */}
          <SectionHeader label="Preferences" />
          <div style={{ background: '#1C1F2E' }}>
            <Row
              icon="🎮"
              label="Quiz Mode"
              value={quizModeLabel}
              onClick={() => { setPendingQuizMode(quizMode); setShowQuizModal(true) }}
              last
            />
          </div>

          {/* ── SECTION 2: PROFILE ── */}
          <SectionHeader label="Profile" />
          <div style={{ background: '#1C1F2E' }}>
            {/* Avatar */}
            <Row
              label="Photo"
              value={avatarLoading ? 'Uploading…' : 'Change'}
              onClick={() => !avatarLoading && fileInputRef.current?.click()}
              icon={
                avatarUrl
                  ? <img src={avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
              }
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Name */}
            <Row
              icon="✏️"
              label="Name"
              value={profile?.name || '—'}
              onClick={() => toggleRow('name')}
            />
            {expandedRow === 'name' && (
              <InlineEdit>
                <InputField value={nameVal} onChange={setNameVal} placeholder="Your name" autoFocus />
                <SaveBtn onClick={handleSaveName} loading={saving} />
              </InlineEdit>
            )}

            {/* Username */}
            <Row
              icon="@"
              label="Username"
              value={profile?.username || '—'}
              onClick={() => { setUsernameError(''); toggleRow('username') }}
            />
            {expandedRow === 'username' && (
              <InlineEdit>
                <InputField value={usernameVal} onChange={setUsernameVal} placeholder="alphanumeric + underscore, 3–20 chars" autoFocus />
                {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
                <SaveBtn onClick={handleSaveUsername} loading={saving} />
              </InlineEdit>
            )}

            {/* Email */}
            <Row
              icon="✉️"
              label="Email"
              value={maskEmail(user?.email)}
              onClick={() => toggleRow('email')}
            />
            {expandedRow === 'email' && (
              <InlineEdit>
                <InputField value={emailVal} onChange={setEmailVal} type="email" placeholder="New email address" autoFocus />
                <p className="text-xs text-slate-500">A confirmation will be sent to both addresses</p>
                <SaveBtn onClick={handleSaveEmail} loading={saving} />
              </InlineEdit>
            )}

            {/* Password */}
            <Row
              icon="🔒"
              label="Password"
              value="••••••••"
              onClick={() => toggleRow('password')}
            />
            {expandedRow === 'password' && (
              <InlineEdit>
                <InputField value={currentPw} onChange={setCurrentPw} type="password" placeholder="Current password" autoFocus />
                <InputField value={newPw} onChange={setNewPw} type="password" placeholder="New password (min 8 chars)" />
                <InputField value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Confirm new password" />
                <SaveBtn onClick={handleSavePassword} loading={saving} />
              </InlineEdit>
            )}

            {/* Delete Account */}
            <Row
              label="Delete Account"
              chevron={false}
              last
              onClick={() => setShowDeleteConfirm(true)}
              value={<span className="text-red-400 text-sm font-medium">Delete</span>}
            />
          </div>

          {/* ── SECTION 3: NOTIFICATIONS ── */}
          <SectionHeader label="Notifications" />
          <div style={{ background: '#1C1F2E' }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">🔔</span>
                <span className="text-white text-sm font-medium">Study Reminders</span>
              </div>
              <Toggle on={remindersOn} onChange={handleRemindersToggle} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">📲</span>
                <span className="text-white text-sm font-medium">Push Notifications</span>
              </div>
              <Toggle on={pushOn} onChange={handlePushToggle} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">📧</span>
                <span className="text-white text-sm font-medium">Email Reminders</span>
              </div>
              <Toggle
                on={emailRemindersOn}
                onChange={(val) => { localStorage.setItem('ptlingo_email_reminders', String(val)); setEmailRemindersOn(val) }}
              />
            </div>
          </div>

          {/* ── SECTION 4: SECURITY ── */}
          <SectionHeader label="Security" />
          <div style={{ background: '#1C1F2E' }}>
            {/* Two-Factor Auth */}
            <div className="px-4 py-3.5 border-b border-white/5 flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {mfaEnabled
                  ? <ShieldCheck className="w-5 h-5 text-teal-400" />
                  : <ShieldOff className="w-5 h-5 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {mfaEnabled
                    ? 'Your account is protected with an authenticator app.'
                    : 'Add an extra layer of security to your account.'}
                </p>
              </div>
              <div className="flex-shrink-0">
                {mfaEnabled ? (
                  <button
                    onClick={handleDisableMFA}
                    disabled={mfaLoading}
                    className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
                  >
                    {mfaLoading ? 'Disabling…' : 'Disable'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowMFAModal(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
                  >
                    Set Up
                  </button>
                )}
              </div>
            </div>

            {/* Passkeys */}
            <div className="px-4 py-3.5 border-b border-white/5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <KeyRound className={`w-5 h-5 ${passkeys.length > 0 ? 'text-teal-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Passkeys</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {passkeys.length === 0
                      ? 'Sign in with Face ID or Touch ID — no password needed.'
                      : `${passkeys.length} passkey${passkeys.length > 1 ? 's' : ''} registered.`}
                  </p>
                  {passkeyError && <p className="text-xs text-red-400 mt-1">{passkeyError}</p>}
                </div>
                <button
                  onClick={registerPasskey}
                  disabled={passkeyLoading}
                  className="flex-shrink-0 text-xs text-teal-400 hover:text-teal-300 font-medium disabled:opacity-50 transition-colors"
                >
                  {passkeyLoading ? 'Working…' : 'Add'}
                </button>
              </div>
              {passkeys.length > 0 && (
                <ul className="mt-3 space-y-1.5 pl-8">
                  {passkeys.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-300 truncate">{p.friendly_name || 'Passkey'}</p>
                        <p className="text-slate-500">
                          Added {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={() => removePasskey(p.id)}
                        disabled={passkeyLoading}
                        className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 ml-2"
                        aria-label="Remove passkey"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Biometric Lock */}
            <div className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <Fingerprint className={`w-5 h-5 ${bioEnabled ? 'text-teal-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Biometric App Lock</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {bioEnabled
                      ? `App locks after ${bioTimeout} min of inactivity.`
                      : passkeys.length === 0
                        ? 'Register a passkey first to enable.'
                        : 'Lock the app automatically when idle.'}
                  </p>
                  {bioEnabled && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-slate-400">Timeout:</label>
                      <select
                        value={bioTimeout}
                        onChange={(e) => setBioTimeout(Number(e.target.value))}
                        className="text-xs bg-slate-700 text-white rounded px-2 py-1 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {[1, 2, 5, 10, 15, 30].map((m) => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setBioEnabled(!bioEnabled)}
                  disabled={!bioEnabled && passkeys.length === 0}
                  className={`flex-shrink-0 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                    bioEnabled ? 'text-red-400 hover:text-red-300' : 'text-teal-400 hover:text-teal-300'
                  }`}
                >
                  {bioEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* ── SECTION 5: EXAM ── */}
          <SectionHeader label="Exam" />
          <div style={{ background: '#1C1F2E' }}>
            <Row
              icon="📅"
              label="Test Date"
              value={formattedExamDate}
              onClick={() => toggleRow('examDate')}
              last={expandedRow !== 'examDate'}
            />
            {expandedRow === 'examDate' && (
              <InlineEdit>
                <input
                  type="date"
                  value={examDateVal}
                  min={today}
                  onChange={(e) => setExamDateVal(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm border border-slate-600 focus:outline-none focus:border-teal-500"
                />
                <SaveBtn onClick={handleSaveExamDate} loading={saving} />
              </InlineEdit>
            )}
          </div>

          {/* ── SECTION 6: MORE ── */}
          <SectionHeader label="More" />
          <div style={{ background: '#1C1F2E' }}>
            <Row
              icon="🏆"
              label="View Achievements"
              last
              onClick={() => navigate('/achievements')}
            />
          </div>

          {/* Sign Out */}
          <div className="px-4 mt-8">
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full py-4 rounded-2xl font-bold text-sm text-red-400"
              style={{ background: '#1C1F2E', border: 'none' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Quiz Mode Modal ── */}
      <AnimatePresence>
        {showQuizModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowQuizModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={ANIMATION.sheetSpring}
              className="fixed bottom-0 inset-x-0 z-[60] rounded-t-2xl px-6 pt-6 pb-10"
              style={{ background: '#1C1F2E' }}
            >
              <p className="text-white font-bold text-lg mb-4">Quiz Mode</p>
              {[
                {
                  id: 'standard', icon: '📋', label: 'Standard',
                  desc: 'Classic testing format — full desktop-style layout with question panel, answer panel, and review toolbar. Best for focused study.',
                },
                {
                  id: 'ptlingo', icon: '🎮', label: 'PT Lingo',
                  desc: 'Mascot-guided experience with large answer cards. PT Lingo style — gamified and mobile-friendly.',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPendingQuizMode(opt.id)}
                  className={`flex items-start gap-3 p-4 rounded-xl mb-3 cursor-pointer transition-all ${
                    pendingQuizMode === opt.id
                      ? 'border-2 border-teal-500 bg-teal-900/20'
                      : 'border-2 border-transparent bg-slate-800'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                  <div>
                    <p className="text-white font-semibold">{opt.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  localStorage.setItem('ptlingo_quiz_mode', pendingQuizMode)
                  setQuizMode(pendingQuizMode)
                  setShowQuizModal(false)
                }}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm"
                style={{ background: '#14B8A6', border: 'none' }}
              >
                Save
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Account Confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl px-6 py-8 w-full max-w-sm text-center" style={{ background: '#1C1F2E' }}>
            <p className="text-white font-bold text-lg mb-2">Delete Your Account?</p>
            <p className="text-slate-400 text-sm mb-1">
              This permanently deletes your account and all study data.
            </p>
            <p className="text-slate-500 text-xs mb-6">
              Account deletion is processed within 24 hours. Contact support if needed.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                className="w-full py-4 rounded-xl font-bold text-white text-sm"
                style={{ background: '#EF4444', border: 'none', cursor: 'pointer' }}
              >
                Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-slate-400 text-sm font-medium py-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirm ── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl px-6 py-8 w-full max-w-sm text-center" style={{ background: '#1C1F2E' }}>
            <p className="text-white font-bold text-lg mb-4">Sign out of PT Lingo?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSignOut}
                className="w-full py-4 rounded-xl font-bold text-white text-sm"
                style={{ background: '#EF4444', border: 'none', cursor: 'pointer' }}
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="text-slate-400 text-sm font-medium py-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MFA Enroll Modal ── */}
      <MFAEnrollModal
        open={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onSuccess={() => {
          setMfaEnabled(true)
          listFactors().then(({ data }) => {
            const verified = data?.totp?.find((f) => f.status === 'verified')
            if (verified) setMfaFactorId(verified.id)
          })
        }}
      />
    </>
  )
}

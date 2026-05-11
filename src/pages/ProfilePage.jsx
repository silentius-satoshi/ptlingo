import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trophy, Flame, Zap, ShieldCheck, ShieldOff, KeyRound, Fingerprint, Trash2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import useGamificationStore from '../stores/gamificationStore'
import { supabase } from '../lib/supabase'
import { getActivePlan } from '../lib/studyPlanStorage'
import { useMFA } from '../hooks/useMFA'
import { usePasskey } from '../hooks/usePasskey'
import { useBiometricLock } from '../hooks/useBiometricLock'
import MFAEnrollModal from '../components/auth/MFAEnrollModal'

// ── Helpers ────────────────────────────────────────────────────────────────
const EXAM_DATE = new Date('2026-07-29')
const PREP_START = new Date('2026-04-01')

function getInitials(email = '') {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

function daysUntil(date) {
  return Math.max(0, Math.ceil((date - new Date()) / 86400000))
}

function prepProgress() {
  const now = new Date()
  const total = EXAM_DATE - PREP_START
  const elapsed = now - PREP_START
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
      {label}
    </p>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-1">
      <div className="text-slate-400">{icon}</div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

// ── Mini calendar ──────────────────────────────────────────────────────────
function Calendar({ activePlan }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [popoverDate, setPopoverDate] = useState(null)

  const planDates = useMemo(() => {
    if (!activePlan?.plan) return {}
    try {
      const pd = typeof activePlan.plan === 'string' ? JSON.parse(activePlan.plan) : activePlan.plan
      const out = {}
      const weeks = pd.weeks || pd.schedule || []
      weeks.forEach((week) => {
        const days = week.days || week.sessions || []
        days.forEach((day) => {
          if (day.date) {
            out[day.date] = {
              completed: !!day.completed,
              focusAreas: day.focus_areas || day.subjects || [],
            }
          }
        })
      })
      return out
    } catch {
      return {}
    }
  }, [activePlan])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = today.toISOString().slice(0, 10)
  const examStr = '2026-07-29'

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function dateStr(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">{monthLabel}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-500 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />
          const ds = dateStr(d)
          const isToday = ds === todayStr
          const isExam = ds === examStr
          const entry = planDates[ds]
          const isFuture = new Date(ds) > today

          let bg = ''
          let textColor = 'text-slate-300'
          if (isExam) { bg = 'bg-amber-500'; textColor = 'text-white' }
          else if (isToday) { bg = 'ring-2 ring-white'; textColor = 'text-white font-bold' }

          return (
            <button
              key={ds}
              onClick={() => entry ? setPopoverDate(popoverDate === ds ? null : ds) : null}
              className={`relative flex flex-col items-center justify-start pt-1 pb-1 rounded-lg text-xs ${textColor} ${bg} ${
                entry ? 'cursor-pointer hover:bg-slate-700' : 'cursor-default'
              }`}
              style={{ minHeight: 36 }}
            >
              <span>{d}</span>
              {entry && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    entry.completed
                      ? 'bg-teal-400'
                      : isFuture
                      ? 'border border-teal-400 bg-transparent'
                      : 'bg-slate-500'
                  }`}
                  style={!entry.completed && isFuture ? { display: 'block' } : {}}
                />
              )}
              {/* Popover */}
              {popoverDate === ds && entry && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 bg-slate-900 border border-slate-600 rounded-lg p-2 min-w-[120px] shadow-xl text-left">
                  {entry.focusAreas.length > 0 ? (
                    entry.focusAreas.map((f, fi) => (
                      <p key={fi} className="text-[10px] text-slate-300 leading-snug">{f}</p>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400">Study day</p>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Completed
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full border border-teal-400 inline-block" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Exam
        </span>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { streak, xp, energy, maxEnergy, achievements } = useGamificationStore()
  const { listFactors, unenroll } = useMFA()
  const { passkeys, loading: passkeyLoading, error: passkeyError, register: registerPasskey, remove: removePasskey } = usePasskey()
  const { enabled: bioEnabled, setEnabled: setBioEnabled, timeoutMinutes: bioTimeout, setTimeoutMinutes: setBioTimeout } = useBiometricLock()
  const [activePlan, setActivePlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [showMFAModal, setShowMFAModal] = useState(false)

  const daysLeft = daysUntil(EXAM_DATE)
  const pct = prepProgress()
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  useEffect(() => {
    if (!user?.id) return
    getActivePlan(user.id)
      .then(setActivePlan)
      .catch(() => setActivePlan(null))
      .finally(() => setPlanLoading(false))
  }, [user?.id])

  useEffect(() => {
    listFactors().then(({ data, error }) => {
      if (error || !data?.totp?.length) return
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id) }
    })
  }, [])

  const handleDisableMFA = async () => {
    if (!mfaFactorId) return
    setMfaLoading(true)
    const { error } = await unenroll(mfaFactorId)
    setMfaLoading(false)
    if (!error) { setMfaEnabled(false); setMfaFactorId(null) }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-full bg-slate-950 text-white overflow-x-hidden">
      <div className="max-w-lg md:max-w-none mx-auto px-4 py-6 pb-8">

        {/* Two-column layout on desktop */}
        <div className="flex flex-col md:flex-row md:gap-8 md:items-start">

          {/* ── LEFT COLUMN: User + Stats + Countdown + Quick Actions ── */}
          <div className="md:w-2/5 space-y-6">

            {/* Section A: User Header */}
            <div className="flex flex-col items-center text-center gap-2 pt-2">
              <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {getInitials(user?.email)}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-full">{user?.email}</p>
              <p className="text-sm font-semibold text-white">Attempt 6 Candidate</p>
              <p className="text-xs text-slate-500">Member since {memberSince}</p>
            </div>

            {/* Section B: Stats Grid */}
            <div>
              <SectionHeader label="Stats" />
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Flame className="w-4 h-4 text-orange-400" />} value={streak} label="Days Studied" />
                <StatCard icon={<Trophy className="w-4 h-4 text-amber-400" />} value={achievements.length} label="Achievements" />
                <StatCard icon={<Zap className="w-4 h-4 text-yellow-400" />} value={xp.toLocaleString()} label="Total XP" />
                <StatCard icon={<Zap className="w-4 h-4 text-yellow-400" />} value={`${energy}/${maxEnergy}`} label="Energy" />
              </div>
            </div>

            {/* Section C: Exam Countdown */}
            <div>
              <SectionHeader label="Exam Countdown" />
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Next Attempt</p>
                    <p className="text-base font-semibold text-white mt-0.5">July 29, 2026</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${daysLeft < 30 ? 'text-red-400' : 'text-amber-400'}`}>
                      {daysLeft}
                    </p>
                    <p className="text-xs text-slate-400">days left</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden mt-4 mb-2">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">Score needed: 600 · Current best: 585</p>
              </div>
            </div>

            {/* Section F: Quick Actions */}
            <div>
              <SectionHeader label="Quick Actions" />
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/achievements')}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-teal-600 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-white">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    View Achievements
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-600 transition-colors text-sm font-medium text-red-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>

            {/* Section G: Security */}
            <div>
              <SectionHeader label="Security" />
              <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
                <div className="px-4 py-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    {mfaEnabled
                      ? <ShieldCheck className="w-5 h-5 text-teal-400" />
                      : <ShieldOff className="w-5 h-5 text-slate-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
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

                {/* Passkeys row */}
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <KeyRound className={`w-5 h-5 ${passkeys.length > 0 ? 'text-teal-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Passkeys</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {passkeys.length === 0
                          ? 'Sign in with Face ID or Touch ID — no password needed.'
                          : `${passkeys.length} passkey${passkeys.length > 1 ? 's' : ''} registered.`}
                      </p>
                      {passkeyError && (
                        <p className="text-xs text-red-400 mt-1">{passkeyError}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={registerPasskey}
                        disabled={passkeyLoading}
                        className="text-xs text-teal-400 hover:text-teal-300 font-medium disabled:opacity-50 transition-colors"
                      >
                        {passkeyLoading ? 'Working…' : 'Add Passkey'}
                      </button>
                    </div>
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

                {/* Biometric Lock row */}
                <div className="px-4 py-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Fingerprint className={`w-5 h-5 ${bioEnabled ? 'text-teal-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Biometric App Lock</p>
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
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setBioEnabled(!bioEnabled)}
                      disabled={!bioEnabled && passkeys.length === 0}
                      className={`text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                        bioEnabled ? 'text-red-400 hover:text-red-300' : 'text-teal-400 hover:text-teal-300'
                      }`}
                    >
                      {bioEnabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Study Plan + Calendar ── */}
          <div className="md:w-3/5 space-y-6 mt-6 md:mt-0">

            {/* Section D: Study Plan */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader label="Study Plan" />
                {activePlan && (
                  <button
                    onClick={() => navigate('/performance')}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium -mt-3"
                  >
                    View Full Plan →
                  </button>
                )}
              </div>

              {planLoading ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
                  <p className="text-xs text-slate-400">Loading...</p>
                </div>
              ) : activePlan ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                  <p className="text-sm font-semibold text-white mb-1">
                    {activePlan.weeks_remaining}-Week Study Plan
                  </p>
                  <p className="text-xs text-slate-400">
                    Exam: {activePlan.exam_date
                      ? new Date(activePlan.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'July 29, 2026'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Generated {new Date(activePlan.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
                  <p className="text-sm text-slate-300 mb-3">No active study plan</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Generate your personalized 12-week plan to stay on track for your exam.
                  </p>
                  <button
                    onClick={() => navigate('/performance')}
                    className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
                  >
                    Generate Study Plan
                  </button>
                </div>
              )}
            </div>

            {/* Section E: Calendar */}
            <div>
              <SectionHeader label="Study Calendar" />
              <Calendar activePlan={activePlan} />
            </div>

          </div>

        </div>
      </div>

      <MFAEnrollModal
        open={showMFAModal}
        onClose={() => setShowMFAModal(false)}
        onSuccess={() => {
          setMfaEnabled(true)
          // Refresh factor ID for future unenroll
          listFactors().then(({ data }) => {
            const verified = data?.totp?.find((f) => f.status === 'verified')
            if (verified) setMfaFactorId(verified.id)
          })
        }}
      />
    </div>
  )
}

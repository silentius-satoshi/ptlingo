import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const USER_TYPES = [
  { id: 'highschool', emoji: '🏫', label: 'High school student', desc: 'Exploring PT as a career' },
  { id: 'prept',      emoji: '🎓', label: 'Pre-PT student',      desc: 'Preparing for DPT programs' },
  { id: 'dpt',        emoji: '🩺', label: 'DPT student',         desc: 'Currently in a PT program' },
  { id: 'npte',       emoji: '📋', label: 'NPTE candidate',      desc: 'Studying for the boards' },
]

const VALIDATION_MESSAGES = {
  highschool: "Welcome! Let's show you what PT is all about. 🦾",
  prept:      "Great foundation to build on! Let's get you ready. 📚",
  dpt:        "Let's reinforce what you're learning in school. 🩺",
  npte:       "Let's get you to 600. You'll be better prepared with practice. 🎯",
}

const DAILY_GOALS = [
  { value: 5,  badge: 'Casual' },
  { value: 10, badge: 'Consistent' },
  { value: 20, badge: 'Serious' },
  { value: 30, badge: 'Unstoppable' },
]

const ACCENT = '#F59E0B'

function MascotBubble({ text }) {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <motion.img
        src="/mascots/sparky.png"
        alt="Sparky"
        className="w-28 h-28 object-contain"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      />
      <div
        className="rounded-2xl px-5 py-3 max-w-xs text-center relative"
        style={{ background: '#1C1F2E' }}
      >
        <p className="text-white text-sm font-medium leading-snug">{text}</p>
        <div style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid #1C1F2E',
        }} />
      </div>
    </div>
  )
}

function ContinueBtn({ onClick, disabled, label = 'Continue' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 rounded-xl text-sm font-bold transition-opacity"
      style={{
        background: disabled ? '#374151' : ACCENT,
        color: disabled ? '#6B7280' : '#000',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function OnboardingFlow({ onComplete }) {
  const [screenIndex, setScreenIndex] = useState(0)
  const [userType, setUserType] = useState(null)
  const [dailyGoal, setDailyGoal] = useState(10)
  const [examDate, setExamDate] = useState('')

  const advance = () => {
    // Skip exam_date screen (index 3) for non-NPTE users
    const next = screenIndex === 2 && userType !== 'npte' ? 4 : screenIndex + 1
    setScreenIndex(next)
  }

  const goBack = () => {
    // Skip exam_date screen (index 3) for non-NPTE users when going back
    const prev = screenIndex === 4 && userType !== 'npte' ? 2 : screenIndex - 1
    setScreenIndex(prev)
  }

  // Auto-complete screen
  useEffect(() => {
    if (screenIndex === 5) {
      const t = setTimeout(() => onComplete({ userType, dailyGoal, examDate: examDate || null }), 1200)
      return () => clearTimeout(t)
    }
  }, [screenIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().split('T')[0]
  const daysUntil = examDate
    ? Math.ceil((new Date(examDate) - new Date()) / 86400000)
    : null

  const showBack = screenIndex >= 1 && screenIndex <= 4

  const progressPct = Math.round((screenIndex / 5) * 100)

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#080d18', zIndex: 200 }}
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-800 flex-shrink-0">
        <motion.div
          className="h-full rounded-full"
          style={{ background: '#22C55E' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Back button */}
      <div className="flex-shrink-0 h-12 flex items-center px-4">
        {showBack && (
          <button
            onClick={goBack}
            className="text-slate-400 text-sm flex items-center gap-1"
          >
            <span className="text-lg leading-none">←</span> Back
          </button>
        )}
      </div>

      {/* Screen content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={screenIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col items-center px-6 pt-4 pb-8 max-w-sm mx-auto min-h-full"
          >

            {/* Screen 0 — user_type */}
            {screenIndex === 0 && (
              <>
                <MascotBubble text="What best describes you?" />
                <div className="w-full space-y-3">
                  {USER_TYPES.map((ut) => (
                    <button
                      key={ut.id}
                      onClick={() => {
                        setUserType(ut.id)
                        setTimeout(advance, 400)
                      }}
                      className="w-full flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all"
                      style={{
                        background: userType === ut.id ? 'rgba(245,158,11,0.15)' : '#1C1F2E',
                        border: `2px solid ${userType === ut.id ? ACCENT : '#2D3748'}`,
                      }}
                    >
                      <span className="text-2xl">{ut.emoji}</span>
                      <div>
                        <p className="text-white text-sm font-semibold">{ut.label}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{ut.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Screen 1 — validation */}
            {screenIndex === 1 && (
              <>
                <MascotBubble text={VALIDATION_MESSAGES[userType] ?? "Let's get started!"} />
                <div className="flex-1" />
                <div className="w-full">
                  <ContinueBtn onClick={advance} />
                </div>
              </>
            )}

            {/* Screen 2 — daily_goal */}
            {screenIndex === 2 && (
              <>
                <MascotBubble text="How many questions do you want to tackle each day?" />
                <div className="w-full space-y-3 mb-6">
                  {DAILY_GOALS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setDailyGoal(g.value)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-4 text-left transition-all"
                      style={{
                        background: dailyGoal === g.value ? 'rgba(245,158,11,0.15)' : '#1C1F2E',
                        border: `2px solid ${dailyGoal === g.value ? ACCENT : '#2D3748'}`,
                      }}
                    >
                      <p className="text-white text-sm font-semibold">{g.value} questions / day</p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: dailyGoal === g.value ? ACCENT : '#2D3748',
                          color: dailyGoal === g.value ? '#000' : '#94A3B8',
                        }}
                      >
                        {g.badge}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="w-full">
                  <ContinueBtn onClick={advance} />
                </div>
              </>
            )}

            {/* Screen 3 — exam_date (NPTE only) */}
            {screenIndex === 3 && (
              <>
                <MascotBubble
                  text={
                    daysUntil != null
                      ? `That's ${daysUntil} days away. Every session counts.`
                      : 'When is your NPTE exam?'
                  }
                />
                <div className="w-full mb-6">
                  <input
                    type="date"
                    min={today}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white border border-slate-600 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ background: '#1C1F2E', colorScheme: 'dark' }}
                  />
                </div>
                <div className="w-full space-y-2">
                  <ContinueBtn onClick={advance} disabled={!examDate} />
                  <button
                    onClick={advance}
                    className="w-full py-2 text-xs text-slate-500"
                  >
                    Skip — I don't know my date yet
                  </button>
                </div>
              </>
            )}

            {/* Screen 4 — notifications */}
            {screenIndex === 4 && (
              <>
                <MascotBubble text="I'll remind you to practice before you forget. 🔔" />
                <div className="flex-1" />
                <div className="w-full space-y-3">
                  <button
                    onClick={async () => {
                      if ('Notification' in window) await Notification.requestPermission()
                      advance()
                    }}
                    className="w-full py-3.5 rounded-xl text-sm font-bold"
                    style={{ background: '#22C55E', color: '#000' }}
                  >
                    Yes, remind me
                  </button>
                  <button
                    onClick={advance}
                    className="w-full py-3 rounded-xl text-sm font-medium border border-slate-600 text-slate-300"
                  >
                    Not now
                  </button>
                </div>
              </>
            )}

            {/* Screen 5 — complete */}
            {screenIndex === 5 && (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <motion.img
                  src="/mascots/sparky.png"
                  alt="Sparky"
                  className="w-36 h-36 object-contain mb-6"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                />
                <p className="text-white text-2xl font-black mb-2">You're all set!</p>
                <p className="text-slate-400 text-sm">Getting your study path ready…</p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

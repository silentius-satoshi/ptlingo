import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSystemConfig } from '../../constants/systemConfig'

// Score 0-100 — level boundaries
const LEVEL_THRESHOLDS = [0, 17, 34, 51, 68, 85, 101]

function getLevelBounds(score) {
  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    if (score >= LEVEL_THRESHOLDS[i] && score < LEVEL_THRESHOLDS[i + 1]) {
      return { start: LEVEL_THRESHOLDS[i], next: LEVEL_THRESHOLDS[i + 1] }
    }
  }
  return { start: 85, next: 101 }
}

function scoreToPct(score, start, next) {
  if (next <= start) return 100
  return Math.round(((score - start) / (next - start)) * 100)
}

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const SUB_SCREENS = { score_update: 2, streak: 2 }

// ── Sub-screen components ────────────────────────────────────────────────────

function SessionCompleteScreen({ mascot, primary, xpEarned, accuracy }) {
  return (
    <>
      <motion.img
        src={mascot}
        alt=""
        style={{ width: 128, height: 128, objectFit: 'contain' }}
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <p className="text-3xl font-black text-center" style={{ color: primary }}>
        Session Complete!
      </p>
      <div className="flex gap-3 w-full max-w-xs">
        <div className="flex-1 rounded-xl p-4 bg-amber-500">
          <p className="text-xs font-bold uppercase text-amber-900">Total XP</p>
          <p className="text-2xl font-black text-white">⚡ {xpEarned}</p>
        </div>
        <div
          className="flex-1 rounded-xl p-4"
          style={{ background: accuracy >= 0.6 ? '#22C55E' : '#EF4444' }}
        >
          <p
            className="text-xs font-bold uppercase"
            style={{ color: accuracy >= 0.6 ? '#14532D' : '#7F1D1D' }}
          >
            {accuracy >= 0.8 ? 'GREAT!' : accuracy >= 0.6 ? 'GOOD' : 'KEEP GOING'}
          </p>
          <p className="text-2xl font-black text-white">{Math.round(accuracy * 100)}%</p>
        </div>
      </div>
    </>
  )
}

function ScoreUpdateScreen({ subScreen, mascot, primary, ptLingoScore, prevPtLingoScore }) {
  const { start, next } = getLevelBounds(ptLingoScore)
  const prevPct   = scoreToPct(prevPtLingoScore, start, next)
  const targetPct = scoreToPct(ptLingoScore,     start, next)
  const [barPct, setBarPct] = useState(prevPct)

  useEffect(() => {
    if (subScreen !== 1) return
    const t = setTimeout(() => setBarPct(targetPct), 80)
    return () => clearTimeout(t)
  }, [subScreen, targetPct])

  if (subScreen === 0) {
    return (
      <>
        <img src={mascot} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
        <p className="text-6xl font-black" style={{ color: primary }}>{ptLingoScore}</p>
        <p className="text-lg font-bold text-white text-center">
          Your PT Lingo Score increased!
        </p>
      </>
    )
  }

  const displayNext = next < 101 ? next : 100

  return (
    <>
      <div className="flex items-center gap-3">
        <img src={mascot} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        <p className="text-5xl font-black" style={{ color: primary }}>{ptLingoScore}</p>
      </div>
      <div className="w-full max-w-xs">
        <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${barPct}%`,
              background: primary,
              transition: 'width 700ms ease-out',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">{prevPtLingoScore}</span>
          <span className="text-xs text-slate-400">{displayNext}</span>
        </div>
      </div>
      <p className="text-sm text-slate-400 text-center">
        Your Score tracks NPTE blueprint mastery
      </p>
    </>
  )
}

function StreakScreen({ subScreen, streakCount }) {
  const checksInWindow = streakCount % 5 === 0 ? 5 : streakCount % 5
  const isLapComplete  = streakCount > 0 && streakCount % 5 === 0
  const today = new Date()
  const days = Array.from({ length: 5 }, (_, i) => {
    const daysFromToday = i - (checksInWindow - 1)
    const d = new Date(today)
    d.setDate(today.getDate() + daysFromToday)
    return { label: DAY_ABBR[d.getDay()], practiced: i < checksInWindow }
  })

  if (subScreen === 0) {
    return (
      <>
        <p className="text-[80px] leading-none">🔥</p>
        <p className="text-[72px] font-black leading-none" style={{ color: '#FF9600' }}>
          {streakCount}
        </p>
        <p className="text-xl font-bold" style={{ color: '#FF9600' }}>day streak!</p>
      </>
    )
  }

  return (
    <>
      <p className="text-5xl leading-none">🔥</p>
      <p className="text-5xl font-black leading-none" style={{ color: '#FF9600' }}>
        {streakCount}
      </p>
      <p className="text-base font-bold text-slate-300">day streak!</p>

      {isLapComplete && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🏆</span>
          <p className="text-amber-400 font-bold text-sm">5-Day Streak Complete!</p>
          <span className="text-2xl">🏆</span>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        {days.map(({ label, practiced }, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">{label}</span>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                practiced && isLapComplete
                  ? 'bg-amber-400'
                  : practiced
                  ? 'bg-[#FF9600]'
                  : 'bg-slate-700'
              }`}
            >
              {practiced && <span className="text-white text-sm font-bold">✓</span>}
            </div>
          </div>
        ))}
      </div>

      {isLapComplete ? (
        <div className="w-full max-w-xs rounded-xl p-4 mt-4 bg-[#1C1F2E]">
          <p className="text-sm text-amber-300 text-center font-medium">
            🔥 You're on fire! Keep the streak going.
          </p>
        </div>
      ) : streakCount < 3 ? (
        <div className="w-full max-w-xs rounded-xl p-4 mt-2 bg-[#1C1F2E]">
          <p className="text-sm text-slate-300 text-center">
            But your streak will reset if you don't practice tomorrow. Watch out!
          </p>
        </div>
      ) : null}
    </>
  )
}

function MissionsCompleteScreen({ missions }) {
  return (
    <>
      <p className="text-2xl font-black text-center" style={{ color: '#F59E0B' }}>
        All Daily Quests Complete!
      </p>
      <div className="w-full max-w-xs flex flex-col gap-2">
        {missions.map((m, i) => (
          <div key={i} className="rounded-xl px-4 py-3 bg-[#1C1F2E] flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{m.description}</p>
              <div className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: '100%' }} />
              </div>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{m.target}/{m.target}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function GemsEarnedScreen({ coinsEarned }) {
  return (
    <>
      <p className="text-6xl">💎</p>
      <p className="text-4xl font-black" style={{ color: '#F59E0B' }}>+{coinsEarned}</p>
      <p className="text-2xl font-bold text-white text-center">
        You earned {coinsEarned} gems!
      </p>
      <p className="text-sm text-slate-400 text-center">Nice job completing your session!</p>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PostSessionFlow({
  sessionId,
  xpEarned,
  accuracy,
  correctCount,
  totalQuestions,
  currentSystem,
  streakCount,
  streakAdvanced,
  ptLingoScore,
  prevPtLingoScore,
  missionsAllDone,
  missions,
  coinsEarned,
  onReview,
  onComplete,
}) {
  const [screenIndex, setScreenIndex] = useState(0)
  const [subScreen,   setSubScreen]   = useState(0)

  const cfg     = getSystemConfig(currentSystem)
  const primary = cfg?.primary ?? '#22C55E'
  const mascot  = cfg?.mascot  ?? '/mascots/sparky.png'

  const screens = [
    'session_complete',
    ...(ptLingoScore > prevPtLingoScore ? ['score_update'] : []),
    ...(streakAdvanced ? ['streak'] : []),
    ...(missionsAllDone ? ['missions_complete'] : []),
    'gems_earned',
  ]
  const currentScreen = screens[screenIndex]

  function handleContinue() {
    const maxSub = SUB_SCREENS[currentScreen] ?? 1
    if (subScreen < maxSub - 1) {
      setSubScreen(s => s + 1)
    } else if (screenIndex < screens.length - 1) {
      setScreenIndex(i => i + 1)
      setSubScreen(0)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#080d18] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${screenIndex}-${subScreen}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center gap-5"
          >
            {currentScreen === 'session_complete' && (
              <SessionCompleteScreen
                mascot={mascot}
                primary={primary}
                xpEarned={xpEarned}
                accuracy={accuracy}
              />
            )}
            {currentScreen === 'score_update' && (
              <ScoreUpdateScreen
                subScreen={subScreen}
                mascot={mascot}
                primary={primary}
                ptLingoScore={ptLingoScore}
                prevPtLingoScore={prevPtLingoScore}
              />
            )}
            {currentScreen === 'streak' && (
              <StreakScreen subScreen={subScreen} streakCount={streakCount} />
            )}
            {currentScreen === 'missions_complete' && (
              <MissionsCompleteScreen missions={missions} />
            )}
            {currentScreen === 'gems_earned' && (
              <GemsEarnedScreen coinsEarned={coinsEarned} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="flex-shrink-0 h-16 flex items-center justify-between px-6"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onReview}
          className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold uppercase tracking-wider"
        >
          Review Session
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-2.5 rounded-xl text-white text-sm font-bold uppercase tracking-wider"
          style={{ background: primary }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useGamificationStore from '../stores/gamificationStore'
import PathNode, { HexNode } from '../components/gamification/PathNode'
import MissionCard from '../components/gamification/MissionCard'
import StreakBadge from '../components/gamification/StreakBadge'
import LevelBadge from '../components/gamification/LevelBadge'

const PATH_SUBJECTS = [
  'Musculoskeletal',
  'Neuromuscular',
  'Cardiovascular and Pulmonary',
  'Integumentary',
  'Pediatrics',
  'Other',
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ThePathPage() {
  const navigate = useNavigate()
  const {
    loaded,
    streak, level, xp,
    subjectMastery,
    dailyMissions,
    generateDailyMissions,
    refreshHeartsForNewDay,
  } = useGamificationStore()

  const [generatingMissions, setGeneratingMissions] = useState(false)

  // Refresh missions and reset hearts if stale (new day)
  useEffect(() => {
    if (!loaded) return
    if (!dailyMissions?.date || dailyMissions.date !== todayStr()) {
      setGeneratingMissions(true)
      Promise.all([generateDailyMissions(), refreshHeartsForNewDay()])
        .finally(() => setGeneratingMissions(false))
    }
  }, [loaded, dailyMissions?.date, generateDailyMissions, refreshHeartsForNewDay])

  const missions = dailyMissions?.missions ?? []
  const allComplete = dailyMissions?.all_complete ?? false

  // Lock logic: Mock Exam 1 unlocks when all subjects ≥ 60%
  const allAbove60 = PATH_SUBJECTS.slice(0, 5).every(
    (s) => ((subjectMastery[s]?.pct ?? subjectMastery[s] ?? 0)) >= 60,
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 max-w-2xl mx-auto">

      {/* ── Daily Missions ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Today's Missions
          </h2>
          {allComplete && (
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              All complete!
            </span>
          )}
        </div>

        {generatingMissions ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <svg className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-400 dark:text-slate-500">Generating today's missions…</p>
          </div>
        ) : missions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic py-4 text-center">
            Generating missions…
          </div>
        )}
      </section>

      {/* ── Streak + Level strip ────────────────────────────────────────────── */}
      <section className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-6 flex-wrap">
        <StreakBadge streak={streak} />
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-[180px]">
          <LevelBadge level={level} xp={xp} />
        </div>
      </section>

      {/* ── The Path ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
          The Path
        </h2>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {PATH_SUBJECTS.map((subject, i) => (
            <div key={subject}>
              <PathNode
                subject={subject}
                masteryPct={subjectMastery[subject]?.pct ?? subjectMastery[subject] ?? 0}
                correct={subjectMastery[subject]?.correct ?? 0}
                total={subjectMastery[subject]?.total ?? 0}
                onClick={() => navigate(`/question-bank?subject=${encodeURIComponent(subject)}`)}
              />
              {i < PATH_SUBJECTS.length - 1 && (
                <div className="mx-auto ml-12 border-l-2 border-dashed border-slate-200 dark:border-slate-700 h-4" />
              )}
            </div>
          ))}

          {/* Divider before mock exam */}
          <div className="mx-auto ml-12 border-l-2 border-dashed border-slate-200 dark:border-slate-700 h-4" />

          <HexNode
            label="Mock Exam 1"
            locked={!allAbove60}
            badge="Legendary"
            onClick={() => navigate('/exam/1/start')}
          />
          <HexNode
            label="Mock Exam 2"
            locked={!allAbove60}
            badge="Legendary"
            onClick={() => navigate('/exam/2/start')}
          />
        </div>
      </section>
    </div>
  )
}

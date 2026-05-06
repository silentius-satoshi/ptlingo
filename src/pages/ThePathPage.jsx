import { useEffect } from 'react'
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
  } = useGamificationStore()

  // Refresh missions if stale
  useEffect(() => {
    if (!loaded) return
    if (!dailyMissions?.date || dailyMissions.date !== todayStr()) {
      generateDailyMissions()
    }
  }, [loaded, dailyMissions?.date, generateDailyMissions])

  const missions = dailyMissions?.missions ?? []
  const allComplete = dailyMissions?.all_complete ?? false

  // Lock logic: Mock Exam 1 unlocks when all subjects ≥ 60%
  const allAbove60 = PATH_SUBJECTS.slice(0, 5).every(
    (s) => (subjectMastery[s] ?? 0) >= 60,
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

        {missions.length > 0 ? (
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
                masteryPct={subjectMastery[subject] ?? 0}
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

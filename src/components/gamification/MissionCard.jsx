import { useNavigate } from 'react-router-dom'

export default function MissionCard({ mission, compact = false }) {
  const navigate = useNavigate()
  const pct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0

  function handleClick() {
    if (mission.completed) return
    switch (mission.type) {
      case 'questions': {
        const p = new URLSearchParams()
        if (mission.subject) p.set('subject', mission.subject)
        p.set('mode', 'practice')
        p.set('count', String(mission.target))
        p.set('difficulty', 'all')
        navigate(`/question-bank?${p.toString()}`)
        break
      }
      case 'tutor':
        navigate('/tutor')
        break
      case 'review':
        navigate('/tutor?mode=drill')
        break
      default:
        break
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
        mission.completed
          ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/10'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
      }`}>
        {mission.completed && (
          <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        <span className="text-slate-600 dark:text-slate-300 truncate">{mission.description}</span>
        <span className="flex-shrink-0 text-slate-400 dark:text-slate-500 tabular-nums">{mission.progress}/{mission.target}</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
        mission.completed
          ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/10 cursor-not-allowed opacity-70'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md cursor-pointer'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
          {mission.description}
        </p>
        {mission.completed && (
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
          <span>{mission.progress} / {mission.target}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* XP badge */}
      <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        +{mission.xp_reward} XP
      </span>
    </button>
  )
}

import { useNavigate } from 'react-router-dom'
import { getSystemColors } from '../../lib/bodySystemColors'

export default function MissionCard({ mission, compact = false }) {
  const navigate = useNavigate()
  const pct = mission.target > 0 ? Math.min(100, Math.round((mission.progress / mission.target) * 100)) : 0
  const sys = getSystemColors(mission.subject)

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
        {/* compact progress */}
        <div className="flex-shrink-0 w-12 h-2 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full bg-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800 text-left overflow-hidden transition-all border-l-4 w-full ${
        mission.completed
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-slate-600 cursor-pointer'
      }`}
      style={{ borderLeftColor: sys.hex }}
    >
      {/* Top row: emoji + title + XP pill */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${sys.light}`}>
          <span className="text-lg">{sys.emoji}</span>
        </div>
        <p className="flex-1 min-w-0 text-sm font-semibold text-white leading-snug break-words">
          {mission.description}
        </p>
        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${sys.bg}`}>
          {mission.completed ? '✓ ' : '+'}{mission.xp_reward} XP
        </span>
      </div>

      {/* Progress row */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>{mission.progress} / {mission.target}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  )
}

import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useTimer } from '../../hooks/useTimer'
import { getSystemConfig } from '../../constants/systemConfig'

export default function ExamTopBar({
  onExpire,
  onToggleToolbar,
  paused        = false,
  readOnly      = false,
  onBack        = null,
  type          = 'exam',
  currentIndex  = 0,
  questionsTotal = 0,
  currentSystem,
  energy        = 0,
  maxEnergy     = 25,
}) {
  const navigate = useNavigate()
  const { formatted, timeRemaining } = useTimer({ onExpire, paused })

  const isLow      = !readOnly && timeRemaining > 0 && timeRemaining <= 300
  const isQuiz     = type === 'quiz' && !readOnly
  const cfg        = isQuiz ? getSystemConfig(currentSystem) : null
  const primary    = cfg?.primary ?? '#22C55E'
  const progressPct = questionsTotal > 0 ? (currentIndex / questionsTotal) * 100 : 0

  if (isQuiz) {
    return (
      <div className="h-14 flex items-center px-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 z-10">

        {/* Mobile only: ✕ quit */}
        <button
          onClick={() => onBack ? onBack() : navigate(-1)}
          className="md:hidden flex-shrink-0 text-lg leading-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          aria-label="Quit"
        >✕</button>

        {/* Desktop only: ← Back */}
        <button
          onClick={() => onBack ? onBack() : navigate(-1)}
          className="hidden md:flex items-center gap-1.5 flex-shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Progress bar — shared, flex-1 fills center on both breakpoints */}
        <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden bg-slate-200/60 dark:bg-slate-700/60">
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPct}%`, background: primary, transition: 'width 300ms ease' }}
          />
        </div>

        {/* Pink energy badge — both breakpoints */}
        <div
          className="flex flex-shrink-0 items-center gap-1"
          style={{ background: '#EC4899', borderRadius: 9999, padding: '5px 10px', fontSize: 13, fontWeight: 700, color: 'white' }}
        >
          <Zap style={{ width: 12, height: 12 }} />
          {energy}
        </div>

        {/* Desktop only: toolbar toggle */}
        <button
          onClick={onToggleToolbar}
          className="hidden md:flex flex-shrink-0 p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          aria-label="Toggle toolbar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 z-10">
      <button
        onClick={() => onBack ? onBack() : navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {readOnly ? (
        <span className="inline-flex items-center px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Review Mode
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isLow ? 'text-red-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`font-mono text-base font-semibold tabular-nums tracking-wide ${
            isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'
          }`}>
            {formatted}
          </span>
        </div>
      )}

      <button
        onClick={onToggleToolbar}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
        aria-label="Toggle toolbar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
    </div>
  )
}

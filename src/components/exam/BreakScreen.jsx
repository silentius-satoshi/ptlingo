function formatMMSS(seconds) {
  const t = Math.max(0, seconds)
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function BreakScreen({ section, mandatory, breakTimeLeft, examFormatted, onResume }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-sm w-full mx-6 text-center">

        {/* Section complete badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold tracking-wide uppercase mb-6">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Section {section} of 5 Complete
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {mandatory ? 'Scheduled Break' : "You're on a Break"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {mandatory
            ? 'Rest up — the exam will resume automatically when the break ends.'
            : 'Take a moment. Your exam timer is still running.'}
        </p>

        {/* Timer card */}
        <div className={`rounded-2xl px-8 py-8 mb-8 ${
          mandatory
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40'
        }`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
            mandatory
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {mandatory ? 'Break time remaining' : 'Exam time remaining'}
          </p>
          <p className={`font-mono text-5xl font-bold tabular-nums tracking-wide ${
            mandatory
              ? 'text-slate-800 dark:text-white'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {mandatory ? formatMMSS(breakTimeLeft) : examFormatted}
          </p>
        </div>

        <button
          onClick={onResume}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {mandatory ? 'Return from Break Early' : 'Resume Exam'}
        </button>

        {mandatory && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
            The exam will continue automatically when the break ends.
          </p>
        )}
      </div>
    </div>
  )
}

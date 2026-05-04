const COLS = 15

// Color priority: current > marked > answered > unanswered
function boxClass(isAnswered, isMarked, isCurrent) {
  if (isCurrent)  return 'bg-white dark:bg-slate-800 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
  if (isMarked)   return 'bg-amber-400 dark:bg-amber-500 hover:bg-amber-500 dark:hover:bg-amber-400'
  if (isAnswered) return 'bg-teal-500 dark:bg-teal-600 hover:bg-teal-600 dark:hover:bg-teal-500'
  return 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
}

export default function ProgressGrid({ questions, answers, marked, currentIndex, onJump }) {
  const total      = questions.length
  const answered   = questions.filter((q) => answers[q.id] !== undefined).length
  const markedCount = marked.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Progress</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {answered} of {total} answered
          {markedCount > 0 && ` · ${markedCount} marked`}
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div
          style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: '4px' }}
        >
          {questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined
            const isMarked   = marked.includes(q.id)
            const isCurrent  = i === currentIndex

            return (
              <button
                key={q.id}
                onClick={() => onJump(i)}
                title={`Question ${i + 1}${isMarked ? ' (marked)' : ''}${isAnswered ? ' (answered)' : ''}`}
                className={`aspect-square rounded text-[9px] font-bold transition-all flex items-center justify-center ${boxClass(isAnswered, isMarked, isCurrent)} ${
                  isCurrent ? 'text-blue-600 dark:text-blue-400' : isMarked || isAnswered ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 space-y-1.5">
        {[
          { color: 'bg-slate-100 dark:bg-slate-700', label: 'Unanswered' },
          { color: 'bg-teal-500',                    label: 'Answered' },
          { color: 'bg-amber-400',                   label: 'Marked for review' },
          { color: 'ring-2 ring-blue-500 bg-white dark:bg-slate-800', label: 'Current question' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${color}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

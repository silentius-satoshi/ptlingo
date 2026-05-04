const LETTERS = ['A', 'B', 'C', 'D']

export default function ChoiceRow({
  index,
  text,
  selected,
  eliminated,
  focused,
  onSelect,
  onToggleEliminate,
  onFocus,
  revealed = false,  // true when rationale is visible (quiz mode, answered)
  correct  = false,  // true if this is the correct answer
}) {
  const letter = LETTERS[index]

  // Interaction disabled once rationale is revealed
  const handleClick = () => {
    if (revealed || eliminated) return
    onSelect(index)
  }

  // Container border + background
  const containerClass = revealed
    ? correct
      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 cursor-default'
      : selected
      ? 'border-red-400 bg-red-50 dark:bg-red-900/20 cursor-default'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-default opacity-50'
    : eliminated
    ? 'opacity-50 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 cursor-default'
    : selected
    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
    : focused
    ? 'border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800'
    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750'

  // Radio ring + fill
  const radioClass = revealed
    ? correct
      ? 'border-teal-600 bg-teal-600'
      : selected
      ? 'border-red-500 bg-red-500'
      : 'border-slate-300 dark:border-slate-600'
    : selected
    ? 'border-teal-600 bg-teal-600'
    : 'border-slate-300 dark:border-slate-600'

  // Letter badge
  const letterClass = revealed
    ? correct
      ? 'bg-teal-600 text-white'
      : selected
      ? 'bg-red-500 text-white'
      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
    : selected
    ? 'bg-teal-600 text-white'
    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'

  return (
    <div
      className={`group relative flex items-start gap-3 p-4 rounded-xl border-2 select-none transition-colors ${containerClass}`}
      onClick={handleClick}
      onMouseEnter={() => !revealed && onFocus(index)}
      onMouseLeave={() => !revealed && onFocus(null)}
    >
      {/* Radio indicator */}
      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${radioClass}`}>
        {revealed && correct ? (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : revealed && selected && !correct ? (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : selected ? (
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        ) : null}
      </div>

      {/* Letter badge */}
      <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${letterClass}`}>
        {letter}
      </span>

      {/* Choice text */}
      <span className={`flex-1 text-sm leading-relaxed pt-0.5 transition-colors ${
        eliminated && !revealed
          ? 'line-through text-slate-400 dark:text-slate-500'
          : 'text-slate-800 dark:text-slate-100'
      }`}>
        {text}
      </span>

      {/* Eliminate button — hidden when selected or in revealed mode */}
      {!revealed && (
        <button
          className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
            selected
              ? 'invisible'
              : eliminated
              ? 'opacity-100 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600'
          }`}
          onClick={(e) => { e.stopPropagation(); onToggleEliminate(index) }}
          title={eliminated ? 'Remove elimination (E)' : 'Eliminate this choice (E)'}
          aria-label={eliminated ? 'Remove elimination' : 'Eliminate choice'}
          tabIndex={-1}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// minIndex: first navigable index (0-indexed). In section-locked mock-exam
// mode this is the current section's first item — Previous never crosses back
// into a closed section.
export default function QuestionNav({ currentIndex, total, onPrev, onNext, minIndex = 0 }) {
  const questionNumber = currentIndex + 1

  return (
    <div className="h-14 flex items-center justify-center gap-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 px-4">
      <button
        onClick={onPrev}
        disabled={currentIndex <= minIndex}
        className="flex items-center gap-2 px-4 py-3 md:py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      <span className="text-sm text-slate-600 dark:text-slate-400">
        <span className="hidden md:inline">
          Question{' '}
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">{questionNumber}</span>
          {' '}of{' '}
          <span className="tabular-nums">{total}</span>
        </span>
        <span className="md:hidden font-bold tabular-nums text-slate-900 dark:text-white">
          {questionNumber}{' '}
          <span className="font-normal text-slate-500 dark:text-slate-400">/</span>
          {' '}{total}
        </span>
      </span>

      <button
        onClick={onNext}
        disabled={currentIndex >= total - 1}
        className="flex items-center gap-2 px-4 py-3 md:py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

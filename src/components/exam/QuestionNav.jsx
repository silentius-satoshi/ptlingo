export default function QuestionNav({ currentIndex, total, onPrev, onNext }) {
  const questionNumber = currentIndex + 1

  return (
    <div className="h-14 flex items-center justify-center gap-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 px-4">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      <span className="text-sm text-slate-600 dark:text-slate-400">
        Question{' '}
        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{questionNumber}</span>
        {' '}of{' '}
        <span className="tabular-nums">{total}</span>
      </span>

      <button
        onClick={onNext}
        disabled={currentIndex >= total - 1}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

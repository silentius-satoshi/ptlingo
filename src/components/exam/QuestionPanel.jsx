export default function QuestionPanel({ question, questionNumber, totalQuestions, isMarked }) {
  if (!question) {
    return (
      <div className="flex-[55] flex items-center justify-center border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
        No question loaded
      </div>
    )
  }

  return (
    <div className="flex-[55] flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-700">
      {/* Panel header */}
      <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Question
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {questionNumber} of {totalQuestions}
          </span>
        </div>
        {isMarked && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
            Marked
          </span>
        )}
      </div>

      {/* Subject + difficulty badges */}
      <div className="px-8 pt-5 pb-2 flex-shrink-0 flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium border border-teal-100 dark:border-teal-800">
          {question.subject}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
          question.difficulty === 'Easy'
            ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
            : question.difficulty === 'Hard'
            ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
        }`}>
          {question.difficulty}
        </span>
      </div>

      {/* Stem */}
      <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-thin">
        <p className="text-[15px] leading-[1.75] text-slate-800 dark:text-slate-100 font-[450] whitespace-pre-wrap">
          {question.stem}
        </p>
      </div>
    </div>
  )
}

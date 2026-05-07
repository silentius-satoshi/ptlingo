const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function TutorRationaleCard({ question }) {
  const choices = question.choices || []
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          From Your Question Bank
        </p>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          {question.subject && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              {question.subject}
            </span>
          )}
          {question.difficulty && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              {question.difficulty}
            </span>
          )}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 uppercase tracking-wide">
            Missed {question.times_incorrect}×
          </span>
        </div>

        {/* Stem */}
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{question.stem}</p>

        {/* Correct answer */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-400">
              {LETTERS[question.correct_index]}. {choices[question.correct_index]}
            </p>
            {question.rationale && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-1 leading-relaxed">{question.rationale}</p>
            )}
          </div>
        </div>

        {/* Wrong answers */}
        {choices.map((choice, i) => {
          if (i === question.correct_index) return null
          const why = question.rationale_map?.[i]
          return (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  {LETTERS[i]}. {choice}
                  {i === question.last_selected_index && (
                    <span className="ml-1.5 text-[10px] font-bold bg-red-200 dark:bg-red-900/40 px-1.5 py-0.5 rounded-full">
                      You chose this
                    </span>
                  )}
                </p>
                {why && <p className="text-xs text-red-500 dark:text-red-500 mt-0.5 leading-relaxed">{why}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

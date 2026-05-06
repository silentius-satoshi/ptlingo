import { useNavigate } from 'react-router-dom'

const LETTERS = ['A', 'B', 'C', 'D']

export default function RationalePanel({ question, selectedAnswer }) {
  const navigate = useNavigate()
  const correct = question.correct_index

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900">

      {/* ── Header — matches Question / Answer panel style ─────────────────── */}
      <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Explanation
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="px-8 py-6 space-y-6">

        {/* Correct Answer */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Correct Answer
          </p>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center bg-teal-600 text-white">
              {LETTERS[correct]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {question.choices[correct]}
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {question.rationale_map?.[String(correct)] || question.rationale || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Incorrect Answers */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Incorrect Answers
          </p>
          <div className="space-y-4">
            {question.choices.map((choice, i) => {
              if (i === correct) return null
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${
                    i === selectedAnswer
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {LETTERS[i]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {choice}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {question.rationale_map?.[String(i)] || ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium border border-teal-100 dark:border-teal-800">
            {question.subject}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            question.difficulty === 'Easy'
              ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : question.difficulty === 'Hard'
              ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
              : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
          }`}>
            {question.difficulty}
          </span>
        </div>

        {/* Ask Max — only shown when the user got this question wrong */}
        {selectedAnswer !== null && selectedAnswer !== question.correct_index && (
          <div className="pt-2">
            <button
              onClick={() => navigate(`/tutor?question=${question.id}&wrong=${selectedAnswer}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ask Max why I got this wrong
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

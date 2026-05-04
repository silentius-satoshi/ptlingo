import { useState } from 'react'

const LETTERS = ['A', 'B', 'C', 'D']

function formatTimeSpent(seconds) {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

export default function RationalePanel({ question, selectedAnswer, timeSpent = 0 }) {
  const [refsOpen, setRefsOpen] = useState(false)
  const correct    = question.correct_index
  const isCorrect  = selectedAnswer === correct
  const hasRefs    = question.references?.length > 0

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">

      {/* ── Result banner ───────────────────────────────────────────────────── */}
      <div className={`px-8 py-3 flex items-center gap-2.5 ${
        isCorrect
          ? 'bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800'
          : 'bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900'
      }`}>
        {isCorrect ? (
          <svg className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className={`text-sm font-semibold ${
          isCorrect ? 'text-teal-700 dark:text-teal-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </span>
        {!isCorrect && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            — The correct answer is {LETTERS[correct]}.
          </span>
        )}
      </div>

      {/* ── Question Summary ─────────────────────────────────────────────────── */}
      <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <div className={`grid gap-4 ${isCorrect ? 'grid-cols-2' : 'grid-cols-3'}`}>

          {/* Your answer */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Your Answer
            </p>
            <div className="flex items-start gap-2">
              <span className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                isCorrect ? 'bg-teal-600 text-white' : 'bg-red-500 text-white'
              }`}>
                {LETTERS[selectedAnswer]}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                {question.choices[selectedAnswer]}
              </span>
            </div>
          </div>

          {/* Correct answer — only shown when wrong */}
          {!isCorrect && (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                Correct Answer
              </p>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-teal-600 text-white">
                  {LETTERS[correct]}
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                  {question.choices[correct]}
                </span>
              </div>
            </div>
          )}

          {/* Time spent */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Time Spent
            </p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatTimeSpent(timeSpent)}
            </p>
          </div>

        </div>
      </div>

      {/* ── Per-choice rationale ─────────────────────────────────────────────── */}
      <div className="px-8 py-5 space-y-4">
        {question.rationale.map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center ${
              i === correct
                ? 'bg-teal-600 text-white'
                : i === selectedAnswer
                ? 'bg-red-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {LETTERS[i]}
            </span>
            <p className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* ── References (collapsible) ─────────────────────────────────────────── */}
      {hasRefs && (
        <div className="border-t border-slate-100 dark:border-slate-800 mb-2">
          <button
            onClick={() => setRefsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-8 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              References
            </span>
            <svg
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${refsOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {refsOpen && (
            <ul className="px-8 pb-5 space-y-1.5">
              {question.references.map((ref, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {ref}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  )
}

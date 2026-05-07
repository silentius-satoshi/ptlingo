import { useState } from 'react'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

const DIFF_COLOR = {
  Easy:   'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Hard:   'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function TutorDrillCard({ question, onAnswerSubmit, answered }) {
  const [selected, setSelected] = useState(null)

  const choices = question.choices || []

  const choiceClass = (i) => {
    if (!answered) {
      return selected === i
        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
    }
    if (i === question.correct_index)
      return 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
    if (i === selected && i !== question.correct_index)
      return 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
    return 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 opacity-50'
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 space-y-4">
        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          {question.subject && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              {question.subject}
            </span>
          )}
          {question.difficulty && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${DIFF_COLOR[question.difficulty] ?? DIFF_COLOR.Medium}`}>
              {question.difficulty}
            </span>
          )}
        </div>

        {/* Stem */}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
          {question.stem}
        </p>

        {/* Choices */}
        <div className="space-y-2">
          {choices.map((choice, i) => (
            <button
              key={i}
              disabled={answered}
              onClick={() => !answered && setSelected(i)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all disabled:cursor-default ${choiceClass(i)}`}
            >
              <span className="font-bold flex-shrink-0 w-5">{LETTERS[i]}.</span>
              <span className="leading-snug">{choice}</span>
              {answered && i === question.correct_index && (
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 ml-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {answered && i === selected && i !== question.correct_index && (
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Submit */}
        {!answered && (
          <button
            disabled={selected === null}
            onClick={() => onAnswerSubmit(selected)}
            className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  )
}

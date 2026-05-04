import ChoiceRow from './ChoiceRow'
import RationalePanel from './RationalePanel'

export default function AnswerPanel({
  question,
  selectedAnswer,
  eliminated,
  onSelect,
  onToggleEliminate,
  focusedChoice,
  onFocusChoice,
  rationaleVisible = false,
}) {
  if (!question) {
    return <div className="flex-[45] bg-slate-50 dark:bg-slate-900/50" />
  }

  return (
    <div className="flex-[45] flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
      {/* Panel header */}
      <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Answer
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          Multiple Choice
        </span>
      </div>

      {/* Scrollable area: choices + rationale */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-8 py-5 space-y-3">
          {question.choices.map((choice, i) => (
            <ChoiceRow
              key={i}
              index={i}
              text={choice}
              selected={selectedAnswer === i}
              eliminated={(eliminated || []).includes(i)}
              focused={rationaleVisible ? false : focusedChoice === i}
              onSelect={onSelect}
              onToggleEliminate={onToggleEliminate}
              onFocus={rationaleVisible ? () => {} : onFocusChoice}
              revealed={rationaleVisible}
              correct={rationaleVisible && i === question.correct_index}
            />
          ))}

          {!rationaleVisible && (
            <p className="text-xs text-slate-400 dark:text-slate-600 text-center pt-2">
              Press 1–4 to select · E to eliminate · M to mark · ←→ to navigate
            </p>
          )}
        </div>

        {rationaleVisible && (
          <RationalePanel question={question} selectedAnswer={selectedAnswer} />
        )}
      </div>
    </div>
  )
}

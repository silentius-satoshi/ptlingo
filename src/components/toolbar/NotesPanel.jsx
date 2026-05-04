import { useEffect, useRef } from 'react'

export default function NotesPanel({ questionNumber, note, onChange }) {
  const textareaRef = useRef(null)

  // Focus textarea when panel opens
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Notes</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Question {questionNumber} · auto-saved
        </p>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes for this question…"
        className="flex-1 p-4 text-sm resize-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none leading-relaxed"
      />

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          Notes are saved per question and visible in results.
        </p>
      </div>
    </div>
  )
}

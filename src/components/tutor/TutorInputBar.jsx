import { useState, useEffect, useRef, useCallback } from 'react'

export default function TutorInputBar({ onSend, isStreaming, context, injectedText, onInjectedTextClear }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // Apply injected text from suggested topics / Ask Max
  useEffect(() => {
    if (!injectedText) return
    setValue(injectedText)
    textareaRef.current?.focus()
    onInjectedTextClear()
  }, [injectedText, onInjectedTextClear])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
  }, [value, isStreaming, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.repeat) {
      e.preventDefault()
      handleSend()
    }
  }

  // Build quick chips from context
  const weakest = context?.subjectAccuracy
    ? Object.entries(context.subjectAccuracy).sort((a, b) => a[1] - b[1])[0]?.[0]
    : null
  const weakestTag = context?.weakestTags?.[0] ?? null
  const topMissed = context?.flaggedQuestions?.[0] ?? null

  const quickChips = [
    weakest && { label: `🎯 Drill me on ${weakest}`, text: `Drill me on ${weakest} questions — I want one at a time.` },
    topMissed && { label: '❓ Walk me through my most-missed question', text: `Can you walk me through the question I've gotten wrong most often and explain exactly what I'm misunderstanding?` },
    { label: '📊 How am I trending?', text: 'How am I trending overall? What should I focus on next?' },
    weakestTag && { label: `💡 Mnemonic for ${weakestTag}`, text: `Give me a clinical mnemonic for ${weakestTag}.` },
    { label: '🔁 New Session', text: null, isReset: true },
  ].filter(Boolean)

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
      {/* Quick chips */}
      <div className="flex gap-2 px-3 pt-3 overflow-x-auto scrollbar-thin pb-1">
        {quickChips.map((chip, i) => (
          <button
            key={i}
            disabled={isStreaming}
            onClick={() => {
              if (chip.isReset) {
                onSend('__reset__')
              } else {
                onSend(chip.text)
              }
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your tutor…"
          disabled={isStreaming}
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 disabled:opacity-50 transition-colors"
          style={{ minHeight: 40, maxHeight: 120 }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || isStreaming}
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-teal-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
        >
          {isStreaming ? (
            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

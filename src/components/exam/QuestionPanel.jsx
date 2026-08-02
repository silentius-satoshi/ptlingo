import { useRef, useCallback } from 'react'
import QuestionImage from './QuestionImage'

// Walk all text nodes in container to convert a (node, offset) DOM position
// into an absolute character offset within the container's plain text.
function getTextOffset(container, targetNode, targetOffset) {
  let total = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
  let node
  while ((node = walker.nextNode())) {
    if (node === targetNode) return total + targetOffset
    total += node.textContent.length
  }
  return total
}

// Split plain text into alternating unhighlighted / highlighted segments,
// sorted and de-overlapped so adjacent <mark> elements never collide.
function buildSegments(text, ranges) {
  if (!ranges || ranges.length === 0) return [{ text, hl: false, idx: null }]

  const sorted = [...ranges]
    .map((r, i) => ({ ...r, idx: i }))
    .sort((a, b) => a.start - b.start)

  const segments = []
  let cursor = 0

  for (const r of sorted) {
    const start = Math.max(r.start, cursor)
    if (start >= r.end) continue            // fully subsumed by previous range
    if (start > cursor) segments.push({ text: text.slice(cursor, start), hl: false, idx: null })
    segments.push({ text: text.slice(start, r.end), hl: true, idx: r.idx })
    cursor = r.end
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), hl: false, idx: null })
  return segments
}

export default function QuestionPanel({
  question,
  questionNumber,
  totalQuestions,
  isMarked,
  highlightMode  = false,
  highlights     = [],
  onAddHighlight,
  onRemoveHighlight,
}) {
  const stemRef = useRef(null)

  const handleMouseUp = useCallback(() => {
    if (!highlightMode) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    // Ignore selections that aren't inside the stem
    if (!stemRef.current?.contains(range.commonAncestorContainer)) {
      sel.removeAllRanges()
      return
    }

    const start = getTextOffset(stemRef.current, range.startContainer, range.startOffset)
    const end   = getTextOffset(stemRef.current, range.endContainer,   range.endOffset)

    if (start >= end) { sel.removeAllRanges(); return }

    onAddHighlight?.({ start, end })
    sel.removeAllRanges()
  }, [highlightMode, onAddHighlight])

  if (!question) {
    return (
      <div className="w-full md:flex-[55] flex items-center justify-center md:border-r border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-sm">
        No question loaded
      </div>
    )
  }

  const segments = buildSegments(question.stem, highlights)

  return (
    <div className="w-full md:flex-[55] flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700">
      {/* Panel header */}
      <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center justify-between">
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

      {/* Highlight mode banner */}
      {highlightMode && (
        <div className="px-4 md:px-8 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-900 flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
            Highlight mode — select text to highlight · click highlight to remove
          </span>
          {highlights.length > 0 && (
            <button
              onClick={() => onRemoveHighlight?.('all')}
              className="text-xs text-yellow-600 dark:text-yellow-500 hover:text-yellow-800 dark:hover:text-yellow-300 underline ml-3 flex-shrink-0"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Subject + difficulty badges */}
      <div className="px-4 md:px-8 pt-5 pb-2 flex-shrink-0 flex items-center gap-2">
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
      <div className="px-4 md:px-8 py-4">
        <p
          ref={stemRef}
          onMouseUp={handleMouseUp}
          className={`text-[15px] leading-[1.75] text-slate-800 dark:text-slate-100 font-[450] whitespace-pre-wrap ${
            highlightMode ? 'cursor-text' : ''
          }`}
        >
          {segments.map((seg, i) =>
            seg.hl ? (
              <mark
                key={i}
                onClick={highlightMode ? () => onRemoveHighlight?.(seg.idx) : undefined}
                title={highlightMode ? 'Click to remove' : undefined}
                className={`bg-yellow-200 dark:bg-yellow-600/40 text-inherit rounded-[2px] ${
                  highlightMode ? 'cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-600/60' : ''
                }`}
              >
                {seg.text}
              </mark>
            ) : (
              // React needs a key even on plain strings inside an array
              <span key={i}>{seg.text}</span>
            )
          )}
        </p>

        {/* Exhibit (media-dependent items) */}
        <QuestionImage src={question.image_url} className="mt-4" />
      </div>
    </div>
  )
}

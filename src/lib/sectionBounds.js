// Section geometry for a mock form. Pure — no React, no browser APIs — so both
// ExamPage (which locks navigation) and ReviewPage (which locks its jump
// buttons) share one implementation, and scripts/ can assert on it directly.

// Fallback only: 0-indexed last question of sections 1-4 on a canonical 225-item form.
export const SECTION_END_225 = new Set([44, 89, 134, 179])

// Derive the 0-indexed last-question position of each section from the questions
// themselves. A real form is almost never exactly 225 items after quarantine, so
// keying breaks off index arithmetic silently disables every break on the forms
// we actually sit. Read the boundary off the data; fall back to arithmetic only
// when the section field is missing entirely.
export function deriveSectionEnds(questions) {
  if (!questions || questions.length === 0) return new Set()
  const hasSection = questions.every((q) => q && q.section != null)
  if (!hasSection) return questions.length === 225 ? SECTION_END_225 : new Set()
  const ends = new Set()
  for (let i = 0; i < questions.length - 1; i++) {
    if (Number(questions[i].section) !== Number(questions[i + 1].section)) ends.add(i)
  }
  return ends
}

// The half-open-free [start, end] window (both inclusive, 0-indexed) of the
// section containing `index`. Returns null when there are no boundaries to
// enforce, which callers treat as "nothing is locked".
export function boundsForIndex(sectionEnds, index, total) {
  if (!sectionEnds || sectionEnds.size === 0) return null
  if (!(total > 0)) return null
  const ends = [...sectionEnds].sort((a, b) => a - b)
  let start = 0
  for (const e of ends) {
    if (index <= e) return { start, end: e }
    start = e + 1
  }
  return { start, end: total - 1 }
}

// True when `index` falls outside the section window `bounds`. A null bounds
// locks nothing.
export function isOutOfBounds(bounds, index) {
  return bounds != null && (index < bounds.start || index > bounds.end)
}

export function calculateNextReview(wasCorrect, currentInterval, repetitions, easeFactor) {
  if (!wasCorrect) {
    return { interval: 1, repetitions: 0, easeFactor: Math.max(1.3, easeFactor - 0.2) }
  }
  let newInterval
  if (repetitions === 0) newInterval = 1
  else if (repetitions === 1) newInterval = 3
  else newInterval = Math.round(currentInterval * easeFactor)
  newInterval = Math.min(newInterval, 14)
  return { interval: newInterval, repetitions: repetitions + 1, easeFactor: Math.min(2.5, easeFactor + 0.1) }
}

export function isDueToday(nextReviewAt) {
  return new Date(nextReviewAt) <= new Date()
}

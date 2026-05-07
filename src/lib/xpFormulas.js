// XP threshold to reach level N (cumulative)
// Level 1 = 0 XP, Level 2 = 100, Level 3 = 250, Level 4 = 450, Level 5 = 700 ...
// Each level gap increases by 50 XP over the previous gap (100, 150, 200, 250, ...)
export function xpForLevel(n) {
  if (n <= 1) return 0
  // Sum of gaps: 100 + 150 + ... + (100 + 50*(n-2)) = (n-1) * 100 + 50*(n-1)*(n-2)/2
  return (n - 1) * 100 + 50 * (n - 1) * (n - 2) / 2
}

export function getLevelFromXP(xp) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

export function xpForNextLevel(currentLevel) {
  return xpForLevel(currentLevel + 1)
}

export function xpProgressInLevel(xp, level) {
  const floor = xpForLevel(level)
  const ceil  = xpForLevel(level + 1)
  return { current: xp - floor, needed: ceil - floor }
}

const LEVEL_TITLES = [
  { min: 1,  max: 5,  title: 'NPTE Novice',       color: 'slate'  },
  { min: 6,  max: 10, title: 'PT Apprentice',      color: 'blue'   },
  { min: 11, max: 15, title: 'Clinical Scholar',   color: 'teal'   },
  { min: 16, max: 20, title: 'Board Candidate',    color: 'purple' },
  { min: 21, max: 25, title: 'Board-Ready',        color: 'amber'  },
  { min: 26, max: 30, title: 'NPTE Champion',      color: 'coral'  },
]

export function getLevelTitle(level) {
  return LEVEL_TITLES.find((t) => level >= t.min && level <= t.max) ?? LEVEL_TITLES[0]
}

// Mastery color thresholds
export function masteryColor(pct) {
  if (pct >= 70) return 'teal'
  if (pct >= 50) return 'amber'
  return 'coral'
}

export const MASTERY_STROKE = {
  teal:  '#14b8a6',
  amber: '#f59e0b',
  coral: '#ef4444',
}

export function questionsToNextBracket(correct, total) {
  if (total === 0) return null
  const currentPct = (correct / total) * 100
  if (currentPct >= 90) return null
  const nextThreshold = Math.floor(currentPct / 10) * 10 + 10
  const N = Math.ceil(
    (nextThreshold * total - 100 * correct) / (100 - nextThreshold)
  )
  if (N <= 0) return 1
  if (N > 200) return null
  return N
}

export function nextBracketLabel(correct, total) {
  if (total === 0) return 'Answer questions to start tracking'
  const currentPct = (correct / total) * 100
  if (currentPct >= 90) return 'Mastered'
  const N = questionsToNextBracket(correct, total)
  if (N === null) return null
  const nextThreshold = Math.floor(currentPct / 10) * 10 + 10
  return `${N} correct to reach ${nextThreshold}%`
}

import { fetchFlaggedCount, fetchActiveStudyPlan } from './gamificationQueries'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getPct(v) {
  return typeof v === 'number' ? v : (v?.pct ?? 0)
}

function getCurrentWeekFocus(plan) {
  const weeks = plan?.plan?.weeks
  if (!weeks?.length) return { currentFocus: null, nextFocus: null }
  const examDate = plan.config?.examDate
  const daysLeft = examDate
    ? Math.max(0, Math.floor((new Date(examDate) - new Date()) / 86400000))
    : null
  const weekIdx = daysLeft != null
    ? Math.max(0, weeks.length - Math.ceil(daysLeft / 7))
    : 0
  return {
    currentFocus: weeks[weekIdx]?.focus ?? weeks[weekIdx]?.subjects?.[0] ?? null,
    nextFocus:    weeks[weekIdx + 1]?.focus ?? weeks[weekIdx + 1]?.subjects?.[0] ?? null,
  }
}

export async function generateDailyMissions(userId, subjectMastery) {
  const plan   = await fetchActiveStudyPlan(userId)
  const sorted = Object.entries(subjectMastery)
    .map(([s, v]) => [s, getPct(v)])
    .sort((a, b) => a[1] - b[1])

  const weakest       = sorted[0] ?? ['Musculoskeletal', 0]
  const secondWeakest = sorted[1] ?? ['Neuromuscular', 0]

  const { currentFocus, nextFocus } = getCurrentWeekFocus(plan)
  const focusSubject  = currentFocus ?? weakest[0]
  const secondSubject = nextFocus    ?? secondWeakest[0]

  // Mission 1 — focus subject, 20 questions
  const m1 = {
    id: 'm1', type: 'questions',
    subject: focusSubject, target: 20,
    description: `Answer 20 ${focusSubject} questions`,
    xp_reward: 50, progress: 0, completed: false,
  }

  // Mission 2 — AI Tutor, context-aware based on focus mastery
  const focusMastery = getPct(subjectMastery[focusSubject])
  const m2 = {
    id: 'm2', type: 'tutor', target: 1, xp_reward: 30, progress: 0, completed: false,
    description: focusMastery < 60
      ? `Ask Max one ${focusSubject} question`
      : 'Complete one AI Tutor session',
  }

  // Mission 3 — flagged review or second-subject questions
  const flaggedCount = await fetchFlaggedCount(userId)
  let m3
  if (flaggedCount >= 3) {
    m3 = {
      id: 'm3', type: 'review', target: 3, xp_reward: 20, progress: 0, completed: false,
      description: focusSubject
        ? `Review 3 flagged ${focusSubject} questions with Max`
        : 'Review 3 flagged questions with Max',
    }
  } else {
    m3 = {
      id: 'm3', type: 'questions',
      subject: secondSubject, target: 15, xp_reward: 20, progress: 0, completed: false,
      description: `Answer 15 ${secondSubject} questions`,
    }
  }

  return {
    date: todayStr(),
    missions: [m1, m2, m3],
    all_complete: false,
  }
}

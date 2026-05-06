import { fetchFlaggedCount, fetchActiveStudyPlan } from './gamificationQueries'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export async function generateDailyMissions(userId, subjectMastery) {
  const plan   = await fetchActiveStudyPlan(userId)
  const sorted = Object.entries(subjectMastery).sort((a, b) => a[1] - b[1])

  const weakest       = sorted[0]       ?? ['Musculoskeletal', 0]
  const secondWeakest = sorted[1]       ?? ['Neuromuscular', 0]

  // If study plan exists and names a current focus subject, use it for mission 1
  const focusSubject = plan?.plan?.weeks?.[0]?.focus ?? weakest[0]

  const m1 = {
    id: 'm1', type: 'questions',
    subject: focusSubject, target: 20,
    description: `Answer 20 ${focusSubject} questions`,
    xp_reward: 50, progress: 0, completed: false,
  }

  const m2 = {
    id: 'm2', type: 'tutor',
    target: 1,
    description: 'Complete one AI Tutor session',
    xp_reward: 30, progress: 0, completed: false,
  }

  let m3
  const flaggedCount = await fetchFlaggedCount(userId)
  if (flaggedCount >= 3) {
    m3 = {
      id: 'm3', type: 'review',
      target: 3,
      description: 'Review 3 flagged questions with Max',
      xp_reward: 20, progress: 0, completed: false,
    }
  } else {
    m3 = {
      id: 'm3', type: 'questions',
      subject: secondWeakest[0], target: 15,
      description: `Answer 15 ${secondWeakest[0]} questions`,
      xp_reward: 20, progress: 0, completed: false,
    }
  }

  return {
    date: todayStr(),
    missions: [m1, m2, m3],
    all_complete: false,
  }
}

// Pure functions — all take arrays of enriched attempt objects, return computed values.

export const SYSTEM_LABELS = {
  cardiopulmonary: 'Cardiovascular & Pulmonary',
  musculoskeletal: 'Musculoskeletal',
  neuromuscular:   'Neuromuscular & Nervous',
  integumentary:   'Integumentary & Lymphatic',
  other:           'Other Systems',
}

export const SUBJECT_TO_SYSTEM = {
  'Musculoskeletal':              'musculoskeletal',
  'Neuromuscular':                'neuromuscular',
  'Cardiovascular and Pulmonary': 'cardiopulmonary',
  'Integumentary':                'integumentary',
  'Other':                        'other',
}

const SYSTEMS = Object.keys(SYSTEM_LABELS)

function bodyScore(attempt, system) {
  return attempt?.body?.find((b) => b.system === system)?.scale_score ?? null
}

export function getScoreTrend(attempts, system) {
  if (attempts.length < 2) return 'flat'
  const recent = bodyScore(attempts[attempts.length - 1], system)
  const prev   = bodyScore(attempts[attempts.length - 2], system)
  if (recent == null || prev == null) return 'flat'
  const delta = recent - prev
  if (delta >= 20) return 'up'
  if (delta <= -20) return 'down'
  return 'flat'
}

export function getGapFromPassing(scaleScore, threshold = 600) {
  return scaleScore - threshold
}

export function getPriorityLabel(scaleScore) {
  if (scaleScore >= 600) return 'Passing'
  if (scaleScore >= 580) return 'Near'
  if (scaleScore >= 540) return 'Focus'
  return 'Critical'
}

export function detectPlateau(attempts, tolerance = 10) {
  if (attempts.length < 3) return false
  const last3 = attempts.slice(-3).map((a) => a.scale_score)
  return Math.max(...last3) - Math.min(...last3) <= tolerance
}

export function detectFatigue(latestAttempt) {
  const secs = latestAttempt?.sections
  if (!secs?.length || secs.length < 4) return false
  const sorted   = [...secs].sort((a, b) => a.section_number - b.section_number)
  const earlyAvg = (sorted[0].scale_score + sorted[1].scale_score) / 2
  const lateArr  = sorted.slice(3)
  const lateAvg  = lateArr.reduce((s, x) => s + x.scale_score, 0) / lateArr.length
  return earlyAvg - lateAvg > 50
}

export function detectPracticeGaps(practiceAccuracy, latestAttempt) {
  return (practiceAccuracy || [])
    .filter(({ accuracy, subject }) => {
      if (accuracy < 0.75) return false
      const sys   = SUBJECT_TO_SYSTEM[subject]
      const score = sys ? bodyScore(latestAttempt, sys) : null
      return score != null && score < 560
    })
    .map(({ subject, accuracy }) => ({
      subject,
      practiceAccuracy: Math.round(accuracy * 100),
      npteScore: bodyScore(latestAttempt, SUBJECT_TO_SYSTEM[subject]),
    }))
}

export function getWeakestSystems(attempt, n = 3) {
  return [...(attempt?.body || [])].sort((a, b) => a.scale_score - b.scale_score).slice(0, n)
}

export function getStrongestSystem(attempt) {
  if (!attempt?.body?.length) return null
  return [...attempt.body].sort((a, b) => b.scale_score - a.scale_score)[0]
}

export function computeGapMatrix(attempts) {
  if (!attempts?.length) return []
  const latest = attempts[attempts.length - 1]
  return SYSTEMS.map((sys) => {
    const score = bodyScore(latest, sys)
    return {
      system:    sys,
      label:     SYSTEM_LABELS[sys],
      score,
      gap:       score != null ? getGapFromPassing(score) : null,
      trend:     getScoreTrend(attempts, sys),
      priority:  score != null ? getPriorityLabel(score) : '—',
    }
  }).filter((r) => r.score != null)
}

export function computeInsightCards(attempts, practiceAccuracy) {
  if (!attempts?.length) return []
  const latest = attempts[attempts.length - 1]
  const prev   = attempts.length >= 2 ? attempts[attempts.length - 2] : null
  const cards  = []

  // Biggest drop
  if (prev) {
    let drop = null
    ;(latest.body || []).forEach((b) => {
      const prevScore = bodyScore(prev, b.system)
      if (prevScore == null) return
      const delta = prevScore - b.scale_score
      if (delta > 30 && (!drop || delta > drop.delta)) {
        drop = { system: b.system, delta, score: b.scale_score }
      }
    })
    if (drop) {
      cards.push({
        id: 'biggest_drop',
        title: 'Biggest drop since last attempt',
        body: `${SYSTEM_LABELS[drop.system]} fell ${drop.delta} points to ${drop.score} — your most significant regression.`,
        system: drop.system,
      })
    }
  }

  // Plateau
  if (detectPlateau(attempts)) {
    const scores = attempts.slice(-3).map((a) => a.scale_score)
    cards.push({
      id: 'plateau',
      title: 'Score plateau detected',
      body: `Your last 3 attempts scored ${scores.join(', ')} — within ±10 points of each other. A strategy shift is needed to break through.`,
      system: null,
    })
  }

  // Consistent weak area (below 580 in 3+ attempts)
  if (attempts.length >= 3) {
    SYSTEMS.forEach((sys) => {
      const count = attempts.filter((a) => {
        const s = bodyScore(a, sys); return s != null && s < 580
      }).length
      if (count >= 3) {
        cards.push({
          id: `consistent_weak_${sys}`,
          title: 'Consistent weak area',
          body: `${SYSTEM_LABELS[sys]} has been below 580 in ${count} attempts (most recent: ${bodyScore(latest, sys)}).`,
          system: sys,
        })
      }
    })
  }

  // Fatigue
  if (detectFatigue(latest)) {
    cards.push({
      id: 'fatigue',
      title: 'Fatigue pattern detected',
      body: 'Your late sections (4–5) score 50+ points below early sections (1–2). Test-taking stamina should be a training priority.',
      system: null,
    })
  }

  // Practice-to-real gaps
  detectPracticeGaps(practiceAccuracy, latest).forEach((g) => {
    cards.push({
      id: `practice_gap_${g.subject}`,
      title: 'Practice-to-real gap',
      body: `You score ${g.practiceAccuracy}% on ${g.subject} in-app but only ${g.npteScore} on the real NPTE — practice conditions may not be transferring.`,
      system: SUBJECT_TO_SYSTEM[g.subject] ?? null,
      subject: g.subject,
    })
  })

  // Strongest system
  const strongest = getStrongestSystem(latest)
  if (strongest) {
    cards.push({
      id: 'strongest',
      title: 'Strongest system',
      body: `${SYSTEM_LABELS[strongest.system]} is your highest-scoring area at ${strongest.scale_score} — well above the 600 passing threshold.`,
      system: strongest.system,
    })
  }

  return cards
}

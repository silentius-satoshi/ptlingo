// Direct browser call to Anthropic API.
// Requires VITE_ANTHROPIC_API_KEY in .env.local (same file as ANTHROPIC_API_KEY, prefixed for Vite).

import { SYSTEM_LABELS, SUBJECT_TO_SYSTEM, computeGapMatrix, getScoreTrend } from './insightEngine'

const PWA_LABELS = {
  pt_exam:       'PT Examination',
  foundations:   'Foundations/DDx',
  interventions: 'Interventions',
  nonsystem:     'Nonsystem Domains',
}

export function getDaysRemaining(examDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exam  = new Date(examDate)
  return Math.max(0, Math.floor((exam - today) / 86400000))
}

export function getWeeksRemaining(examDate) {
  return Math.max(0, Math.floor(getDaysRemaining(examDate) / 7))
}

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function pct(items_correct, total_items) {
  if (!total_items) return '—'
  return `${Math.round(items_correct / total_items * 100)}%`
}

function assemblePrompt({ attempts, practiceAccuracy, config, weeksRemaining, isRegeneration, currentWeekNumber }) {
  const today    = new Date()
  const todayStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const gapMatrix = attempts.length ? computeGapMatrix(attempts) : []

  const attemptsJson = attempts.map((a) => ({
    attempt_number: a.attempt_number,
    exam_date:      a.exam_date,
    scale_score:    a.scale_score,
    passed:         a.passed,
    body_scores:    a.body?.map((b) => ({ system: SYSTEM_LABELS[b.system] || b.system, scale_score: b.scale_score, pct: pct(b.items_correct, b.total_items) })) ?? [],
    pwa_scores:     a.pwa?.map((p) => ({ activity: PWA_LABELS[p.activity] || p.activity, scale_score: p.scale_score, pct: pct(p.items_correct, p.total_items) })) ?? [],
    section_scores: a.sections?.map((s) => ({ section: s.section_number, scale_score: s.scale_score, pct: pct(s.items_correct, s.total_items) })) ?? [],
  }))

  const practiceLines = (practiceAccuracy || [])
    .map((p) => `  ${p.subject}: ${Math.round(p.accuracy * 100)}% in-app accuracy`)
    .join('\n')

  const gapLines = gapMatrix
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))
    .map((r) => `  ${r.label}: scale ${r.score} | ${r.gap >= 0 ? '+' : ''}${r.gap} from 600 | trend: ${r.trend.toUpperCase()} | ${r.priority}`)
    .join('\n')

  const regenerationLine = isRegeneration
    ? `Regeneration: mid-plan from week ${currentWeekNumber} of original plan`
    : 'Regeneration: first-time generation'

  return `Candidate: Eric Brooks | Jurisdiction: ${config.jurisdiction || 'Texas'}
Exam date: ${fmt(config.examDate)} | Today: ${todayStr} | Weeks remaining: ${weeksRemaining}
Daily study hours: ${config.dailyHours} | Study days/week: ${config.studyDaysPerWeek} | Working full-time: ${config.workingFullTime ? 'yes' : 'no'}
${regenerationLine}
${config.userNotes ? `User priorities: ${config.userNotes}` : ''}

NPTE Attempt History (${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}, chronological):
${JSON.stringify(attemptsJson, null, 2)}

Gap Analysis (most recent attempt):
Body Systems:
${gapLines}

In-App Practice Accuracy (all-time from submissions):
${practiceLines || '  No practice data yet.'}

Generate a personalized ${weeksRemaining}-week study plan starting from today, ${todayStr}.
Order weekly themes by gap severity — Critical areas first. Follow all calendar structure rules exactly.`
}

const SYSTEM_PROMPT = `You are an NPTE study coach generating a personalized week-by-week study plan for a PT candidate on their final allowed attempt.

The candidate's weeks remaining is provided in the user message. Use that number — not a hardcoded assumption — to scale the entire plan. The plan must fit exactly within the weeks available.

CALENDAR STRUCTURE RULES (follow these exactly):
- One primary body system theme per week, with a part label when split across multiple weeks (e.g. "Neuromuscular — Part 1")
- Daily question targets: 40–60 questions/day on content study days
- Include Adaptive Learning days within content weeks — mixed questions from the current system after initial content days
- Every Sunday is a mandatory rest day — no questions
- Schedule a full-length practice test (180 questions) every 2 weeks on a Friday
- The Monday after each practice test is always a review day (analyze results, no new content)
- The final week always follows this exact structure regardless of total plan duration:
  Mon: 50 Adaptive Learning (most missed topics from all tests)
  Tue: FINAL COMPREHENSIVE EXAM
  Wed: 50 Adaptive Learning
  Thu: 50 Adaptive Learning
  Fri: Light review of final concerns only
  Sat: Light review + mental preparation
  Sun: FINAL REST

DURATION SCALING RULES:
If weeks_remaining >= 12: Neuromuscular 3 wks, Cardio 2 wks, Integumentary+Other 1 wk shared, Non-Systems 2 wks, Musculoskeletal 3-4 days confidence pass, Final week 1 wk, 1 practice test every 2 wks (6 total).
If 8-11 weeks: compress each allocation proportionally, minimum 1 week for Critical systems, drop Adaptive Learning days if needed.
If < 8 weeks: drop Passing systems entirely, increase daily targets to 55-70, flag urgency in summary.

PERSONALIZATION RULES:
- Order weekly themes by gap severity — Critical areas first, Passing areas last
- Interventions (work activity) must be woven into every study week as 10-15 daily intervention-type questions alongside the system's content
- Do not allocate a full week to any system already above 600 unless weeks_remaining >= 12 and space exists

Return your response as valid JSON with this exact shape — no markdown, no preamble:

{
  "summary": "3-4 sentence strategic overview",
  "critical_focus_areas": [{ "system": "...", "reason": "one sentence" }],
  "weekly_interventions_note": "One sentence on Interventions threading",
  "weeks": [
    {
      "week_number": 1,
      "date_range": "May 5 – May 11",
      "theme": "Neuromuscular & Nervous Systems — Part 1",
      "days": [
        {
          "day": "Monday",
          "date": "May 5",
          "type": "study",
          "subject": "Neuromuscular",
          "question_target": 60,
          "interventions_questions": 10,
          "focus_topics": ["Topic A", "Topic B"],
          "note": "Optional tip"
        }
      ],
      "week_total_questions": 380,
      "weekly_goal": "Specific measurable target",
      "milestone": "What success looks like by end of week"
    }
  ],
  "practice_tests": [{ "week": 2, "day": "Friday", "date": "May 16", "type": "Full 180-question practice exam" }],
  "final_week_strategy": "Detailed advice for the final week",
  "what_not_to_do": ["Specific pitfall given this candidate's history"]
}`

export async function generateStudyPlan({ attempts, practiceAccuracy, config, previousPlan }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env.local')

  const weeksRemaining     = getWeeksRemaining(config.examDate)
  const isRegeneration     = !!previousPlan
  const currentWeekNumber  = isRegeneration ? (previousPlan.weeks?.length ?? weeksRemaining) - weeksRemaining + 1 : null

  const userMessage = assemblePrompt({
    attempts,
    practiceAccuracy,
    config,
    weeksRemaining,
    isRegeneration,
    currentWeekNumber,
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 apiKey,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 8000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const raw  = data.content?.[0]?.text ?? ''

  try {
    return { ...JSON.parse(raw), weeksRemaining, generatedAt: new Date().toISOString() }
  } catch {
    throw new Error('Plan generation failed — model returned invalid JSON. Try again.')
  }
}

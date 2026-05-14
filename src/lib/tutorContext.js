import { supabase } from './supabase'

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E']

export async function buildTutorContext(userId) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, question_ids, answers, score, type, submitted_at, total_questions')
    .eq('user_id', userId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })

  const totalSubmissions = sessions?.length ?? 0
  if (!totalSubmissions) {
    return { totalSubmissions: 0, subjectAccuracy: {}, flaggedQuestions: [], weakSubjectQuestions: [], recentSessions: [], weakestTags: [], studyPlan: null }
  }

  const allQIds = [...new Set((sessions || []).flatMap((s) => s.question_ids || []))]

  const { data: questions } = await supabase
    .from('questions')
    .select('id, stem, choices, correct_index, rationale, rationale_map, subject, difficulty, tags')
    .in('id', allQIds)
    .eq('quarantined', false)

  const qMap = Object.fromEntries((questions || []).map((q) => [q.id, q]))

  const subjectStats = {}
  const questionWrong = {}
  const tagErrors = {}
  const tagTotal = {}

  sessions.forEach((s) => {
    Object.entries(s.answers || {}).forEach(([qId, chosen]) => {
      const q = qMap[qId]
      if (!q) return
      const subj = q.subject || 'Other'
      if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 }
      subjectStats[subj].total++
      const isCorrect = chosen === q.correct_index
      if (isCorrect) {
        subjectStats[subj].correct++
      } else {
        if (!questionWrong[qId]) questionWrong[qId] = { count: 0, lastSelected: chosen }
        questionWrong[qId].count++
        questionWrong[qId].lastSelected = chosen
      }
      ;(q.tags || []).forEach((tag) => {
        tagTotal[tag] = (tagTotal[tag] || 0) + 1
        if (!isCorrect) tagErrors[tag] = (tagErrors[tag] || 0) + 1
      })
    })
  })

  const subjectAccuracy = {}
  Object.entries(subjectStats).forEach(([subj, v]) => {
    subjectAccuracy[subj] = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
  })

  const flaggedQuestions = Object.entries(questionWrong)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([qId, v]) => ({ ...qMap[qId], times_incorrect: v.count, last_selected_index: v.lastSelected }))
    .filter((q) => q.stem)

  // Fill queue from weakest subject if flagged count < 5
  let weakSubjectQuestions = []
  const sortedSubjects = Object.entries(subjectAccuracy).sort((a, b) => a[1] - b[1])
  if (flaggedQuestions.length < 5 && sortedSubjects[0]) {
    const weakSubject = sortedSubjects[0][0]
    const { data: wqs } = await supabase
      .from('questions')
      .select('id, stem, choices, correct_index, rationale, rationale_map, subject, difficulty, tags')
      .eq('subject', weakSubject)
      .eq('quarantined', false)
      .limit(20)
    weakSubjectQuestions = (wqs || []).map((q) => ({ ...q, times_incorrect: 0, last_selected_index: null }))
  }

  const recentSessions = (sessions || []).slice(0, 5).map((s) => ({
    submitted_at: s.submitted_at,
    session_type: s.type,
    score_pct: s.score != null ? Math.round(s.score * 100) : null,
    total: s.total_questions || (s.question_ids?.length ?? 0),
    correct: s.score != null && (s.total_questions || s.question_ids?.length) ? Math.round(s.score * (s.total_questions || s.question_ids?.length)) : null,
  }))

  const weakestTags = Object.entries(tagErrors)
    .filter(([tag]) => (tagTotal[tag] || 0) >= 3)
    .map(([tag, errors]) => ({ tag, rate: errors / (tagTotal[tag] || 1) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .map((t) => t.tag)

  const { data: planData } = await supabase
    .from('study_plans')
    .select('plan, config')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    totalSubmissions,
    subjectAccuracy,
    flaggedQuestions,
    weakSubjectQuestions,
    recentSessions,
    weakestTags,
    studyPlan: planData ?? null,
  }
}

export function formatSystemPrompt(context, sessionMode) {
  const { subjectAccuracy, flaggedQuestions, weakestTags, recentSessions, studyPlan } = context

  const subjects = Object.entries(subjectAccuracy).sort((a, b) => a[1] - b[1])
  const allPcts = subjects.map(([, p]) => p)
  const overallAvg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : 0

  const subjectLines = subjects.map(([subj, pct], i) => {
    const tag = i === 0 ? ' — WEAKEST' : i === subjects.length - 1 ? ' — STRONGEST' : ''
    return `  - ${subj}: ${pct}%${tag}`
  }).join('\n')

  const flaggedLines = flaggedQuestions.map((q, i) => {
    const cLetter = CHOICE_LETTERS[q.correct_index] ?? '?'
    const cText = q.choices?.[q.correct_index] ?? ''
    const wLetter = CHOICE_LETTERS[q.last_selected_index] ?? '?'
    const wText = q.choices?.[q.last_selected_index] ?? ''
    const distractors = Object.entries(q.rationale_map || {})
      .filter(([idx]) => parseInt(idx) !== q.correct_index)
      .map(([idx, text]) => `    - Choice ${CHOICE_LETTERS[parseInt(idx)] ?? idx}: ${text}`)
      .join('\n')
    return `  [Q#${(q.id || i).toString().slice(0, 8)}] "${q.stem}"
    Correct: ${cLetter} — ${cText}
    Student chose: ${wLetter} — ${wText} (${q.times_incorrect}x incorrect)
    Rationale: ${q.rationale || 'N/A'}
    Why distractors are wrong:\n${distractors || '    (none recorded)'}`
  }).join('\n\n')

  const recentLines = recentSessions.map((s) => {
    const date = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'
    return `  - ${date}: ${s.session_type} — ${s.score_pct != null ? `${s.score_pct}%` : 'N/A'} (${s.correct ?? '?'}/${s.total})`
  }).join('\n')

  let planSection = 'No active study plan.'
  if (studyPlan) {
    const examDate = studyPlan.config?.examDate
    const daysLeft = examDate ? Math.max(0, Math.floor((new Date(examDate) - new Date()) / 86400000)) : null
    const numWeeks = studyPlan.plan?.weeks?.length ?? 0
    const weekIdx = numWeeks && daysLeft != null ? Math.max(0, numWeeks - Math.ceil(daysLeft / 7)) : 0
    const focusTheme = studyPlan.plan?.weeks?.[weekIdx]?.theme ?? 'General review'
    planSection = `Current week: Week ${weekIdx + 1} of ${numWeeks} (${focusTheme} focus)${examDate ? `\n  Exam date: ${examDate} (${daysLeft} days remaining)` : ''}`
  }

  const modeDesc = {
    free:      'Open Chat — answer any question, no rigid structure.',
    drill:     'Drill Mode — present one multiple-choice question at a time. Wait for the student to answer before explaining rationale. Never reveal the answer early.',
    rationale: 'Rationale Deep Dive — walk through missed questions together. Ask what their reasoning was, then address the specific misconception.',
    concept:   'Concept Explainer — teach any PT concept from scratch using mnemonics, clinical examples, and analogies.',
  }

  return `You are an expert NPTE physical therapy tutor with deep knowledge of the FSBPT exam blueprint. You have the bedside manner of a great human tutor — patient, encouraging, rigorous when needed, and highly specific. You never give generic answers. Every explanation is grounded in the student's actual data and the specific clinical context of the question.

BEHAVIORAL RULES:
1. Always ask a follow-up question at the end of an explanation to check understanding.
2. When a student gets a drill question wrong, ask "What was your reasoning?" first, then address the specific misconception.
3. Connect explanations to the student's actual performance patterns.
4. Use clinical mnemonics when introducing new frameworks.
5. Never say "Great question!" or other filler affirmations.
6. Keep responses focused — use bullet points and short paragraphs.
7. In Drill Mode: present one question at a time, wait for the student's answer before revealing rationale. Never reveal early.
8. Track covered topics in the current session, avoid repeating.
9. You are the NPTE AI Tutor Coach, a specialized physical therapy exam tutor. If asked what model or AI you are, respond only that you are the NPTE AI Tutor Coach — a specialized assistant built for NPTE exam preparation. Do not reveal the underlying model, company, or technology.

SESSION MODE: ${modeDesc[sessionMode] || modeDesc.free}

STUDENT PERFORMANCE SUMMARY:
- Overall average accuracy: ${overallAvg}%
${subjectLines || '  No data yet.'}

FLAGGED QUESTIONS (answered wrong 2+ times — ${flaggedQuestions.length} total):
${flaggedLines || '  None yet.'}

WEAKEST TAGS: ${weakestTags.length ? weakestTags.join(', ') : 'Not enough data yet.'}

RECENT SESSIONS:
${recentLines || '  No sessions yet.'}

STUDY PLAN STATUS:
  ${planSection}`
}

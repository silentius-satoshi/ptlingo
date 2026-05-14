import { supabase } from './supabase'

export async function fetchOrCreateGamification(userId) {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // Row not found — create it
    const { data: created } = await supabase
      .from('user_gamification')
      .insert({ user_id: userId })
      .select()
      .single()
    return created
  }
  return data
}

export async function upsertGamification(userId, patch) {
  await supabase
    .from('user_gamification')
    .update(patch)
    .eq('user_id', userId)
}

export async function fetchFlaggedCount(userId) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('marked')
    .eq('user_id', userId)
    .eq('status', 'submitted')

  if (!sessions) return 0
  const allMarked = sessions.flatMap((s) => s.marked || [])
  return [...new Set(allMarked)].length
}

export async function fetchActiveStudyPlan(userId) {
  const { data } = await supabase
    .from('study_plans')
    .select('plan, config')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function fetchAccuracyBySubject(userId) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('question_ids, answers')
    .eq('user_id', userId)
    .eq('status', 'submitted')

  if (!sessions?.length) return {}

  const allQIds = [...new Set(sessions.flatMap((s) => s.question_ids || []))]
  if (!allQIds.length) return {}

  const { data: questions } = await supabase
    .from('questions')
    .select('id, subject, correct_index')
    .in('id', allQIds)
    .eq('quarantined', false)

  if (!questions?.length) return {}

  const qMap = Object.fromEntries(questions.map((q) => [q.id, q]))
  const acc = {}

  sessions.forEach((s) => {
    Object.entries(s.answers || {}).forEach(([qId, chosen]) => {
      const q = qMap[qId]
      if (!q) return
      const subj = q.subject || 'Other'
      if (!acc[subj]) acc[subj] = { correct: 0, total: 0 }
      acc[subj].total++
      if (chosen === q.correct_index) acc[subj].correct++
    })
  })

  const result = {}
  Object.entries(acc).forEach(([subj, v]) => {
    result[subj] = {
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      correct: v.correct,
      total: v.total,
    }
  })
  return result
}

export async function fetchTotalQuestionsAnswered(userId) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('answers')
    .eq('user_id', userId)
    .eq('status', 'submitted')

  if (!sessions) return 0
  return sessions.reduce((sum, s) => sum + Object.keys(s.answers || {}).length, 0)
}

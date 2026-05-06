import { supabase } from './supabase'

export async function getActivePlan(userId) {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPlanHistory(userId) {
  const { data, error } = await supabase
    .from('study_plans')
    .select('id, generated_at, exam_date, weeks_remaining, config, plan')
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('generated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function savePlan(userId, { examDate, weeksRemaining, config, plan, completionSnapshot }) {
  // Deactivate current active plan (snapshot completion)
  const current = await getActivePlan(userId)
  if (current) {
    await supabase
      .from('study_plans')
      .update({ is_active: false, completion_snapshot: completionSnapshot ?? null })
      .eq('id', current.id)
  }

  const { data, error } = await supabase
    .from('study_plans')
    .insert({
      user_id:         userId,
      exam_date:       examDate,
      weeks_remaining: weeksRemaining,
      config,
      plan,
      is_active:       true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function restorePlan(planId, userId, completionSnapshot) {
  // Archive current active plan
  const current = await getActivePlan(userId)
  if (current) {
    await supabase
      .from('study_plans')
      .update({ is_active: false, completion_snapshot: completionSnapshot ?? null })
      .eq('id', current.id)
  }

  const { data, error } = await supabase
    .from('study_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePlan(planId, userId) {
  const { error } = await supabase.from('study_plans').delete().eq('id', planId).eq('user_id', userId)
  if (error) throw error
}

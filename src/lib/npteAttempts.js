import { supabase } from './supabase'

const PWA_KEYS  = ['pt_exam', 'foundations', 'interventions', 'nonsystem']
const BODY_KEYS = ['cardiopulmonary', 'musculoskeletal', 'neuromuscular', 'integumentary', 'other']

export async function fetchAttempts(userId) {
  const { data: attempts, error } = await supabase
    .from('npte_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('attempt_number', { ascending: true })
  if (error) throw error
  if (!attempts?.length) return []

  const ids = attempts.map((a) => a.id)
  const [{ data: pwa }, { data: body }, { data: sections }] = await Promise.all([
    supabase.from('npte_attempt_pwa').select('*').in('attempt_id', ids),
    supabase.from('npte_attempt_body').select('*').in('attempt_id', ids),
    supabase.from('npte_attempt_sections').select('*').in('attempt_id', ids),
  ])

  return attempts.map((a) => ({
    ...a,
    pwa:      (pwa      || []).filter((r) => r.attempt_id === a.id),
    body:     (body     || []).filter((r) => r.attempt_id === a.id),
    sections: (sections || [])
      .filter((r) => r.attempt_id === a.id)
      .sort((x, y) => x.section_number - y.section_number),
  }))
}

export async function saveAttempt(userId, formData, existingId = null) {
  const meta = {
    user_id:             userId,
    attempt_number:      parseInt(formData.attempt_number),
    exam_date:           formData.exam_date,
    jurisdiction:        formData.jurisdiction || null,
    total_items:         parseInt(formData.total_items),
    items_correct:       parseInt(formData.items_correct),
    scale_score:         parseInt(formData.scale_score),
    passed:              formData.passed,
    retake_pass_rate:    formData.retake_pass_rate    ? parseInt(formData.retake_pass_rate)    : null,
    retake_median_score: formData.retake_median_score ? parseInt(formData.retake_median_score) : null,
  }

  let attemptId = existingId
  if (existingId) {
    const { error } = await supabase.from('npte_attempts').update(meta).eq('id', existingId)
    if (error) throw error
    await Promise.all([
      supabase.from('npte_attempt_pwa').delete().eq('attempt_id', existingId),
      supabase.from('npte_attempt_body').delete().eq('attempt_id', existingId),
      supabase.from('npte_attempt_sections').delete().eq('attempt_id', existingId),
    ])
  } else {
    const { data, error } = await supabase.from('npte_attempts').insert(meta).select().single()
    if (error) throw error
    attemptId = data.id
  }

  const toInt = (v) => (v !== '' && v !== undefined ? parseInt(v) || 0 : 0)
  await Promise.all([
    supabase.from('npte_attempt_pwa').insert(
      PWA_KEYS.map((k) => ({
        attempt_id:    attemptId,
        activity:      k,
        total_items:   toInt(formData.pwa[k].total_items),
        items_correct: toInt(formData.pwa[k].items_correct),
        scale_score:   toInt(formData.pwa[k].scale_score),
      })),
    ),
    supabase.from('npte_attempt_body').insert(
      BODY_KEYS.map((k) => ({
        attempt_id:    attemptId,
        system:        k,
        total_items:   toInt(formData.body[k].total_items),
        items_correct: toInt(formData.body[k].items_correct),
        scale_score:   toInt(formData.body[k].scale_score),
      })),
    ),
    supabase.from('npte_attempt_sections').insert(
      [1, 2, 3, 4, 5].map((n) => ({
        attempt_id:     attemptId,
        section_number: n,
        total_items:    toInt(formData.sections[n].total_items),
        items_correct:  toInt(formData.sections[n].items_correct),
        scale_score:    toInt(formData.sections[n].scale_score),
      })),
    ),
  ])

  return attemptId
}

export async function deleteAttempt(attemptId) {
  const { error } = await supabase.from('npte_attempts').delete().eq('id', attemptId)
  if (error) throw error
}

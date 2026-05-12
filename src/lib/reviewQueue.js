export async function fetchDueReviews(userId, supabase) {
  const { data } = await supabase
    .from('question_reviews')
    .select('question_id, next_review_at')
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(20)
  return data ?? []
}

export async function getDueCount(userId, supabase) {
  const { count } = await supabase
    .from('question_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())
  return count ?? 0
}

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL')!

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get all due reviews grouped by user
  const { data: dueReviews } = await supabase
    .from('question_reviews')
    .select('user_id')
    .lte('next_review_at', new Date().toISOString())

  if (!dueReviews?.length) {
    return new Response(JSON.stringify({ sent: 0 }))
  }

  // Count per user
  const userCounts: Record<string, number> = {}
  for (const row of dueReviews) {
    userCounts[row.user_id] = (userCounts[row.user_id] ?? 0) + 1
  }

  // Get push subscriptions for those users
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', Object.keys(userCounts))

  let sent = 0
  for (const sub of subs ?? []) {
    const count = userCounts[sub.user_id]
    const payload = JSON.stringify({
      title: 'PT Lingo',
      body: `${count} question${count !== 1 ? 's' : ''} due for review`,
      icon: '/icons/icon-192x192.png',
      url: '/question-bank?mode=review&limit=10',
    })
    try {
      await webpush.sendNotification(sub.subscription, payload)
      sent++
    } catch (err: any) {
      // 410 = subscription expired, clean it up
      if (err.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

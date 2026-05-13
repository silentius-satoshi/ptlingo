# Plan: ThePathPage.jsx — "Review Now" creates session directly

## Context

Currently, every "Review Now" tap in ThePathPage navigates the user to
`/question-bank?mode=review&limit=N`, which bounces them out to a separate
page before starting the session. The goal is to match the UX of path node
sessions: tap → loading overlay → exam starts immediately, without visiting
QuestionBankPage at all.

## File to change

`src/pages/ThePathPage.jsx`

---

## Change 1 — Add `handleReviewPress` after `handleNodePress` (after line 278)

```js
const handleReviewPress = async () => {
  if (nodeStarting) return
  setNodeStarting(true)
  try {
    const { user } = useAuthStore.getState()

    const { data: dueReviews } = await supabase
      .from('question_reviews')
      .select('question_id')
      .eq('user_id', user.id)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(10)

    if (!dueReviews?.length) {
      setNodeStarting(false)
      return
    }

    const questionIds = dueReviews.map(r => r.question_id)

    const { data: session } = await supabase
      .from('sessions')
      .insert({
        user_id:         user.id,
        type:            'quiz',
        mode:            'practice',
        status:          'in_progress',
        question_ids:    questionIds,
        total_questions: questionIds.length,
        current_index:   0,
        time_remaining:  9 * 3600,
        time_multiplier: 1,
        subjects:        ['Review Queue'],
        difficulty:      [],
        answers:         {},
        marked:          [],
      })
      .select()
      .single()

    if (session) navigate(`/exam/${session.id}`)
  } catch (err) {
    console.error('Review start error:', err)
  } finally {
    setNodeStarting(false)
  }
}
```

---

## Change 2 — `ActiveSectionBanner` prop (line 294)

**Before:**
```jsx
onReviewTap={() => navigate(`/question-bank?mode=review&limit=${Math.min(dueCount, 10)}`)}
```

**After:**
```jsx
onReviewTap={handleReviewPress}
```

---

## Change 3 — "Review Now" button onClick in alert modal (lines 481–484)

**Before:**
```jsx
onClick={() => {
  setShowReviewAlert(false)
  navigate(`/question-bank?mode=review&limit=${Math.min(dueCount, 10)}`)
}}
```

**After:**
```jsx
onClick={() => {
  setShowReviewAlert(false)
  handleReviewPress()
}}
```

---

## Notes

- No other files need changes.
- `ActiveSectionBanner.jsx` already invokes `onReviewTap` as a plain callback — no changes needed there.
- All other `/question-bank` navigations in the codebase are unrelated (non-review modes from other pages).
- The existing `nodeStarting` state and loading overlay are reused — review sessions show the same "Loading session..." spinner while creating.

---

## Verification

1. `npm run build` — must exit 0, no errors.
2. On ThePathPage with due reviews:
   - Tap "Due for Review" in the missions dropdown → loading overlay appears → lands on `/exam/:id`.
   - Tap "Review Now" in the alert modal → modal closes, loading overlay appears → lands on `/exam/:id`.
3. With no due reviews: tapping either entry closes/resets UI without navigating.
4. No navigation to `/question-bank?mode=review` occurs from ThePathPage.

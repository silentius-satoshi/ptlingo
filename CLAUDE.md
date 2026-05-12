# PT Lingo — Project Reference
Step 36 complete. Step 37 next (PostSessionFlow).

## Stack
React 18 + Vite 5 | Tailwind 3 | React Router v6 | Zustand
Supabase JS v2 | Framer Motion | Recharts
OpenRouter (Gemini Flash) — AI Tutor Max (~$0.007/exchange)
Anthropic claude-sonnet-4-6 — study plan only (low-freq)
vite-plugin-pwa + Workbox — PWA/iOS
⚠️ claude-sonnet-4-20250514 retires June 15 2026

## Steps
1–30: scaffold→perf review→AI tutor→gamification→PWA→2FA→OAuth→passkeys→rebrand ✅
31-A: Answer Feedback Sheet ✅
31-B: Path 3D nodes + START bubble + completion ring ✅
31-C: Rationale screen + A/B/C/D slider ✅
31-D: Treasure chests (Supabase) ✅
31-E: Streak calendar + StreakModal ✅
31-F: Quit friction modal (7-variant) ✅
31-G: Energy 25/25 + coins header ✅
32: MotivationBreak (25 triggers, 5 moods) ✅
33: PT Lingo Score + mascot TopStatsBar + Achievements hero ✅
34: Shop page (energy/XP boost/freeze/shield) ✅
35: Settings page (/settings, avatar, profile, notifications, security) ✅
36: PT Lingo casual quiz mode + onboarding modal ✅
37: PostSessionFlow ⬜ next
38: Retention engine (spaced rep, variable rewards, smart notifs) ⬜

## Routes
/auth AuthPage standalone
/ DashboardPage AppLayout
/submissions /notes /question-bank /performance
/performance-review /tutor AppLayout
/path ThePathPage AppLayout
/achievements AchievementsPage AppLayout
/shop ShopPage AppLayout
/settings SettingsPage AppLayout
/exam/:examId/start MockExamStartPage AppLayout
/exam/:sessionId ExamPage full-screen
/review/:sessionId ReviewPage full-screen
/results/:sessionId ResultsPage full-screen
/rationale RationalePage full-screen
/auth/callback /mfa-challenge standalone

## Supabase Schema
questions: id, content, choices(array), correct_index(int), subject, difficulty, tags, rationale
sessions: id, user_id, type(exam|quiz), mode, status(in_progress|paused|submitted),
  time_multiplier, time_remaining, current_index, question_ids(uuid[]),
  answers(jsonb), marked(uuid[]), eliminated(jsonb), highlights(jsonb),
  notes(jsonb), time_per_question(jsonb), score(float), submitted_at, started_at
notes: user_id, question_id, content
fsbpt_attempts: id, user_id, attempt_number, exam_date, scale_score,
  section_scores(jsonb), body_system_scores(jsonb), work_activity_scores(jsonb)
study_plans: id, user_id, attempt_id, plan_content, generated_at, duration_days
user_gamification: user_id, xp, level, streak, longest_streak, last_activity_date,
  hearts, energy(def 25), max_energy(def 25), last_energy_update(timestamptz),
  coins(def 0), xp_boost_active(bool), streak_freeze_count(int),
  streak_shield_expiry(timestamptz), subject_mastery(jsonb {subject:{pct,correct,total}})
daily_missions: id, user_id, mission_type, target, progress, completed, date
achievements: id, user_id, achievement_key, unlocked_at
path_milestones: id, user_id, system_name, claimed_at, xp_awarded — UNIQUE(user_id,system_name)
profiles: id(PK→auth.users), name, username, avatar_url, exam_date(def 2026-07-29)
  RLS: auth.uid()=id
push_subscriptions: id, user_id(→auth.users), subscription(jsonb) — UNIQUE(user_id)
  RLS: auth.uid()=user_id
Storage bucket: avatars (public) path:{user_id}/avatar.jpg
  INSERT/UPDATE policy: name LIKE (auth.uid()::text || '/%')

## LocalStorage Keys
ptlingo_quiz_mode        'standard'|'ptlingo'
ptlingo_quiz_mode_set    'true' — onboarding shown flag
ptlingo_profile          JSON — profile cache (no flash on refresh)
ptlingo_gam              JSON — gamification cache (no flash on refresh)
ptlingo_reminders_enabled 'true'|'false'
ptlingo_push_enabled     'true'|'false'
ptlingo_email_reminders  'true'|'false'

## Stores (Zustand)
gamificationStore (src/stores/gamificationStore.js)
  state: xp, level, streak, longestStreak, energy, maxEnergy,
    lastEnergyUpdate, coins, hearts(alias=energy), xpBoostActive,
    streakFreezeCount, streakShieldExpiry, subjectMastery,
    ptLingoScore, activeSystem, dailyMissions, achievements, loaded
  actions: load, awardXP, deductEnergy, deductHeart(alias),
    rechargeEnergy, rechargeEnergyWithCoins, addCoins,
    purchaseXpBoost, purchaseStreakFreeze, purchaseStreakShield,
    advanceStreak, advanceMission, refreshSubjectMastery,
    updateSubjectMastery, checkQuestionCountAchievements
  cache: localStorage('ptlingo_gam') seeded on init, written after load()

authStore (src/store/authStore.js)
  state: user, profile({} not null), examDate, loading
  actions: loadProfile, updateExamDate, signOut
  cache: localStorage('ptlingo_profile')
  signOut clears BOTH ptlingo_profile AND ptlingo_gam caches

sessionStore: manages active exam/quiz (answers, currentIndex, questions, etc.)

## System Config
src/constants/systemConfig.js — getSystemConfig(subjectName)
Neuromuscular          #F59E0B gold    /mascots/sparky.png
Musculoskeletal        #EF4444 crimson /mascots/flex.png
Cardiovascular/Pulm    #EC4899 rose    /mascots/pulse.png
Integumentary          #F97316 orange  /mascots/patch.png
Other Systems          #22C55E green   /mascots/flora.png
Nonsystem Domains      #3B82F6 blue    /mascots/page.png

## Gamification
Energy: 25 max, -1 per wrong answer, -1 on quit, +1/30min recharge
Coins: +50 per session submit, +50 per treasure chest
Shop: Energy Recharge 500💎 | XP Boost 750💎 | Streak Freeze 1000💎 | Shield 3000💎
XP Boost: 2× multiplier on next awardXP call, auto-deactivates
Streak Freeze: auto-applies if missed exactly 1 day, stackable
Streak Shield: 7-day window stored in streak_shield_expiry
PT Lingo Score 0-100: Musculoskeletal×0.32 + Neuromuscular×0.23
  + Cardiopulm×0.17 + Other×0.13 + Integ×0.08 + Nonsystem×0.07
Levels: Novice(0-16) Developing(17-33) Competent(34-50)
  Proficient(51-67) Advanced(68-84) Expert(85-100)
getPtLingoLevel() exported from gamificationStore

## Quiz Mode (Step 36)
Standard: two-panel desktop layout (unchanged)
PT Lingo: CasualQuizView.jsx — mascot float + speech bubble + 4 answer cards
  pendingAnswer (local) → CHECK tap → onSelectAnswer (ExamPage commit)
  Desktop: centered max-w-2xl, toolbar hidden
Onboarding: QuizModeOnboarding.jsx fires once on login
  (checks ptlingo_quiz_mode_set in localStorage)
ExamPage: const isCasual = quizMode==='ptlingo' && type==='quiz'

## MotivationBreak (Step 32)
getMotivationBreak() — module-level pure fn in ExamPage.jsx
Refs (not state): consecutiveCorrectRef, prevMaxWrongRef,
  answerHistoryRef, shownBreaksRef
Fires in handleSheetContinue() BEFORE advancing question
25 candidates, first match wins, each key fires once per session
Key order: streak_20→perfect_10→streak_15→streak_10→neuro_streak
  →streak_7→accuracy_halfway→streak_5→total_5-25→clean_energy
  →last_1→last_5→three_quarters→recovery_strong→recovery_quick
  →accuracy_climbing→halfway→exam_three_quarters→streak_milestone
  →streak_alive→low_energy→neuro_recovery→still_standing→total_3
  →streak_3→quarter→total_1

## Exam Engine
Section breaks (exam 225q only): SECTION_END=new Set([44,89,134,179])
  Index 89: mandatory 15min break. Others: optional.
Quiz top bar: progress bar (system primary) + pink energy badge
  Mobile: [✕][progress bar][⚡|N]  Desktop: [←Back][progress bar][⚡|N][≡]
Quit friction: QuitWarningModal fires if questionsRemaining>0
  onQuit: deducts 1 energy, no submit, session stays in_progress
Mobile responsive: flex-col md:flex-row (stacked on mobile)
Keyboard: 1-4 select | E eliminate | M mark | ←→ navigate
Toolbar: starts collapsed 56px, expands to 176px

## Auth (Steps 27-29 Complete)
TOTP 2FA: supabase.auth.mfa.* | useMFA.js | MFAEnrollModal.jsx
Google OAuth: GoogleSignInButton.jsx | /auth/callback
Passkeys: @simplewebauthn/browser | usePasskey.js
Biometric Lock: useBiometricLock.js | idle timeout
All security flows in Settings → Security (/settings)

## Settings Page (Step 35)
Route: /settings (dedicated page, not sheet)
Gear icon on ProfilePage → navigate('/settings')
Sections: Preferences | Profile | Notifications | Security |
  Exam Countdown | View Achievements | Sign Out
Avatar: Supabase Storage avatars bucket, {userId}/avatar.jpg
Password change: requires signInWithPassword re-auth first
Exam date: updates profiles.exam_date + authStore.examDate
  Propagates to TopStatsBar countdown pill everywhere

## Key Components (Steps 31-36)
src/components/drill/
  AnswerFeedbackSheet.jsx  QuitWarningModal.jsx  MotivationBreak.jsx
src/components/exam/
  CasualQuizView.jsx  ExamTopBar.jsx
src/components/gamification/
  PathNode.jsx  TreasureChest.jsx  OutOfEnergyModal.jsx  EnergyBar.jsx
src/components/streak/
  StreakCalendar.jsx  StreakModal.jsx
src/components/onboarding/
  QuizModeOnboarding.jsx
src/components/layout/
  TopStatsBar.jsx (mobile: [mascot+score][🔥][💎][⚡|N][Nd])
  SidebarHeader.jsx

## Gotchas
- profile initial state is {} not null (prevents flash)
- signOut clears BOTH localStorage caches
- Workbox precache limit raised to 4MB (lottie-react)
- Import script: needs --- before first question or Q1 skipped
- React StrictMode streaming double-fire: use refs, not state updaters
- ptlingo_quiz_mode_set: clear to re-trigger onboarding
- VITE_VAPID_PUBLIC_KEY not yet set — push notifs show graceful fallback
- VS Code extension may revert to Opus silently — run /context to verify
- question_reviews table not yet created — needed for Step 38

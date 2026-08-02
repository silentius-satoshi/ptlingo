# PT Lingo — Project Reference
Current state: Steps 39–40 + Mock-A instrumentation complete. Exam Oct 27 2026.
Repo: silentius-satoshi/ptlingo (renamed from npte-prep)

## Stack
React 18 + Vite 7.3.3 | Tailwind 3 | React Router v6 | Zustand
Supabase JS v2 | Framer Motion | Recharts
OpenRouter (Gemini Flash) — AI Tutor Max (~$0.007/exchange)
Anthropic claude-sonnet-4-20250514 — study plan only (low-freq)
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
37: PostSessionFlow ✅
38-A: Spaced repetition engine ✅
38-B: Path UI polish (mascots, bell curve) ✅
38-C: Variable reward engine ✅
38-D: Smart push notifications (iOS PWA) ✅
38-E: Progressive path session sizes ✅
38-F: Streak 5-day lap calendar ✅
39: Anonymous sign-in + user type onboarding (4 segments) ✅
40: Duolingo-style entry flow (LandingPage, OnboardingFlow, demo session, ProfileGate) ✅
Mock-A instrumentation (Aug 2026): wall-clock timer + deadline_at, auto answer-change
  log, process report + JSON export, exhibit media (img+video), section-locked nav ✅
41–46: Nostr dual auth — spec v18 complete, NOT YET IMPLEMENTED
47–50: Bitcoin/Lightning wallet — spec v1 complete, depends on 41–46

## Routes
/ LandingPage (unauthenticated) | redirects authenticated → /path or /onboarding
/onboarding OnboardingFlow (requires auth, anonymous users included)
/auth AuthPage standalone (signin/signup/upgrade)
/path ThePathPage AppLayout (home for authenticated users)
/submissions /notes /question-bank /performance AppLayout
/performance-review /tutor AppLayout
/achievements AchievementsPage AppLayout
/shop ShopPage AppLayout
/settings SettingsPage AppLayout
/exam/:examId/start MockExamStartPage AppLayout
/exam/:sessionId ExamPage full-screen
/review/:sessionId ReviewPage full-screen
/results/:sessionId ResultsPage full-screen
/rationale RationalePage full-screen
/auth/callback /mfa-challenge standalone
RequireAuth: redirects to / (not /auth) when no session
RequireFullAuth: allows anonymous users through (they have real Supabase sessions)

## Supabase Schema
questions: id, stem, choices(array), correct_index(int), subject, difficulty,
  tags, rationale, quarantined(bool DEFAULT false),
  exam_series, section(int), question_number(int, global 1–225), image_url
  — ALL fetches must include .eq('quarantined', false)
  — 'Series 3 Form A': 224 rows (no Q161), 6 media items (66,68,73,144,150,153; 73+153 mp4)
  — import upsert conflict key: (exam_series, section, question_number)
    changed key = orphan rows, not updates — delete before re-import
sessions: id, user_id, type(exam|quiz), mode, status(in_progress|paused|submitted),
  time_multiplier, time_remaining, current_index, question_ids(uuid[]),
  answers(jsonb), marked(uuid[]), eliminated(jsonb), highlights(jsonb),
  notes(jsonb), time_per_question(jsonb), score(float), submitted_at, started_at,
  answer_changes(jsonb DEFAULT '[]'), deadline_at(timestamptz),
  visit_log(jsonb DEFAULT '[]')
  — visit_log persisted via a SEPARATE .update() so a missing column degrades to
    localStorage-only instead of failing every save
  — deadline_at NULL = clock legitimately stopped (paused / mandatory break / submitted)
  — deadline_at written when the clock starts/stops/resumes, NEVER periodically
notes: user_id, question_id, content
fsbpt_attempts: id, user_id, attempt_number, exam_date, scale_score,
  section_scores(jsonb), body_system_scores(jsonb), work_activity_scores(jsonb)
study_plans: id, user_id, attempt_id, plan_content, generated_at,
  duration_days, plan_type(text DEFAULT 'npte')
  — plan_type: 'npte'|'dpt'|'prept'|'highschool'
question_reviews: id, user_id, question_id, interval_days, repetitions, ease_factor,
  next_review_at, last_answered_at, last_correct — UNIQUE(user_id, question_id)
user_gamification: user_id, xp, level, streak, longest_streak, last_activity_date,
  hearts, energy(def 25), max_energy(def 25), last_energy_update(timestamptz),
  coins(def 0), xp_boost_active(bool), streak_freeze_count(int),
  streak_shield_expiry(timestamptz), subject_mastery(jsonb {subject:{pct,correct,total}}),
  path_node_levels(jsonb def {})
daily_missions: id, user_id, mission_type, target, progress, completed, date
achievements: id, user_id, achievement_key, unlocked_at
path_milestones: id, user_id, system_name, claimed_at, xp_awarded — UNIQUE(user_id,system_name)
profiles: id(PK→auth.users), name, username, avatar_url, exam_date,
  user_type(text: 'highschool'|'prept'|'dpt'|'npte'), daily_goal(int)
  RLS: auth.uid()=id
push_subscriptions: id, user_id(→auth.users), subscription(jsonb) — UNIQUE(user_id)
  RLS: auth.uid()=user_id
Storage buckets: avatars (public) path:{user_id}/avatar.jpg
  question-media (public) path: formA/q{question_number}.{png|mp4}

## LocalStorage Keys
ptlingo_quiz_mode         'standard'|'ptlingo'
ptlingo_quiz_mode_set     'true' — quiz mode onboarding shown flag
ptlingo_profile           JSON — profile cache
ptlingo_gam               JSON — gamification cache
ptlingo_reminders_enabled 'true'|'false'
ptlingo_push_enabled      'true'|'false'
ptlingo_email_reminders   'true'|'false'
ptlingo_onboarding_complete '1' — user has completed OnboardingFlow
ptlingo_answer_changes_{sessionId} JSON — synchronous mirror of sessions.answer_changes
  — merge rule on load: longer log wins, server wins ties (src/lib/changeLog.js)
ptlingo_visit_log_{sessionId} JSON — mirror of sessions.visit_log, same merge rule
  (src/lib/visitLog.js — one entry per continuous stay on an item)
sessionStorage:
ptlingo_anon_banner_dismissed — anon upgrade banner dismissed this browser session

## Auth / Anonymous Users
Anonymous sign-in: supabase.auth.signInAnonymously() — fires silently on LandingPage GET STARTED
Anonymous users: real Supabase UUID, is_anonymous: true, authenticated role
  — pass through RequireFullAuth
  — subject to same RLS policies as registered users
  — questions table readable (SELECT policy uses authenticated role)
Upgrade path: /auth?upgrade=true → supabase.auth.updateUser({ email, password })
  — same user_id preserved, all data carries over
authStore: isAnonymous bool derived from user.is_anonymous
Anonymous sign-ins must be enabled in Supabase Auth → Settings

## Onboarding Flow (Step 39–40)
LandingPage (/): dark entry, Sparky mascot, GET STARTED + I already have an account
  — GET STARTED fires signInAnonymously() → navigate('/onboarding')
  — authenticated users redirect: onboarding complete → /path, else → /onboarding
OnboardingFlow (/onboarding): 6 screens
  0: user_type (highschool/prept/dpt/npte) — auto-advance 400ms, back → /
  1: validation (segment-specific mascot message) — back → screen 0
  2: daily_goal (5/10/20/30 questions/day) — back → screen 1
  3: exam_date (NPTE only, skip for others) — back → screen 2
  4: notifications (triggers browser prompt) — back → screen 3
  5: complete (auto-advance 1200ms → demo session)
  Progress bar: CSS transition, (screenIndex+1)/6*100%, no Framer Motion
Demo session: 3 random non-quarantined questions → /exam/:id?demo=true
ProfileGate: shown after demo for anonymous users (replaces PostSessionFlow)
  Screen A: "Time to create a profile!" + Sparky + CREATE A PROFILE (cyan) + LATER
  Screen B: "Create your profile" + back + LOGIN + Name/Username/Email/Password + Google
  onSuccess: navigate('/path')
  onLater: navigate('/path') — stays anonymous, AppLayout banner appears
AppLayout anonymous banner: "Create a profile to save your progress!"
  — Create a Profile (green) + Sign In (cyan) side by side, no dismiss
  — md:hidden on desktop path page (PathStatsPanel handles it there)
Existing users skip onboarding: sessions count > 0 sets ptlingo_onboarding_complete

## Desktop Path Layout (3-column)
AppLayout: [240px Sidebar (md:w-14 lg:w-60)] | [main overflow-y-auto]
  — isPathPage check: path page gets full-width Outlet (no max-w-5xl px-6)
  — all other pages keep max-w-5xl mx-auto px-6 md:px-8
ThePathPage: flex row — [center flex-1 overflow-x-hidden] | [right aside md:flex]
Right aside: w-80 sticky top-0 h-screen overflow-y-auto pl-4 pr-0 py-4
  — slim dark scrollbar: [&::-webkit-scrollbar]:w-1 etc.
  — no border between center and right
PathStatsPanel (src/components/path/PathStatsPanel.jsx):
  1. Stats row: 🔥 Streak | 💎 Gems | ⚡ Energy
  2. Exam countdown card: "{N} days to exam" + date (two rows, NPTE only)
  3. Current section card: section color tinted bg, label, mastery bar
  4. Daily Missions: SVG progress circles (same as banner dropdown)
  5. Due for Review: amber Review Now button (conditional, dueCount > 0)
  6. Anonymous CTA: Create a Profile + Sign In side by side (conditional)
Sidebar: md:w-14 (icon-only, labels hidden lg:block) | lg:w-60 (full text)
  — PT Lingo icon: /icons/manifest-icon-192.maskable.png
  — SidebarHeader removed, replaced with inline logo div
ActiveSectionBanner: missions toggle + dropdown hidden on md+ (md:hidden)
  — desktop: banner shows section name/mastery only, no dropdown

## Path UI (Steps 31-B, 38-B, plus polish)
Path nodes: bell curve layout, 3-column flex (mascot | nodes | mascot)
  Mascots alternate sides per section (even=left, odd=right)
  Mascot size: w-[88px] md:w-[148px], maxHeight: 160px
START bubble: floating animation y:[0,-4,0], section.color text, no Nq label
  — hides (AnimatePresence exit y:8) when NodePreviewCard opens
  — previewOpen prop guards visibility
Jump here?: static pill on first node of sections BELOW active section
  — opposite side from mascot (jumpSide prop from ThePathPage)
  — same floating animation as START but horizontal x:[0,±4,0]
  — side-pointing triangle toward node
NodePreviewCard: springs in when active/non-locked node tapped
  — backdrop tap or node re-tap dismisses
  — section.color background, white text, white button with section.color text
  — mascot: /mascots/${section.mascot}.png (stem, needs full path construction)
  — mastery bar, session size from pathNodeLevels
Sticky banner: stickyBannerRef → getBoundingClientRect().bottom (not BANNER_HEIGHT const)
  — section markers placed BEFORE dividers for earlier banner update
  — end-of-section markers + divider refs for desktop scroll detection

## Study Plan Generator (multi user type)
generatePlan(userType, config, context) dispatcher in src/lib/studyPlanAI.js
plan_type stored in study_plans.plan_type column
NPTE: existing gap-analysis driven calendar (unchanged)
DPT: week-by-week + curriculum_alignment badge (cyan)
Pre-PT: monthly milestone cards (Academic/Clinical/Application task buckets)
High School: 4-section roadmap (Now/Next Year/Senior/After Graduation) + specialty chips
StudyPlanGenerator.jsx: reads profile.user_type, shows segment-specific form
StudyPlan.jsx: routes on activePlan.plan_type to correct renderer

## Ask Max — Question Context (Step 40 polish)
RationalePanel Ask Max button: navigate('/tutor', { state: { questionContext, autoPrompt: true } })
TutorPage: reads location.state on mount via refs (questionContextRef, autoPromptRef)
  — calls sendMessage() with formatted question context in boot .then()
  — window.history.replaceState({}, '') clears state so back-nav doesn't re-trigger
  — falls back to fireAskMaxOpening (URL params) if no location.state

## Review Flow Fixes
readOnly mode: isCasual forced false (&& !readOnly) — standard layout shows rationale
Quit friction: suppressed in readOnly (back/end navigate(-1) immediately)
ResultsPage: first wrong answer auto-expanded, chevron rotates, hint text above table
Due for Review: handleReviewPress creates session directly from question_reviews
  — no QuestionBankPage bounce, same loading overlay as path node start

## Mock Exam Fidelity
Timing: ONE shared clock across 5 sections (FSBPT-verified). Only stop: mandatory
  15-min break after S2. Optional breaks S1/S3/S4 do NOT stop the clock.
  No per-section timers — do not reintroduce them.
useTimer: wall-clock anchored (deadline − Date.now()), survives tab throttle/sleep
  — armedRef guard prevents auto-submit on mount (store seeds async from 0) — never remove
Section breaks: deriveSectionEnds() reads boundaries off loaded questions
  (src/lib/sectionBounds.js) — NOT hardcoded index arithmetic
Section-locked nav: goTo(index, {force}) — force only from break flow;
  ProgressGrid/QuestionNav lock out-of-section items; ReviewPage (pre-submit, exam):
  no View Rationale, Go-to-Question locked to current section
Form order: MockExamStartPage orders section, question_number — order freezes into
  question_ids at session creation (old sessions keep old order)
examSnapshot(): the ONLY way to build a sessions .update() payload — add new persisted
  fields there, never inline. PostgREST fails the WHOLE update on an unknown column.
  ONE exception: the keepalive flush-on-exit drops deadline_at from the payload
  ({ deadline_at, ...snap }) — useTimer has no pagehide wake, so a throttled tab's
  timeRemaining is stale-high and would refund clock. The deadline never moves while
  running, and both stops persist null explicitly, so the row is always already right.
Section-end dialog: S2 dwell time in the confirmation IS charged to section time —
  the clock stop persists on confirm, not on the Next tap. Faithful: the real
  end-of-section warning runs on the clock. Not a bug, do not "fix".
clockPausedRef is stale inside handlers — pass deadline_at explicitly at clock
  start/stop call sites
Answer-change log: automatic only (first pick ≠ change, same-click ≠ change),
  append-only, never hand-edited — load-bearing for the mock analysis
Section-end confirmation: Next on a section's last item opens a modal with
  answered/unanswered/marked counts + Go-to-Unanswered — confirmEndSection()
  is the only entry into the break flow; closing is irreversible
Visit log: ExamPage records {idx,qid,enter,leave,ms} per stay — StrictMode dev
  double-invoke can add a 0ms phantom visit (harmless, dev only)
Flush-on-exit: pagehide/hidden → keepalive PATCH straight to PostgREST
  (examSnapshot + visit_log as TWO separate requests, deliberately)

## Process Report
src/lib/processReport.js — pure; buildProcessReport({session, questions, changeLog})
  4 measures: score (raw only — NEVER fabricate FSBPT scale scores), pacing
  (2:30 ceiling, compression ratio <0.70 flag), answer changes (net, into, marked
  split), attention (opener vs body per section + explicit verdict)
  raw.per_item carries question_number → offline join to form text for
  work-activity classification (not derivable in-app)
ResultsPage: collapsible Process Report + one JSON download
  (mock-process-report-{sessionId}.json) — the JSON is the deliverable
report_version: '2.1' stamped in every export — bump on shape/math changes so
  cross-mock comparisons know which instrument produced which reading
raw.visit_log + per_item.visits: revisit behavior, first-decision latency, and
  exact compression re-derive offline from the visit log
Tests: npm test → scripts/testProcessReport.mjs (keep green)

## Key Gotchas
- ALL questions fetches MUST include .eq('quarantined', false)
- section.mascot is a filename STEM ('sparky'), not a full path
  → use /mascots/${section.mascot}.png
- section.emoji does NOT exist in systemConfig — use section.mascot
- section.color is 6-digit hex — ${color}22 (8-digit alpha) works in modern browsers
- offsetTop unreliable in nested flex → use getBoundingClientRect()
- sticky positioning inside overflow-y-auto needs h-screen to work correctly
- isCasual must include && !readOnly or rationale never renders in review mode
- useNavigate() cannot be called in App — App wraps BrowserRouter, use AppInner
- Network calls must NOT be inside setMessages updater → double-fire bug
- React StrictMode double-invocation: use module-scope flag
- profile initial state is {} not null (prevents flash)
- signOut clears BOTH ptlingo_profile AND ptlingo_gam caches
- lottie-web uses eval() internally — known upstream issue, not a regression
- VAPID keys: public in Vercel env (VITE_VAPID_PUBLIC_KEY), private in Supabase Edge secrets
- VS Code extension may revert to Opus silently — run /context to verify
- question field is 'stem' not 'content'
- getNodeSessionSize: level 0→2q, 1→5q, 2→10q, 3+→15q
- pg_cron: daily 0 13 * * * (8am CST) → send-review-notifications Edge Function
- Import script: needs --- before Q1 or it gets silently skipped
- ptlingo_quiz_mode_set: clear localStorage to re-trigger quiz mode onboarding
- Migration BEFORE code that writes new sessions columns — unknown column fails every save
- Exhibit media: QuestionImage renders <video> for .mp4/.mov/.webm, click-to-play, no autoplay
- ReviewPage reviewBounds keys off session.current_index — valid only because
  handleGoToReview flushes before navigating

## Stores (Zustand)
gamificationStore (src/stores/gamificationStore.js)
  state: xp, level, streak, longestStreak, energy, maxEnergy,
    lastEnergyUpdate, coins, hearts(alias=energy), xpBoostActive,
    streakFreezeCount, streakShieldExpiry, subjectMastery,
    ptLingoScore, activeSystem, dailyMissions, achievements, loaded,
    pathNodeLevels
  actions: load, awardXP, deductEnergy, deductHeart(alias),
    rechargeEnergy, rechargeEnergyWithCoins, addCoins,
    purchaseXpBoost, purchaseStreakFreeze, purchaseStreakShield,
    advanceStreak, advanceMission, refreshSubjectMastery,
    updateSubjectMastery, checkQuestionCountAchievements,
    getNodeSessionSize, incrementNodeLevel
  cache: localStorage('ptlingo_gam')

authStore (src/store/authStore.js)
  state: user, profile({} not null), examDate, loading, isAnonymous
  actions: loadProfile, updateExamDate, signOut, setUser
  setUser: reads user.is_anonymous → sets isAnonymous
  cache: localStorage('ptlingo_profile')

## System Config
src/constants/systemConfig.js — getSystemConfig(subjectName)
Neuromuscular          #F59E0B gold    /mascots/sparky.png
Musculoskeletal        #EF4444 crimson /mascots/flex.png
Cardiovascular/Pulm    #EC4899 rose    /mascots/pulse.png
Integumentary          #F97316 orange  /mascots/patch.png
Other Systems          #22C55E green   /mascots/flora.png
Nonsystem Domains      #3B82F6 blue    /mascots/page.png

## Dev Tooling
SECURITY.md: private vulnerability reporting via GitHub Security tab
.gitmessage: commit template (git config commit.template .gitmessage)
  — prompts CLAUDE.md update status on every commit
.claude/commands/update-docs.md: /update-docs slash command
  — reads session history, updates CLAUDE.md surgically, stages it
scripts/review-plan.js: pre-screens plans against CLAUDE.md + invariants
  — node scripts/review-plan.js <plan.md>
  — exits 1 on CRITICAL findings (CI-compatible)
  — requires ANTHROPIC_API_KEY in .env.local

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

## Quiz Mode (Step 36)
Standard: two-panel desktop layout
PT Lingo: CasualQuizView.jsx — mascot float + speech bubble + 4 answer cards
  isCasual = quizMode==='ptlingo' && type==='quiz' && !readOnly
  readOnly MUST force isCasual false or rationale never renders

## MotivationBreak (Step 32)
getMotivationBreak() — module-level pure fn in ExamPage.jsx
Fires in handleSheetContinue() BEFORE advancing question
25 candidates, first match wins, each key fires once per session

## Auth (Steps 27-29)
TOTP 2FA | Google OAuth | Passkeys (@simplewebauthn/browser)
All security flows in Settings → Security (/settings)

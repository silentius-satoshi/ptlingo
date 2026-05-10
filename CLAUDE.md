# PT Lingo — Project Reference
## Current state: Step 30 complete (brand rename). Next: Step 31 (Anonymous sign-in).

---

## Stack

- **React 18** + **Vite 5** (ESM, no TypeScript)
- **Tailwind CSS 3** — utility-first; dark mode via `class` strategy
- **React Router v6** — `BrowserRouter`, `Routes/Route`
- **Zustand** — `sessionStore`, `authStore`, `uiStore`, `gamificationStore`
- **Supabase JS v2** — auth + Postgres (RLS enabled on all tables)
- **Recharts** — performance charts, trend dashboard
- **OpenRouter** (Gemini Flash) — AI Tutor Max (in-app, high-frequency)
- **Anthropic API** (Claude) — study plan generation only (low-frequency, deep)
- **vite-plugin-pwa** + **Workbox** — PWA, iOS Safari Add to Home Screen

Build: `npm run build` → clean. Deployed via Vercel (git push trigger).

---

## Step Build Map

| Step | Feature | Status |
|------|---------|--------|
| 1–18 | Scaffold → Performance page | ✅ Complete |
| 19–22e | NPTE Performance Review module | ✅ Complete |
| 23 | AI Tutor Coach "Max" | ✅ Complete |
| 24 | Gamification — "The Path" | ✅ Complete |
| 24.5 | PWA / iOS install | ✅ Complete |
| 25 | Mascot PNG / Framer Motion | 📋 Specced, pre-exam |
| 26 | Rive Mascot Upgrade | 📋 Specced, post-exam |
| 27 | TOTP 2FA | ✅ Complete |
| 28 | Google OAuth | ✅ Complete |
| 29 | Passkeys + Biometric Lock | ✅ Complete |
| 30 | Brand rename → PT Lingo | ✅ Complete |

**Next available step number: 31.**

---

## Routing

| Path | Component | Layout |
|---|---|---|
| `/auth` | `AuthPage` | Standalone |
| `/` | `DashboardPage` | `AppLayout` (sidebar) |
| `/submissions` | `SubmissionsPage` | `AppLayout` |
| `/notes` | `NotesPage` | `AppLayout` |
| `/question-bank` | `QuestionBankPage` | `AppLayout` |
| `/performance` | `PerformancePage` | `AppLayout` |
| `/performance-review` | `PerformanceReviewPage` | `AppLayout` |
| `/tutor` | `TutorPage` | `AppLayout` |
| `/path` | `PathPage` (skill tree home) | `AppLayout` |
| `/achievements` | `AchievementsPage` | `AppLayout` |
| `/exam/:examId/start` | `MockExamStartPage` | `AppLayout` |
| `/exam/:sessionId` | `ExamPage` | Full-screen (no sidebar) |
| `/review/:sessionId` | `ReviewPage` | Full-screen |
| `/results/:sessionId` | `ResultsPage` | Full-screen |
| `/auth/callback` | `AuthCallback` | Standalone *(Step 28)* |
| `/mfa-challenge` | `MFAChallenge` | Standalone *(Step 27)* |

---

## AI Architecture — Cost Split

Two separate AI systems. Do NOT consolidate them.

**OpenRouter → Gemini Flash** (`src/lib/openrouter.js`)
- Used by: AI Tutor Max (Step 23)
- Rationale: High-frequency per-exchange calls; cost-optimized
- Four session modes: Open Chat, Drill Mode, Rationale Deep Dive, Concept Explainer
- Streaming responses via SSE
- Context-aware system prompt pulls live Supabase performance data on session start

**Anthropic API** (`src/lib/anthropic.js`)
- Used by: Study plan generator only (Step 22e)
- Rationale: Reserved for deep, low-frequency generation
- Model: `claude-sonnet-4-6` (update if deprecated)
- ⚠️ Deprecation notice: `claude-sonnet-4-20250514` retires June 15 2026 — search codebase for that string

---

## Supabase Schema — Key Tables

### Core (Steps 1–18)
```
questions       id, content, choices, correct_index, subject, difficulty, tags, rationale
sessions        type, mode, status, time_multiplier, time_remaining, current_index,
                question_ids, answers, marked, eliminated, highlights, notes,
                time_per_question, score, submitted_at
notes           user_id, question_id, content, timestamps (RLS)
```

### Performance Review (Steps 19–22e)
```
fsbpt_attempts  id, user_id, attempt_number, exam_date, scale_score, section_scores (jsonb),
                body_system_scores (jsonb), work_activity_scores (jsonb), created_at
study_plans     id, user_id, attempt_id, plan_content, generated_at, duration_days
```

### Gamification (Step 24)
```
user_xp         user_id, total_xp, level, streak_days, last_active_date
user_hearts     user_id, hearts (0–5), last_refill_at
daily_missions  id, user_id, mission_type, target, progress, completed, date
achievements    id, user_id, achievement_key, unlocked_at
subject_mastery id, user_id, subject, questions_answered, correct_count, mastery_ring (0–3)
```

All tables: RLS enabled, `auth.uid() = user_id` policies.

---

## Gamification System (Step 24)

**XP Economy**
- Correct answer: +10 XP
- Drill completion: +25 XP
- Daily mission complete: +50 XP bonus (all three missions)
- Streak bonus: +5 XP/day multiplier

**Hearts system**
- 5 hearts max; lose 1 per wrong answer in drill mode
- Refill: 1 heart per 30 min, or watch ad / purchase (future)
- At 0 hearts: locked out of drill mode

**Skill tree home (`/path`)**
- Subjects displayed as nodes on a path (Duolingo-style)
- `questionsToNextBracket` computed per subject from `subject_mastery`
- "Ask Max" button on each node links to Tutor with subject context

**Daily missions**
- Three missions generated on login, tied to study plan focus areas
- All-missions-complete: 50 XP bonus toast

**Mastery rings**
- 0 = locked, 1 = bronze, 2 = silver, 3 = gold
- Thresholds: 0/20/50/100 correct answers per subject

---

## AI Tutor Max (Step 23)

File: `src/pages/TutorPage.jsx`, `src/components/tutor/`

- Four session modes selectable at session start:
  - **Open Chat** — free-form Q&A
  - **Drill Mode** — question generation loop with hearts penalty
  - **Rationale Deep Dive** — paste a missed question, get full breakdown
  - **Concept Explainer** — topic explanation with clinical examples
- Streaming via OpenRouter SSE; response renders token-by-token
- System prompt built dynamically from live Supabase data:
  - User's weakest subjects (from `subject_mastery`)
  - Active study plan focus areas (from `study_plans`)
  - Recent session accuracy (from `sessions`)
- ⚠️ React StrictMode bug: double-invocation fix — compute message history
  from a `ref`, move network calls outside state updater functions

---

## NPTE Performance Review (Steps 19–22e)

File: `src/pages/PerformanceReviewPage.jsx`, `src/lib/insightEngine.js`

- Manual FSBPT score report entry (5 attempts stored)
- Multi-attempt trend dashboard: 5 Recharts charts
  - Scale score trend, section score trend, body system radar,
    work activity bar, attempt comparison table
- Gap analysis engine (`insightEngine.js`):
  - Computes priority order: Neuromuscular → Interventions →
    Nonsystem Domains → Cardiopulm → MSK (maintenance only)
  - Retake ceiling logic per body system
- AI study plan generator:
  - Calls Anthropic API with full attempt history + gap analysis
  - Dynamic duration scaling (days until exam auto-calculated)
  - Plan history restore (previous plans stored, selectable)

---

## PWA (Step 24.5)

- `vite-plugin-pwa` + Workbox runtime caching
- iOS Safari: Add to Home Screen → standalone mode
- Cached: Supabase API endpoints, static assets
- ⚠️ iOS caveat: `localStorage` (day-checkbox state) vulnerable to
  eviction after ~7 weeks non-use. Core progress data in Supabase is safe.
- Manifest: `public/manifest.webmanifest`
- Service worker: auto-generated by vite-plugin-pwa on build

---

## Auth — Current State (Steps 1–2) + Incoming (Steps 27–29)

**Current:** Supabase email/password only. `RequireAuth` HOC gates all
`AppLayout` routes. `authStore` (Zustand) holds session.

**Step 27 (TOTP 2FA) — Specced, not yet built**
- Supabase native MFA: `supabase.auth.mfa.*`
- Dashboard prereq: Authentication → MFA → Enable Authenticator App
- New: `MFAEnrollModal.jsx`, `MFAChallenge.jsx`, `useMFA.js`
- Modified: `Settings.jsx` (Security section), `AuthGuard.jsx` (AAL2 check)
- Route: `/mfa-challenge` (full-screen, not dismissible)

**Step 28 (Google OAuth) — Specced, not yet built**
- Supabase OAuth provider: Google
- New: `GoogleSignInButton.jsx`, `AuthCallback.jsx`
- Route: `/auth/callback`
- PWA note: iOS standalone mode uses redirect flow (not popup)
- Dashboard prereq: Google Cloud Console OAuth credentials

**Step 29 (Passkeys + Biometric Lock) — Specced, not yet built**
- Library: `@simplewebauthn/browser` (client), `@simplewebauthn/server` (Edge Functions)
- New Supabase Edge Functions:
  - `webauthn-register-challenge`, `webauthn-register-verify`
  - `webauthn-auth-challenge`, `webauthn-auth-verify`
- New DB table: `passkeys` (credential_id, public_key, counter, device_name)
- New: `PasskeySetup.jsx`, `PasskeyLoginButton.jsx`, `BiometricLock.jsx`
- New: `usePasskey.js`, `useBiometricLock.js`
- iOS: `navigator.credentials.*` works in Safari 16+ and PWA standalone
- Always gate behind: `await platformAuthenticatorIsAvailable()`

---

## Question Import Pipeline

Script: `scripts/importQuestions.js`

⚠️ **Critical quirk:** The parser requires a `---` separator BEFORE the
very first question block, or Q1 is silently skipped.

Format:
```
---
## Question 1
[content]

---
## Question 2
[content]
```

- "Missing Q107–Q225" warnings on subject-specific imports are expected
  and ignorable — those IDs don't exist in subject-filtered files.
- Current bank: ~900 questions from FSBPT PEAT exams
- 106 Neuromuscular-tagged questions imported

---

## Session Model

`sessions` table columns relevant to the exam engine:

```
type             'exam' | 'quiz'
mode             'timed' | 'practice'
status           'in_progress' | 'paused' | 'submitted'
time_multiplier  1 | 1.5 | 2
time_remaining   seconds (integer)
current_index    0-based question index
question_ids     uuid[]
answers          jsonb  { questionId: choiceIndex }
marked           uuid[]
eliminated       jsonb  { questionId: int[] }
highlights       jsonb  { questionId: [{start, end}][] }
notes            jsonb  { questionId: string }
time_per_question jsonb { questionId: seconds }
score            float (0–1), set on submit
submitted_at     timestamptz
```

---

## Exam Engine — Key Decisions

### Session types
- **`exam`** — timer counts down, rationale hidden until results screen,
  section breaks trigger after sections 1–4.
- **`quiz`** — rationale revealed immediately after first answer pick;
  answer locks; timer still runs but is practice time.

### Section breaks (exam mode only)
- Only fires when `type === 'exam' && questions.length === 225`.
- `SECTION_END = new Set([44, 89, 134, 179])` — 0-indexed last-question
  indices for sections 1–4.
- After section 2 (index 89): **mandatory** 15-min break, timer pauses.
- After sections 1, 3, 4: **optional** break offer modal; timer keeps running.
- Break state machine: `null` | `'offer'` | `'optional'` | `'mandatory'`.
- To test breaks locally: temporarily set `new Set([1, 3])` and restore after.

### Per-question time tracking
- `prevQuestionIdRef` + `questionStartRef` refs.
- `useEffect` on `currentQuestionId` saves elapsed time for previous question.
- Quiz mode: time saved immediately on answer selection; `questionStartRef`
  reset to prevent double-counting on navigation.
- Writes via `useSessionStore.getState()` (non-reactive) — avoids stale closure.

### Scroll / layout architecture
- `h-screen flex flex-col overflow-hidden` outer shell.
- `ExamTopBar` and `QuestionNav` are `flex-shrink-0` — never scroll.
- Center: single `flex-1 overflow-y-auto scrollbar-thin` column.
- No nested scrollable containers inside `QuestionPanel`, `AnswerPanel`,
  or `RationalePanel`.
- Normal mode: inner `flex min-h-full` row.
- Quiz/rationale mode: `flex flex-col` — Q+A row with `border-b`,
  `RationalePanel` below; scrolls as one unit.
- Right toolbar: `flex-shrink-0`, stays fixed while content scrolls.

### Keyboard shortcuts
- `1–4`: select answer
- `E`: toggle eliminate focused/hovered choice
- `M`: toggle mark for review
- `←` / `→`: previous / next question
- All disabled when `loading || breakState !== null`.

### Toolbar
- Starts collapsed (`toolbarExpanded = false`, 56px wide icon strip).
- Expands to 176px via toggle in `ExamTopBar`.
- Dark/light mode toggle in toolbar footer (`useUiStore`).
- `ProgressGrid` has its own internal scroll — intentional (utility panel).

---

## Known Issues / Gotchas

- **React StrictMode + streaming**: double-invocation causes double network
  fires in Tutor. Fix: compute message history from a `ref`, move network
  calls outside state updater functions.
- **Gamification 404 loading hang**: resolved — ensure gamification tables
  exist before rendering `PathPage`.
- **`questionsToNextBracket` stub**: was returning zeros — fixed in Step 24
  patch. Confirm live calculation from `subject_mastery` table.
- **Chart RangeError**: caused by invalid date format options in Recharts
  trend chart — fixed. If recurring, check date strings passed to charts.
- **iOS PWA `localStorage` eviction**: ~7 weeks non-use; day-checkbox state
  may reset. Not a data-loss risk — core data in Supabase.
- **VS Code extension model revert bug**: Claude Code VS Code extension may
  silently revert to Opus despite Sonnet configuration. Run `/context`
  mid-session to verify actual model in use.
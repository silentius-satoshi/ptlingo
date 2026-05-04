# NPTE Prep — Project Reference

## Stack

- **React 18** + **Vite 5** (ESM, no TypeScript)
- **Tailwind CSS 3** — utility-first; dark mode via `class` strategy
- **React Router v6** — `BrowserRouter`, `Routes/Route`
- **Zustand** — `sessionStore`, `authStore`, `uiStore`
- **Supabase JS v2** — auth + Postgres (RLS enabled)
- **Recharts** — installed, not yet wired up (Step 15)

Build: `npm run build` → `dist/` (123 modules, ~479 kB JS gzip ~131 kB). Clean as of last session.

---

## Routing

| Path | Component | Layout |
|---|---|---|
| `/auth` | `AuthPage` | Standalone |
| `/` | `DashboardPage` | `AppLayout` (sidebar) |
| `/submissions` | `SubmissionsPage` | `AppLayout` |
| `/notes` | `NotesPage` | `AppLayout` |
| `/question-bank` | `QuestionBankPage` | `AppLayout` |
| `/diagnostic` | `DiagnosticPage` | `AppLayout` |
| `/exam/:examId/start` | `MockExamStartPage` | `AppLayout` |
| `/exam/:sessionId` | `ExamPage` | Full-screen (no sidebar) |
| `/review/:sessionId` | `ReviewPage` | Full-screen |
| `/results/:sessionId` | `ResultsPage` | Full-screen |

`/exam/:examId/start` (3 segments) and `/exam/:sessionId` (2 segments) don't conflict — Router resolves by path structure.

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
- **`exam`** — timer counts down, rationale hidden until results screen, section breaks trigger after sections 1–4.
- **`quiz`** — rationale revealed immediately after first answer pick; answer locks (cannot change); timer still runs but is practice time.

### Section breaks (exam mode only)
- Only fires when `type === 'exam' && questions.length === 225`.
- `SECTION_END = new Set([44, 89, 134, 179])` — 0-indexed last-question indices for sections 1–4 (defined at module scope in `ExamPage.jsx`).
- After section 2 (index 89): **mandatory** 15-min break, exam timer pauses (`paused` prop on `ExamTopBar` → `useTimer`).
- After sections 1, 3, 4: **optional** break offer modal; exam timer keeps running.
- Break state machine: `null` | `'offer'` | `'optional'` | `'mandatory'`.

### Per-question time tracking
- `prevQuestionIdRef` + `questionStartRef` refs; `useEffect` on `currentQuestionId` saves elapsed time for the previous question.
- In quiz mode, time is also saved immediately on answer selection so the rationale panel has a non-zero value; `questionStartRef` is reset after that save to prevent double-counting on navigation.
- Writes go through `useSessionStore.getState()` (non-reactive) to avoid stale closure issues.

### Scroll / layout architecture
- `h-screen flex flex-col overflow-hidden` outer shell.
- `ExamTopBar` and `QuestionNav` are `flex-shrink-0` siblings — they never scroll.
- Center content: single `flex-1 overflow-y-auto scrollbar-thin` column. **No nested scrollable containers** inside `QuestionPanel`, `AnswerPanel`, or `RationalePanel`.
- Normal mode: inner `flex min-h-full` row so Q+A panels stretch to fill the viewport even on short content.
- Quiz/rationale mode: `flex flex-col` — Q+A row with `border-b`, then `RationalePanel` below; everything scrolls as one unit.
- Right toolbar (`ExamToolbar` + optional tool panels) are `flex-shrink-0` siblings of the scroll column; they stay fixed while content scrolls.

### Keyboard shortcuts
- `1–4`: select answer
- `E`: toggle eliminate focused/hovered choice
- `M`: toggle mark for review
- `←` / `→`: previous / next question
- All shortcuts disabled when `loading || breakState !== null`.

### Toolbar
- Starts **collapsed** (`toolbarExpanded = false`, icon strip 56px wide).
- Expanded to 176px via toggle button in `ExamTopBar`.
- Dark/light mode toggle lives in the toolbar footer (uses `useUiStore`).

---

---

## Build Steps — Status

### Complete
- **Step 1** — Project scaffold (Vite, Tailwind, Router, Supabase, Zustand)
- **Step 2** — Auth (Supabase email/password, `RequireAuth`, `AuthPage`)
- **Step 3** — App shell (`AppLayout`, `Sidebar`, `ExamTopBar`, dark mode, `uiStore`)
- **Step 4** — Supabase schema + seed (questions, sessions tables, RLS)
- **Step 5** — Mock Exam start screen (`MockExamStartPage`: time multiplier, session insert, routing)
- **Step 6** — Exam engine core (`ExamPage`, `QuestionPanel`, `AnswerPanel`, `ChoiceRow`, `QuestionNav`, `ExamToolbar`, `useTimer`, `useKeyboardShortcuts`, debounced save, pause/submit/end modals)
- **Step 7** — Section break system (`BreakScreen`, break state machine, mandatory 15-min pause after section 2, optional break offer after sections 1/3/4, `paused` prop on `useTimer`)
- **Step 8** — Quiz vs Exam mode rationale gating (`rationaleVisible = type === 'quiz' && selectedAnswer !== null`, answer lock, `ChoiceRow` revealed styling with checkmark/X SVGs, eliminate button hidden when revealed)
- **Step 9** — Rationale panel (`RationalePanel`: Explanation header, Correct Answer section, Incorrect Answers section with red badge for selected-wrong, Tags chips; per-question time tracking)
- **Layout refactor (post Step 9)** — Single-scroll architecture; `QuestionNav` always visible (except during breaks); Next Question button moved from `AnswerPanel` into the `QuestionNav` bottom bar; center label changed to "Question X of Y"
- **Step 10** — Break screen circular countdown ring (`CountdownRing` SVG component; mandatory 15-min teal ring; optional amber pill)
- **Step 11** — Review screen (`ReviewPage`): summary strip, marked + unanswered cards, jump-to-question, timer continuity, auto-submit on expiry
- **Step 12** — Results screen (`ResultsPage`): score ring animation, stat cards, collapsible subject breakdown, per-question filter/sort/expand table, read-only ExamPage review mode
- **Step 13** — Question Bank / Quiz Builder (`QuestionBankPage`): mode toggle (Practice/Timed), subject chips, difficulty chips, count presets + custom input, summary card; removed temp mode toggle from `MockExamStartPage`

- **Step 14** — Submissions history (full columns: date, type, score, status, time, 3-dot menu for resume/review/delete)
- **Step 15** — Dashboard + Recharts (stat cards, line chart, radar chart, bar chart)
- **Step 16** — Markdown import script refinement
- **Step 17** — Dark mode full audit
- **Step 18** — Polish + responsive

---

## Known Issues / Decisions

- `DashboardPage`, `SubmissionsPage`, `NotesPage`, `DiagnosticPage` are placeholder stubs.
- `ProgressGrid` in the toolbar has its own internal scroll — this is intentional (utility panel, not part of main content).
- `QuestionNav` is hidden during break screens (`!breakState` condition) since the user cannot navigate mid-break.
- The `SECTION_END` set uses real boundaries (44, 89, 134, 179). To test breaks locally, temporarily change to e.g. `new Set([1, 3])` and restore after.
- Quiz sessions created by `QuestionBankPage` use `time_multiplier: 1` and no `exam_number`. `ResultsPage` skips "time used" display for quiz sessions since there is no stored `time_allotted` to diff against.

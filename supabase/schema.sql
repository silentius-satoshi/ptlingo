-- ============================================================
-- NPTE Prep — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- QUESTIONS
-- ============================================================
create table questions (
  id             uuid primary key default uuid_generate_v4(),
  stem           text not null,
  choices        text[] not null,
  correct_index  int  not null,
  rationale      text[] not null,
  "references"   text[] not null default '{}',
  subject        text not null,
  difficulty     text not null,
  section        int,           -- 1–5 (exam sections); null = question-bank only
  exam_number    int,           -- 1 | 2 | 3 for mock exam series; null = shared pool
  created_at     timestamptz not null default now()
);

-- choices and rationale must always have exactly 4 entries (A/B/C/D)
alter table questions
  add constraint choices_length   check (array_length(choices,   1) = 4),
  add constraint rationale_length check (array_length(rationale, 1) = 4),
  add constraint correct_index_range check (correct_index between 0 and 3),
  add constraint difficulty_values   check (difficulty in ('Easy', 'Medium', 'Hard')),
  add constraint section_range       check (section is null or section between 1 and 5),
  add constraint exam_number_range   check (exam_number is null or exam_number between 1 and 3);

-- ============================================================
-- SESSIONS
-- ============================================================
create table sessions (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,

  -- session config
  type               text not null,           -- 'quiz' | 'exam'
  mode               text not null,           -- 'timed' | 'practice'
  time_multiplier    numeric not null default 1,  -- 1 | 1.5 | 2
  subjects           text[] not null default '{}',
  difficulty         text[] not null default '{}',
  exam_number        int,                     -- set for mock exams (1 | 2 | 3)

  -- question list (ordered, matches answer indices)
  question_ids       uuid[] not null default '{}',
  total_questions    int not null default 0,

  -- per-question state (all keyed by question_id as text)
  answers            jsonb not null default '{}',  -- { [question_id]: 0|1|2|3 }
  marked             uuid[] not null default '{}', -- question_ids marked for review
  eliminated         jsonb not null default '{}',  -- { [question_id]: [0,2] }
  highlights         jsonb not null default '{}',  -- { [question_id]: [{start,end,text}] }
  notes              jsonb not null default '{}',  -- { [question_id]: "string" }
  time_per_question  jsonb not null default '{}',  -- { [question_id]: seconds }

  -- navigation + timer
  time_remaining     int not null default 0,       -- seconds
  current_index      int not null default 0,

  -- outcome
  status             text not null default 'in_progress',
  score              float,                         -- 0.0 – 1.0, set on submit
  started_at         timestamptz not null default now(),
  submitted_at       timestamptz
);

alter table sessions
  add constraint session_type_values   check (type in ('quiz', 'exam')),
  add constraint session_mode_values   check (mode in ('timed', 'practice')),
  add constraint time_multiplier_values check (time_multiplier in (1, 1.5, 2)),
  add constraint session_status_values  check (status in ('in_progress', 'submitted')),
  add constraint exam_number_range_s    check (exam_number is null or exam_number between 1 and 3),
  add constraint score_range            check (score is null or (score >= 0 and score <= 1));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Questions: any authenticated user can read; only service role can write
alter table questions enable row level security;

create policy "Authenticated users can read questions"
  on questions for select
  to authenticated
  using (true);

-- Sessions: each user sees and modifies only their own rows
alter table sessions enable row level security;

create policy "Users can read own sessions"
  on sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on sessions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

-- Questions — filter by subject, difficulty, section, exam series
create index questions_subject_idx     on questions(subject);
create index questions_difficulty_idx  on questions(difficulty);
create index questions_section_idx     on questions(section);
create index questions_exam_number_idx on questions(exam_number);

-- Sessions — look up by user, filter by status/type
create index sessions_user_id_idx   on sessions(user_id);
create index sessions_status_idx    on sessions(status);
create index sessions_type_idx      on sessions(type);
create index sessions_started_at_idx on sessions(started_at desc);

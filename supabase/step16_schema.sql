-- Step 16 — Schema update for structured exam question import
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (idempotent — all statements use IF EXISTS / IF NOT EXISTS)
--
-- Also supersedes add_rationale_map.sql; no need to run that separately.

-- 1. Convert rationale from text[] (per-choice array) to text (correct answer only).
--    The USING clause extracts the correct choice's rationale from the old array so
--    existing rows (if any) retain the right content. For an empty table this is a no-op.
alter table questions drop constraint if exists rationale_length;
alter table questions
  alter column rationale type text
  using rationale[correct_index + 1];   -- Postgres arrays are 1-indexed

-- 2. Add rationale_map jsonb — per-choice rationale keyed "0"–"3".
alter table questions add column if not exists rationale_map jsonb;

-- 3. Add tags, exam_series, question_number.
alter table questions add column if not exists tags            text[]  not null default '{}';
alter table questions add column if not exists exam_series     text;
alter table questions add column if not exists question_number int;

-- 4. Unique index for upsert conflict target on (exam_series, section, question_number).
--    NULL values are treated as distinct in Postgres indexes, so question-bank rows
--    (where all three are NULL) will never conflict with each other.
create unique index if not exists questions_series_section_num_idx
  on questions(exam_series, section, question_number);

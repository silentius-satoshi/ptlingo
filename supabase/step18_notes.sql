-- Step 18: notes table
-- Run in Supabase SQL Editor

create table if not exists public.notes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  question_id uuid        not null references public.questions(id) on delete cascade,
  content     text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One note per user per question
create unique index if not exists notes_user_question_idx
  on public.notes(user_id, question_id);

-- Index for fast user lookups
create index if not exists notes_user_id_idx
  on public.notes(user_id);

-- RLS
alter table public.notes enable row level security;

create policy "notes_select" on public.notes
  for select using (auth.uid() = user_id);

create policy "notes_insert" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update" on public.notes
  for update using (auth.uid() = user_id);

create policy "notes_delete" on public.notes
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

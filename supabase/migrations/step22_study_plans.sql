-- Step 22: Study plan storage
-- Run in Supabase SQL Editor

create table if not exists public.study_plans (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  generated_at        timestamptz not null default now(),
  exam_date           date        not null,
  weeks_remaining     integer     not null,
  config              jsonb       not null,
  plan                jsonb       not null,
  is_active           boolean     not null default true,
  completion_snapshot jsonb
);

create index if not exists study_plans_user_id_idx on public.study_plans(user_id);

alter table public.study_plans enable row level security;

create policy "study_plans_all" on public.study_plans
  for all using (auth.uid() = user_id);

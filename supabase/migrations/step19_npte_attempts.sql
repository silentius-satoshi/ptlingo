-- Step 19: NPTE attempt logger tables
-- Run in Supabase SQL Editor

create table if not exists public.npte_attempts (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  attempt_number      integer     not null,
  exam_date           date        not null,
  jurisdiction        text,
  total_items         integer     not null,
  items_correct       integer     not null,
  scale_score         integer     not null check (scale_score between 300 and 800),
  passed              boolean     not null default false,
  retake_pass_rate    integer,
  retake_median_score integer,
  created_at          timestamptz not null default now()
);

create table if not exists public.npte_attempt_pwa (
  id            uuid    primary key default gen_random_uuid(),
  attempt_id    uuid    not null references public.npte_attempts(id) on delete cascade,
  activity      text    not null,   -- 'pt_exam' | 'foundations' | 'interventions' | 'nonsystem'
  total_items   integer not null,
  items_correct integer not null,
  scale_score   integer not null
);

create table if not exists public.npte_attempt_body (
  id            uuid    primary key default gen_random_uuid(),
  attempt_id    uuid    not null references public.npte_attempts(id) on delete cascade,
  system        text    not null,   -- 'cardiopulmonary' | 'musculoskeletal' | 'neuromuscular' | 'integumentary' | 'other'
  total_items   integer not null,
  items_correct integer not null,
  scale_score   integer not null
);

create table if not exists public.npte_attempt_sections (
  id             uuid    primary key default gen_random_uuid(),
  attempt_id     uuid    not null references public.npte_attempts(id) on delete cascade,
  section_number integer not null check (section_number between 1 and 5),
  total_items    integer not null,
  items_correct  integer not null,
  scale_score    integer not null
);

create index if not exists npte_attempts_user_id_idx         on public.npte_attempts(user_id);
create index if not exists npte_attempt_pwa_attempt_id_idx   on public.npte_attempt_pwa(attempt_id);
create index if not exists npte_attempt_body_attempt_id_idx  on public.npte_attempt_body(attempt_id);
create index if not exists npte_sections_attempt_id_idx      on public.npte_attempt_sections(attempt_id);

alter table public.npte_attempts         enable row level security;
alter table public.npte_attempt_pwa      enable row level security;
alter table public.npte_attempt_body     enable row level security;
alter table public.npte_attempt_sections enable row level security;

create policy "npte_attempts_all" on public.npte_attempts
  for all using (auth.uid() = user_id);

create policy "npte_attempt_pwa_all" on public.npte_attempt_pwa
  for all using (attempt_id in (select id from public.npte_attempts where user_id = auth.uid()));

create policy "npte_attempt_body_all" on public.npte_attempt_body
  for all using (attempt_id in (select id from public.npte_attempts where user_id = auth.uid()));

create policy "npte_attempt_sections_all" on public.npte_attempt_sections
  for all using (attempt_id in (select id from public.npte_attempts where user_id = auth.uid()));

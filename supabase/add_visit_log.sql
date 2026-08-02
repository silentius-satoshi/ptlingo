-- Visit-level timing for mock sittings (src/lib/visitLog.js).
-- One row entry per continuous stay on an item: { idx, qid, enter, leave, ms }.
-- Written by a SEPARATE .update() from examSnapshot(), so a database that has
-- not run this migration degrades to a localStorage-only visit log instead of
-- failing every save (PostgREST rejects the whole update on an unknown column).
-- Idempotent — safe to re-run.

alter table sessions
  add column if not exists visit_log jsonb default '[]'::jsonb;

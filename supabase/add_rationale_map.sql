-- Add rationale_map for per-choice rationale lookup by index
-- rationale text[] stays as the canonical column; this adds a jsonb mirror
-- keyed by choice index ("0"–"3") for flexible access patterns.
alter table questions
  add column if not exists rationale_map jsonb;

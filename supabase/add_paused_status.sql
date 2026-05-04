-- Add 'paused' to the session status constraint
alter table sessions drop constraint session_status_values;
alter table sessions add constraint session_status_values
  check (status in ('in_progress', 'paused', 'submitted'));

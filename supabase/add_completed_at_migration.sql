-- One-time migration: records WHEN a task was completed, so the Completed
-- Tasks tab can be filtered by a completion-date range.
--
-- The app stamps completed_at = now() when a task is marked Completed and
-- clears it back to null if the task is reverted to Pending. Tasks that were
-- already Completed before this migration ran have a null completed_at (no
-- completion date was ever recorded) and are shown unfiltered.
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).

alter table tasks add column if not exists completed_at timestamptz;

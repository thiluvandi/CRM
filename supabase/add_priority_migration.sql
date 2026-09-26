-- One-time migration: lets a task be flagged as high-priority so it sorts to
-- the top of the pending queue.
--
-- The app toggles priority = true/false from the star switch on each task card
-- and orders pending tasks with the flagged ones first. Tasks that existed
-- before this migration ran default to priority = false (not flagged).
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).

alter table tasks add column if not exists priority boolean not null default false;

-- One-time migration: records when each user last opened their notifications,
-- so the unread badge is consistent across every device they log in from
-- (it was previously kept in localStorage, i.e. per browser).
-- Run once in the SQL Editor. Safe to re-run.

alter table profiles
  add column if not exists notifications_seen_at timestamptz;

-- Existing users start with everything marked read rather than being handed a
-- backlog of every note and draft ever created. Remove this line if you would
-- rather they see the full history on first open.
update profiles
  set notifications_seen_at = now()
  where notifications_seen_at is null;

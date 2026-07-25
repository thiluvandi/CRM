-- One-time migration: enable Supabase Realtime for the task_activity table.
--
-- task_activity was added after profiles/tasks/task_notes (which were enabled
-- for realtime via the dashboard). Without membership in the supabase_realtime
-- publication, subscribing to it raised a CHANNEL_ERROR. The app now isolates
-- task_activity on its own channel so that error can't affect the main feed,
-- but adding it here lets the activity log update live for other viewers too.
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_activity'
  ) then
    alter publication supabase_realtime add table task_activity;
  end if;
end $$;

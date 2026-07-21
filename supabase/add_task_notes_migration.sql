-- One-time migration: adds a task_notes table for the per-task notes
-- thread (communication between CA/Admin and the assigned employee).
-- Run once in the SQL Editor. Safe to re-run (IF NOT EXISTS / idempotent policies).

create table if not exists task_notes (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table task_notes enable row level security;

-- Open to the anon key, same model as profiles/tasks — the app only
-- ever shows/lets you post notes on tasks you already have access to.
drop policy if exists "task_notes_select_anon" on task_notes;
create policy "task_notes_select_anon" on task_notes for select using (true);

drop policy if exists "task_notes_insert_anon" on task_notes;
create policy "task_notes_insert_anon" on task_notes for insert with check (true);

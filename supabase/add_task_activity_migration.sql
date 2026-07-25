-- One-time migration: per-task activity log + task ownership.
--
-- 1. Adds tasks.created_by so the app knows who added each task — used to let
--    a creator edit their own task even without the Add/Edit permission.
-- 2. Adds a task_activity table that records meaningful actions on a task
--    (created, edited, status change, draft uploaded/replaced/removed,
--    verified/unverified, note added) with who did it and when. History only
--    starts from the moment this migration runs — existing tasks have none.
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).

-- 1. Task ownership -------------------------------------------------------
alter table tasks add column if not exists created_by uuid references profiles(id);

-- 2. Activity log ---------------------------------------------------------
create table if not exists task_activity (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table task_activity enable row level security;

-- Open to the anon key, same model as tasks/task_notes — the app only shows
-- activity for tasks the logged-in user already has access to.
drop policy if exists "task_activity_select_anon" on task_activity;
create policy "task_activity_select_anon" on task_activity for select using (true);

drop policy if exists "task_activity_insert_anon" on task_activity;
create policy "task_activity_insert_anon" on task_activity for insert with check (true);

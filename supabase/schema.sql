-- TaxOps Pro — Supabase schema, RLS policies, and storage bucket.
-- No Supabase Auth is used: identity is picked via the app's "Simulate As"
-- dropdown, and permissions are enforced in the React app itself (not RLS).
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to re-run — every statement is idempotent.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Profiles (standalone — not tied to any auth account)
-- ============================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('CA', 'Admin', 'Employee')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- ============================================================
-- 2. Tasks
-- ============================================================
create table if not exists tasks (
  id bigint generated always as identity primary key,
  client text not null,
  task_type text not null,
  assigned_to uuid not null references profiles(id),
  status text not null default 'Pending' check (status in ('Pending', 'Completed')),
  deadline date not null,
  draft_file_name text,
  draft_file_path text,
  draft_file_type text,
  draft_file_size bigint,
  draft_uploaded_by uuid references profiles(id),
  draft_uploaded_at timestamptz,
  draft_verified boolean not null default false,
  draft_verified_by uuid references profiles(id),
  draft_verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

-- ============================================================
-- 3. RLS policies — open to the anon key; the app enforces who can
--    see/edit what based on the simulated user's permissions.
-- ============================================================
drop policy if exists "profiles_select_anon" on profiles;
create policy "profiles_select_anon" on profiles for select using (true);

drop policy if exists "profiles_insert_anon" on profiles;
create policy "profiles_insert_anon" on profiles for insert with check (true);

drop policy if exists "profiles_update_anon" on profiles;
create policy "profiles_update_anon" on profiles for update using (true);

drop policy if exists "profiles_delete_anon" on profiles;
create policy "profiles_delete_anon" on profiles for delete using (true);

drop policy if exists "tasks_select_anon" on tasks;
create policy "tasks_select_anon" on tasks for select using (true);

drop policy if exists "tasks_insert_anon" on tasks;
create policy "tasks_insert_anon" on tasks for insert with check (true);

drop policy if exists "tasks_update_anon" on tasks;
create policy "tasks_update_anon" on tasks for update using (true);

drop policy if exists "tasks_delete_anon" on tasks;
create policy "tasks_delete_anon" on tasks for delete using (true);

-- ============================================================
-- 4. Storage bucket for uploaded drafts (private — accessed via signed URLs)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-drafts', 'task-drafts', false)
on conflict (id) do nothing;

drop policy if exists "task_drafts_read_anon" on storage.objects;
create policy "task_drafts_read_anon" on storage.objects
  for select using (bucket_id = 'task-drafts');

drop policy if exists "task_drafts_write_anon" on storage.objects;
create policy "task_drafts_write_anon" on storage.objects
  for insert with check (bucket_id = 'task-drafts');

drop policy if exists "task_drafts_update_anon" on storage.objects;
create policy "task_drafts_update_anon" on storage.objects
  for update using (bucket_id = 'task-drafts');

drop policy if exists "task_drafts_delete_anon" on storage.objects;
create policy "task_drafts_delete_anon" on storage.objects
  for delete using (bucket_id = 'task-drafts');

-- ============================================================
-- 5. Seed data (optional — the app's "Add New Employee" form does this too)
-- ============================================================
-- insert into profiles (name, role, permissions) values
--   ('CA Chandrashekhar', 'CA', array['all']),
--   ('Admin Staff', 'Admin', array['all']),
--   ('Priya Sharma', 'Employee', array['view_assigned','update_task_status']),
--   ('Rahul Hegde', 'Employee', array['view_assigned','update_task_status']);

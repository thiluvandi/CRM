-- TaxOps Pro — Supabase schema, RLS policies, and storage bucket.
-- No Supabase Auth is used: on load the app shows a "who's logging in"
-- picker, checks a SHA-256 password hash client-side, then remembers the
-- device via localStorage. Permissions are enforced in the React app, not
-- RLS — the anon key has open read/write access (see the note in section 3).
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
  password_hash text,
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
--    see/edit what based on the logged-in user's permissions.
--    NOTE: because select is open, password_hash IS technically readable
--    by anyone with the (public, bundled-in-the-frontend) anon key — the
--    app never bulk-fetches that column, only looks up one row's hash at
--    login time, but this is a soft, office-internal gate, not a secure
--    auth system. Treat it accordingly.
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
-- 5. Seed data — not needed. The app shows a first-run setup screen to
--    create the first CA account (with a password) when profiles is empty,
--    and "Add New Employee" handles everyone after that.
-- ============================================================

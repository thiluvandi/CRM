-- One-time migration: run this ONCE in the SQL Editor on your existing
-- project to remove the Supabase Auth dependency that was set up earlier.
-- After this, supabase/schema.sql reflects the current (no-auth) design —
-- you don't need to run schema.sql again unless setting up a fresh project.

create extension if not exists pgcrypto;

-- 1. Decouple profiles from auth.users — identity is now just app data,
--    no login required to create or read it.
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles alter column id set default gen_random_uuid();

-- 2. Drop the old auth-gated policies (named *_authenticated / *_admin*).
drop policy if exists "profiles_select_authenticated" on profiles;
drop policy if exists "profiles_update_admin_or_self" on profiles;
drop policy if exists "profiles_insert_admin" on profiles;
drop policy if exists "profiles_delete_admin" on profiles;

drop policy if exists "tasks_select_authenticated" on tasks;
drop policy if exists "tasks_insert_authenticated" on tasks;
drop policy if exists "tasks_update_assignee_or_editor" on tasks;
drop policy if exists "tasks_delete_permitted" on tasks;

drop policy if exists "task_drafts_read_authenticated" on storage.objects;
drop policy if exists "task_drafts_write_authenticated" on storage.objects;
drop policy if exists "task_drafts_update_authenticated" on storage.objects;
drop policy if exists "task_drafts_delete_authenticated" on storage.objects;

-- 3. The auth.uid()-based helper functions are no longer used by any policy.
drop function if exists public.has_permission(text);
drop function if exists public.is_admin();

-- 4. Open policies — the anon key can now fully read/write; permissions are
--    enforced in the React app (matches how tasks/profiles CRUD is already
--    gated client-side).
create policy "profiles_select_anon" on profiles for select using (true);
create policy "profiles_insert_anon" on profiles for insert with check (true);
create policy "profiles_update_anon" on profiles for update using (true);
create policy "profiles_delete_anon" on profiles for delete using (true);

create policy "tasks_select_anon" on tasks for select using (true);
create policy "tasks_insert_anon" on tasks for insert with check (true);
create policy "tasks_update_anon" on tasks for update using (true);
create policy "tasks_delete_anon" on tasks for delete using (true);

create policy "task_drafts_read_anon" on storage.objects
  for select using (bucket_id = 'task-drafts');
create policy "task_drafts_write_anon" on storage.objects
  for insert with check (bucket_id = 'task-drafts');
create policy "task_drafts_update_anon" on storage.objects
  for update using (bucket_id = 'task-drafts');
create policy "task_drafts_delete_anon" on storage.objects
  for delete using (bucket_id = 'task-drafts');

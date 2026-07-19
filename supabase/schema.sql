-- TaxOps Pro — Supabase schema, RLS policies, and storage bucket.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

-- ============================================================
-- 1. Profiles (extends auth.users with app-specific fields)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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
-- 3. Permission helper functions (read the caller's own profile)
-- ============================================================
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (permissions @> array['all'] or permissions @> array[perm])
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and permissions @> array['all']
  );
$$;

-- ============================================================
-- 4. RLS policies — profiles
-- ============================================================
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_admin_or_self" on profiles;
create policy "profiles_update_admin_or_self" on profiles
  for update using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_insert_admin" on profiles;
create policy "profiles_insert_admin" on profiles
  for insert with check (public.is_admin());

drop policy if exists "profiles_delete_admin" on profiles;
create policy "profiles_delete_admin" on profiles
  for delete using (public.is_admin());

-- ============================================================
-- 5. RLS policies — tasks
-- ============================================================
drop policy if exists "tasks_select_authenticated" on tasks;
create policy "tasks_select_authenticated" on tasks
  for select using (auth.role() = 'authenticated');

drop policy if exists "tasks_insert_authenticated" on tasks;
create policy "tasks_insert_authenticated" on tasks
  for insert with check (auth.role() = 'authenticated');

-- Assignee can always update their own task (status + draft fields);
-- add_edit_tasks/all permission can update any task.
drop policy if exists "tasks_update_assignee_or_editor" on tasks;
create policy "tasks_update_assignee_or_editor" on tasks
  for update using (
    public.has_permission('add_edit_tasks') or assigned_to = auth.uid()
  );

drop policy if exists "tasks_delete_permitted" on tasks;
create policy "tasks_delete_permitted" on tasks
  for delete using (public.has_permission('delete_data'));

-- ============================================================
-- 6. Storage bucket for uploaded drafts (private — accessed via signed URLs)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-drafts', 'task-drafts', false)
on conflict (id) do nothing;

drop policy if exists "task_drafts_read_authenticated" on storage.objects;
create policy "task_drafts_read_authenticated" on storage.objects
  for select using (bucket_id = 'task-drafts' and auth.role() = 'authenticated');

drop policy if exists "task_drafts_write_authenticated" on storage.objects;
create policy "task_drafts_write_authenticated" on storage.objects
  for insert with check (bucket_id = 'task-drafts' and auth.role() = 'authenticated');

drop policy if exists "task_drafts_update_authenticated" on storage.objects;
create policy "task_drafts_update_authenticated" on storage.objects
  for update using (bucket_id = 'task-drafts' and auth.role() = 'authenticated');

drop policy if exists "task_drafts_delete_authenticated" on storage.objects;
create policy "task_drafts_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'task-drafts' and auth.role() = 'authenticated');

-- ============================================================
-- 7. Seed data
-- ============================================================
-- Auth users must exist first (Authentication > Users > Add user, or via the
-- app's "Add New Employee" form once it's running). Then insert their profile
-- row here, substituting each real auth user id:
--
-- insert into profiles (id, name, role, permissions) values
--   ('<uuid-of-ca-user>',    'CA Chandrashekhar', 'CA',    array['all']),
--   ('<uuid-of-admin-user>', 'Admin Staff',        'Admin', array['all']),
--   ('<uuid-of-priya>',      'Priya Sharma',       'Employee', array['view_assigned','update_task_status']),
--   ('<uuid-of-rahul>',      'Rahul Hegde',        'Employee', array['view_assigned','update_task_status']);

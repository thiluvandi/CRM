-- One-time migration: lets a task hold MANY draft files instead of the single
-- draft_* columns on tasks. Each file carries its own verification state.
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists task_files (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  verified boolean not null default false,
  verified_by uuid references profiles(id),
  verified_at timestamptz
);

alter table task_files enable row level security;

-- Same open-anon posture as the rest of the app (see the note in schema.sql).
drop policy if exists "task_files_select_anon" on task_files;
create policy "task_files_select_anon" on task_files for select using (true);
drop policy if exists "task_files_insert_anon" on task_files;
create policy "task_files_insert_anon" on task_files for insert with check (true);
drop policy if exists "task_files_update_anon" on task_files;
create policy "task_files_update_anon" on task_files for update using (true);
drop policy if exists "task_files_delete_anon" on task_files;
create policy "task_files_delete_anon" on task_files for delete using (true);

-- Backfill: move every task's existing single draft into task_files, so nothing
-- that was already uploaded disappears. Guard against double-running by skipping
-- tasks that already have a file row for that path.
insert into task_files (task_id, file_name, file_path, file_type, file_size, uploaded_by, uploaded_at, verified, verified_by, verified_at)
select id, draft_file_name, draft_file_path, draft_file_type, draft_file_size,
       draft_uploaded_by, coalesce(draft_uploaded_at, now()),
       coalesce(draft_verified, false), draft_verified_by, draft_verified_at
from tasks t
where t.draft_file_path is not null
  and not exists (select 1 from task_files f where f.task_id = t.id and f.file_path = t.draft_file_path);

-- Enable realtime so uploads/verifications appear live for everyone.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_files'
  ) then
    alter publication supabase_realtime add table task_files;
  end if;
end $$;

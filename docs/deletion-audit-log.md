# Deletion audit log — design note

Status: **proposed, not yet implemented.**
Captures why task/employee deletions currently leave no trace and how to record them.

## The problem

Deleting a task is invisible — nothing anywhere records that it happened.

1. **The delete handler logs nothing.** Every other action calls `logActivity`
   (create, status change, note added, draft upload/verify/remove), but
   `handleDeleteTask` in `src/App.jsx` only deletes and refetches:

   ```js
   const handleDeleteTask = async (taskId) => {
     const { error } = await supabase.from("tasks").delete().eq("id", taskId);
     if (error) throw error;
     await fetchTasks();
   };
   ```

2. **Even if it did log, the record would vanish.** `task_activity.task_id`
   references `tasks(id)` **`on delete cascade`** (`supabase/schema.sql`). Deleting
   a task cascade-deletes all of its activity rows, so a "task deleted" entry
   keyed to that task_id would be wiped by the same delete (or fail the foreign
   key if inserted afterward). The task's whole history disappears with it.

The same blind spot applies to **deleting an employee** (`handleDeleteUser`).

## Why the fix can't live on `task_activity`

You can't reference a row you're about to remove. A deletion record must live in
a table that is **not** foreign-keyed to `tasks` (or `profiles`), so it survives
the delete. That means a separate, firm-wide audit table.

## Proposed schema

`supabase/add_audit_log_migration.sql` (run once in the SQL editor; idempotent):

```sql
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),   -- who did it (nullable: actor may later be deleted)
  action text not null,                    -- 'task_deleted' | 'employee_deleted'
  summary text not null,                   -- human-readable snapshot, see below
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

-- Same open-anon posture as the rest of the app (see the note in schema.sql).
drop policy if exists "audit_log_select_anon" on audit_log;
create policy "audit_log_select_anon" on audit_log for select using (true);
drop policy if exists "audit_log_insert_anon" on audit_log;
create policy "audit_log_insert_anon" on audit_log for insert with check (true);
```

Note `actor_id` uses a plain `references` **without** `on delete cascade`, so
deleting an employee does not erase the audit trail of what they did. Consider
`on delete set null` if you want deleted actors to null out cleanly.

Mirror the column into `schema.sql` for fresh installs, and add `audit_log` to
the realtime publication block there if the log view should update live.

## Client change

Write the audit row **before** the delete, capturing a snapshot while the data
still exists. In `src/App.jsx`:

```js
const handleDeleteTask = async (taskId) => {
  const t = tasks.find((x) => x.id === taskId);
  const assignee = users.find((u) => u.id === t?.assigned_to)?.name ?? "Unassigned";

  await supabase.from("audit_log").insert({
    actor_id: currentUserId,
    action: "task_deleted",
    summary: `Deleted "${t?.client} · ${t?.task_type}" (assigned to ${assignee})`,
  });

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  await fetchTasks();
};
```

Same pattern in `handleDeleteUser` with `action: "employee_deleted"` if employee
deletions should be tracked too.

Add an `UNDEFINED_TABLE` fallback (like the existing `completed_at` / activity
guards) so a database that hasn't run the migration still deletes successfully —
the audit insert should never block the delete.

## Viewing it

Per-task display no longer makes sense (the task is gone), so surface it as a
**firm-wide audit log** visible to CA/Admin only — e.g. a new tab or a section in
User Management. Fetch `audit_log` ordered by `created_at desc`; each row is just
an icon, the summary, the actor, and a relative timestamp.

## Scope decision

Recommend starting with **task deletions only**. Add employee deletions in the
same table (`action: 'employee_deleted'`) if/when wanted — no schema change
needed, just another insert site.

## Effort

- Migration: run one SQL block.
- Client: ~15 lines across `handleDeleteTask` (and optionally `handleDeleteUser`).
- View: a small read-only list component for CA/Admin.

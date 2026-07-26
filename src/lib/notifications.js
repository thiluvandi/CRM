import { isAdminUser } from "../permissions";

/**
 * Derives the notification feed for a user from data the app already holds.
 *
 * CA/Admin sees drafts waiting on their verification, plus notes written by
 * anyone else. Employees see their own drafts once verified, plus notes a
 * CA/Admin left on the tasks assigned to them. Nobody sees their own notes.
 *
 * Returns newest first. Items carry an `at` ISO timestamp so unread counts can
 * be derived by comparing against a last-seen mark.
 */
export function buildNotifications({ currentUser, tasks, notes, users, taskFiles = [] }) {
  if (!currentUser) return [];

  const nameOf = (id) => users.find((u) => u.id === id)?.name || "Someone";
  const taskOf = (id) => tasks.find((t) => t.id === id);
  const label = (task) => `${task.client} · ${task.task_type}`;
  const admin = isAdminUser(currentUser);

  const items = [];

  // One notification per file: the CA sees each file still awaiting their
  // verification; the assignee sees each of their files once it's verified.
  for (const file of taskFiles) {
    const task = taskOf(file.task_id);
    if (!task) continue;

    if (admin && !file.verified) {
      items.push({
        id: `verify-${file.id}`,
        kind: "verify",
        title: "File awaiting verification",
        detail: `${label(task)} — ${file.file_name}, uploaded by ${nameOf(file.uploaded_by)}`,
        at: file.uploaded_at,
        taskId: task.id,
      });
    } else if (!admin && task.assigned_to === currentUser.id && file.verified) {
      items.push({
        id: `verified-${file.id}`,
        kind: "verified",
        title: "File verified",
        detail: `${label(task)} — ${file.file_name}, verified by ${nameOf(file.verified_by)}`,
        at: file.verified_at,
        taskId: task.id,
      });
    }
  }

  for (const note of notes) {
    if (note.author_id === currentUser.id) continue;

    const task = taskOf(note.task_id);
    if (!task) continue;

    const author = users.find((u) => u.id === note.author_id);
    if (!author) continue;

    // Admins hear from staff; staff hear from admins about their own tasks.
    const relevant = admin
      ? !isAdminUser(author)
      : isAdminUser(author) && task.assigned_to === currentUser.id;
    if (!relevant) continue;

    items.push({
      id: `note-${note.id}`,
      kind: "note",
      title: `Note from ${author.name}`,
      detail: `${label(task)} — ${note.message}`,
      at: note.created_at,
      taskId: task.id,
    });
  }

  return items
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function countUnread(items, seenAt) {
  if (!seenAt) return items.length;
  const seen = new Date(seenAt);
  return items.filter((item) => new Date(item.at) > seen).length;
}

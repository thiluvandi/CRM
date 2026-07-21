export const PERMISSION_TOGGLES = [
  { key: "add_edit_tasks", label: "Add/Edit Tasks" },
  { key: "delete_data", label: "Delete Data" },
];

export function isAdminUser(user) {
  return user.permissions.includes("all");
}

export function hasPermission(user, key) {
  return isAdminUser(user) || user.permissions.includes(key);
}

export function canViewAllTasks(user) {
  return isAdminUser(user);
}

export function canAddEditTasks(user) {
  return hasPermission(user, "add_edit_tasks");
}

export function canDeleteData(user) {
  return hasPermission(user, "delete_data");
}

export function canUpdateTaskStatus(user) {
  return hasPermission(user, "update_task_status");
}

export function canManageUsers(user) {
  return isAdminUser(user);
}

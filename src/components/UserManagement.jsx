import { useState, Fragment } from "react";
import { PERMISSION_TOGGLES, isAdminUser, canManageUsers } from "../permissions";
import AccessDenied from "./AccessDenied";
import AddEmployeeForm from "./AddEmployeeForm";

export default function UserManagement({ users, currentUser, onTogglePermission, onAddUser, onDeleteUser }) {
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  if (!canManageUsers(currentUser)) {
    return <AccessDenied message="User Management is restricted to CA and Admin roles only." />;
  }

  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">User Management</h2>
          <p className="panel-sub">Manage staff roles and granular permissions.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddForm((s) => !s)}>
          {showAddForm ? "Close" : "+ Add New Employee"}
        </button>
      </div>

      {showAddForm && <AddEmployeeForm onAdd={onAddUser} onClose={() => setShowAddForm(false)} />}

      <div className="table-wrap">
        <table className="grid-table user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const admin = isAdminUser(u);
              const editing = editingId === u.id;
              const isSelf = u.id === currentUser.id;
              return (
                <Fragment key={u.id}>
                  <tr>
                    <td>{u.name}</td>
                    <td>
                      <span className="role-tag">{u.role}</span>
                    </td>
                    <td>
                      {admin ? (
                        <span className="perm-tag perm-tag--all">All Permissions</span>
                      ) : u.permissions.filter((p) => p !== "view_assigned" && p !== "update_task_status").length ? (
                        u.permissions
                          .filter((p) => p !== "view_assigned" && p !== "update_task_status")
                          .map((p) => (
                            <span className="perm-tag" key={p}>
                              {PERMISSION_TOGGLES.find((t) => t.key === p)?.label || p}
                            </span>
                          ))
                      ) : (
                        <span className="perm-tag perm-tag--none">Base access only</span>
                      )}
                    </td>
                    <td className="user-actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditingId(editing ? null : u.id)}
                        disabled={admin}
                        title={admin ? "CA/Admin already have full access" : "Edit Permissions"}
                      >
                        Edit Permissions
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => {
                          if (isSelf) return;
                          if (window.confirm(`Remove ${u.name} from the roster?`)) onDeleteUser(u.id);
                        }}
                        disabled={isSelf}
                        title={isSelf ? "You cannot delete the user you are simulating" : "Delete User"}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editing && !admin && (
                    <tr className="perm-edit-row">
                      <td colSpan={4}>
                        <div className="perm-checkbox-group">
                          {PERMISSION_TOGGLES.map((toggle) => (
                            <label key={toggle.key} className="perm-checkbox">
                              <input
                                type="checkbox"
                                checked={u.permissions.includes(toggle.key)}
                                onChange={(e) => onTogglePermission(u.id, toggle.key, e.target.checked)}
                              />
                              {toggle.label}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

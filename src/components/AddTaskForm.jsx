import { useState } from "react";

export default function AddTaskForm({ users, onAdd, onClose }) {
  const [client, setClient] = useState("");
  const [taskType, setTaskType] = useState("");
  const [assignedTo, setAssignedTo] = useState(users[0]?.id || "");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!client.trim() || !taskType.trim() || !deadline || !assignedTo) return;
    setError("");
    setSubmitting(true);
    try {
      await onAdd({
        client: client.trim(),
        task_type: taskType.trim(),
        assigned_to: assignedTo,
        deadline,
        status: "Pending",
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add Task</h3>
      <div className="inline-form-grid">
        <label>
          Client
          <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Hexa Green Power" required />
        </label>
        <label>
          Task Type
          <input value={taskType} onChange={(e) => setTaskType(e.target.value)} placeholder="e.g. GST Filing" required />
        </label>
        <label>
          Assignee
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deadline
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
        </label>
      </div>
      {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
      <div className="inline-form-actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? "Adding…" : "Add Task"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

import { useState } from "react";

const ROLE_OPTIONS = ["Employee", "Admin"];

export default function AddEmployeeForm({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password) return;
    setError("");
    setSubmitting(true);
    try {
      await onAdd({ name: name.trim(), role, password });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add New Employee</h3>
      <div className="inline-form-grid">
        <label>
          Full Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anjali Rao" required />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Set Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Give them this to log in"
            required
          />
        </label>
      </div>
      {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
      <div className="inline-form-actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? "Adding…" : "Add Employee"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

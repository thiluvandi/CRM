import { useState } from "react";

const ROLE_OPTIONS = ["Employee", "Admin"];

export default function AddEmployeeForm({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const tempPassword = await onAdd({ name: name.trim(), email: email.trim(), role });
      setResult({ email: email.trim(), tempPassword });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="inline-form">
        <h3>Employee Added</h3>
        <p className="scope-note" style={{ marginTop: 0 }}>
          Share these sign-in details with {name.trim()} — this password is shown only once.
        </p>
        <div className="new-employee-credentials">
          <div>
            <strong>Email:</strong> {result.email}
          </div>
          <div>
            <strong>Temporary password:</strong> {result.tempPassword}
          </div>
        </div>
        <div className="inline-form-actions">
          <button className="btn btn--primary btn--sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <h3>Add New Employee</h3>
      <div className="inline-form-grid">
        <label>
          Full Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anjali Rao" required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anjali@taxopspro.com"
            required
          />
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
      </div>
      {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
      <div className="inline-form-actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? "Creating…" : "Add Employee"}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

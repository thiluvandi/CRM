import { useState } from "react";
import logoFull from "../assets/logo-full.jpg";

export default function FirstRunSetup({ onSetup }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password) return;
    setError("");
    setSubmitting(true);
    try {
      await onSetup({ name: name.trim(), password });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src={logoFull} alt="CSG & Associates" className="login-logo-full" />
          <div className="login-brand-name">CSG's CRM</div>
        </div>

        <p className="login-prompt">
          No accounts exist yet — set up the first one. This will be the CA account with full access; add everyone
          else afterward from User Management.
        </p>

        <label>
          Your Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CA Chandrashekhar" required autoFocus />
        </label>
        <label>
          Set a Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Creating…" : "Create CA Account"}
        </button>
      </form>
    </div>
  );
}

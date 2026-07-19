import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-mark">TP</div>
          <div>
            <div className="login-brand-name">TaxOps Pro</div>
            <div className="login-brand-sub">Chartered Accountant Practice Manager</div>
          </div>
        </div>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@taxopspro.com"
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

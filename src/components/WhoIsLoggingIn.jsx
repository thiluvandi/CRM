import { useState } from "react";
import ScreenBrand from "./ScreenBrand";

export default function WhoIsLoggingIn({ users, onCheckAccount, onAuthenticate, onSetInitialPassword }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasPassword, setHasPassword] = useState(null);
  const [checking, setChecking] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectUser = async (u) => {
    setSelectedUser(u);
    setChecking(true);
    setError("");
    const { hasPassword: existing } = await onCheckAccount(u.id);
    setHasPassword(existing);
    setChecking(false);
  };

  const back = () => {
    setSelectedUser(null);
    setHasPassword(null);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await onAuthenticate(selectedUser.id, password);
    setSubmitting(false);
    if (!ok) {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (password.length < 4) {
      setError("Use at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSetInitialPassword(selectedUser.id, password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <ScreenBrand />
      <div className={`login-card ${!selectedUser ? "login-card--wide" : ""}`}>
        {!selectedUser ? (
          <>
            <p className="login-prompt">Who's logging in?</p>
            <div className="user-picker-list">
              {users.map((u) => (
                <button key={u.id} type="button" className="user-picker-item" onClick={() => selectUser(u)}>
                  <span className="user-picker-name">{u.name}</span>
                  <span className="user-picker-role-slot">
                    <span className="role-tag user-picker-role">{u.role}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : checking ? (
          <p className="login-prompt">Loading…</p>
        ) : hasPassword ? (
          <form onSubmit={submitLogin}>
            <button type="button" className="login-back" onClick={back}>
              ← Not {selectedUser.name}?
            </button>
            <label>
              Password for {selectedUser.name}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
            </label>
            {error && <div className="form-error" style={{ marginTop: 4 }}>{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={submitting} style={{ marginTop: 16, width: "100%" }}>
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitNewPassword}>
            <button type="button" className="login-back" onClick={back}>
              ← Not {selectedUser.name}?
            </button>
            <p className="login-prompt">No password set yet for {selectedUser.name} — create one now.</p>
            <label>
              New Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
            </label>
            <label style={{ marginTop: 10 }}>
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error && <div className="form-error" style={{ marginTop: 4 }}>{error}</div>}
            <button type="submit" className="btn btn--primary" disabled={submitting} style={{ marginTop: 16, width: "100%" }}>
              {submitting ? "Saving…" : "Set Password & Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

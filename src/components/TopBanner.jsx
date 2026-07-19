import { isAdminUser } from "../permissions";

export default function TopBanner({ users, currentUser, onSwitchUser, onMenuClick }) {
  return (
    <header className="top-banner">
      <div className="brand">
        <button className="burger-btn" onClick={onMenuClick} aria-label="Open navigation menu">
          <span />
          <span />
          <span />
        </button>
        <div className="brand-mark">TP</div>
        <div>
          <div className="brand-name">TaxOps Pro</div>
          <div className="brand-sub">Chartered Accountant Practice Manager</div>
        </div>
      </div>

      <div className="simulate-control">
        <label htmlFor="simulate-as">Simulate As:</label>
        <select id="simulate-as" value={currentUser.id} onChange={(e) => onSwitchUser(e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.role}
            </option>
          ))}
        </select>
        <span className={`role-badge ${isAdminUser(currentUser) ? "role-badge--admin" : "role-badge--staff"}`}>
          {isAdminUser(currentUser) ? "Full Access" : "Restricted"}
        </span>
      </div>
    </header>
  );
}

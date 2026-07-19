import { isAdminUser } from "../permissions";

export default function TopBanner({ currentUser, onSignOut, onMenuClick }) {
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
        <span className="current-user-name">{currentUser.name}</span>
        <span className={`role-badge ${isAdminUser(currentUser) ? "role-badge--admin" : "role-badge--staff"}`}>
          {currentUser.role}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </header>
  );
}

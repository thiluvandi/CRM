import { isAdminUser } from "../permissions";
import logoIcon from "../assets/logo-icon.png";

export default function TopBanner({ currentUser, onLogout, onMenuClick }) {
  return (
    <header className="top-banner">
      <div className="brand">
        <button className="burger-btn" onClick={onMenuClick} aria-label="Open navigation menu">
          <span />
          <span />
          <span />
        </button>
        <img src={logoIcon} alt="CSG & Associates" className="brand-mark" />
        <div>
          <div className="brand-name">CSG's CRM</div>
          <div className="brand-sub">CSG & Associates — Chartered Accountants</div>
        </div>
      </div>

      <div className="identity-bar">
        <span className="current-user-name">{currentUser.name}</span>
        <span className={`role-badge ${isAdminUser(currentUser) ? "role-badge--admin" : "role-badge--staff"}`}>
          {currentUser.role}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={onLogout}>
          Switch User
        </button>
      </div>
    </header>
  );
}

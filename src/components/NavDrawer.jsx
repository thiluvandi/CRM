import { isAdminUser } from "../permissions";

const TAB_DEFS = [
  { key: "dashboard", label: "Dashboard", adminOnly: false },
  { key: "users", label: "User Management", adminOnly: true },
];

export default function NavDrawer({ open, onClose, activeTab, onChange, currentUser }) {
  const admin = isAdminUser(currentUser);

  return (
    <>
      <div className={`nav-backdrop ${open ? "nav-backdrop--visible" : ""}`} onClick={onClose} />
      <nav className={`nav-drawer ${open ? "nav-drawer--open" : ""}`} aria-hidden={!open}>
        <div className="nav-drawer-header">
          <span>Menu</span>
          <button className="nav-drawer-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>
        {TAB_DEFS.map((tab) => {
          const locked = tab.adminOnly && !admin;
          return (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? "nav-item--active" : ""} ${locked ? "nav-item--locked" : ""}`}
              onClick={() => !locked && onChange(tab.key)}
              disabled={locked}
              title={locked ? "Locked — CA/Admin access only" : undefined}
            >
              {tab.label}
              {locked && <span className="nav-lock">🔒</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}

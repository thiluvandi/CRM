import { useEffect, useRef, useState } from "react";
import { isAdminUser } from "../permissions";
import logoFull from "../assets/logo-full.png";

export default function TopBanner({ currentUser, onLogout, onMenuClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const identityRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!identityRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="top-banner">
      <button className="burger-btn" onClick={onMenuClick} aria-label="Open navigation menu">
        <span />
        <span />
        <span />
      </button>

      <img src={logoFull} alt="CSG & Associates" className="brand-mark" />

      <div className="brand-text">
        <div className="brand-name">CSG's CRM</div>
        <div className="brand-sub">CSG & Associates — Chartered Accountants</div>
      </div>

      <div className="identity-bar" ref={identityRef}>
        <button
          type="button"
          className="identity-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <span className="current-user-name">{currentUser.name}</span>
          <span className={`identity-caret ${menuOpen ? "identity-caret--up" : ""}`} aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="identity-menu">
            <span className={`role-badge ${isAdminUser(currentUser) ? "role-badge--admin" : "role-badge--staff"}`}>
              {currentUser.role}
            </span>
            <button className="btn btn--ghost btn--sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { buildNotifications, countUnread } from "../lib/notifications";

const KIND_ICON = {
  verify: "📄",
  verified: "✅",
  note: "💬",
};

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ currentUser, tasks, notes, users, onMarkSeen, onSelectTask }) {
  const [open, setOpen] = useState(false);
  // Mirrors the stored mark so the badge clears instantly, without waiting for
  // the write to land and the profile to be refetched.
  const [seenAt, setSeenAt] = useState(currentUser.notifications_seen_at);
  const panelRef = useRef(null);

  const items = useMemo(
    () => buildNotifications({ currentUser, tasks, notes, users }),
    [currentUser, tasks, notes, users]
  );
  const unread = countUnread(items, seenAt);

  // Never move the mark backwards: a refetch can briefly carry the pre-write
  // value and would otherwise make a cleared badge reappear.
  useEffect(() => {
    const stored = currentUser.notifications_seen_at;
    if (!stored) return;
    setSeenAt((local) => (!local || new Date(stored) > new Date(local) ? stored : local));
  }, [currentUser.notifications_seen_at]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        const now = new Date().toISOString();
        setSeenAt(now);
        onMarkSeen(now);
      }
      return !wasOpen;
    });
  };

  const select = (taskId) => {
    setOpen(false);
    onSelectTask(taskId);
  };

  return (
    <div className="notif" ref={panelRef}>
      <button
        type="button"
        className="notif-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
      >
        <span className="notif-icon" aria-hidden="true">
          🔔
        </span>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">Notifications</div>
          {items.length === 0 ? (
            <p className="notif-empty">You're all caught up.</p>
          ) : (
            <ul className="notif-list">
              {items.slice(0, 30).map((item) => (
                <li key={item.id}>
                  <button type="button" className="notif-item" onClick={() => select(item.taskId)}>
                    <span className="notif-item-icon" aria-hidden="true">
                      {KIND_ICON[item.kind]}
                    </span>
                    <span className="notif-item-body">
                      <span className="notif-item-title">{item.title}</span>
                      <span className="notif-item-detail">{item.detail}</span>
                      <span className="notif-item-time">{timeAgo(item.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { buildNotifications, countUnread } from "../lib/notifications";
import { playChime, unlockAudio } from "../lib/chime";

const KIND_ICON = {
  verify: "📄",
  verified: "✅",
  note: "💬",
};

const MUTE_KEY = "taxops_notif_muted";

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ currentUser, tasks, notes, users, taskFiles, onMarkSeen, onSelectTask }) {
  const [open, setOpen] = useState(false);
  // Mirrors the stored mark so the badge clears instantly, without waiting for
  // the write to land and the profile to be refetched.
  const [seenAt, setSeenAt] = useState(currentUser.notifications_seen_at);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");
  const panelRef = useRef(null);
  const prevIdsRef = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const items = useMemo(
    () => buildNotifications({ currentUser, tasks, notes, users, taskFiles }),
    [currentUser, tasks, notes, users, taskFiles]
  );
  const unread = countUnread(items, seenAt);

  // Chime when a notification ID appears that wasn't there before. Keying on IDs
  // (not the unread count, which resets when the panel opens) avoids false pings,
  // and the first pass only seeds the baseline so an initial load stays silent.
  // The component is keyed by user in TopBanner, so switching accounts remounts
  // and reseeds — no chime for the next user's existing notifications.
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    const prev = prevIdsRef.current;
    prevIdsRef.current = ids;
    if (!prev) return;
    let hasNew = false;
    for (const id of ids) {
      if (!prev.has(id)) {
        hasNew = true;
        break;
      }
    }
    if (hasNew && !mutedRef.current) playChime();
  }, [items]);

  // Resume the audio context on the first user gesture so the first chime isn't
  // blocked by the browser's autoplay policy.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      if (!next) {
        unlockAudio();
        playChime(); // preview the sound when turning it back on
      }
      return next;
    });
  };

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
          <div className="notif-panel-head">
            <span>Notifications</span>
            <button
              type="button"
              className="notif-mute"
              onClick={toggleMute}
              aria-label={muted ? "Unmute notification sound" : "Mute notification sound"}
              title={muted ? "Sound off — click to unmute" : "Sound on — click to mute"}
            >
              {muted ? "🔕" : "🔔"}
            </button>
          </div>
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

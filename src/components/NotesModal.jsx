import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_ANIMATION_MS = 260;

export default function NotesModal({ task, notes, users, currentUser, onAddNote, onClose }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const listRef = useRef(null);

  const authorName = (id) => users.find((u) => u.id === id)?.name || "Unknown";
  const assigneeName = users.find((u) => u.id === task.assigned_to)?.name || "Unassigned";

  // Play the reverse animation, then actually unmount.
  const startClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") startClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [notes.length]);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await onAddNote(task.id, message.trim());
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={`draft-modal-backdrop ${closing ? "modal-backdrop-closing" : "modal-backdrop-opening"}`} onClick={startClose}>
      <div
        className={`notes-dialog ${closing ? "notes-dialog-closing" : "notes-dialog-opening"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`task-card notes-task-card ${task.status === "Pending" ? "task-card--pending" : "task-card--completed"} ${closing ? "notes-task-card-closing" : "notes-task-card-opening"}`}>
          <div className="task-card-header">
            <span className="task-client">{task.client}</span>
            <div className="notes-task-card-right">
              <span className={`status-pill status-pill--${task.status.toLowerCase()}`}>{task.status}</span>
              <button className="draft-modal-close" onClick={startClose} aria-label="Close notes">
                ✕
              </button>
            </div>
          </div>
          <div className="task-card-meta">
            <span>{task.task_type}</span>
            <span>·</span>
            <span>Assigned: {assigneeName}</span>
            <span>·</span>
            <span>Due {task.deadline}</span>
          </div>
        </div>

        <div className="draft-modal notes-modal">
          <div ref={listRef} className="notes-list">
            {notes.length === 0 && <p className="empty-note">No notes yet. Start the conversation below.</p>}
            {notes.map((n) => {
              const isSelf = n.author_id === currentUser.id;
              return (
                <div key={n.id} className={`note-bubble ${isSelf ? "note-bubble--self" : ""}`}>
                  <div className="note-bubble-meta">
                    <span className="note-bubble-author">{authorName(n.author_id)}</span>
                    <span className="note-bubble-time">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="note-bubble-text">{n.message}</div>
                </div>
              );
            })}
          </div>

          <form className="notes-composer" onSubmit={submit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a note…"
              rows={2}
              required
            />
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
              {submitting ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

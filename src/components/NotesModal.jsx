import { useState } from "react";

export default function NotesModal({ task, notes, users, currentUser, onAddNote, onClose }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authorName = (id) => users.find((u) => u.id === id)?.name || "Unknown";

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

  return (
    <div className="draft-modal-backdrop" onClick={onClose}>
      <div className="draft-modal notes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="draft-modal-header">
          <span className="draft-modal-title">Notes — {task.client}</span>
          <button className="draft-modal-close" onClick={onClose} aria-label="Close notes">
            ✕
          </button>
        </div>

        <div className="notes-list">
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
  );
}

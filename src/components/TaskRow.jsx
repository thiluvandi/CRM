import { useEffect, useRef, useState } from "react";
import { supabase, DRAFTS_BUCKET } from "../supabaseClient";
import DraftPreviewModal from "./DraftPreviewModal";
import NotesModal from "./NotesModal";
import StatusToggle from "./StatusToggle";

export default function TaskRow({ task, users, notes = [], activity = [], files = [], currentUser, canEditFields, canDelete, canVerify, focusSignal, onUpdate, onDelete, onAddNote, onAddFile, onRemoveFile, onVerifyFile }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const [previewFile, setPreviewFile] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [flash, setFlash] = useState(false);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);

  // A task's creator can always edit it, even without the firm-wide Add/Edit
  // permission; everyone else needs that permission.
  const canEdit = canEditFields || task.created_by === currentUser.id;

  // focusSignal carries a fresh nonce each time a notification for this task is
  // clicked, so re-clicking the same one re-triggers the scroll and highlight.
  useEffect(() => {
    if (focusSignal === null || focusSignal === undefined) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [focusSignal]);

  const assigneeName = users.find((u) => u.id === task.assigned_to)?.name || "Unassigned";
  const nameOf = (id) => (id ? users.find((u) => u.id === id)?.name : null);

  const triggerFileSelect = () => fileInputRef.current?.click();

  // Upload each selected file to storage, then record it as its own task_files
  // row. Files are independent, so one failure doesn't abort the rest.
  const handleFileChange = async (e) => {
    const chosen = Array.from(e.target.files || []);
    e.target.value = "";
    if (chosen.length === 0) return;
    setUploadError("");
    setUploading(true);
    for (const file of chosen) {
      const path = `${task.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(DRAFTS_BUCKET).upload(path, file, { upsert: true });
      if (uploadErr) {
        setUploadError(uploadErr.message);
        continue;
      }
      try {
        await onAddFile(task.id, {
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size: file.size,
        });
      } catch (err) {
        setUploadError(err.message);
      }
    }
    setUploading(false);
  };

  const removeFile = (file) => {
    if (!window.confirm(`Remove "${file.file_name}"? This also clears its verification.`)) return;
    onRemoveFile(file);
  };

  const startEdit = () => {
    setDraft(task);
    setEditing(true);
  };

  const save = () => {
    const nameOf = (id) => users.find((u) => u.id === id)?.name || "Unassigned";
    const changes = [];
    if (draft.client !== task.client) changes.push(`Client "${task.client}" → "${draft.client}"`);
    if (draft.task_type !== task.task_type) changes.push(`Task Type "${task.task_type}" → "${draft.task_type}"`);
    if (draft.assigned_to !== task.assigned_to) changes.push(`Assignee ${nameOf(task.assigned_to)} → ${nameOf(draft.assigned_to)}`);
    if (draft.deadline !== task.deadline) changes.push(`Deadline ${task.deadline} → ${draft.deadline}`);
    onUpdate(
      task.id,
      {
        client: draft.client,
        task_type: draft.task_type,
        assigned_to: draft.assigned_to,
        deadline: draft.deadline,
      },
      changes.length ? { action: "edited", detail: `Edited ${changes.join("; ")}` } : null,
    );
    setEditing(false);
  };

  const cancel = () => {
    setDraft(task);
    setEditing(false);
  };

  const today = new Date();
  const overdue = task.status !== "Completed" && new Date(task.deadline) < today;

  const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

  if (editing) {
    return (
      <div className="task-card task-card--editing">
        <div className="task-edit-grid">
          <label>
            Client
            <input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} />
          </label>
          <label>
            Task Type
            <input value={draft.task_type} onChange={(e) => setDraft({ ...draft, task_type: e.target.value })} />
          </label>
          <label>
            Assigned To
            <select value={draft.assigned_to} onChange={(e) => setDraft({ ...draft, assigned_to: e.target.value })}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deadline
            <input type="date" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
          </label>
        </div>
        <div className="task-edit-actions">
          <button className="btn btn--primary btn--sm" onClick={save}>Save</button>
          <button className="btn btn--ghost btn--sm" onClick={cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`task-card ${task.status === "Pending" ? "task-card--pending" : "task-card--completed"} ${flash ? "task-card--flash" : ""}`}
    >
      <div className="task-card-main">
        <div className="task-card-header">
          <div className="task-client-group">
            <span className="task-client">{task.client}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setNotesOpen(true)} title="Notes">
              💬 Notes{notes.length > 0 ? ` (${notes.length})` : ""}
            </button>
          </div>
          <span className={`status-pill status-pill--${task.status.toLowerCase()}`}>{task.status}</span>
        </div>
        <div className="task-card-meta">
          <span>{task.task_type}</span>
          <span>·</span>
          <span>Assigned: {assigneeName}</span>
          <span>·</span>
          <span className={overdue ? "overdue-date" : undefined}>Due {task.deadline}{overdue ? " (overdue)" : ""}</span>
          {task.status === "Completed" && task.completed_at && (
            <>
              <span>·</span>
              <span>Completed {new Date(task.completed_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>

      <div className="task-draft">
        {files.map((file) => (
          <div className="draft-info" key={file.id}>
            <span className="draft-icon">📎</span>
            <div className="draft-meta">
              <button type="button" className="draft-link" onClick={() => setPreviewFile(file)}>
                {file.file_name}
              </button>
              <span className="draft-sub">
                {formatSize(file.file_size)} · Uploaded by {nameOf(file.uploaded_by) || "—"} ·{" "}
                {new Date(file.uploaded_at).toLocaleString()}
              </span>
            </div>
            <div className="draft-actions">
              {file.verified ? (
                <span
                  className="draft-badge draft-badge--verified"
                  title={`Verified by ${nameOf(file.verified_by) || "—"} · ${new Date(file.verified_at).toLocaleString()}`}
                >
                  ✓ Verified
                </span>
              ) : canVerify ? (
                <button className="btn btn--primary btn--sm" onClick={() => onVerifyFile(file, true)}>
                  Mark Verified
                </button>
              ) : (
                <span className="draft-badge draft-badge--pending">Awaiting CA review</span>
              )}
              {file.verified && canVerify && (
                <button className="btn btn--ghost btn--sm" onClick={() => onVerifyFile(file, false)}>
                  Unverify
                </button>
              )}
              {(canVerify || file.uploaded_by === currentUser.id) && (
                <button
                  className="btn btn--danger btn--sm btn--icon"
                  onClick={() => removeFile(file)}
                  title="Remove file"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={triggerFileSelect} disabled={uploading}>
          {uploading ? "Uploading…" : files.length > 0 ? "📎 Add File" : "📎 Upload File"}
        </button>
        {uploadError && <div className="form-error" style={{ marginTop: 8 }}>{uploadError}</div>}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="draft-file-input"
          onChange={handleFileChange}
        />
      </div>

      <div className="task-card-actions">
        <StatusToggle
          value={task.status}
          onChange={(status) =>
            onUpdate(task.id, { status }, { action: "status_changed", detail: `Marked ${status}` })
          }
        />
        {canEdit && (
          <button
            className="btn btn--ghost btn--sm btn--icon"
            onClick={startEdit}
            title="Edit task details"
            aria-label="Edit task details"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn--danger btn--sm btn--icon"
            onClick={() => {
              if (window.confirm(`Delete "${task.client}" (${task.task_type})? This cannot be undone.`)) {
                onDelete(task.id);
              }
            }}
            title="Delete task"
            aria-label="Delete task"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      <div className="task-activity">
        <button
          type="button"
          className="activity-toggle"
          onClick={() => setLogOpen((o) => !o)}
          aria-expanded={logOpen}
        >
          <span className={`activity-caret ${logOpen ? "activity-caret--open" : ""}`} aria-hidden="true">▸</span>
          Activity log{activity.length > 0 ? ` (${activity.length})` : ""}
        </button>
        {logOpen && (
          <ul className="activity-list">
            {activity.length === 0 && <li className="activity-empty">No activity recorded yet.</li>}
            {[...activity]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((entry) => (
                <li key={entry.id} className="activity-item">
                  <span className="activity-detail">{entry.detail || entry.action}</span>
                  <span className="activity-by">
                    {users.find((u) => u.id === entry.actor_id)?.name || "—"} · {new Date(entry.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {previewFile && (
        <DraftPreviewModal
          draftFile={{
            name: previewFile.file_name,
            path: previewFile.file_path,
            type: previewFile.file_type,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {notesOpen && (
        <NotesModal
          task={task}
          notes={notes}
          users={users}
          currentUser={currentUser}
          onAddNote={onAddNote}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </div>
  );
}

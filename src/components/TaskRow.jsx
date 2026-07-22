import { useEffect, useRef, useState } from "react";
import { supabase, DRAFTS_BUCKET } from "../supabaseClient";
import DraftPreviewModal from "./DraftPreviewModal";
import NotesModal from "./NotesModal";

const STATUS_OPTIONS = ["Pending", "Completed"];

export default function TaskRow({ task, users, notes = [], currentUser, canEditFields, canDelete, canVerify, focusSignal, onUpdate, onDelete, onAddNote }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [flash, setFlash] = useState(false);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);

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
  const uploadedByName = task.draft_uploaded_by ? users.find((u) => u.id === task.draft_uploaded_by)?.name : null;
  const verifiedByName = task.draft_verified_by ? users.find((u) => u.id === task.draft_verified_by)?.name : null;

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const path = `${task.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from(DRAFTS_BUCKET).upload(path, file, { upsert: true });
    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }
    await onUpdate(task.id, {
      draft_file_name: file.name,
      draft_file_path: path,
      draft_file_type: file.type,
      draft_file_size: file.size,
      draft_uploaded_by: currentUser.id,
      draft_uploaded_at: new Date().toISOString(),
      draft_verified: false,
      draft_verified_by: null,
      draft_verified_at: null,
    });
    setUploading(false);
  };

  const toggleVerified = () => {
    const verified = !task.draft_verified;
    onUpdate(task.id, {
      draft_verified: verified,
      draft_verified_by: verified ? currentUser.id : null,
      draft_verified_at: verified ? new Date().toISOString() : null,
    });
  };

  const handleRemoveDraft = async () => {
    if (!window.confirm(`Remove "${task.draft_file_name}"? This also clears its verification.`)) return;
    setUploadError("");
    setUploading(true);
    // Clear the row even if the storage object is already gone, so a stale
    // reference can't leave the task stuck with an unremovable file.
    const { error: removeErr } = await supabase.storage.from(DRAFTS_BUCKET).remove([task.draft_file_path]);
    if (removeErr) {
      setUploadError(removeErr.message);
      setUploading(false);
      return;
    }
    await onUpdate(task.id, {
      draft_file_name: null,
      draft_file_path: null,
      draft_file_type: null,
      draft_file_size: null,
      draft_uploaded_by: null,
      draft_uploaded_at: null,
      draft_verified: false,
      draft_verified_by: null,
      draft_verified_at: null,
    });
    setUploading(false);
  };

  const startEdit = () => {
    setDraft(task);
    setEditing(true);
  };

  const save = () => {
    onUpdate(task.id, {
      client: draft.client,
      task_type: draft.task_type,
      assigned_to: draft.assigned_to,
      deadline: draft.deadline,
    });
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
        </div>
      </div>

      <div className="task-draft">
        {task.draft_file_path ? (
          <div className="draft-info">
            <span className="draft-icon">📎</span>
            <div className="draft-meta">
              <button type="button" className="draft-link" onClick={() => setPreviewOpen(true)}>
                {task.draft_file_name}
              </button>
              <span className="draft-sub">
                {formatSize(task.draft_file_size)} · Uploaded by {uploadedByName || "—"} ·{" "}
                {new Date(task.draft_uploaded_at).toLocaleString()}
              </span>
            </div>
            {task.draft_verified ? (
              <span
                className="draft-badge draft-badge--verified"
                title={`Verified by ${verifiedByName || "—"} · ${new Date(task.draft_verified_at).toLocaleString()}`}
              >
                ✓ Verified
              </span>
            ) : canVerify ? (
              <button className="btn btn--primary btn--sm" onClick={toggleVerified}>
                Mark Verified
              </button>
            ) : (
              <span className="draft-badge draft-badge--pending">Awaiting CA review</span>
            )}
            {task.draft_verified && canVerify && (
              <button className="btn btn--ghost btn--sm" onClick={toggleVerified}>
                Unverify
              </button>
            )}
            <button
              className="btn btn--ghost btn--sm btn--icon"
              onClick={triggerFileSelect}
              disabled={uploading}
              title="Replace file"
              aria-label="Replace file"
            >
              {uploading ? "…" : "↻"}
            </button>
            {(canVerify || task.draft_uploaded_by === currentUser.id) && (
              <button
                className="btn btn--danger btn--sm btn--icon"
                onClick={handleRemoveDraft}
                disabled={uploading}
                title="Remove file"
                aria-label="Remove file"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button className="btn btn--ghost btn--sm" onClick={triggerFileSelect} disabled={uploading}>
            {uploading ? "Uploading…" : "📎 Upload Draft"}
          </button>
        )}
        {uploadError && <div className="form-error" style={{ marginTop: 8 }}>{uploadError}</div>}
        <input type="file" ref={fileInputRef} className="draft-file-input" onChange={handleFileChange} />
      </div>

      <div className="task-card-actions">
        <select
          value={task.status}
          onChange={(e) => onUpdate(task.id, { status: e.target.value })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {canEditFields && (
          <button className="btn btn--ghost btn--sm" onClick={startEdit} title="Edit task details">
            Edit Task
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn--danger btn--sm"
            onClick={() => {
              if (window.confirm(`Delete "${task.client}" (${task.task_type})? This cannot be undone.`)) {
                onDelete(task.id);
              }
            }}
            title="Delete task"
          >
            Delete
          </button>
        )}
      </div>

      {previewOpen && task.draft_file_path && (
        <DraftPreviewModal
          draftFile={{
            name: task.draft_file_name,
            path: task.draft_file_path,
            type: task.draft_file_type,
          }}
          onClose={() => setPreviewOpen(false)}
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

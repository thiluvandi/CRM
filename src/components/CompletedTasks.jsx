import { useState } from "react";
import { canViewAllTasks, canAddEditTasks, canDeleteData, isAdminUser } from "../permissions";
import TaskRow from "./TaskRow";

export default function CompletedTasks({ users, tasks, notes, activity, taskFiles, currentUser, focusTask, onUpdateTask, onDeleteTask, onAddNote, onAddFile, onRemoveFile, onVerifyFile }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const seesAll = canViewAllTasks(currentUser);
  const editable = canAddEditTasks(currentUser);
  const deletable = canDeleteData(currentUser);

  const scoped = seesAll ? tasks : tasks.filter((t) => t.assigned_to === currentUser.id);
  const completed = scoped.filter((t) => t.status === "Completed");

  const rangeActive = !!(from || to);

  const inRange = (task) => {
    if (!rangeActive) return true;
    if (!task.completed_at) return false;
    const day = task.completed_at.slice(0, 10); // YYYY-MM-DD, lexicographically comparable
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const visible = completed
    .filter(inRange)
    .sort((a, b) => {
      // Newest completion first; tasks with no recorded date sink to the bottom.
      if (!a.completed_at) return 1;
      if (!b.completed_at) return -1;
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

  // Completed before tracking existed — hidden once a date range is applied.
  const undatedHidden = rangeActive ? completed.filter((t) => !t.completed_at).length : 0;

  const clearDates = () => {
    setFrom("");
    setTo("");
  };

  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">Completed Tasks</h2>
          <p className="panel-sub">
            {seesAll
              ? "Every completed task across the firm. Filter by the date it was completed."
              : `Tasks you've completed. Filter by the date they were completed.`}
          </p>
        </div>
      </div>

      <div className="date-filter-row">
        <label className="date-filter-field">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="date-filter-field">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {rangeActive && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearDates}>
            Clear dates ✕
          </button>
        )}
      </div>

      {undatedHidden > 0 && (
        <div className="scope-note">
          {undatedHidden} completed task{undatedHidden === 1 ? " was" : "s were"} completed before completion
          dates were tracked, so {undatedHidden === 1 ? "it is" : "they are"} hidden by this date filter. Clear the
          dates to see {undatedHidden === 1 ? "it" : "them"}.
        </div>
      )}

      <div className="task-column">
        <h3 className="task-column-title task-column-title--completed">
          {rangeActive ? "Matching Completed Tasks" : "Completed Tasks"} ({visible.length})
        </h3>
        {visible.length === 0 && (
          <p className="empty-note">
            {rangeActive ? "No completed tasks in the selected date range." : "No completed tasks yet."}
          </p>
        )}
        {visible.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            users={users}
            notes={notes.filter((n) => n.task_id === t.id)}
            activity={activity.filter((a) => a.task_id === t.id)}
            files={taskFiles.filter((f) => f.task_id === t.id)}
            currentUser={currentUser}
            canEditFields={editable}
            canDelete={deletable}
            canVerify={isAdminUser(currentUser)}
            focusSignal={focusTask?.id === t.id ? focusTask.nonce : null}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
            onAddNote={onAddNote}
            onAddFile={onAddFile}
            onRemoveFile={onRemoveFile}
            onVerifyFile={onVerifyFile}
          />
        ))}
      </div>
    </div>
  );
}

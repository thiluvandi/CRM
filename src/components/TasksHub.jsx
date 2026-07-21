import { useState } from "react";
import { canViewAllTasks, canAddEditTasks, canDeleteData, isAdminUser } from "../permissions";
import TaskRow from "./TaskRow";
import AddTaskForm from "./AddTaskForm";

export default function TasksHub({ users, tasks, notes, currentUser, filter, onClearFilter, onAddTask, onUpdateTask, onDeleteTask, onAddNote }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const seesAll = canViewAllTasks(currentUser);
  const editable = canAddEditTasks(currentUser);
  const deletable = canDeleteData(currentUser);

  let visibleTasks = seesAll ? tasks : tasks.filter((t) => t.assigned_to === currentUser.id);

  const filterEmployee = filter?.assignedTo ? users.find((u) => u.id === filter.assignedTo) : null;
  if (filter?.assignedTo) {
    visibleTasks = visibleTasks.filter((t) => t.assigned_to === filter.assignedTo);
  }

  const showPending = !filter?.status || filter.status === "Pending";
  const showCompleted = !filter?.status || filter.status === "Completed";

  const pending = visibleTasks.filter((t) => t.status === "Pending");
  const completed = visibleTasks.filter((t) => t.status === "Completed");

  return (
    <div className="panel">
      <div className="panel-header-row">
        <div>
          <h2 className="panel-title">Tasks Hub</h2>
          <p className="panel-sub">
            {seesAll
              ? "Showing all client tasks across the firm."
              : `Showing tasks assigned to ${currentUser.name}.`}
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddForm((s) => !s)}>
          {showAddForm ? "Close" : "+ Add Task"}
        </button>
      </div>

      {(filter?.status || filter?.assignedTo) && (
        <div className="filter-chip-row">
          <span className="filter-chip">
            Showing {filter.status ? `${filter.status} tasks` : "tasks"}
            {filterEmployee ? ` for ${filterEmployee.name}` : ""}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClearFilter}>
            Clear filter ✕
          </button>
        </div>
      )}

      {!isAdminUser(currentUser) && (
        <div className="scope-note">
          You can add new tasks for anyone.{" "}
          {editable || deletable ? (
            <>Your permissions also allow: {[editable && "Edit Task Details", deletable && "Delete Data"].filter(Boolean).join(", ")}.</>
          ) : (
            <>Existing tasks can only have their Status changed — ask an Admin to unlock more.</>
          )}
        </div>
      )}

      {showAddForm && (
        <AddTaskForm users={users} onAdd={onAddTask} onClose={() => setShowAddForm(false)} />
      )}

      <div className="task-columns">
        {showPending && (
          <div className="task-column">
            <h3 className="task-column-title task-column-title--pending">Pending Tasks ({pending.length})</h3>
            {pending.length === 0 && <p className="empty-note">No pending tasks.</p>}
            {pending.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                users={users}
                notes={notes.filter((n) => n.task_id === t.id)}
                currentUser={currentUser}
                canEditFields={editable}
                canDelete={deletable}
                canVerify={isAdminUser(currentUser)}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                onAddNote={onAddNote}
              />
            ))}
          </div>
        )}

        {showCompleted && (
          <div className="task-column">
            <h3 className="task-column-title task-column-title--completed">Completed Tasks ({completed.length})</h3>
            {completed.length === 0 && <p className="empty-note">No completed tasks.</p>}
            {completed.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                users={users}
                notes={notes.filter((n) => n.task_id === t.id)}
                currentUser={currentUser}
                canEditFields={editable}
                canDelete={deletable}
                canVerify={isAdminUser(currentUser)}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                onAddNote={onAddNote}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

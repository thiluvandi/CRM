import { useEffect, useRef, useState } from "react";
import { isAdminUser } from "../permissions";
import OverviewPanel from "./OverviewPanel";
import TasksHub from "./TasksHub";

export default function Dashboard({ users, tasks, notes, currentUser, focusTask, onAddTask, onUpdateTask, onDeleteTask, onAddNote }) {
  const [filter, setFilter] = useState({ status: null, assignedTo: null });
  const tasksRef = useRef(null);

  const admin = isAdminUser(currentUser);
  const overviewTasks = admin ? tasks : tasks.filter((t) => t.assigned_to === currentUser.id);

  const scrollToTasks = () => {
    tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectStatus = (status) => {
    setFilter({ status, assignedTo: null });
    scrollToTasks();
  };

  const handleSelectTotal = () => {
    setFilter({ status: null, assignedTo: null });
    scrollToTasks();
  };

  const handleSelectEmployee = (userId) => {
    setFilter({ status: null, assignedTo: userId });
    scrollToTasks();
  };

  const clearFilter = () => setFilter({ status: null, assignedTo: null });

  // An active filter could be hiding the task a notification points at.
  useEffect(() => {
    if (focusTask) setFilter({ status: null, assignedTo: null });
  }, [focusTask]);

  return (
    <div className="dashboard-stack">
      <OverviewPanel
        users={users}
        tasks={overviewTasks}
        currentUser={currentUser}
        onSelectStatus={handleSelectStatus}
        onSelectTotal={handleSelectTotal}
        onSelectEmployee={handleSelectEmployee}
      />

      <div ref={tasksRef}>
        <TasksHub
          users={users}
          tasks={tasks}
          notes={notes}
          currentUser={currentUser}
          focusTask={focusTask}
          filter={filter}
          onClearFilter={clearFilter}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddNote={onAddNote}
        />
      </div>
    </div>
  );
}

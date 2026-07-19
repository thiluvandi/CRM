import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { isAdminUser } from "./permissions";
import TopBanner from "./components/TopBanner";
import NavDrawer from "./components/NavDrawer";
import OverviewPanel from "./components/OverviewPanel";
import TasksHub from "./components/TasksHub";
import UserManagement from "./components/UserManagement";
import "./App.css";

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (!error) setUsers(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at");
    if (!error) setTasks(data);
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchTasks()]).then(() => setLoading(false));

    const channel = supabase
      .channel("taxops-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId && users.length > 0) {
      setCurrentUserId(users[0].id);
    }
  }, [users, currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const handleSwitchUser = (id) => {
    setCurrentUserId(id);
    const nextUser = users.find((u) => u.id === id);
    if (nextUser && !isAdminUser(nextUser) && activeTab === "users") {
      setActiveTab("tasks");
    }
  };

  const handleAddTask = async (taskDraft) => {
    await supabase.from("tasks").insert(taskDraft);
  };

  const handleUpdateTask = async (taskId, updates) => {
    await supabase.from("tasks").update(updates).eq("id", taskId);
  };

  const handleDeleteTask = async (taskId) => {
    await supabase.from("tasks").delete().eq("id", taskId);
  };

  const handleTogglePermission = async (userId, key, checked) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const permissions = checked
      ? [...new Set([...target.permissions, key])]
      : target.permissions.filter((p) => p !== key);
    await supabase.from("profiles").update({ permissions }).eq("id", userId);
  };

  const handleAddUser = async ({ name, role }) => {
    const permissions = role === "Admin" ? ["all"] : ["view_assigned", "update_task_status"];
    const { error } = await supabase.from("profiles").insert({ name, role, permissions });
    if (error) throw error;
  };

  const handleDeleteUser = async (userId) => {
    await supabase.from("profiles").delete().eq("id", userId);
  };

  if (loading) {
    return <div className="auth-loading-screen">Loading TaxOps Pro…</div>;
  }

  if (!currentUser) {
    return (
      <div className="auth-loading-screen">
        No users found. Add a row to the "profiles" table in Supabase to get started.
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBanner
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onMenuClick={() => setMenuOpen(true)}
      />
      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setMenuOpen(false);
        }}
        currentUser={currentUser}
      />

      <main className="main-canvas">
        {activeTab === "overview" && <OverviewPanel users={users} tasks={tasks} />}
        {activeTab === "tasks" && (
          <TasksHub
            users={users}
            tasks={tasks}
            currentUser={currentUser}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {activeTab === "users" && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onTogglePermission={handleTogglePermission}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </main>
    </div>
  );
}

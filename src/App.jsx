import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { sha256Hex } from "./lib/hash";
import TopBanner from "./components/TopBanner";
import NavDrawer from "./components/NavDrawer";
import OverviewPanel from "./components/OverviewPanel";
import TasksHub from "./components/TasksHub";
import UserManagement from "./components/UserManagement";
import WhoIsLoggingIn from "./components/WhoIsLoggingIn";
import FirstRunSetup from "./components/FirstRunSetup";
import "./App.css";

const REMEMBER_KEY = "taxops_current_user_id";

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(REMEMBER_KEY));
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,role,permissions,created_at")
      .order("created_at");
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

  const currentUser = users.find((u) => u.id === currentUserId);

  useEffect(() => {
    if (!loading && currentUserId && users.length > 0 && !currentUser) {
      localStorage.removeItem(REMEMBER_KEY);
      setCurrentUserId(null);
    }
  }, [loading, currentUserId, users, currentUser]);

  const handleCheckAccount = async (userId) => {
    const { data } = await supabase.from("profiles").select("password_hash").eq("id", userId).single();
    return { hasPassword: !!data?.password_hash };
  };

  const handleAuthenticate = async (userId, password) => {
    const { data, error } = await supabase.from("profiles").select("password_hash").eq("id", userId).single();
    if (error || !data?.password_hash) return false;
    const hash = await sha256Hex(password);
    if (hash !== data.password_hash) return false;
    localStorage.setItem(REMEMBER_KEY, userId);
    setCurrentUserId(userId);
    return true;
  };

  const handleSetInitialPassword = async (userId, password) => {
    const passwordHash = await sha256Hex(password);
    const { error } = await supabase
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("id", userId)
      .is("password_hash", null);
    if (error) throw error;
    localStorage.setItem(REMEMBER_KEY, userId);
    setCurrentUserId(userId);
  };

  const handleLogout = () => {
    localStorage.removeItem(REMEMBER_KEY);
    setCurrentUserId(null);
    setActiveTab("overview");
  };

  const handleFirstRunSetup = async ({ name, password }) => {
    const passwordHash = await sha256Hex(password);
    const { data, error } = await supabase
      .from("profiles")
      .insert({ name, role: "CA", permissions: ["all"], password_hash: passwordHash })
      .select()
      .single();
    if (error) throw error;
    localStorage.setItem(REMEMBER_KEY, data.id);
    setCurrentUserId(data.id);
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

  const handleAddUser = async ({ name, role, password }) => {
    const passwordHash = await sha256Hex(password);
    const permissions = role === "Admin" ? ["all"] : ["view_assigned", "update_task_status"];
    const { error } = await supabase
      .from("profiles")
      .insert({ name, role, permissions, password_hash: passwordHash });
    if (error) throw error;
  };

  const handleResetPassword = async (userId, password) => {
    const passwordHash = await sha256Hex(password);
    const { error } = await supabase.from("profiles").update({ password_hash: passwordHash }).eq("id", userId);
    if (error) throw error;
  };

  const handleDeleteUser = async (userId) => {
    await supabase.from("profiles").delete().eq("id", userId);
  };

  if (loading) {
    return <div className="auth-loading-screen">Loading CSG's CRM…</div>;
  }

  if (users.length === 0) {
    return <FirstRunSetup onSetup={handleFirstRunSetup} />;
  }

  if (!currentUser) {
    return (
      <WhoIsLoggingIn
        users={users}
        onCheckAccount={handleCheckAccount}
        onAuthenticate={handleAuthenticate}
        onSetInitialPassword={handleSetInitialPassword}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBanner currentUser={currentUser} onLogout={handleLogout} onMenuClick={() => setMenuOpen(true)} />
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
            onResetPassword={handleResetPassword}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </main>
    </div>
  );
}

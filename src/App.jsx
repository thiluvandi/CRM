import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { sha256Hex } from "./lib/hash";
import TopBanner from "./components/TopBanner";
import NavDrawer from "./components/NavDrawer";
import Dashboard from "./components/Dashboard";
import UserManagement from "./components/UserManagement";
import WhoIsLoggingIn from "./components/WhoIsLoggingIn";
import FirstRunSetup from "./components/FirstRunSetup";
import "./App.css";

const REMEMBER_KEY = "taxops_current_user_id";

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(REMEMBER_KEY));
  const [activeTab, setActiveTab] = useState("dashboard");
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

  const fetchNotes = async () => {
    const { data, error } = await supabase.from("task_notes").select("*").order("created_at");
    if (!error) setNotes(data);
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchTasks(), fetchNotes()]).then(() => setLoading(false));

    const channel = supabase
      .channel("taxops-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_notes" }, fetchNotes)
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
    setActiveTab("dashboard");
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
    const { error } = await supabase.from("tasks").insert(taskDraft);
    if (error) throw error;
    await fetchTasks();
  };

  const handleUpdateTask = async (taskId, updates) => {
    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) throw error;
    await fetchTasks();
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw error;
    await fetchTasks();
  };

  const handleAddNote = async (taskId, message) => {
    const { error } = await supabase
      .from("task_notes")
      .insert({ task_id: taskId, author_id: currentUser.id, message });
    if (error) throw error;
    await fetchNotes();
  };

  const handleTogglePermission = async (userId, key, checked) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const permissions = checked
      ? [...new Set([...target.permissions, key])]
      : target.permissions.filter((p) => p !== key);
    const { error } = await supabase.from("profiles").update({ permissions }).eq("id", userId);
    if (error) throw error;
    await fetchUsers();
  };

  const handleAddUser = async ({ name, role, password }) => {
    const passwordHash = await sha256Hex(password);
    const permissions = role === "Admin" ? ["all"] : ["view_assigned", "update_task_status"];
    const { error } = await supabase
      .from("profiles")
      .insert({ name, role, permissions, password_hash: passwordHash });
    if (error) throw error;
    await fetchUsers();
  };

  const handleResetPassword = async (userId, password) => {
    const passwordHash = await sha256Hex(password);
    const { error } = await supabase.from("profiles").update({ password_hash: passwordHash }).eq("id", userId);
    if (error) throw error;
    await fetchUsers();
  };

  const handleDeleteUser = async (userId) => {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) throw error;
    await fetchUsers();
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
        {activeTab === "dashboard" && (
          <Dashboard
            users={users}
            tasks={tasks}
            notes={notes}
            currentUser={currentUser}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddNote={handleAddNote}
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

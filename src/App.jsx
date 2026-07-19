import { useEffect, useState } from "react";
import { supabase, supabaseSignupClient } from "./supabaseClient";
import TopBanner from "./components/TopBanner";
import NavDrawer from "./components/NavDrawer";
import OverviewPanel from "./components/OverviewPanel";
import TasksHub from "./components/TasksHub";
import UserManagement from "./components/UserManagement";
import Login from "./components/Login";
import "./App.css";

function generateTempPassword() {
  return `Tp${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at");
    if (!error) setUsers(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at");
    if (!error) setTasks(data);
  };

  useEffect(() => {
    if (!session) {
      setUsers([]);
      setTasks([]);
      return;
    }
    fetchUsers();
    fetchTasks();

    const channel = supabase
      .channel("taxops-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const currentUser = session ? users.find((u) => u.id === session.user.id) : null;

  const handleSignOut = () => supabase.auth.signOut();

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

  const handleAddUser = async ({ name, email, role }) => {
    const tempPassword = generateTempPassword();
    const { data, error } = await supabaseSignupClient.auth.signUp({ email, password: tempPassword });
    if (error) throw error;
    const permissions = role === "Admin" ? ["all"] : ["view_assigned", "update_task_status"];
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user.id, name, role, permissions });
    if (profileError) throw profileError;
    return tempPassword;
  };

  const handleDeleteUser = async (userId) => {
    await supabase.from("profiles").delete().eq("id", userId);
  };

  if (session === undefined) {
    return <div className="auth-loading-screen">Loading TaxOps Pro…</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (!currentUser) {
    return (
      <div className="auth-loading-screen">
        <div style={{ textAlign: "center" }}>
          <p>No profile found for this account. Ask an Admin to provision access.</p>
          <button className="btn btn--ghost btn--sm" onClick={handleSignOut} style={{ marginTop: 12 }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBanner currentUser={currentUser} onSignOut={handleSignOut} onMenuClick={() => setMenuOpen(true)} />
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

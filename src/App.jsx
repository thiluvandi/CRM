import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { sha256Hex } from "./lib/hash";
import TopBanner from "./components/TopBanner";
import NavDrawer from "./components/NavDrawer";
import Dashboard from "./components/Dashboard";
import CompletedTasks from "./components/CompletedTasks";
import UserManagement from "./components/UserManagement";
import WhoIsLoggingIn from "./components/WhoIsLoggingIn";
import FirstRunSetup from "./components/FirstRunSetup";
import "./App.css";

const REMEMBER_KEY = "taxops_current_user_id";

// password_hash is deliberately never bulk-fetched — see the note in schema.sql.
const PROFILE_COLUMNS = "id,name,role,permissions,notifications_seen_at,created_at";
// Fallback for databases where add_notifications_seen_migration.sql hasn't been
// run yet; without it the whole profile load fails and the app would look empty.
const PROFILE_COLUMNS_LEGACY = "id,name,role,permissions,created_at";
const UNDEFINED_COLUMN = "42703";

export default function App() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(REMEMBER_KEY));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // { id, nonce } — the nonce lets the same task be re-focused on a repeat click.
  const [focusTask, setFocusTask] = useState(null);

  const fetchUsers = async () => {
    let { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).order("created_at");
    if (error?.code === UNDEFINED_COLUMN) {
      ({ data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS_LEGACY).order("created_at"));
    }
    if (error) {
      setLoadError(error.message);
      return;
    }
    setLoadError("");
    setUsers(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at");
    if (!error) setTasks(data);
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase.from("task_notes").select("*").order("created_at");
    if (!error) setNotes(data);
  };

  // The activity table ships in a later migration; tolerate its absence so an
  // un-migrated database still loads the rest of the app.
  const fetchActivity = async () => {
    const { data, error } = await supabase.from("task_activity").select("*").order("created_at");
    if (!error) setActivity(data);
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchTasks(), fetchNotes(), fetchActivity()]).then(() => setLoading(false));

    // profiles/tasks/task_notes drive the live UI and notifications — keep them
    // on their own channel so nothing else can disturb their realtime feed.
    const channel = supabase
      .channel("taxops-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchUsers)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, fetchTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_notes" }, fetchNotes)
      .subscribe();

    // task_activity is isolated on its own channel: if it isn't enabled for
    // realtime, a CHANNEL_ERROR here can't take down the channel above (which
    // is what previously broke live notifications on document upload / notes).
    const activityChannel = supabase
      .channel("taxops-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_activity" }, fetchActivity)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(activityChannel);
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

  const handleMarkNotificationsSeen = async (iso) => {
    const { error } = await supabase
      .from("profiles")
      .update({ notifications_seen_at: iso })
      .eq("id", currentUserId);
    if (!error) await fetchUsers();
  };

  const handleSelectNotifiedTask = (taskId) => {
    // Completed tasks live in their own tab now, so route the focus there.
    const task = tasks.find((t) => t.id === taskId);
    setActiveTab(task?.status === "Completed" ? "completed" : "dashboard");
    setFocusTask({ id: taskId, nonce: Date.now() });
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

  // Records one meaningful action against a task. Best-effort: a failed log
  // (e.g. the migration hasn't been run yet) must never block the action it
  // describes, which has already succeeded by the time we get here.
  const logActivity = async (taskId, action, detail) => {
    const { error } = await supabase
      .from("task_activity")
      .insert({ task_id: taskId, actor_id: currentUserId, action, detail });
    if (!error) await fetchActivity();
  };

  const handleAddTask = async (taskDraft) => {
    let { data, error } = await supabase
      .from("tasks")
      .insert({ ...taskDraft, created_by: currentUserId })
      .select()
      .single();
    // Fall back for databases where add_task_activity_migration.sql hasn't been
    // run yet — created_by won't exist there, but adding tasks must still work.
    if (error?.code === UNDEFINED_COLUMN) {
      ({ data, error } = await supabase.from("tasks").insert(taskDraft).select().single());
    }
    if (error) throw error;
    const assignee = users.find((u) => u.id === data.assigned_to)?.name || "Unassigned";
    await logActivity(data.id, "created", `Created task — assigned to ${assignee}`);
    await fetchTasks();
  };

  const handleUpdateTask = async (taskId, updates, activity) => {
    // Stamp/clear the completion date alongside a status change so the
    // Completed Tasks tab can filter by when a task was actually finished.
    let payload = updates;
    if (updates.status === "Completed") payload = { ...updates, completed_at: new Date().toISOString() };
    else if (updates.status === "Pending") payload = { ...updates, completed_at: null };

    // Optimistic update: reflect the change locally right away so toggles feel
    // instant instead of waiting on the write + activity log + refetch. The
    // fetchTasks below (and the realtime subscription) reconcile with the DB.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...payload } : t)));

    let { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
    // Fall back for databases where add_completed_at_migration.sql hasn't run
    // yet — completed_at won't exist there, but status changes must still work.
    if (error?.code === UNDEFINED_COLUMN && payload !== updates) {
      ({ error } = await supabase.from("tasks").update(updates).eq("id", taskId));
    }
    if (error) {
      await fetchTasks(); // roll the optimistic change back to server truth
      throw error;
    }
    if (activity) await logActivity(taskId, activity.action, activity.detail);
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
    await logActivity(taskId, "note_added", "Added a note");
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

  // A failed load also leaves users empty, and offering first-run setup then
  // would invite a duplicate CA account on a database that already has one.
  if (loadError) {
    return <div className="auth-loading-screen">Couldn't load accounts — {loadError}</div>;
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
      <TopBanner
        currentUser={currentUser}
        tasks={tasks}
        notes={notes}
        users={users}
        onMarkSeen={handleMarkNotificationsSeen}
        onSelectTask={handleSelectNotifiedTask}
        onLogout={handleLogout}
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
        {activeTab === "dashboard" && (
          <Dashboard
            users={users}
            tasks={tasks}
            notes={notes}
            activity={activity}
            currentUser={currentUser}
            focusTask={focusTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddNote={handleAddNote}
            onGoToCompleted={() => setActiveTab("completed")}
          />
        )}
        {activeTab === "completed" && (
          <CompletedTasks
            users={users}
            tasks={tasks}
            notes={notes}
            activity={activity}
            currentUser={currentUser}
            focusTask={focusTask}
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

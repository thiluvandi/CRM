import { isAdminUser } from "../permissions";

export default function OverviewPanel({ users, tasks, currentUser, onSelectStatus, onSelectTotal, onSelectEmployee }) {
  const admin = isAdminUser(currentUser);

  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  const today = new Date();

  const staff = users.filter((u) => !isAdminUser(u));
  const loadByEmployee = staff.map((u) => {
    const userTasks = tasks.filter((t) => t.assigned_to === u.id);
    const overdueCount = userTasks.filter((t) => t.status !== "Completed" && new Date(t.deadline) < today).length;
    const completedCount = userTasks.filter((t) => t.status === "Completed").length;
    const pendingCount = userTasks.length - overdueCount - completedCount;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      total: userTasks.length,
      overdueCount,
      pendingCount,
      completedCount,
    };
  });

  return (
    <div className="panel">
      <h2 className="panel-title">Overview Panel</h2>
      <p className="panel-sub">
        {admin
          ? "Firm-wide monitoring across all clients and staff. Click any metric to jump to those tasks below."
          : "Your task summary. Click any metric to jump to those tasks below."}
      </p>

      <div className="metric-cards">
        <button type="button" className="metric-card metric-card--pending metric-card--clickable" onClick={() => onSelectStatus("Pending")}>
          <div className="metric-label">{admin ? "Total Pending Tasks" : "Your Pending Tasks"}</div>
          <div className="metric-value">{pendingCount}</div>
        </button>
        <button type="button" className="metric-card metric-card--completed metric-card--clickable" onClick={() => onSelectStatus("Completed")}>
          <div className="metric-label">{admin ? "Completed Tasks" : "Your Completed Tasks"}</div>
          <div className="metric-value">{completedCount}</div>
        </button>
        <button type="button" className="metric-card metric-card--total metric-card--clickable" onClick={onSelectTotal}>
          <div className="metric-label">{admin ? "Total Tasks" : "Your Total Tasks"}</div>
          <div className="metric-value">{tasks.length}</div>
        </button>
      </div>

      {admin && (
        <div className="section-block">
          <h3>Task Load per Employee</h3>
          <p className="section-hint">Hover a name for their task breakdown, click to see their tasks below.</p>
          <div className="load-chip-row">
            {loadByEmployee.map((l) => (
              <div className="load-chip-wrap" key={l.id}>
                <button type="button" className="load-chip" onClick={() => onSelectEmployee(l.id)}>
                  {l.name}
                  <span className="load-chip-count">{l.total}</span>
                </button>
                <div className="load-popover">
                  <div className="load-popover-name">
                    {l.name} <span className="load-role">{l.role}</span>
                  </div>
                  {l.total > 0 ? (
                    <>
                      <div className="load-popover-bar">
                        {l.overdueCount > 0 && (
                          <div className="load-segment load-segment--red" style={{ flexGrow: l.overdueCount }} />
                        )}
                        {l.pendingCount > 0 && (
                          <div className="load-segment load-segment--yellow" style={{ flexGrow: l.pendingCount }} />
                        )}
                        {l.completedCount > 0 && (
                          <div className="load-segment load-segment--green" style={{ flexGrow: l.completedCount }} />
                        )}
                      </div>
                      <div className="load-popover-counts">
                        {l.overdueCount} overdue · {l.pendingCount} pending · {l.completedCount} completed
                      </div>
                    </>
                  ) : (
                    <p className="load-popover-empty">No tasks assigned.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-block">
        <h3>{admin ? "Tracking Grid" : "Your Tasks"}</h3>
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Task Type</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Target Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const overdue = t.status !== "Completed" && new Date(t.deadline) < today;
                const assigneeName = users.find((u) => u.id === t.assigned_to)?.name || "Unassigned";
                return (
                  <tr key={t.id} className="grid-row--clickable" onClick={() => onSelectEmployee(t.assigned_to)}>
                    <td>{t.client}</td>
                    <td>{t.task_type}</td>
                    <td>{assigneeName}</td>
                    <td>
                      <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{t.status}</span>
                    </td>
                    <td className={overdue ? "overdue-date" : undefined}>{t.deadline}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

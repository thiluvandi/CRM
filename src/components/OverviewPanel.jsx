import { isAdminUser } from "../permissions";

export default function OverviewPanel({ users, tasks, onSelectStatus, onSelectTotal, onSelectEmployee }) {
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  const staff = users.filter((u) => !isAdminUser(u));
  const loadByEmployee = staff.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    count: tasks.filter((t) => t.assigned_to === u.id).length,
  }));
  const maxLoad = Math.max(1, ...loadByEmployee.map((l) => l.count));

  const today = new Date();

  return (
    <div className="panel">
      <h2 className="panel-title">Overview Panel</h2>
      <p className="panel-sub">Firm-wide monitoring across all clients and staff. Click any metric to jump to those tasks below.</p>

      <div className="metric-cards">
        <button type="button" className="metric-card metric-card--pending metric-card--clickable" onClick={() => onSelectStatus("Pending")}>
          <div className="metric-label">Total Pending Tasks</div>
          <div className="metric-value">{pendingCount}</div>
        </button>
        <button type="button" className="metric-card metric-card--completed metric-card--clickable" onClick={() => onSelectStatus("Completed")}>
          <div className="metric-label">Completed Tasks</div>
          <div className="metric-value">{completedCount}</div>
        </button>
        <button type="button" className="metric-card metric-card--total metric-card--clickable" onClick={onSelectTotal}>
          <div className="metric-label">Total Tasks</div>
          <div className="metric-value">{tasks.length}</div>
        </button>
      </div>

      <div className="section-block">
        <h3>Task Load per Employee</h3>
        <div className="load-list">
          {loadByEmployee.map((l) => (
            <button type="button" className="load-row load-row--clickable" key={l.id} onClick={() => onSelectEmployee(l.id)}>
              <div className="load-name">
                {l.name}
                <span className="load-role">{l.role}</span>
              </div>
              <div className="load-bar-track">
                <div className="load-bar-fill" style={{ width: `${(l.count / maxLoad) * 100}%` }} />
              </div>
              <div className="load-count">{l.count}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section-block">
        <h3>Tracking Grid</h3>
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

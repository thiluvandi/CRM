export default function AccessDenied({ message }) {
  return (
    <div className="access-denied">
      <div className="access-denied-icon">🔒</div>
      <h2>Access Denied</h2>
      <p>{message || "You do not have permission to view this section. Contact your Administrator."}</p>
    </div>
  );
}

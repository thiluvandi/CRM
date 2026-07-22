const CONFETTI_COLORS = ["#14b8a6", "#0d9488", "#16a34a", "#d97706", "#1e4278", "#f59e0b"];
const PIECES = 20;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Completing a task moves its card between the Pending and Completed columns,
// which unmounts this component — so the celebration is spawned imperatively on
// document.body, where it can outlive the remount and finish animating.
function spawnCelebration(x, y) {
  const layer = document.createElement("div");
  layer.className = "celebrate-layer";
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;

  const badge = document.createElement("div");
  badge.className = "celebrate-badge";
  badge.textContent = "✓ Done!";
  layer.appendChild(badge);

  for (let i = 0; i < PIECES; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--angle", `${(360 / PIECES) * i + (Math.random() * 22 - 11)}deg`);
    piece.style.setProperty("--dist", `${34 + Math.random() * 34}px`);
    piece.style.setProperty("--delay", `${Math.random() * 70}ms`);
    piece.style.setProperty("--spin", `${Math.random() * 540 - 270}deg`);
    piece.style.setProperty("--color", CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1200);
}

export default function StatusToggle({ value, onChange, disabled }) {
  const completed = value === "Completed";

  const toggle = (e) => {
    if (disabled) return;
    const next = completed ? "Pending" : "Completed";
    if (next === "Completed" && !prefersReducedMotion()) {
      const rect = e.currentTarget.getBoundingClientRect();
      navigator.vibrate?.(25);
      spawnCelebration(rect.left + rect.width * 0.72, rect.top + rect.height / 2);
    }
    onChange(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={completed}
      aria-label={`Mark task ${completed ? "pending" : "completed"}`}
      className={`status-toggle ${completed ? "status-toggle--done" : ""}`}
      onClick={toggle}
      disabled={disabled}
    >
      <span className="status-toggle-thumb" aria-hidden="true" />
      <span className="status-toggle-seg status-toggle-seg--pending">Pending</span>
      <span className="status-toggle-seg status-toggle-seg--completed">
        <span className="status-toggle-check" aria-hidden="true">
          ✓
        </span>
        Completed
      </span>
    </button>
  );
}

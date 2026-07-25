import { useEffect, useRef, useState } from "react";

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

// Must outlast the thumb's slide transition (transform 0.32s in App.css) so
// the card doesn't unmount mid-animation when the status change filters it out.
const SLIDE_MS = 340;

export default function StatusToggle({ value, onChange, disabled }) {
  // `visual` drives the thumb position so it can slide to the new side before
  // the committed status change (and any resulting unmount) lands.
  const [visual, setVisual] = useState(value === "Completed");
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  // Keep in sync with external changes (e.g. a realtime update from someone else).
  useEffect(() => {
    setVisual(value === "Completed");
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const completed = visual;

  const toggle = (e) => {
    if (disabled || lockRef.current) return;
    const next = completed ? "Pending" : "Completed";
    setVisual(next === "Completed"); // start the slide immediately

    if (next === "Completed" && !prefersReducedMotion()) {
      const rect = e.currentTarget.getBoundingClientRect();
      navigator.vibrate?.(25);
      spawnCelebration(rect.left + rect.width * 0.72, rect.top + rect.height / 2);
    }

    if (prefersReducedMotion()) {
      onChange(next);
      return;
    }

    // Let the thumb finish sliding, then commit — this is what makes the
    // green tab visibly glide back to "Pending" before the row moves.
    lockRef.current = true;
    timerRef.current = setTimeout(() => {
      onChange(next);
      lockRef.current = false;
    }, SLIDE_MS);
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

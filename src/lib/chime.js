// A short two-note notification chime synthesised with the Web Audio API, so
// there's no audio file to bundle. Browsers block audio until the user has
// interacted with the page; unlockAudio() resumes a shared context on the first
// gesture so the first real chime isn't swallowed.
let ctx = null;

function context() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export function unlockAudio() {
  const c = context();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function playChime() {
  const c = context();
  if (!c) return;
  // No gesture yet → resume is best-effort; if it stays suspended the notes
  // simply won't sound rather than throwing.
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    const start = c.currentTime;
    // A5 then D6 — a gentle ascending two-note ping.
    for (const [freq, offset] of [[880, 0], [1174.66, 0.12]]) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start + offset);
      gain.gain.linearRampToValueAtTime(0.14, start + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
      osc.connect(gain).connect(c.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.2);
    }
  } catch {
    // Audio is best-effort — never let it break the UI.
  }
}

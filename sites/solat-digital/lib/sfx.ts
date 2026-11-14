let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  const AC = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext : null;
  if (!AC) return null; try { ctx = ctx || new AC(); ctx.resume().catch(() => {}); return ctx; } catch { return null; }
}
function tone(c: AudioContext, f: number, t: number, dur: number, vol: number, type: OscillatorType = "sine", f2?: number) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
}
/** Kesan bunyi sembang: "send" (swoosh naik) dan "recv" (dua nada lembut). */
export function chatSfx(kind: "send" | "recv" | "delete") {
  const c = ac(); if (!c || c.state !== "running") return; const t = c.currentTime + 0.01;
  if (kind === "send") { tone(c, 520, t, 0.16, 0.18, "sine", 980); tone(c, 1040, t + 0.07, 0.14, 0.08, "triangle"); }
  else if (kind === "recv") { tone(c, 880, t, 0.22, 0.16); tone(c, 1318, t + 0.12, 0.3, 0.14); }
  else tone(c, 420, t, 0.18, 0.12, "triangle", 220);
}

export type Ring = "chime" | "bell" | "beep" | "off";
export const RINGS: { id: Ring; label: string }[] = [
  { id: "chime", label: "Loceng lembut (chime)" }, { id: "bell", label: "Loceng panjang" }, { id: "beep", label: "Bip ringkas" }, { id: "off", label: "Tiada bunyi" },
];
let ctx: AudioContext | null = null;
function note(c: AudioContext, f: number, t: number, dur: number, vol: number, type: OscillatorType) {
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
/** Mainkan nada sebelum azan. Dijana dalam pelayar (tiada fail, tiada isu lesen). */
export async function playRing(kind: Ring, repeat: number, volume: number): Promise<boolean> {
  if (kind === "off") return true;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return false;
  try { ctx = ctx || new AC(); await ctx.resume(); } catch { return false; }
  if (ctx.state !== "running") return false;
  const c = ctx, v = Math.max(0.05, Math.min(1, volume / 100)) * 0.35; let t = c.currentTime + 0.05;
  for (let r = 0; r < Math.max(1, Math.min(5, repeat)); r++) {
    if (kind === "chime") { [659, 880, 1319, 1760].forEach((f, i) => note(c, f, t + i * 0.3, 1.6, v, "sine")); t += 3.2; }
    else if (kind === "bell") { [523, 1046, 1568].forEach((f, i) => note(c, f, t, 3.2 - i * 0.7, v / (i + 1), "triangle")); t += 3.8; }
    else { for (let i = 0; i < 3; i++) note(c, 880, t + i * 0.35, 0.2, v, "square"); t += 1.6; }
  }
  return true;
}

// Kesan bunyi (sound FX) pendek untuk interaksi sahaja, dijana dengan WebAudio. Tiada muzik, tiada fail audio.
let ctx, master;
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.2;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, { t = 0, dur = 0.1, type = 'sine', vol = 1, slide = 0 } = {}) {
  const c = ensure();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), now = c.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g);
  g.connect(master);
  o.start(now);
  o.stop(now + dur + 0.03);
}
export const sfx = {
  click: () => tone(1200, { dur: 0.05, type: 'triangle', vol: 0.5, slide: -500 }),
  pop: () => tone(520, { dur: 0.12, vol: 0.7, slide: 380 }),
  open: () => tone(480, { dur: 0.14, vol: 0.45, slide: 240 }),
  close: () => tone(600, { dur: 0.12, vol: 0.4, slide: -240 }),
  success: () => tone(880, { dur: 0.18, vol: 0.5, slide: 330 }),
  error: () => tone(200, { dur: 0.18, type: 'square', vol: 0.25, slide: -60 }),
  msg: () => tone(880, { dur: 0.08, vol: 0.35, slide: 200 }),
};
// Bunyi klik automatik untuk butang dan pautan.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('button, a.btn, [data-sfx], summary, label.chip');
  if (el && !el.disabled && !el.hasAttribute('data-nosfx')) sfx.click();
}, { passive: true });

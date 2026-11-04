// Bunyi sintetik (WebAudio) — tiada fail audio. Dimatikan/dihidupkan dengan togol, simpan dalam localStorage.
let ctx, master;
const KEY = 'ngap:sound';
let on = true;
try { on = localStorage.getItem(KEY) !== 'off'; } catch {}
function ensure() {
  if (!on) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, { t = 0, dur = 0.12, type = 'sine', vol = 1, slide = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), now = c.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(freq, now);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(master); o.start(now); o.stop(now + dur + 0.03);
}
export const sfx = {
  click: () => { tone(1200, { dur: 0.05, type: 'triangle', vol: 0.5, slide: -500 }); },
  pop: () => { tone(520, { dur: 0.14, vol: 0.8, slide: 380 }); },
  open: () => { tone(440, { dur: 0.18, vol: 0.5, slide: 220 }); tone(660, { t: 0.06, dur: 0.18, vol: 0.4, slide: 220 }); },
  close: () => { tone(660, { dur: 0.14, vol: 0.4, slide: -260 }); },
  success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, { t: i * 0.085, dur: 0.22, vol: 0.55, type: 'sine' })); },
  error: () => { tone(220, { dur: 0.22, type: 'sawtooth', vol: 0.35, slide: -80 }); tone(165, { t: 0.1, dur: 0.28, type: 'sawtooth', vol: 0.3, slide: -50 }); },
  msg: () => { tone(880, { dur: 0.09, vol: 0.4, slide: 200 }); },
  get enabled() { return on; },
  toggle() { on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {} if (on) this.pop(); return on; },
};
// Bunyi klik automatik untuk semua butang/pautan bertanda.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('button, a.btn, [data-sfx], summary, label.chip');
  if (el && !el.disabled && !el.hasAttribute('data-nosfx')) sfx.click();
}, { passive: true });

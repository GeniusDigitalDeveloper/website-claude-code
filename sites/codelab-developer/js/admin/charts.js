// Carta bar SVG ringkas (tanpa library). Menerima [{label, value}] — data sebenar datang daripada adminData.
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}, text) => { const e = document.createElementNS(NS, n); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (text !== undefined) e.textContent = text; return e; };

export function barChart(series, { height = 220, label = '' } = {}) {
  const W = 640, H = height, pad = { l: 40, r: 10, t: 12, b: 28 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, class: 'chart' });
  const max = Math.max(1, ...series.map((s) => s.value));
  const bw = (W - pad.l - pad.r) / series.length;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ((H - pad.t - pad.b) * i) / 4;
    svg.append(el('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: '#e2e8f0' }));
    svg.append(el('text', { x: pad.l - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#475569' }, String(Math.round(max * (1 - i / 4)))));
  }
  series.forEach((s, i) => {
    const h = ((H - pad.t - pad.b) * s.value) / max, x = pad.l + i * bw + bw * 0.15;
    svg.append(el('rect', { x, y: H - pad.b - h, width: bw * 0.7, height: h, rx: 4, fill: 'url(#cg)' }));
    if (series.length <= 16 || i % Math.ceil(series.length / 12) === 0) svg.append(el('text', { x: x + bw * 0.35, y: H - 10, 'text-anchor': 'middle', 'font-size': 10, fill: '#475569' }, s.label));
  });
  const defs = el('defs'); const g = el('linearGradient', { id: 'cg', x1: 0, y1: 0, x2: 0, y2: 1 });
  g.append(el('stop', { offset: 0, 'stop-color': '#7c3aed' }), el('stop', { offset: 1, 'stop-color': '#2563eb' })); defs.append(g); svg.prepend(defs);
  return svg;
}

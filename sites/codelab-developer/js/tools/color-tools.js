import { h, icon, btn, field, controls, outputPane, errorBox, resultRow, copyText, toast, ToolError } from './lib/ui.js';
import * as K from './lib/color.js';
import { store } from '../utils/storage.js';
import { clear } from '../utils/dom.js';

const hexOr = (s, d = '#4f46e5') => (K.parseHex(s) ? K.rgbToHex(K.parseHex(s)) : d);

function swatch(hex, { label = true } = {}) {
  const fg = K.readableOn(K.parseHex(hex));
  const b = h('button', { type: 'button', class: 'swatch', style: `background:${hex};color:${fg}`, 'aria-label': hex, onclick: async () => toast((await copyText(hex)) ? 'toast.copied' : 'toast.copyFailed') }, label ? h('span', { dir: 'ltr' }, hex.toUpperCase()) : null);
  return b;
}

// ---------- penukar warna (4 alat) ----------
function colorConvert({ inKind, outKind }) {
  const ph = { hex: '#4F46E5', rgb: 'rgb(79, 70, 229)', hsl: 'hsl(243, 75%, 59%)' }[inKind];
  const input = h('input', { type: 'text', class: 'big-input', value: ph, spellcheck: 'false', dir: 'ltr', aria: 'ui.input', autocomplete: 'off' });
  const picker = h('input', { type: 'color', class: 'picker', aria: 'ui.pickColor' });
  const preview = h('div', { class: 'color-preview' });
  const rows = h('div', { class: 'results' });
  const err = errorBox();
  const parse = { hex: K.parseHex, rgb: K.parseRgb, hsl: (s) => { const x = K.parseHsl(s); return x && { ...K.hslToRgb(x.h, x.s, x.l), a: x.a }; } }[inKind];
  const fmt = (c) => {
    const hsl = K.rgbToHsl(c);
    return { hex: K.rgbToHex(c, true).toUpperCase(), rgb: K.fmtRgb(c), hsl: K.fmtHsl(hsl, c.a), rgbArr: `[${c.r}, ${c.g}, ${c.b}]`, css: `--color: ${K.rgbToHex(c, true)};` };
  };
  function update() {
    const c = parse(input.value);
    if (!c) { err.show(new ToolError(`err.color_${inKind}`)); clear(rows); preview.style.background = 'transparent'; return; }
    err.hide();
    const f = fmt(c);
    preview.style.background = K.fmtRgb(c);
    picker.value = K.rgbToHex(c);
    clear(rows);
    const order = [outKind, ...['hex', 'rgb', 'hsl'].filter((k) => k !== outKind)];
    rows.append(h('div', { class: 'result-primary' }, resultRow(`ui.fmt_${outKind}`, f[outKind])),
      ...order.slice(1).map((k) => resultRow(`ui.fmt_${k}`, f[k])), resultRow('ui.fmt_rgbArr', f.rgbArr), resultRow('ui.fmt_css', f.css));
  }
  input.addEventListener('input', update);
  picker.addEventListener('input', () => { const c = K.parseHex(picker.value); input.value = { hex: picker.value.toUpperCase(), rgb: K.fmtRgb(c), hsl: K.fmtHsl(K.rgbToHsl(c)) }[inKind]; update(); });
  const el = h('div', { class: 'tool tool-color' },
    h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: `ui.in_${inKind}` })), h('div', { class: 'color-input-row' }, picker, input), err.el),
    h('div', { class: 'split' }, h('div', { class: 'pane' }, preview), h('div', { class: 'pane' }, rows)));
  update();
  return el;
}

// ---------- palet + simpan ----------
const palettes = { all: () => store.get('palettes', []), save(p) { store.set('palettes', [p, ...palettes.all()].slice(0, 30)); }, remove(i) { const a = palettes.all(); a.splice(i, 1); store.set('palettes', a); } };

function savedPalettes() {
  const box = h('div', { class: 'pane saved-palettes' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.savedPalettes' })));
  const list = h('div', { class: 'saved-list' });
  const render = () => {
    clear(list);
    const all = palettes.all();
    if (!all.length) list.append(h('p', { class: 'muted', i18n: 'ui.noSavedPalettes' }));
    all.forEach((p, i) => list.append(h('div', { class: 'saved-item' },
      h('div', { class: 'strip' }, p.colors.map((c) => swatch(c, { label: false }))),
      h('span', { class: 'muted', dir: 'ltr' }, p.colors.join(' ')),
      btn('copy', null, { aria: 'ui.copy', cls: 'btn-icon', onclick: async () => toast((await copyText(p.colors.join(', '))) ? 'toast.copied' : 'toast.copyFailed') }),
      btn('trash-2', null, { aria: 'ui.delete', cls: 'btn-icon', onclick: () => { palettes.remove(i); render(); } }))));
  };
  box.append(list); render();
  return { el: box, render };
}

function paletteStrip(getColors, saved) {
  const strip = h('div', { class: 'strip big' });
  const saveBtn = btn('heart', 'ui.savePalette', { onclick: () => { palettes.save({ colors: getColors(), at: Date.now() }); saved.render(); toast('toast.paletteSaved'); } });
  return { strip, saveBtn };
}

function uiPreview(cols) {
  const [c0, c1, c2, c3, c4] = [0, 1, 2, 3, 4].map((i) => cols[i % cols.length]);
  const fgOn = (c) => K.readableOn(K.parseHex(c));
  return h('div', { class: 'mock-ui', style: `background:${c4}22;border-color:${c1}55` },
    h('div', { class: 'mock-head', style: `background:${c0};color:${fgOn(c0)}` }, h('strong', {}, 'CodeLab'), h('span', {}, '● ● ●')),
    h('div', { class: 'mock-body' }, h('h4', { style: `color:${K.contrast(K.parseHex(c0), { r: 255, g: 255, b: 255 }) > 4.5 ? c0 : '#0f172a'}` }, 'Preview'), h('p', { style: 'color:#334155' }, 'Lorem — CodeLab Developer'),
      h('div', { class: 'mock-row' }, h('span', { class: 'mock-btn', style: `background:${c1};color:${fgOn(c1)}` }, 'Button'), h('span', { class: 'mock-btn', style: `background:${c2};color:${fgOn(c2)}` }, 'Accent'), h('span', { class: 'mock-btn', style: `background:${c3};color:${fgOn(c3)}` }, 'Info'))));
}

export const tools = {
  'color-palette': () => {
    const saved = savedPalettes();
    const ctl = controls([{ key: 'base', type: 'color', label: 'ui.baseColor', value: '#4f46e5' },
      { key: 'kind', type: 'select', label: 'ui.scheme', value: 'analogous', options: [['analogous', 'ui.sc_analogous'], ['complementary', 'ui.sc_complementary'], ['triadic', 'ui.sc_triadic'], ['tetradic', 'ui.sc_tetradic'], ['split', 'ui.sc_split'], ['monochromatic', 'ui.sc_mono'], ['shades', 'ui.sc_shades'], ['tints', 'ui.sc_tints']].map(([v, l]) => ({ v, l })) },
      { key: 'n', type: 'range', label: 'ui.count', min: 3, max: 9, value: 5 }], () => update());
    const out = outputPane({ lang: 'css', filename: 'palette.css', mime: 'text/css', label: 'ui.cssVariables' });
    const pv = h('div');
    let cols = [];
    const { strip, saveBtn } = paletteStrip(() => cols, saved);
    function update() {
      const v = ctl.values();
      cols = K.scheme(v.base, v.kind, v.n);
      strip.replaceChildren(...cols.map((c) => swatch(c)));
      out.set(`:root {\n${cols.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`);
      pv.replaceChildren(uiPreview(cols));
    }
    const el = h('div', { class: 'tool tool-palette' }, ctl.el, h('div', { class: 'pane' }, strip, h('div', { class: 'toolbar' }, saveBtn)),
      h('div', { class: 'split' }, h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.uiPreview' })), pv), out.el), saved.el);
    update(); return el;
  },
  'hex-to-rgb': () => colorConvert({ inKind: 'hex', outKind: 'rgb' }),
  'rgb-to-hex': () => colorConvert({ inKind: 'rgb', outKind: 'hex' }),
  'hex-to-hsl': () => colorConvert({ inKind: 'hex', outKind: 'hsl' }),
  'hsl-to-hex': () => colorConvert({ inKind: 'hsl', outKind: 'hex' }),

  'contrast-checker': () => {
    const fg = field({ key: 'fg', type: 'color', label: 'ui.foreground', value: '#1e293b' });
    const bg = field({ key: 'bg', type: 'color', label: 'ui.background', value: '#ffffff' });
    const fgT = h('input', { type: 'text', value: '#1e293b', dir: 'ltr', aria: 'ui.foreground', spellcheck: 'false' });
    const bgT = h('input', { type: 'text', value: '#ffffff', dir: 'ltr', aria: 'ui.background', spellcheck: 'false' });
    const sample = h('div', { class: 'contrast-sample' }, h('p', { class: 'cs-large' }, 'CodeLab Developer'), h('p', { class: 'cs-normal' }, 'Teks biasa 16px — The quick brown fox jumps over the lazy dog. 0123456789'));
    const ratioEl = h('div', { class: 'ratio', dir: 'ltr' }), badges = h('div', { class: 'badges' }), sug = h('div', { class: 'muted' });
    const err = errorBox();
    function update() {
      const f = K.parseHex(fgT.value), b = K.parseHex(bgT.value);
      if (!f || !b) { err.show(new ToolError('err.color_hex')); return; }
      err.hide();
      const r = K.contrast(f, b);
      sample.style.color = K.rgbToHex(f); sample.style.background = K.rgbToHex(b);
      ratioEl.textContent = `${r.toFixed(2)} : 1`;
      const badge = (k, pass) => h('div', { class: `badge ${pass ? 'pass' : 'fail'}` }, icon(pass ? 'circle-check' : 'circle-alert', 16), h('span', { i18n: k }), h('strong', { i18n: pass ? 'ui.pass' : 'ui.fail' }));
      badges.replaceChildren(badge('ui.aaNormal', r >= 4.5), badge('ui.aaLarge', r >= 3), badge('ui.aaaNormal', r >= 7), badge('ui.aaaLarge', r >= 4.5), badge('ui.uiComponents', r >= 3));
      sug.replaceChildren();
      if (r < 4.5) { const s = K.suggestForeground(f, b, 4.5); if (s) sug.append(h('span', { i18n: 'ui.suggestion' }), ' ', swatch(s)); }
    }
    const link = (c, t) => { c.input.addEventListener('input', () => { t.value = c.input.value; update(); }); t.addEventListener('input', () => { if (K.parseHex(t.value)) c.input.value = K.rgbToHex(K.parseHex(t.value)); update(); }); };
    link(fg, fgT); link(bg, bgT);
    const swap = btn('arrow-left-right', 'ui.swap', { onclick: () => { const a = fgT.value; fgT.value = bgT.value; bgT.value = a; fg.set(hexOr(fgT.value)); bg.set(hexOr(bgT.value)); update(); } });
    const el = h('div', { class: 'tool' }, h('div', { class: 'pane color-pair' }, h('div', { class: 'cp' }, fg.el, fgT), swap, h('div', { class: 'cp' }, bg.el, bgT)), err.el,
      h('div', { class: 'split' }, h('div', { class: 'pane' }, sample), h('div', { class: 'pane' }, h('div', { class: 'ratio-label', i18n: 'ui.contrastRatio' }), ratioEl, badges, sug)));
    update(); return el;
  },

  'gradient-picker': () => {
    const stops = [{ c: '#4f46e5', p: 0 }, { c: '#a855f7', p: 50 }, { c: '#06b6d4', p: 100 }];
    const bar = h('div', { class: 'grad-bar' }), list = h('div', { class: 'stop-list' });
    const out = outputPane({ lang: 'css', filename: 'gradient.css', mime: 'text/css', label: 'ui.cssOutput' });
    const steps = h('div', { class: 'strip big' });
    const ctl = controls([{ key: 'angle', type: 'range', label: 'css.angle', min: 0, max: 360, value: 90, unit: '°' }, { key: 'steps', type: 'range', label: 'ui.steps', min: 3, max: 12, value: 7 }, { key: 'at', type: 'range', label: 'ui.samplePos', min: 0, max: 100, value: 40, unit: '%' }], () => update());
    const sampleOut = h('div', { class: 'sample-out' });
    const sorted = () => [...stops].sort((a, b) => a.p - b.p);
    function at(pos) {
      const s = sorted();
      if (pos <= s[0].p) return K.parseHex(s[0].c);
      for (let i = 0; i < s.length - 1; i++) {
        if (pos <= s[i + 1].p) { const t = (pos - s[i].p) / Math.max(s[i + 1].p - s[i].p, 0.0001), a = K.parseHex(s[i].c), b = K.parseHex(s[i + 1].c); return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) }; }
      }
      return K.parseHex(s[s.length - 1].c);
    }
    function renderList() {
      clear(list);
      stops.forEach((s, i) => {
        const c = h('input', { type: 'color', value: s.c, aria: 'ui.color', oninput: (e) => { s.c = e.target.value; update(); } });
        const p = h('input', { type: 'range', min: 0, max: 100, value: s.p, aria: 'ui.position', oninput: (e) => { s.p = +e.target.value; pv.textContent = `${s.p}%`; update(); } });
        const pv = h('output', { class: 'readout' }, `${s.p}%`);
        list.append(h('div', { class: 'stop' }, c, p, pv, btn('trash-2', null, { aria: 'ui.delete', cls: 'btn-icon', onclick: () => { if (stops.length > 2) { stops.splice(i, 1); renderList(); update(); } } })));
      });
    }
    function update() {
      const v = ctl.values();
      const css = `linear-gradient(${v.angle}deg, ${sorted().map((s) => `${s.c} ${s.p}%`).join(', ')})`;
      bar.style.background = css;
      out.set(`.gradient {\n  background: ${css};\n}`);
      steps.replaceChildren(...Array.from({ length: v.steps }, (_, i) => swatch(K.rgbToHex(at((100 * i) / (v.steps - 1))))));
      const sc = K.rgbToHex(at(v.at));
      sampleOut.replaceChildren(h('span', { i18n: 'ui.colorAt', i18nArgs: { pos: v.at } }), swatch(sc));
    }
    const add = btn('plus', 'ui.addStop', { onclick: () => { if (stops.length < 8) { stops.push({ c: K.rgbToHex(at(50)), p: 50 }); renderList(); update(); } } });
    const el = h('div', { class: 'tool' }, h('div', { class: 'pane' }, bar, ctl.el, sampleOut), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.stops' }), add), list),
      h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.gradientSteps' })), steps), out.el);
    renderList(); update(); return el;
  },

  'random-color': () => {
    const saved = savedPalettes();
    const ctl = controls([{ key: 'n', type: 'range', label: 'ui.count', min: 1, max: 12, value: 6 }, { key: 'mode', type: 'select', label: 'ui.mode', value: 'any', options: [['any', 'ui.rc_any'], ['pastel', 'ui.rc_pastel'], ['vivid', 'ui.rc_vivid'], ['dark', 'ui.rc_dark'], ['light', 'ui.rc_light']].map(([v, l]) => ({ v, l })) },
      { key: 'fmt', type: 'select', label: 'ui.format', value: 'hex', options: [{ v: 'hex', l: 'HEX', raw: true }, { v: 'rgb', l: 'RGB', raw: true }, { v: 'hsl', l: 'HSL', raw: true }] }], () => gen());
    const strip = h('div', { class: 'strip big wrap' }), list = h('div', { class: 'results' });
    let cols = [];
    const gen = () => {
      const v = ctl.values();
      const rng = { any: [0, 100, 20, 80], pastel: [45, 85, 78, 90], vivid: [75, 100, 45, 60], dark: [30, 90, 12, 30], light: [30, 90, 85, 95] }[v.mode];
      cols = Array.from({ length: v.n }, () => K.hslToHex(K.randomInt(360), rng[0] + K.randomInt(rng[1] - rng[0] + 1), rng[2] + K.randomInt(rng[3] - rng[2] + 1)));
      strip.replaceChildren(...cols.map((c) => swatch(c)));
      list.replaceChildren(...cols.map((c) => { const rgb = K.parseHex(c); return resultRow('ui.color', v.fmt === 'hex' ? c.toUpperCase() : v.fmt === 'rgb' ? K.fmtRgb(rgb) : K.fmtHsl(K.rgbToHsl(rgb))); }));
    };
    const el = h('div', { class: 'tool' }, ctl.el, h('div', { class: 'toolbar' }, btn('refresh-cw', 'ui.generate', { variant: 'primary', onclick: gen }),
      btn('heart', 'ui.savePalette', { onclick: () => { palettes.save({ colors: cols, at: Date.now() }); saved.render(); toast('toast.paletteSaved'); } })),
      h('div', { class: 'pane' }, strip), h('div', { class: 'pane' }, list), saved.el);
    gen(); return el;
  },

  'color-blindness': () => {
    const types = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
    const grid = h('div', { class: 'cvd-grid' });
    const cvs = {};
    const src = document.createElement('canvas');
    const err = errorBox();
    function draw(img) {
      const max = 520; const sc = Math.min(1, max / Math.max(img.width, img.height));
      src.width = Math.max(1, Math.round(img.width * sc)); src.height = Math.max(1, Math.round(img.height * sc));
      src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
      const data = src.getContext('2d').getImageData(0, 0, src.width, src.height);
      for (const t of types) {
        const c = cvs[t]; c.width = src.width; c.height = src.height;
        const out = new ImageData(new Uint8ClampedArray(data.data), src.width, src.height);
        if (t !== 'normal') for (let i = 0; i < out.data.length; i += 4) { const s = K.simulate({ r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] }, t); out.data[i] = s.r; out.data[i + 1] = s.g; out.data[i + 2] = s.b; }
        c.getContext('2d').putImageData(out, 0, 0);
      }
    }
    for (const t of types) { cvs[t] = h('canvas', { role: 'img', 'aria-label': `ui.cvd_${t}` }); grid.append(h('figure', { class: 'cvd' }, cvs[t], h('figcaption', { i18n: `ui.cvd_${t}` }))); }
    const sample = () => { const c = document.createElement('canvas'); c.width = 520; c.height = 240; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 520, 0); ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col)); x.fillStyle = g; x.fillRect(0, 0, 520, 160); ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#14b8a6'].forEach((col, i) => { x.fillStyle = col; x.fillRect(10 + i * 85, 175, 75, 55); }); draw(c); };
    const load = (file) => {
      if (!file || !file.type.startsWith('image/')) { err.show(new ToolError('err.notImage')); return; }
      err.hide(); const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { draw(img); URL.revokeObjectURL(url); }; img.onerror = () => err.show(new ToolError('err.notImage')); img.src = url;
    };
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => load(e.target.files[0]) });
    const el = h('div', { class: 'tool' }, h('div', { class: 'toolbar' }, btn('upload', 'ui.uploadImage', { variant: 'primary', onclick: () => file.click() }), file, btn('refresh-cw', 'ui.useSample', { onclick: sample })), h('p', { class: 'muted', i18n: 'ui.localOnly' }), err.el, grid);
    sample(); return el;
  },

  'image-color-picker': () => {
    const cv = h('canvas', { class: 'pick-canvas', tabindex: '0', role: 'img', aria: 'ui.pickCanvas' });
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const err = errorBox(); const readout = h('div', { class: 'results' }); const dom = h('div', { class: 'strip big wrap' });
    const hoverSw = h('div', { class: 'color-preview small' });
    let picked = null;
    function showColor(r, g, b) {
      const c = { r, g, b }; picked = c;
      hoverSw.style.background = K.fmtRgb(c);
      readout.replaceChildren(resultRow('ui.fmt_hex', K.rgbToHex(c).toUpperCase()), resultRow('ui.fmt_rgb', K.fmtRgb(c)), resultRow('ui.fmt_hsl', K.fmtHsl(K.rgbToHsl(c))));
    }
    const at = (e) => { const r = cv.getBoundingClientRect(); const x = Math.floor(((e.clientX - r.left) / r.width) * cv.width), y = Math.floor(((e.clientY - r.top) / r.height) * cv.height); const d = ctx.getImageData(Math.min(Math.max(x, 0), cv.width - 1), Math.min(Math.max(y, 0), cv.height - 1), 1, 1).data; showColor(d[0], d[1], d[2]); };
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') at(e); }); cv.addEventListener('pointerdown', at);
    function palette() {
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data; const buckets = new Map();
      for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 128) continue; const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); const b = buckets.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; buckets.set(k, b); }
      const top = [...buckets.values()].sort((a, b) => b[3] - a[3]).map((b) => ({ r: Math.round(b[0] / b[3]), g: Math.round(b[1] / b[3]), b: Math.round(b[2] / b[3]) }));
      const chosen = [];
      for (const c of top) { if (chosen.every((o) => Math.hypot(o.r - c.r, o.g - c.g, o.b - c.b) > 48)) chosen.push(c); if (chosen.length === 8) break; }
      dom.replaceChildren(...chosen.map((c) => swatch(K.rgbToHex(c))));
    }
    function draw(img) {
      const sc = Math.min(1, 900 / Math.max(img.width, img.height)); cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height); palette(); showColor(...Array.from(ctx.getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data.slice(0, 3)));
    }
    const load = (file) => {
      if (!file || !file.type.startsWith('image/')) { err.show(new ToolError('err.notImage')); return; }
      if (file.size > 15 * 1024 * 1024) { err.show(new ToolError('err.fileTooLarge')); return; }
      err.hide(); const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { draw(img); URL.revokeObjectURL(url); }; img.onerror = () => err.show(new ToolError('err.notImage')); img.src = url;
    };
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: (e) => load(e.target.files[0]) });
    const demo = () => { cv.width = 640; cv.height = 360; const g = ctx.createLinearGradient(0, 0, 640, 360); g.addColorStop(0, '#4f46e5'); g.addColorStop(0.5, '#a855f7'); g.addColorStop(1, '#06b6d4'); ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(480, 110, 60, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(60, 240, 220, 60); palette(); showColor(79, 70, 229); };
    const wrap = h('div', { class: 'tool', ondragover: (e) => e.preventDefault(), ondrop: (e) => { e.preventDefault(); load(e.dataTransfer.files[0]); } },
      h('div', { class: 'toolbar' }, btn('upload', 'ui.uploadImage', { variant: 'primary', onclick: () => file.click() }), file), h('p', { class: 'muted', i18n: 'ui.pickHint' }), err.el,
      h('div', { class: 'split' }, h('div', { class: 'pane' }, cv), h('div', { class: 'pane' }, hoverSw, readout, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.dominant' })), dom)));
    demo(); return wrap;
  },
};

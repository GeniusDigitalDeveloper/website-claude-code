// Matematik warna: hex/rgb/hsl, kontras WCAG, simulasi buta warna.
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function parseHex(s) {
  const m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(s).trim());
  if (!m) return null;
  let x = m[1];
  if (x.length <= 4) x = [...x].map((c) => c + c).join('');
  const n = (i) => parseInt(x.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: x.length === 8 ? +(n(6) / 255).toFixed(3) : 1 };
}

const num = '(-?\\d*\\.?\\d+)';
export function parseRgb(s) {
  const str = String(s).trim().replace(/^rgba?\(/i, '').replace(/\)$/, '');
  const m = new RegExp(`^${num}%?\\s*[,\\s]\\s*${num}%?\\s*[,\\s]\\s*${num}%?(?:\\s*[,/\\s]\\s*${num}(%?))?$`).exec(str);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if ([r, g, b].some((v) => v < 0 || v > 255)) return null;
  let a = m[4] === undefined ? 1 : Number(m[4]);
  if (m[5]) a /= 100;
  if (a < 0 || a > 1) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

export function parseHsl(s) {
  const str = String(s).trim().replace(/^hsla?\(/i, '').replace(/\)$/, '');
  const m = new RegExp(`^${num}(?:deg)?\\s*[,\\s]\\s*${num}%?\\s*[,\\s]\\s*${num}%?(?:\\s*[,/\\s]\\s*${num}(%?))?$`).exec(str);
  if (!m) return null;
  const h = ((Number(m[1]) % 360) + 360) % 360, sat = Number(m[2]), l = Number(m[3]);
  if (sat < 0 || sat > 100 || l < 0 || l > 100) return null;
  let a = m[4] === undefined ? 1 : Number(m[4]);
  if (m[5]) a /= 100;
  return { h, s: sat, l, a: clamp(a, 0, 1) };
}

export function parseAny(s) {
  const v = String(s).trim();
  if (/^#/.test(v) || /^[0-9a-f]{3,8}$/i.test(v)) { const c = parseHex(v); if (c) return c; }
  if (/^rgba?\(/i.test(v)) return parseRgb(v);
  if (/^hsla?\(/i.test(v)) { const h = parseHsl(v); return h && { ...hslToRgb(h.h, h.s, h.l), a: h.a }; }
  return null;
}

const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
export const rgbToHex = ({ r, g, b, a = 1 }, withAlpha = false) =>
  `#${hex2(r)}${hex2(g)}${hex2(b)}${withAlpha && a < 1 ? hex2(a * 255) : ''}`;

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0; const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h: Math.round(h * 10) / 10, s: Math.round(s * 1000) / 10, l: Math.round(l * 1000) / 10 };
}

export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export const hslToHex = (h, s, l) => rgbToHex(hslToRgb(((h % 360) + 360) % 360, clamp(s, 0, 100), clamp(l, 0, 100)));
export const hexToHsl = (hex) => { const c = parseHex(hex); return c && rgbToHsl(c); };

export const fmtRgb = ({ r, g, b, a = 1 }) => (a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`);
export const fmtHsl = ({ h, s, l }, a = 1) => (a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`);

// ---- WCAG ----
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function contrast(c1, c2) {
  const a = luminance(c1), b = luminance(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export const readableOn = (bg) => (contrast(bg, { r: 255, g: 255, b: 255 }) >= contrast(bg, { r: 0, g: 0, b: 0 }) ? '#ffffff' : '#000000');

/** Laraskan kecerahan fg sehingga nisbah ≥ target terhadap bg. */
export function suggestForeground(fg, bg, target = 4.5) {
  const hsl = rgbToHsl(fg);
  for (const dir of [-1, 1]) {
    for (let l = hsl.l; l >= 0 && l <= 100; l += dir) {
      const c = hslToRgb(hsl.h, hsl.s, l);
      if (contrast(c, bg) >= target) return rgbToHex(c);
    }
  }
  return null;
}

// ---- Simulasi buta warna (Machado et al., 2009, keterukan 1.0) ----
export const CVD = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
  achromatopsia: [[0.2126, 0.7152, 0.0722], [0.2126, 0.7152, 0.0722], [0.2126, 0.7152, 0.0722]],
};
const toLin = (v) => lin(v);
const fromLin = (v) => { v = clamp(v, 0, 1); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)); };
export function simulate({ r, g, b }, type) {
  if (type === 'normal') return { r, g, b };
  const m = CVD[type]; const L = [toLin(r), toLin(g), toLin(b)];
  return { r: fromLin(m[0][0] * L[0] + m[0][1] * L[1] + m[0][2] * L[2]), g: fromLin(m[1][0] * L[0] + m[1][1] * L[1] + m[1][2] * L[2]), b: fromLin(m[2][0] * L[0] + m[2][1] * L[1] + m[2][2] * L[2]) };
}

// ---- Skema palet ----
export function scheme(hex, kind, n = 5) {
  const c = parseHex(hex); if (!c) return [];
  const { h, s, l } = rgbToHsl(c);
  const H = (d) => hslToHex(h + d, s, l);
  switch (kind) {
    case 'complementary': return [H(0), H(180)];
    case 'analogous': return [H(-60), H(-30), H(0), H(30), H(60)];
    case 'triadic': return [H(0), H(120), H(240)];
    case 'tetradic': return [H(0), H(90), H(180), H(270)];
    case 'split': return [H(0), H(150), H(210)];
    case 'monochromatic': return Array.from({ length: n }, (_, i) => hslToHex(h, s, 15 + (70 * i) / Math.max(n - 1, 1)));
    case 'shades': return Array.from({ length: n }, (_, i) => hslToHex(h, s, l * (1 - i / n)));
    case 'tints': return Array.from({ length: n }, (_, i) => hslToHex(h, s, l + ((100 - l) * i) / n));
    default: return [H(0)];
  }
}

export const randomInt = (max) => {
  if (globalThis.crypto?.getRandomValues) { const a = new Uint32Array(1); const lim = Math.floor(0x100000000 / max) * max; let x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim); return x % max; }
  return Math.floor(Math.random() * max);
};

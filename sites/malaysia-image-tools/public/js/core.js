/* =====================================================================
   MALAYSIA IMAGE TOOLS — core
   Semua pemprosesan gambar berlaku dalam browser (client-side).
   Tiada gambar dimuat naik ke mana-mana server.
   ===================================================================== */
'use strict';

/* ---------- 1. TETAPAN ---------- */
const CONFIG = {
  maxImageMB: 25,
  maxPdfMB: 50,
  maxFiles: 30,
  maxPixels: 40e6,
  previewMax: 1400
};

/* Firebase (projek GENIUS DIGITAL) — konfigurasi dalam firebase-config.js.
   Firebase HANYA untuk tetapan admin, statistik penggunaan & maklum balas.
   Gambar TIDAK PERNAH dihantar ke Firebase. */
const FIREBASE_CONFIG = window.MIT_FIREBASE || {};

const LIBS = {
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfworker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  exifr: 'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js',
  fbApp: 'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-app-compat.js',
  fbStore: 'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-firestore-compat.js',
  fbDb: 'https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-database-compat.js'
};

/* ---------- 2. UTILITI ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const rafThrottle = fn => { let q = false, last; return (...a) => { last = a; if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...last); }); }; };

function fmtBytes(b) {
  if (!isFinite(b)) return '-';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}
function baseName(name) { return String(name || 'gambar').replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 60) || 'gambar'; }
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const MIME_LABEL = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP' };
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function ratioText(w, h) { const g = gcd(w, h) || 1; const a = w / g, b = h / g; return (a > 50 || b > 50) ? (w / h).toFixed(3) + ':1' : a + ':' + b; }

const loadedScripts = {};
function loadScript(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = res;
    s.onerror = () => { delete loadedScripts[src]; rej(new Error('Gagal memuatkan pustaka. Semak sambungan internet.')); };
    document.head.appendChild(s);
  });
  return loadedScripts[src];
}

/* ---------- 3. ICON ---------- */
const ICONS = {
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  convert: '<path d="M4 8h13l-3.5-3.5"/><path d="M20 16H7l3.5 3.5"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  pdfimg: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="10" cy="12" r="1.5"/><path d="m17 18-3-3-5 4"/>',
  compress: '<path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="m14 10 7-7"/><path d="m3 21 7-7"/>',
  resize: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  flip: '<path d="M12 3v18"/><path d="M16 7l4 5-4 5z"/><path d="M8 7l-4 5 4 5z"/>',
  picker: '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  drop: '<path d="M12 2.7 17.7 8.4a8 8 0 1 1-11.3 0z"/>',
  gray: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7h5M12 11h8M12 15h7"/>',
  blur: '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="6" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="7.5" cy="7.5" r=".7"/><circle cx="16.5" cy="7.5" r=".7"/><circle cx="7.5" cy="16.5" r=".7"/><circle cx="16.5" cy="16.5" r=".7"/>',
  border: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  ruler: '<path d="M21 3H3v18"/><path d="M7 3v3M11 3v4M15 3v3M19 3v4M3 7h3M3 11h4M3 15h3M3 19h4"/>',
  palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.4 3.4A1.8 1.8 0 0 1 12 22z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="11" cy="6.5" r="1.2"/><circle cx="16" cy="8" r="1.2"/>',
  star: '<path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.7 5.7 21.2l1.5-7L2 9.4l7-.8z"/>',
  play: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
  passport: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 17c.8-2 2-3 3.5-3s2.7 1 3.5 3"/><path d="M15 9h3M15 13h3"/>',
  user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3.2"/><path d="M6.2 18.4c1.3-2.2 3.3-3.4 5.8-3.4s4.5 1.2 5.8 3.4"/>',
  collage: '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 2v20"/><path d="m8 10-2 2 2 2M16 10l2 2-2 2"/>',
  upload: '<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>',
  download: '<path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M4 20h16"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  lr: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5"/>',
  magic: '<path d="m15 4 1.5-1.5M20 9l1.5-1.5M14 10 3 21"/><path d="m18 6 .5 2.5L21 9l-2.5.5L18 12l-.5-2.5L15 9l2.5-.5z"/><path d="M8 3v3M6.5 4.5h3"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12"/>'
};
const LOGO = () => `<img src="/icons/logo.png" alt="Logo Malaysia Image Tools" width="256" height="256" decoding="async">`;
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.image}</svg>`;

/* ---------- 4. TOAST / PROGRESS / MODAL ---------- */
function toast(msg, type = 'info', ms = 3800) {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = icon(type === 'success' ? 'check' : type === 'error' ? 'x' : type === 'warn' ? 'alert' : 'info') + `<div>${esc(msg)}</div>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, ms);
}
let busyCount = 0;
function setProgress(p) { $('#progressBar').style.width = (clamp(p, 0, 1) * 100) + '%'; }
function busy(on, text = 'Memproses...') {
  busyCount += on ? 1 : -1; busyCount = Math.max(0, busyCount);
  $('#busyText').textContent = text;
  $('#busy').hidden = busyCount === 0;
  if (busyCount === 0) { setProgress(1); setTimeout(() => setProgress(0), 350); } else setProgress(0.08);
}
async function withBusy(text, fn) {
  busy(true, text);
  try { return await fn(); }
  catch (e) { console.error(e); toast(e.message || 'Ralat semasa memproses.', 'error'); }
  finally { busy(false); }
}
function openModal(title, bodyEl, opts = {}) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" type="button" aria-label="Tutup">${icon('x')}</button></div><div class="modal-body ${opts.left ? 'left' : ''}"></div></div>`;
  $('.modal-body', m).appendChild(bodyEl);
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); opts.onClose && opts.onClose(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  $('.icon-btn', m).onclick = close;
  m.addEventListener('click', e => { if (e.target === m) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(m);
  $('.icon-btn', m).focus();
  return { close, el: m };
}
async function copyText(text, label = 'Disalin') {
  try { await navigator.clipboard.writeText(text); toast(label + ' ke papan keratan', 'success', 2000); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { }
    ta.remove();
    toast(ok ? label + ' ke papan keratan' : 'Tidak dapat menyalin automatik. Sila salin secara manual.', ok ? 'success' : 'warn');
  }
}

/* ---------- 5. FAIL & GAMBAR ---------- */
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'];
function checkFiles(list, { types = IMG_TYPES, maxMB = CONFIG.maxImageMB, max = CONFIG.maxFiles, current = 0 } = {}) {
  const out = [];
  for (const f of list) {
    let type = f.type;
    if (!type && /\.jpe?g$/i.test(f.name)) type = 'image/jpeg';
    if (!types.includes(type)) { toast(`"${f.name}" bukan format yang disokong (${types.map(t => (EXT[t] || t.split('/')[1]).toUpperCase()).join(', ')}).`, 'warn'); continue; }
    if (f.size > maxMB * 1048576) { toast(`"${f.name}" melebihi had ${maxMB} MB.`, 'warn'); continue; }
    if (current + out.length >= max) { toast(`Had maksimum ${max} fail. Fail lain diabaikan.`, 'warn'); break; }
    out.push(f);
  }
  return out;
}
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth * img.naturalHeight > CONFIG.maxPixels) {
        URL.revokeObjectURL(url);
        rej(new Error(`Resolusi "${file.name}" terlalu besar (${img.naturalWidth}×${img.naturalHeight}). Had ${Math.round(CONFIG.maxPixels / 1e6)} MP.`));
      } else { img._url = url; img._file = file; res(img); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`"${file.name}" tidak dapat dibuka. Fail mungkin rosak atau format tidak disokong browser ini.`)); };
    img.src = url;
  });
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function ctx2d(c) { const x = c.getContext('2d', { willReadFrequently: false }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return x; }
function toCanvas(src, maxSide = Infinity) {
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = makeCanvas(w * s, h * s);
  ctx2d(c).drawImage(src, 0, 0, c.width, c.height);
  return c;
}
function resample(src, w, h) {
  let cur = src, cw = src.naturalWidth || src.width, ch = src.naturalHeight || src.height;
  while (cw / 2 >= w && ch / 2 >= h) {
    cw = Math.round(cw / 2); ch = Math.round(ch / 2);
    const t = makeCanvas(cw, ch); ctx2d(t).drawImage(cur, 0, 0, cw, ch); cur = t;
  }
  const out = makeCanvas(w, h); ctx2d(out).drawImage(cur, 0, 0, out.width, out.height);
  return out;
}
function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Gagal menghasilkan gambar. Mungkin terlalu besar untuk browser ini.')), type, quality));
}
async function encode(canvas, type, quality) {
  let c = canvas;
  if (type === 'image/jpeg') {
    c = makeCanvas(canvas.width, canvas.height);
    const x = ctx2d(c); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0);
  }
  const blob = await canvasToBlob(c, type, quality);
  if (blob.type !== type) toast(`Browser ini tidak menyokong output ${MIME_LABEL[type] || type}. Fail disimpan sebagai ${MIME_LABEL[blob.type] || blob.type}.`, 'warn', 6000);
  return blob;
}
const IN_FRAME = (() => { try { return window.self !== window.top; } catch { return true; } })();
function saveBlob(blob, filename, toolId) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`Muat turun: ${filename} (${fmtBytes(blob.size)})`, 'success');
  if (toolId) track(toolId);
}
async function saveZip(entries, zipName, toolId) {
  if (!entries.length) return toast('Tiada fail untuk dimuat turun.', 'warn');
  if (entries.length === 1) return saveBlob(entries[0].blob, entries[0].name, toolId);
  await withBusy('Menyediakan ZIP...', async () => {
    await loadScript(LIBS.jszip);
    const zip = new JSZip(); const used = {};
    for (const e of entries) {
      let n = e.name; if (used[n]) { n = n.replace(/(\.[^.]+)$/, `-${used[n]}$1`); } used[e.name] = (used[e.name] || 0) + 1;
      zip.file(n, e.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' }, m => setProgress(m.percent / 100));
    saveBlob(blob, zipName, toolId);
  });
}
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function rgbToCmyk(r, g, b) { const k = 1 - Math.max(r, g, b) / 255; if (k >= 1) return [0, 0, 0, 100]; return [r, g, b].map(v => Math.round((1 - v / 255 - k) / (1 - k) * 100)).concat(Math.round(k * 100)); }
function textOn(hex) { const [r, g, b] = hexToRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0e1530' : '#ffffff'; }
function roundRectPath(x, c, X, Y, W, H, R) {
  R = Math.max(0, Math.min(R, W / 2, H / 2));
  x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath();
}
function drawCover(x, img, dx, dy, dw, dh, fx = .5, fy = .5) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(dw / iw, dh / ih); const sw = dw / s, sh = dh / s;
  x.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, dx, dy, dw, dh);
}
function drawContain(x, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(dw / iw, dh / ih); const w = iw * s, h = ih * s;
  x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

/* ---------- 6. PEMPROSESAN PIKSEL ---------- */
function adjustPixels(canvas, { brightness = 0, contrast = 0, saturation = 0 }) {
  if (!brightness && !contrast && !saturation) return canvas;
  const x = canvas.getContext('2d'); const im = x.getImageData(0, 0, canvas.width, canvas.height); const d = im.data;
  const b = brightness * 2.55, c = contrast * 2.55, f = (259 * (c + 255)) / (255 * (259 - c)), s = 1 + saturation / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], bl = d[i + 2];
    if (s !== 1) { const gr = .2126 * r + .7152 * g + .0722 * bl; r = gr + (r - gr) * s; g = gr + (g - gr) * s; bl = gr + (bl - gr) * s; }
    d[i] = f * (r - 128) + 128 + b; d[i + 1] = f * (g - 128) + 128 + b; d[i + 2] = f * (bl - 128) + 128 + b;
  }
  x.putImageData(im, 0, 0); return canvas;
}
function grayscalePixels(canvas, mode, amount, threshold) {
  const x = canvas.getContext('2d'); const im = x.getImageData(0, 0, canvas.width, canvas.height); const d = im.data; const a = amount / 100;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]; let nr, ng, nb;
    if (mode === 'sepia') { nr = .393 * r + .769 * g + .189 * b; ng = .349 * r + .686 * g + .168 * b; nb = .272 * r + .534 * g + .131 * b; }
    else {
      let y = mode === 'average' ? (r + g + b) / 3 : mode === 'desat' ? (Math.max(r, g, b) + Math.min(r, g, b)) / 2 : .2126 * r + .7152 * g + .0722 * b;
      if (mode === 'bw') y = y >= threshold ? 255 : 0;
      nr = ng = nb = y;
    }
    d[i] = r + (nr - r) * a; d[i + 1] = g + (ng - g) * a; d[i + 2] = b + (nb - b) * a;
  }
  x.putImageData(im, 0, 0); return canvas;
}
function boxBlur(canvas, radius) {
  const r = Math.round(radius); if (r < 1) return canvas;
  const w = canvas.width, h = canvas.height, x = canvas.getContext('2d');
  const im = x.getImageData(0, 0, w, h); let a = im.data, b = new Uint8ClampedArray(a.length);
  const n = 2 * r + 1;
  const pass = (src, dst, horizontal) => {
    const outer = horizontal ? h : w, inner = horizontal ? w : h;
    for (let o = 0; o < outer; o++) {
      let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
      const idx = k => { k = k < 0 ? 0 : k >= inner ? inner - 1 : k; return horizontal ? (o * w + k) * 4 : (k * w + o) * 4; };
      for (let k = -r; k <= r; k++) { const p = idx(k); s0 += src[p]; s1 += src[p + 1]; s2 += src[p + 2]; s3 += src[p + 3]; }
      for (let k = 0; k < inner; k++) {
        const p = idx(k); dst[p] = s0 / n; dst[p + 1] = s1 / n; dst[p + 2] = s2 / n; dst[p + 3] = s3 / n;
        const pr = idx(k - r), pa = idx(k + r + 1);
        s0 += src[pa] - src[pr]; s1 += src[pa + 1] - src[pr + 1]; s2 += src[pa + 2] - src[pr + 2]; s3 += src[pa + 3] - src[pr + 3];
      }
    }
  };
  for (let i = 0; i < 3; i++) { pass(a, b, true); pass(b, a, false); }
  x.putImageData(im, 0, 0); return canvas;
}

/* ---------- 7. KOMPONEN UI ---------- */
function dropzone({ accept = 'image/*', multiple = false, title, hint, compact = false, onFiles }) {
  const el = document.createElement('div');
  el.className = 'dz' + (compact ? ' compact' : '');
  el.tabIndex = 0; el.setAttribute('role', 'button');
  el.innerHTML = `<input type="file" accept="${accept}" ${multiple ? 'multiple' : ''}>
    <div class="dz-ico">${icon('upload')}</div>
    <div><b>${esc(title || 'Seret & lepas gambar di sini')}</b><br><span>${esc(hint || 'atau klik untuk pilih fail · tampal (Ctrl+V) juga boleh')}</span></div>
    <span class="btn primary sm" aria-hidden="true">${icon('upload')}Pilih Fail</span>`;
  const inp = $('input', el);
  const give = files => { if (files && files.length) onFiles(Array.from(files)); };
  el.addEventListener('click', () => inp.click());
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
  inp.addEventListener('click', e => e.stopPropagation());
  inp.addEventListener('change', () => { give(inp.files); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove('over'); }));
  el.addEventListener('drop', e => give(e.dataTransfer.files));
  el._give = give;
  pasteTarget = give;
  return el;
}
let pasteTarget = null;
document.addEventListener('paste', e => {
  if (!pasteTarget) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  const files = Array.from(e.clipboardData?.files || []);
  if (files.length) { e.preventDefault(); pasteTarget(files); }
});

/* Kawalan deklaratif: range | select | color | check | seg | text | textarea | buttons | note */
function renderControls(host, controls, v, onChange) {
  host.innerHTML = '';
  const refresh = () => controls.forEach((c, i) => { const el = host.children[i]; if (el && c.show) el.hidden = !c.show(v); });
  controls.forEach(c => {
    const w = document.createElement('div');
    if (c.type === 'range') {
      w.className = 'fld';
      w.innerHTML = `<span><label for="c_${c.key}">${esc(c.label)}</label><output>${v[c.key]}${c.unit || ''}</output></span><input id="c_${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step || 1}" value="${v[c.key]}">`;
      const i = $('input', w), o = $('output', w);
      i.addEventListener('input', () => { v[c.key] = +i.value; o.textContent = i.value + (c.unit || ''); refresh(); onChange(c.key); });
    } else if (c.type === 'select') {
      w.className = 'fld';
      w.innerHTML = `<label for="c_${c.key}">${esc(c.label)}</label><select class="inp" id="c_${c.key}">${c.options.map(([val, l]) => `<option value="${esc(val)}" ${String(v[c.key]) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      const s = $('select', w); s.addEventListener('change', () => { v[c.key] = s.value; refresh(); onChange(c.key); });
    } else if (c.type === 'seg') {
      w.className = 'fld';
      w.innerHTML = `<span>${esc(c.label)}</span><div class="seg">${c.options.map(([val, l]) => `<button type="button" data-v="${esc(val)}" class="${String(v[c.key]) === String(val) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
      $$('button', w).forEach(b => b.addEventListener('click', () => { v[c.key] = typeof c.options[0][0] === 'number' ? +b.dataset.v : b.dataset.v; $$('button', w).forEach(x => x.classList.toggle('on', x === b)); refresh(); onChange(c.key); }));
    } else if (c.type === 'color') {
      w.className = 'fld';
      w.innerHTML = `<label for="c_${c.key}">${esc(c.label)}</label><input id="c_${c.key}" type="color" value="${v[c.key]}">`;
      const i = $('input', w); i.addEventListener('input', () => { v[c.key] = i.value; refresh(); onChange(c.key); });
    } else if (c.type === 'check') {
      w.innerHTML = `<label class="check"><input id="c_${c.key}" type="checkbox" ${v[c.key] ? 'checked' : ''}>${esc(c.label)}</label>`;
      const i = $('input', w); i.addEventListener('change', () => { v[c.key] = i.checked; refresh(); onChange(c.key); });
    } else if (c.type === 'text' || c.type === 'textarea') {
      w.className = 'fld';
      w.innerHTML = `<label for="c_${c.key}">${esc(c.label)}</label>` + (c.type === 'text' ? `<input class="inp" id="c_${c.key}" value="${esc(v[c.key])}" placeholder="${esc(c.placeholder || '')}" maxlength="${c.max || 200}">` : `<textarea class="inp" id="c_${c.key}" rows="2" maxlength="${c.max || 300}" placeholder="${esc(c.placeholder || '')}">${esc(v[c.key])}</textarea>`);
      const i = $('input,textarea', w); i.addEventListener('input', () => { v[c.key] = i.value; onChange(c.key); });
    } else if (c.type === 'buttons') {
      w.className = 'fld';
      w.innerHTML = `<span>${esc(c.label)}</span><div class="seg">${c.buttons.map((b, k) => `<button type="button" data-k="${k}">${esc(b.label)}</button>`).join('')}</div>`;
      $$('button', w).forEach(btn => btn.addEventListener('click', () => { c.buttons[+btn.dataset.k].run(v); renderControls(host, controls, v, onChange); onChange('*'); }));
    } else if (c.type === 'note') {
      w.className = 'note'; w.innerHTML = c.html;
    }
    host.appendChild(w);
  });
  refresh();
}

/* Pemangkas (cropper) dengan seret & ubah saiz */
function createCropper(host, img, opt = {}) {
  const W = img.naturalWidth, H = img.naturalHeight;
  let aspect = opt.aspect || 0;
  const init = a => { let w = W * .82, h = H * .82; if (a) { if (w / h > a) w = h * a; else h = w / a; } return { x: (W - w) / 2, y: (H - h) / 2, w, h }; };
  let r = init(aspect);
  host.innerHTML = `<div class="crop-stage"><img alt="Gambar untuk dipotong" draggable="false"><div class="crop-box ${opt.round ? 'round' : ''}" tabindex="0" aria-label="Kawasan potongan. Guna anak panah untuk gerak."><i class="g"></i><b data-h="nw"></b><b data-h="ne"></b><b data-h="sw"></b><b data-h="se"></b></div></div>`;
  const stage = host.firstChild, box = $('.crop-box', stage), im = $('img', stage);
  im.src = img.src;
  const sc = () => (im.clientWidth || 1) / W;
  const paint = () => {
    const s = sc();
    Object.assign(box.style, { left: r.x * s + 'px', top: r.y * s + 'px', width: r.w * s + 'px', height: r.h * s + 'px' });
    opt.onChange && opt.onChange(api.get());
  };
  let st = null; const MIN = Math.max(8, Math.min(W, H) * .02);
  box.addEventListener('pointerdown', e => { e.preventDefault(); box.setPointerCapture(e.pointerId); st = { px: e.clientX, py: e.clientY, r: { ...r }, h: e.target.dataset.h || 'move' }; });
  box.addEventListener('pointermove', e => {
    if (!st) return; const s = sc(); const dx = (e.clientX - st.px) / s, dy = (e.clientY - st.py) / s; const o = st.r;
    if (st.h === 'move') { r.x = clamp(o.x + dx, 0, W - o.w); r.y = clamp(o.y + dy, 0, H - o.h); }
    else {
      const west = st.h.includes('w'), north = st.h.includes('n');
      const ax = west ? o.x + o.w : o.x, ay = north ? o.y + o.h : o.y;
      let px = (west ? o.x : o.x + o.w) + dx, py = (north ? o.y : o.y + o.h) + dy;
      px = west ? Math.min(px, ax - MIN) : Math.max(px, ax + MIN);
      py = north ? Math.min(py, ay - MIN) : Math.max(py, ay + MIN);
      let w = Math.min(Math.abs(px - ax), west ? ax : W - ax), h = Math.min(Math.abs(py - ay), north ? ay : H - ay);
      if (aspect) { if (w / h > aspect) w = h * aspect; else h = w / aspect; }
      r = { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h };
    }
    paint();
  });
  const end = () => { st = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('keydown', e => {
    const step = (e.shiftKey ? 10 : 1) / sc(); const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!m) return; e.preventDefault(); r.x = clamp(r.x + m[0], 0, W - r.w); r.y = clamp(r.y + m[1], 0, H - r.h); paint();
  });
  const ro = new ResizeObserver(paint); ro.observe(im);
  im.addEventListener('load', paint);
  const api = {
    get: () => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.max(1, Math.round(r.w)), h: Math.max(1, Math.round(r.h)) }),
    setAspect(a) { aspect = a; r = init(a); paint(); },
    setRound(on) { box.classList.toggle('round', !!on); },
    destroy() { ro.disconnect(); }
  };
  return api;
}

/* Paparan perbandingan sebelum/selepas dengan peluncur */
function compareView(beforeSrc, afterSrc, labels = ['Sebelum', 'Selepas']) {
  const el = document.createElement('div');
  el.className = 'cmp';
  el.innerHTML = `<img alt="${esc(labels[1])}"><div class="top"><img alt="${esc(labels[0])}"></div><div class="bar"><i>${icon('lr')}</i></div><span class="lbl l">${esc(labels[0])}</span><span class="lbl r">${esc(labels[1])}</span>`;
  const base = el.children[0], top = $('.top', el), topImg = $('.top img', el), bar = $('.bar', el);
  base.src = afterSrc; topImg.src = beforeSrc;
  let pos = .5;
  const set = p => { pos = clamp(p, 0, 1); top.style.width = pos * 100 + '%'; bar.style.left = pos * 100 + '%'; topImg.style.width = base.clientWidth + 'px'; topImg.style.height = base.clientHeight + 'px'; };
  const fromEvt = e => { const r = el.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
  let drag = false;
  el.addEventListener('pointerdown', e => { drag = true; el.setPointerCapture(e.pointerId); fromEvt(e); });
  el.addEventListener('pointermove', e => drag && fromEvt(e));
  el.addEventListener('pointerup', () => drag = false);
  el.tabIndex = 0;
  el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') set(pos - .05); if (e.key === 'ArrowRight') set(pos + .05); });
  base.addEventListener('load', () => set(pos));
  new ResizeObserver(() => set(pos)).observe(el);
  el._set = set;
  return el;
}
function showCompare(title, beforeSrc, afterSrc) {
  const wrap = document.createElement('div'); wrap.style.display = 'grid'; wrap.style.gap = '10px'; wrap.style.justifyItems = 'center';
  wrap.appendChild(compareView(beforeSrc, afterSrc));
  const n = document.createElement('div'); n.className = 'meta-line'; n.textContent = 'Seret peluncur ke kiri/kanan untuk membandingkan.'; wrap.appendChild(n);
  openModal(title, wrap);
}
function showImage(title, src) { const im = document.createElement('img'); im.src = src; im.alt = title; im.style.maxHeight = '75vh'; openModal(title, im); }

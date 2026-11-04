// Pangkas gambar profil: seret untuk gerak, peluncur / cubit / roda tetikus untuk zum. Bingkai bulat = apa yang dipaparkan.
// Pulangkan Promise<string|null>: data URL JPEG (persegi), atau null jika dibatalkan.
import { t } from './i18n.js';
import { sfx } from './sfx.js';

const OUT = 320;       // saiz output (px)
const MAX_ZOOM = 4;    // 4x daripada saiz minimum

export function openCropper(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.onload = () => start(img, url, resolve);
    img.src = url;
  });
}

function start(img, objUrl, resolve) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const root = document.createElement('div');
  root.className = 'crop';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', t('crop_title'));
  root.innerHTML = `<div class="crop-card glass hot">
    <h3>${t('crop_title')}</h3>
    <p>${t('crop_hint')}</p>
    <div class="crop-vp"><div class="crop-mask" aria-hidden="true"></div></div>
    <label class="crop-zoom"><span>${t('crop_zoom')}</span><input type="range" min="1" max="${MAX_ZOOM}" step="0.01" value="1" aria-label="${t('crop_zoom')}"></label>
    <div class="crop-actions"><button type="button" class="btn ghost" data-act="cancel">${t('crop_cancel')}</button><button type="button" class="btn gold" data-act="done">${t('crop_done')}</button></div>
  </div>`;
  const vp = root.querySelector('.crop-vp'), slider = root.querySelector('input');
  img.className = 'crop-img'; img.draggable = false; img.alt = '';
  vp.prepend(img);
  document.body.append(root);
  const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';

  let V = vp.clientWidth, s0 = V / Math.min(iw, ih), zoom = 1, x = 0, y = 0;
  const scale = () => s0 * zoom;
  const clamp = () => { const w = iw * scale(), h = ih * scale(); x = Math.min(0, Math.max(V - w, x)); y = Math.min(0, Math.max(V - h, y)); };
  const apply = () => { clamp(); img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale()})`; };
  const center = () => { x = (V - iw * scale()) / 2; y = (V - ih * scale()) / 2; apply(); };
  const setZoom = (z) => {
    z = Math.min(MAX_ZOOM, Math.max(1, z));
    const cx = (V / 2 - x) / scale(), cy = (V / 2 - y) / scale(); // titik tengah bingkai dalam koordinat gambar
    zoom = z; x = V / 2 - cx * scale(); y = V / 2 - cy * scale(); slider.value = String(z); apply();
  };
  center();
  window.addEventListener('resize', onResize);
  function onResize() { const c = ((V / 2 - x) / scale()), d = ((V / 2 - y) / scale()); V = vp.clientWidth; s0 = V / Math.min(iw, ih); x = V / 2 - c * scale(); y = V / 2 - d * scale(); apply(); }

  // Seret (satu jari/tetikus) dan cubit (dua jari)
  const ptrs = new Map(); let pinch = 0;
  vp.addEventListener('pointerdown', (e) => { vp.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch = 0; vp.classList.add('grab'); });
  vp.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) { x += e.clientX - p.x; y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; apply(); return; }
    p.x = e.clientX; p.y = e.clientY;
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) setZoom(zoom * (d / pinch)); pinch = d;
  });
  const up = (e) => { ptrs.delete(e.pointerId); pinch = 0; if (!ptrs.size) vp.classList.remove('grab'); };
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
  slider.addEventListener('input', () => setZoom(parseFloat(slider.value)));

  function finish(result) {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = prevOverflow;
    root.classList.add('out');
    setTimeout(() => root.remove(), 220);
    URL.revokeObjectURL(objUrl);
    resolve(result);
  }
  function crop() {
    const sc = scale(), c = document.createElement('canvas');
    c.width = c.height = OUT;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -x / sc, -y / sc, V / sc, V / sc, 0, 0, OUT, OUT);
    return c.toDataURL('image/jpeg', 0.86);
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { sfx.close(); finish(null); }
    const step = 12;
    if (e.key === 'ArrowLeft') { x += step; apply(); } else if (e.key === 'ArrowRight') { x -= step; apply(); } else if (e.key === 'ArrowUp') { y += step; apply(); } else if (e.key === 'ArrowDown') { y -= step; apply(); }
  };
  document.addEventListener('keydown', onKey);
  root.querySelector('[data-act=cancel]').addEventListener('click', () => finish(null));
  root.querySelector('[data-act=done]').addEventListener('click', () => { sfx.success(); finish(crop()); });
  root.addEventListener('click', (e) => { if (e.target === root) finish(null); });
  sfx.open();
  root.querySelector('[data-act=done]').focus();
}

import { icon } from './icons.js';
import { sfx } from './sfx.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hydrateIcons(root = document) {
  $$('[data-ico]', root).forEach((el) => {
    if (el.dataset.icoDone) return;
    el.dataset.icoDone = 1;
    const svg = icon(el.dataset.ico);
    if (el.textContent.trim()) el.insertAdjacentHTML('afterbegin', svg);
    else el.innerHTML = svg;
  });
}

export function setupReveal() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$('.reveal, .wordmark').forEach((el) => io.observe(el));
  // Cahaya mengikut penuding pada kad kaca (transform sahaja)
  document.addEventListener('pointermove', (e) => {
    const g = e.target.closest?.('.glass');
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', e.clientX - r.left - 180 + 'px');
    g.style.setProperty('--my', e.clientY - r.top - 180 + 'px');
  }, { passive: true });
}

export function setupSound(btn) {
  const paint = () => {
    btn.innerHTML = icon(sfx.enabled ? 'soundOn' : 'soundOff');
    btn.setAttribute('aria-pressed', String(sfx.enabled));
    btn.setAttribute('aria-label', sfx.enabled ? 'Matikan bunyi' : 'Hidupkan bunyi');
  };
  btn.addEventListener('click', () => { sfx.toggle(); paint(); });
  paint();
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* Modal gaya sheet iOS. actions: [{label, cls, onClick, href, keep}] */
export function modal({ icon: ic = 'check', err = false, title, text, actions = [], body }) {
  const ov = $('#overlay');
  $('#mIcon').className = 'big' + (err ? ' err' : '');
  $('#mIcon').innerHTML = icon(ic);
  $('#mTitle').textContent = title;
  $('#mText').textContent = text || '';
  const extra = $('#mBody');
  if (extra) { extra.innerHTML = ''; if (body) extra.append(body); }
  const box = $('#mActions');
  box.innerHTML = '';
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => {
    if (!ov.classList.contains('show')) return;
    sfx.close();
    ov.classList.add('out');
    setTimeout(() => ov.classList.remove('show', 'out'), reduced ? 0 : 240);
    document.removeEventListener('keydown', onKey);
  };
  [...actions, { label: 'Tutup', cls: 'ghost' }].forEach((a) => {
    const el = document.createElement(a.href ? 'a' : 'button');
    el.className = 'btn ' + (a.cls || 'gold');
    el.textContent = a.label;
    if (a.href) { el.href = a.href; el.setAttribute('download', ''); el.rel = 'noopener'; }
    el.addEventListener('click', () => { a.onClick?.(); if (!a.keep) close(); });
    box.append(el);
  });
  ov.onclick = (e) => { if (e.target === ov) close(); };
  document.addEventListener('keydown', onKey);
  ov.classList.remove('out');
  ov.classList.add('show');
  (err ? sfx.error : sfx.open)();
  box.firstElementChild?.focus();
  return close;
}

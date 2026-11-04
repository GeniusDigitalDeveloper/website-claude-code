// Notifikasi pengguna: loceng + lencana, panel boleh skrol, pop-up yang kekal sehingga dibaca.
import { fb } from './firebase.js';
import { $, esc } from './ui.js';
import { t, pick, getLang } from './i18n.js';
import { sfx } from './sfx.js';
import { icon } from './icons.js';

export function initNotify() {
  const bell = $('#bellBtn'), badge = $('#bellBadge'), panel = $('#notifPanel'), list = $('#nList'), pop = $('#notifPop');
  let uid = null, notifs = [], state = {}, gotN = false, gotS = false, stops = [], isOpen = false, lastUnread = -1;
  $('#bellIco').innerHTML = icon('bell');
  $('#npopT').textContent = '';

  // Letak panel / gelembung tepat di bawah loceng (pop-up "keluar" daripada loceng).
  function place(el) {
    const r = bell.getBoundingClientRect();
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    const w = el.offsetWidth || 300, vw = window.innerWidth;
    // Sejajar dengan loceng, tetapi sentiasa muat dalam skrin.
    const edge = Math.min(Math.max(8, rtl ? r.left : vw - r.right), vw - w - 8);
    const left = rtl ? edge : vw - edge - w;
    const cx = r.left + r.width / 2;
    el.style.top = Math.round(r.bottom + 10) + 'px';
    el.style.insetInlineEnd = Math.round(edge) + 'px';
    el.style.transformOrigin = Math.round(cx - left) + 'px -8px'; // animasi keluar tepat dari loceng
    el.style.setProperty('--tail', Math.max(10, Math.round(rtl ? cx - left - 6 : left + w - cx - 6)) + 'px');
  }
  const replace = () => { if (isOpen) place(panel); if (!pop.hidden) place(pop); };
  window.addEventListener('resize', replace);
  window.addEventListener('scroll', replace, { passive: true });

  const visible = () => notifs.filter((n) => !state[n.id]?.deleted);
  const unread = () => visible().filter((n) => !state[n.id]?.read);
  const loc = () => (getLang() === 'ar' ? 'ar' : getLang() === 'en' ? 'en-GB' : 'ms-MY');
  // Tarikh dan masa penuh. Notifikasi yang baru dihantar (cap masa pelayan belum sampai) dianggap "sekarang".
  const fmt = (ts) => { try { const d = ts?.toDate ? ts.toDate() : new Date(); return new Intl.DateTimeFormat(loc(), { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d); } catch { return ''; } };

  function paint() {
    if (!gotN || !gotS) return;
    const un = unread(), all = visible();
    badge.hidden = un.length === 0;
    badge.textContent = un.length > 9 ? '9+' : String(un.length);
    list.innerHTML = all.length
      ? all.map((n, i) => `<li class="nitem ${state[n.id]?.read ? '' : 'unread'}" style="--i:${Math.min(i, 8)}"><div class="nbody"><b>${esc(pick(n.title))}</b><p>${esc(pick(n.body))}</p><small class="ntime"><span class="ico">${icon('clock')}</span>${esc(fmt(n.createdAt))}</small></div><button type="button" class="nx" data-del="${esc(n.id)}" aria-label="${esc(t('notif_del'))}">${icon('x')}</button></li>`).join('')
      : `<li class="nempty">${esc(t('notif_empty'))}</li>`;
    $('#notifClear').hidden = all.length === 0;
    // Pop-up kekal selagi ada notifikasi belum dibaca dan panel belum dibuka.
    if (un.length && !isOpen) {
      $('#npopT').textContent = t('notif_new');
      $('#npopS').textContent = pick(un[0].title) + (un.length > 1 ? ' · ' + t('notif_more', { n: un.length - 1 }) : '');
      pop.hidden = false;
      place(pop);
    } else pop.hidden = true;
    if (lastUnread >= 0 && un.length > lastUnread) sfx.msg();
    lastUnread = un.length;
  }

  function open() {
    if (!uid) return;
    isOpen = true; pop.hidden = true;
    panel.classList.toggle('out', false);
    list.classList.add('fresh'); setTimeout(() => list.classList.toggle('fresh', false), 1000);
    panel.hidden = false;
    place(panel);
    const ids = unread().map((n) => n.id);
    if (ids.length) fb.markRead(uid, ids).catch(() => {});
    sfx.open();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.add('out'); // animasi tutup yang licin, kemudian sembunyikan
    setTimeout(() => { if (!isOpen) { panel.hidden = true; panel.classList.toggle('out', false); } }, 230);
    paint();
  }

  bell.addEventListener('click', (e) => { e.stopPropagation(); if (isOpen) close(); else open(); });
  $('#notifPopBtn').addEventListener('click', (e) => { e.stopPropagation(); open(); });
  $('#notifClear').addEventListener('click', () => { if (uid) fb.deleteNotifs(uid, visible().map((n) => n.id)).catch(() => {}); sfx.pop(); });
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (b && uid) { fb.deleteNotifs(uid, [b.dataset.del]).catch(() => {}); sfx.pop(); } });
  document.addEventListener('click', (e) => { const path = e.composedPath(); if (isOpen && !path.includes(panel) && !path.includes(bell)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('langchange', paint);

  return {
    setUser(user) {
      stops.forEach((s) => s && s()); stops = [];
      uid = user ? user.uid : null; notifs = []; state = {}; gotN = gotS = false; lastUnread = -1; isOpen = false;
      panel.hidden = true; pop.hidden = true; bell.hidden = !user;
      if (!user) return;
      stops = [
        fb.watchNotifs((n) => { notifs = n; gotN = true; paint(); }),
        fb.watchNState(uid, (s) => { state = s; gotS = true; paint(); }),
      ];
    },
  };
}

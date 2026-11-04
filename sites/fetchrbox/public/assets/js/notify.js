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

  const visible = () => notifs.filter((n) => !state[n.id]?.deleted);
  const unread = () => visible().filter((n) => !state[n.id]?.read);
  const loc = () => (getLang() === 'ar' ? 'ar' : getLang() === 'en' ? 'en-GB' : 'ms-MY');
  const fmt = (ts) => { try { return ts?.toDate ? new Intl.DateTimeFormat(loc(), { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' }).format(ts.toDate()) : ''; } catch { return ''; } };

  function paint() {
    if (!gotN || !gotS) return;
    const un = unread(), all = visible();
    badge.hidden = un.length === 0;
    badge.textContent = un.length > 9 ? '9+' : String(un.length);
    list.innerHTML = all.length
      ? all.map((n) => `<li class="nitem ${state[n.id]?.read ? '' : 'unread'}"><div class="nbody"><b>${esc(pick(n.title))}</b><p>${esc(pick(n.body))}</p><small>${esc(fmt(n.createdAt))}</small></div><button type="button" class="nx" data-del="${esc(n.id)}" aria-label="${esc(t('notif_del'))}">${icon('x')}</button></li>`).join('')
      : `<li class="nempty">${esc(t('notif_empty'))}</li>`;
    $('#notifClear').hidden = all.length === 0;
    // Pop-up kekal selagi ada notifikasi belum dibaca dan panel belum dibuka.
    if (un.length && !isOpen) {
      $('#npopT').textContent = t('notif_new');
      $('#npopS').textContent = pick(un[0].title) + (un.length > 1 ? ' · ' + t('notif_more', { n: un.length - 1 }) : '');
      pop.hidden = false;
    } else pop.hidden = true;
    if (lastUnread >= 0 && un.length > lastUnread) sfx.msg();
    lastUnread = un.length;
  }

  function open() {
    if (!uid) return;
    isOpen = true; panel.hidden = false; pop.hidden = true;
    const ids = unread().map((n) => n.id);
    if (ids.length) fb.markRead(uid, ids).catch(() => {});
    sfx.open();
  }
  function close() { if (!isOpen) return; isOpen = false; panel.hidden = true; paint(); }

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

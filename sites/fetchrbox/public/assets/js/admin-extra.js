// Panel admin: Chat dengan pengguna (terjemahan automatik) dan Notifikasi kepada semua pengguna.
import { fb } from './firebase.js';
import { sfx } from './sfx.js';
import { $, esc, hydrateIcons, toast, modal } from './ui.js';
import { translate } from './translate.js';

const TZ = 'Asia/Kuala_Lumpur';
const LGN = { ms: 'BM', en: 'EN', ar: 'AR' };
let ctx = { getTab: () => '', rerender: () => {}, getMe: () => ({}) };
let chats = [], selUid = null, threadMsgs = [], stopThread = null, sent = [], lastUnread = -1;
const trCache = new Map(); // id mesej -> teks BM | null (gagal)

export const initExtra = (c) => { ctx = c; };
export function resetExtra() { if (stopThread) { stopThread(); stopThread = null; } selUid = null; chats = []; threadMsgs = []; sent = []; lastUnread = -1; }
const when = (ts) => { try { return ts?.toDate ? new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts.toDate()) : ''; } catch { return ''; } };

function paintBadge() {
  const n = chats.filter((c) => c.unreadAdmin).length, b = $('#chatBadge');
  if (b) { b.hidden = n === 0; b.textContent = n > 9 ? '9+' : String(n); }
  return n;
}

/** Dipanggil setiap kali senarai chat berubah (masa nyata). */
export function onChats(list) {
  chats = list;
  const n = paintBadge();
  if (lastUnread >= 0 && n > lastUnread) sfx.msg();
  lastUnread = n;
  if (ctx.getTab() === 'chat') {
    paintList();
    if (selUid && chats.find((c) => c.uid === selUid)?.unreadAdmin) fb.markChatReadAdmin(selUid);
  }
}

/* ---------------- Chat ---------------- */
function listHtml() {
  return chats.length ? chats.map((c) => `<button type="button" class="citem ${c.uid === selUid ? 'on' : ''}" data-uid="${esc(c.uid)}"><span class="cav">${esc((c.email || '?')[0].toUpperCase())}</span><span class="ctx"><b>${esc(c.email || c.uid)}</b><small>${c.lastFrom === 'admin' ? 'Anda: ' : ''}${esc(c.lastText || '')}</small></span><span class="cmeta"><em>${esc(LGN[c.lang] || '')}</em>${c.unreadAdmin ? '<i class="dot"></i>' : ''}</span></button>`).join('') : '<p class="empty">Belum ada chat daripada pengguna.</p>';
}
function shellHtml() {
  const c = chats.find((x) => x.uid === selUid);
  if (!c) return '<p class="empty">Pilih satu chat di sebelah.</p>';
  const L = c.lang || 'ms';
  return `<header class="thead"><button type="button" class="icon-btn" id="cback" aria-label="Kembali" data-ico="back"></button><div><b>${esc(c.email)}</b><small>Bahasa pengguna: ${esc(LGN[L] || L)}${L !== 'ms' ? ' · balasan anda diterjemah automatik' : ''}</small></div></header>
  <div class="tmsgs" id="tmsgs"></div>
  <form class="tform" id="tform" novalidate><textarea id="tin" rows="2" maxlength="1000" placeholder="Balas dalam BM…" aria-label="Balas"></textarea><button class="btn gold" type="submit"><span class="ico" data-ico="send"></span><span class="t">Hantar</span></button></form>`;
}
export function chatView() {
  return `<h1>Chat <span class="live">LANGSUNG</span></h1><p class="sub2">Pilih pengguna untuk lihat mesej. Mesej English atau Arab diterjemah ke BM, dan balasan anda diterjemah ke bahasa pengguna secara automatik.</p>
  <div class="chatwrap ${selUid ? 'has-sel' : ''}"><aside class="clist glass" id="clist">${listHtml()}</aside><section class="cthread glass" id="cthread">${shellHtml()}</section></div>`;
}
function paintList() { const el = $('#clist'); if (el) el.innerHTML = listHtml(); }

function trFor(m) {
  if (m.trMs) return m.trMs;
  if (trCache.has(m.id)) return trCache.get(m.id) === null ? '(terjemahan tidak tersedia)' : trCache.get(m.id);
  trCache.set(m.id, '…');
  translate(m.text, m.lang, 'ms').then((r) => {
    trCache.set(m.id, r || null);
    if (r && selUid) fb.saveTrMs(selUid, m.id, r).catch(() => {});
    paintThread();
  });
  return '…';
}
function paintThread() {
  const box = $('#tmsgs');
  if (!box) return;
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80 || !box.dataset.init;
  box.innerHTML = threadMsgs.map((m) => m.from === 'user'
    ? `<div class="b user"><span>${esc(m.text)}</span>${m.lang && m.lang !== 'ms' ? `<span class="tr">${esc(trFor(m))}</span>` : ''}<small>${esc(when(m.at))}${m.lang ? ' · ' + (LGN[m.lang] || '') : ''}</small></div>`
    : `<div class="b admin"><span>${esc(m.text)}</span>${m.trUser ? `<span class="tr">→ ${esc(LGN[m.toLang] || '')}: ${esc(m.trUser)}</span>` : ''}<small>${esc(when(m.at))}</small></div>`).join('') || '<p class="empty">Belum ada mesej.</p>';
  box.dataset.init = '1';
  if (stick) box.scrollTop = box.scrollHeight;
}
function select(uid) {
  if (stopThread) { stopThread(); stopThread = null; }
  selUid = uid; threadMsgs = [];
  ctx.rerender();
  if (uid) { stopThread = fb.watchThread(uid, (m) => { threadMsgs = m; paintThread(); }); fb.markChatReadAdmin(uid); }
}
async function onSend(e) {
  e.preventDefault();
  const ta = $('#tin'), text = ta.value.trim();
  if (!text || !selUid) return;
  const btn = e.submitter || $('#tform button');
  btn.disabled = true;
  const L = chats.find((x) => x.uid === selUid)?.lang || 'ms';
  try {
    let tr = null;
    if (L !== 'ms') { tr = await translate(text, 'ms', L); if (!tr) toast('Terjemahan tidak tersedia. Mesej dihantar dalam BM.'); }
    await fb.sendAsAdmin(selUid, text, tr, L);
    ta.value = ''; sfx.pop();
  } catch { toast('Gagal menghantar mesej.'); sfx.error(); }
  finally { btn.disabled = false; ta.focus(); }
}
export function bindChat() {
  $('#clist').addEventListener('click', (e) => { const b = e.target.closest('[data-uid]'); if (b) { sfx.pop(); select(b.dataset.uid); } });
  const f = $('#tform');
  if (!f) return;
  f.addEventListener('submit', onSend);
  $('#cback').addEventListener('click', () => select(null));
  $('#tin').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  paintThread();
}

/* ---------------- Notifikasi ---------------- */
export function notifsView() {
  return `<h1>Notifikasi</h1><p class="sub2">Hantar kepada semua pengguna berdaftar. Teks BM diterjemah automatik ke English dan Arab.</p>
  <form class="settings-card glass" id="nForm" novalidate>
    <div class="f"><label for="nt">Tajuk (BM)</label><input id="nt" maxlength="80"></div>
    <div class="f"><label for="nb">Mesej (BM)</label><textarea id="nb" maxlength="400"></textarea></div>
    <button class="btn gold" type="submit"><span class="ico" data-ico="send"></span><span class="t">Hantar kepada semua</span></button>
  </form>
  <h2 style="font-family:var(--strong);font-size:1.02rem;margin:1.4rem 0 .7rem">Telah dihantar</h2>
  <div class="list" id="sent"></div>`;
}
export function paintSent() {
  const el = $('#sent');
  if (!el) return;
  el.innerHTML = sent.length ? sent.map((n) => `<div class="row-item glass"><div class="pi" data-ico="bell"></div><div class="txt"><b>${esc(n.title?.ms || '')}</b><small>${esc(n.body?.ms || '')} · ${esc(when(n.createdAt))}</small></div><div class="acts"><button class="icon-btn" data-del="${esc(n.id)}" aria-label="Padam" data-ico="trash"></button></div></div>`).join('') : '<p class="empty">Belum ada notifikasi dihantar.</p>';
  hydrateIcons(el);
}
export function setSent(list) { sent = list; }
export function bindNotifs() {
  $('#nForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#nt').value.trim(), body = $('#nb').value.trim(), btn = e.submitter;
    if (!title || !body) { toast('Isi tajuk dan mesej.'); sfx.error(); return; }
    btn.disabled = true;
    try {
      const [te, ta, be, ba] = await Promise.all([translate(title, 'ms', 'en'), translate(title, 'ms', 'ar'), translate(body, 'ms', 'en'), translate(body, 'ms', 'ar')]);
      const partial = !te || !ta || !be || !ba;
      await fb.sendNotif({ title: { ms: title, en: te || title, ar: ta || title }, body: { ms: body, en: be || body, ar: ba || body }, by: ctx.getMe().email || '' });
      toast(partial ? 'Dihantar. Sebahagian terjemahan tidak tersedia, guna BM.' : 'Dihantar kepada semua pengguna.');
      sfx.success(); $('#nForm').reset();
    } catch (err) { toast(err.code === 'permission-denied' ? 'Tiada kebenaran.' : 'Gagal menghantar.'); sfx.error(); }
    finally { btn.disabled = false; }
  });
  $('#sent').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const id = b.dataset.del, n = sent.find((x) => x.id === id);
    modal({ icon: 'trash', err: true, title: 'Padam notifikasi ini?', text: n?.title?.ms || '', actions: [{ label: 'Padam', cls: 'danger', onClick: () => fb.removeNotif(id).then(() => sfx.pop()).catch(() => toast('Gagal memadam.')) }] });
  });
  paintSent();
}

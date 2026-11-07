import { fb } from './firebase.js';
import { platformIcon } from './icons.js';
import { sfx } from './sfx.js';
import { $, $$, esc, hydrateIcons, toast, modal } from './ui.js';
import { setupPwToggles } from './pw.js';
import { initSystem, systemView, bindSystem } from './admin-system.js';
import { initApprovals, resetApprovals, onRequests, approvalsView, bindApprovals } from './admin-approvals.js';
import { initExtra, resetExtra, onChats, chatView, bindChat, notifsView, bindNotifs, paintSent, setSent } from './admin-extra.js';

const TZ = 'Asia/Kuala_Lumpur';
let tab = 'overview';
let site = null, summary = {}, daily = [], users = [], admins = [], me = { email: '', owner: false };
initExtra({ getTab: () => tab, rerender: () => render(), getMe: () => me });
initSystem({ getSite: () => site, rerender: () => render() });
initApprovals({ getTab: () => tab, getMe: () => me });
let stops = [];
let clock;

hydrateIcons();
setupPwToggles();

/* ---------- Tarikh (zon waktu Malaysia, reset pukul 12 malam) ---------- */
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
const num = (n) => Number(n || 0).toLocaleString('ms-MY');

/* ---------- Log masuk (e-mel + kata laluan sahaja) ---------- */
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#loginErr'), btn = e.submitter;
  err.textContent = ''; btn.disabled = true;
  try { await fb.login($('#em').value.trim(), $('#pw').value); }
  catch (ex) {
    err.textContent = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(ex.code) ? 'E-mel atau kata laluan salah.' : ex.code === 'auth/too-many-requests' ? 'Terlalu banyak percubaan. Cuba lagi sebentar.' : 'Log masuk gagal: ' + (ex.code || ex.message);
    sfx.error();
  } finally { btn.disabled = false; }
});
$('#logout').addEventListener('click', () => fb.logout());

fb.onUser(async (user) => {
  stopWatching();
  if (!user) { $('#login').hidden = false; $('#shell').hidden = true; return; }
  let st = { ok: false, owner: false };
  try { st = await fb.adminState(user); } catch { /* bukan admin */ }
  if (!st.ok) { $('#loginErr').textContent = `${user.email} belum diberi akses admin.`; sfx.error(); await fb.logout(); return; }
  me = { email: user.email, owner: st.owner };
  sfx.success();
  $('#login').hidden = true; $('#shell').hidden = false;
  startWatching();
});

/* ---------- Data masa nyata ---------- */
function startWatching() {
  stops = [
    fb.watchSite((s) => { site = s; if (['platforms', 'faq', 'system'].includes(tab) || !$('.view')) render(); }),
    fb.watchSummary((s) => { summary = s; if (tab === 'overview') render(); }),
    fb.watchDaily((d) => { daily = d; if (tab === 'overview') render(); }),
    fb.watchUsers((u) => { users = u; if (['overview', 'users'].includes(tab)) render(); }),
    fb.watchAdmins((a) => { admins = a; if (tab === 'admins') render(); }),
    fb.watchChats(onChats),
    fb.watchRequests(onRequests),
    fb.watchNotifs((n) => { setSent(n); if (tab === 'notifs') paintSent(); }),
  ];
  let last = todayKey();
  clock = setInterval(() => { const k = todayKey(); if (k !== last) { last = k; if (tab === 'overview') render(); } }, 20000);
  render();
}
function stopWatching() { stops.forEach((f) => f && f()); stops = []; clearInterval(clock); resetExtra(); resetApprovals(); }

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); sfx.pop();
});

function render() {
  if (!site) return;
  $$('#tabs button').forEach((b) => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.body.dataset.theme = { overview: 'home', platforms: 'cara', faq: 'faq', chat: 'home', approvals: 'cara', notifs: 'profil', users: 'profil', admins: 'cara', system: 'faq', settings: 'faq' }[tab];
  const c = $('#content');
  c.innerHTML = `<div class="view">${{ overview, platforms, faq, chat: chatView, approvals: approvalsView, notifs: notifsView, system: systemView, users: usersView, admins: adminsView, settings }[tab]()}</div>`;
  hydrateIcons(c);
  ({ overview: () => {}, platforms: bindPlatforms, faq: bindFaq, chat: bindChat, approvals: bindApprovals, notifs: bindNotifs, system: bindSystem, users: () => {}, admins: bindAdmins, settings: bindSettings }[tab])();
}
const guard = async (fn) => {
  try { await fn(); toast('Disimpan'); sfx.success(); }
  catch (e) { toast(e.code === 'permission-denied' ? 'Tiada kebenaran. Log masuk dengan akaun admin.' : e.message); sfx.error(); }
};

/* ---------- Ringkasan: hari ini → bulan ini → keseluruhan ---------- */
function overview() {
  const today = todayKey(), month = today.slice(0, 7);
  const [y, m, d] = today.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate(); // bilangan hari dalam bulan ini (28/29/30/31 ikut kalendar)
  const byDay = Object.fromEntries(daily.map((x) => [x.day, x.count || 0]));
  const todayCount = byDay[today] || 0;
  const sumMonth = (key) => daily.filter((x) => x.day.startsWith(key)).reduce((a, x) => a + (x.count || 0), 0);
  const monthCount = sumMonth(month);
  const total = summary.total ?? daily.reduce((a, x) => a + (x.count || 0), 0);

  const days = [];
  for (let i = 13; i >= 0; i--) { const k = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() - i * 864e5)); days.push({ day: k, count: byDay[k] || 0 }); }
  const max = Math.max(1, ...days.map((x) => x.count));

  const months = [];
  for (let i = 5; i >= 0; i--) { const dt = new Date(y, m - 1 - i, 1); const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; months.push([key, sumMonth(key)]); }
  const mmax = Math.max(1, ...months.map((x) => x[1]));
  const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];

  const name = (id) => site.platforms.find((p) => p.id === id)?.name || id;
  const top = (obj, label) => { const arr = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]); const mx = Math.max(1, ...arr.map((x) => x[1])); return arr.length ? arr.map(([k, v]) => `<div class="hbar"><span>${esc(label(k))}</span><span class="track"><i style="width:${(v / mx) * 100}%"></i></span><span>${num(v)}</span></div>`).join('') : '<p class="empty">Belum ada data.</p>'; };
  const recent = summary.recent || [];

  return `<h1>Ringkasan <span class="live">LANGSUNG</span></h1><p class="sub2">Dikemas kini serta-merta. Waktu Malaysia (MYT).</p>
  <div class="stats">
    <div class="stat glass"><small><span class="ico" data-ico="clock"></span>Hari ini</small><b>${num(todayCount)}</b><em>Reset pukul 12 tengah malam</em></div>
    <div class="stat glass"><small><span class="ico" data-ico="layers"></span>Bulan ini</small><b>${num(monthCount)}</b><em>Hari ${d} daripada ${dim} · masuk jumlah keseluruhan pada akhir bulan</em></div>
    <div class="stat glass"><small><span class="ico" data-ico="download"></span>Jumlah keseluruhan</small><b>${num(total)}</b><em>Semua muat turun sejak mula</em></div>
    <div class="stat glass"><small><span class="ico" data-ico="user"></span>Pengguna berdaftar</small><b>${num(users.length)}</b><em>Gagal: ${num(summary.failed)}</em></div>
  </div>
  <div class="panels">
    <div class="panel glass"><h2>14 hari terakhir</h2><div class="bars" role="img" aria-label="Carta muat turun 14 hari">${days.map((x, i) => `<div title="${x.day}: ${x.count}"><span>${x.count || ''}</span><i style="height:${Math.max(2, (x.count / max) * 120)}px;animation-delay:${i * 40}ms"></i></div>`).join('')}</div></div>
    <div class="panel glass"><h2>Jumlah bulanan</h2>${months.map(([k, v]) => `<div class="hbar"><span>${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}</span><span class="track"><i style="width:${(v / mmax) * 100}%"></i></span><span>${num(v)}</span></div>`).join('')}</div>
  </div>
  <div class="panels">
    <div class="panel glass"><h2>Mengikut platform</h2>${top(summary.byPlatform, name)}</div>
    <div class="panel glass"><h2>Mengikut format</h2>${top(summary.byFormat, (k) => k.toUpperCase())}</div>
  </div>
  <div class="panel glass" style="margin-top:.9rem"><h2>Aktiviti terkini</h2>${recent.length ? `<ul class="log">${recent.slice(0, 30).map((l) => `<li><span>${esc(name(l.platform))} · ${esc(String(l.format || '').toUpperCase())}${l.title ? ' · ' + esc(l.title) : ''}</span><em>${esc(l.at || '')}</em></li>`).join('')}</ul>` : '<p class="empty">Belum ada aktiviti.</p>'}</div>`;
}

/* ---------- Platform ---------- */
function platforms() {
  return `<div class="toolbar"><div><h1>Platform</h1><p class="sub2" style="margin:0">Tambah laman baharu dengan satu domain. Hidup atau matikan bila-bila masa, laman awam berubah serta-merta.</p></div><button class="btn gold" id="addP"><span class="ico" data-ico="plus"></span><span class="t">Tambah</span></button></div>
  <div class="list">${site.platforms.map((p, i) => `<div class="row-item glass"><div class="pi">${platformIcon(p.icon)}</div><div class="txt"><b>${esc(p.name)}</b><small>${esc(p.domains.join(', '))}${p.note ? ' · ' + esc(p.note) : ''}</small></div><label class="switch"><input type="checkbox" data-sw="${i}" ${p.enabled ? 'checked' : ''} aria-label="Aktifkan ${esc(p.name)}"><span></span></label><div class="acts"><button class="icon-btn" data-edit="${i}" aria-label="Edit ${esc(p.name)}" data-ico="edit"></button><button class="icon-btn" data-del="${i}" aria-label="Padam ${esc(p.name)}" data-ico="trash"></button></div></div>`).join('')}</div>`;
}
const savePlatforms = (list) => guard(() => fb.saveSite({ platforms: list }));
function bindPlatforms() {
  const c = $('.view');
  $('#addP').addEventListener('click', () => editPlatform());
  c.addEventListener('change', (e) => { const i = e.target.dataset.sw; if (i == null) return; const list = structuredClone(site.platforms); list[i].enabled = e.target.checked; sfx.pop(); savePlatforms(list); });
  c.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) editPlatform(+ed.dataset.edit);
    if (dl) { const i = +dl.dataset.del, p = site.platforms[i]; modal({ icon: 'trash', err: true, title: `Padam ${p.name}?`, text: 'Pautan platform ini tidak lagi diterima.', actions: [{ label: 'Padam', cls: 'danger', onClick: () => savePlatforms(site.platforms.filter((_, k) => k !== i)) }] }); }
  });
}
function editPlatform(i) {
  const p = i == null ? { id: '', name: '', icon: 'globe', enabled: true, domains: [], note: '' } : site.platforms[i];
  const names = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', x: 'X', music: 'Muzik', video: 'Video', globe: 'Lain-lain' };
  const f = document.createElement('form'); f.noValidate = true;
  f.innerHTML = `<div class="f"><label for="pn">Nama platform</label><input id="pn" value="${esc(p.name)}" maxlength="40" placeholder="cth: Pinterest"></div>
  <div class="f"><label for="pd">Domain (pisah dengan koma)</label><input id="pd" value="${esc(p.domains.join(', '))}" placeholder="pinterest.com, pin.it"><small>Domain tepat sahaja. Contoh: vimeo.com</small></div>
  <div class="f"><label for="pt">Nota ringkas</label><input id="pt" value="${esc(p.note)}" maxlength="120"></div>
  <div class="f"><label>Ikon</label><div class="icons">${Object.keys(names).map((k) => `<label title="${names[k]}"><input type="radio" name="ic" value="${k}" ${p.icon === k ? 'checked' : ''}><span>${platformIcon(k)}</span></label>`).join('')}</div></div>`;
  f.addEventListener('submit', (e) => e.preventDefault());
  const close = modal({
    icon: 'layers', title: i == null ? 'Platform baharu' : 'Edit platform', body: f,
    actions: [{ label: 'Simpan', keep: true, onClick: () => {
      const name = $('#pn', f).value.trim(), domains = $('#pd', f).value.split(',').map((x) => x.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')).filter(Boolean);
      if (!name || !domains.length || domains.some((d) => !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))) { toast('Isi nama dan domain yang sah (cth vimeo.com).'); sfx.error(); return; }
      const list = structuredClone(site.platforms);
      const item = { id: p.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, domains, note: $('#pt', f).value.trim(), icon: f.querySelector('[name=ic]:checked')?.value || 'globe', enabled: p.enabled };
      if (i == null) list.push(item); else list[i] = item;
      close(); savePlatforms(list);
    } }],
  });
  $('.sheet').classList.add('wide');
}

/* ---------- Chatbot (3 bahasa) ---------- */
const LG = [['ms', 'BM'], ['en', 'EN'], ['ar', 'AR']];
const val = (o, l) => (o && typeof o === 'object' ? o[l] || '' : l === 'ms' ? o || '' : '');
function faq() {
  return `<div class="toolbar"><div><h1>Chatbot</h1><p class="sub2" style="margin:0">Soalan dan jawapan dalam tiga bahasa. Ia juga dipaparkan sebagai Soalan Lazim di laman awam.</p></div><button class="btn gold" id="addF"><span class="ico" data-ico="plus"></span><span class="t">Tambah</span></button></div>
  <div class="list">${site.faq.map((q, i) => `<div class="row-item glass"><div class="pi" data-ico="bot"></div><div class="txt"><b>${esc(val(q.q, 'ms'))}</b><small>${esc(val(q.a, 'ms'))}</small></div><div class="acts"><button class="icon-btn" data-edit="${i}" aria-label="Edit" data-ico="edit"></button><button class="icon-btn" data-del="${i}" aria-label="Padam" data-ico="trash"></button></div></div>`).join('') || '<p class="empty">Belum ada jawapan.</p>'}</div>`;
}
const saveFaq = (list) => guard(() => fb.saveSite({ faq: list }));
function bindFaq() {
  $('#addF').addEventListener('click', () => editFaq());
  $('.view').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) editFaq(+ed.dataset.edit);
    if (dl) { const i = +dl.dataset.del; modal({ icon: 'trash', err: true, title: 'Padam jawapan ini?', text: val(site.faq[i].q, 'ms'), actions: [{ label: 'Padam', cls: 'danger', onClick: () => saveFaq(site.faq.filter((_, k) => k !== i)) }] }); }
  });
}
function editFaq(i) {
  const q = i == null ? { id: '', q: {}, a: {}, keywords: [] } : site.faq[i];
  const f = document.createElement('form'); f.noValidate = true;
  f.innerHTML = LG.map(([l, n]) => `<div class="f"><label for="q_${l}"><span class="langtag">${n}</span>Soalan</label><input id="q_${l}" value="${esc(val(q.q, l))}" maxlength="140" ${l === 'ar' ? 'dir="rtl"' : ''}></div>
  <div class="f"><label for="a_${l}"><span class="langtag">${n}</span>Jawapan</label><textarea id="a_${l}" maxlength="800" ${l === 'ar' ? 'dir="rtl"' : ''}>${esc(val(q.a, l))}</textarea></div>`).join('')
    + `<div class="f"><label for="fk">Kata kunci (pisah dengan koma, boleh campur tiga bahasa)</label><input id="fk" value="${esc((q.keywords || []).join(', '))}" placeholder="harga, price, سعر"></div>`;
  f.addEventListener('submit', (e) => e.preventDefault());
  const close = modal({
    icon: 'bot', title: i == null ? 'Jawapan baharu' : 'Edit jawapan', body: f,
    actions: [{ label: 'Simpan', keep: true, onClick: () => {
      const item = { id: q.id || 'faq' + Date.now().toString(36), q: {}, a: {}, keywords: $('#fk', f).value.split(',').map((x) => x.trim()).filter(Boolean) };
      for (const [l] of LG) { item.q[l] = $('#q_' + l, f).value.trim(); item.a[l] = $('#a_' + l, f).value.trim(); }
      if (!item.q.ms || !item.a.ms) { toast('Soalan dan jawapan Bahasa Melayu wajib diisi.'); sfx.error(); return; }
      for (const [l] of LG) { if (!item.q[l]) item.q[l] = item.q.ms; if (!item.a[l]) item.a[l] = item.a.ms; }
      const list = structuredClone(site.faq);
      if (i == null) list.push(item); else list[i] = item;
      close(); saveFaq(list);
    } }],
  });
  $('.sheet').classList.add('wide');
}

/* ---------- Pengguna berdaftar ---------- */
function usersView() {
  const fmt = (ts) => { try { return ts?.toDate ? new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(ts.toDate()) : ''; } catch { return ''; } };
  return `<h1>Pengguna <span class="live">LANGSUNG</span></h1><p class="sub2">${num(users.length)} pengguna berdaftar. Terbaharu di atas.</p>
  <div class="list">${users.map((u) => `<div class="row-item glass"><div class="pi" data-ico="user"></div><div class="txt"><b>${esc(u.username ? '@' + u.username : u.email)}</b><small>${u.username ? esc(u.email) + ' · ' : ''}${esc(fmt(u.createdAt))}${u.lang ? ' · ' + esc(String(u.lang).toUpperCase()) : ''}</small></div></div>`).join('') || '<p class="empty">Belum ada pengguna berdaftar.</p>'}</div>`;
}

/* ---------- Pentadbir (akaun lain boleh jadi admin dari sini) ---------- */
function adminsView() {
  const rows = [`<div class="row-item glass"><div class="pi" data-ico="shield"></div><div class="txt"><b>${esc(me.email)}</b><small>Anda${me.owner ? ' · Pemilik' : ''}</small></div></div>`]
    .concat(admins.filter((a) => a.email !== String(me.email).toLowerCase()).map((a) => `<div class="row-item glass"><div class="pi" data-ico="shield"></div><div class="txt"><b>${esc(a.email)}</b><small>Admin${a.addedBy ? ' · ditambah oleh ' + esc(a.addedBy) : ''}</small></div>${me.owner ? `<div class="acts"><button class="icon-btn" data-rm="${esc(a.email)}" aria-label="Buang ${esc(a.email)}" data-ico="trash"></button></div>` : ''}</div>`));
  return `<div class="toolbar"><div><h1>Admin</h1><p class="sub2" style="margin:0">Akaun yang boleh log masuk ke panel ini.</p></div></div>
  <p class="sub2">Akaun admin diurus melalui Firebase Authentication oleh pemilik sistem. Tiada borang tambah e-mel di sini.</p>
  <div class="list">${rows.join('')}</div>`;
}
function bindAdmins() {
  const f = $('#admForm');
  if (f) f.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#admEmail').value.trim().toLowerCase();
    if (!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]{2,}$/.test(email)) { toast('Masukkan e-mel yang sah.'); sfx.error(); return; }
    guard(async () => { await fb.addAdmin(email, me.email); $('#admEmail').value = ''; });
  });
  $('.view').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const email = b.dataset.rm;
    modal({ icon: 'trash', err: true, title: 'Buang admin?', text: email, actions: [{ label: 'Buang', cls: 'danger', onClick: () => guard(() => fb.removeAdmin(email)) }] });
  });
}

/* ---------- Tetapan ---------- */
function settings() {
  const s = site.settings;
  return `<h1>Tetapan</h1><p class="sub2">Pengumuman tiga bahasa dan mod penyelenggaraan.</p>
  <div class="settings-card glass">
    ${LG.map(([l, n]) => `<div class="f"><label for="an_${l}"><span class="langtag">${n}</span>Pengumuman di laman awam</label><input id="an_${l}" value="${esc(val(s.announcement, l))}" maxlength="200" ${l === 'ar' ? 'dir="rtl"' : ''} placeholder="${l === 'ms' ? 'Kosongkan jika tiada' : ''}"></div>`).join('')}
    <button class="btn gold" id="saveS" style="margin-top:.6rem"><span class="t">Simpan tetapan</span></button>
  </div>
  <div class="settings-card glass" style="margin-top:.9rem">
    <h2 style="font-family:var(--strong);font-size:1.02rem;margin-bottom:.4rem">Sistem</h2>
    <div class="kv"><span>Pangkalan data</span><span>Cloud Firestore (fetchrbox-app-izzul)</span></div>
    <div class="kv"><span>Platform aktif</span><span>${site.platforms.filter((p) => p.enabled).length} / ${site.platforms.length}</span></div>
    <div class="kv"><span>Muat turun</span><span>${window.FETCHRBOX?.DOWNLOADS_ENABLED ? 'Pelayan disambung' : 'Pelayan muat turun belum disambung (mod pratonton)'}</span></div>
    <button class="btn ghost" id="out" style="margin-top:.8rem"><span class="ico" data-ico="logout"></span><span class="t">Keluar</span></button>
    <small style="color:var(--muted);font-weight:600;margin-top:.6rem">© 2026 Fetchr Box. Hak cipta terpelihara.</small>
  </div>`;
}
function bindSettings() {
  $('#saveS').addEventListener('click', () => guard(() => fb.saveSite({ settings: { announcement: { ms: $('#an_ms').value.trim().slice(0, 200), en: $('#an_en').value.trim().slice(0, 200), ar: $('#an_ar').value.trim().slice(0, 200) } } })));
  $('#out').addEventListener('click', () => fb.logout());
}

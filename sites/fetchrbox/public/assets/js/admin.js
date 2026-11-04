import { fb } from './firebase.js';
import { platformIcon } from './icons.js';
import { sfx } from './sfx.js';
import { $, $$, esc, hydrateIcons, setupSound, toast, modal } from './ui.js';

let data = null;
let tab = 'overview';

hydrateIcons();
setupSound($('#soundBtn'));

/* ---------- Log masuk (Firebase Auth, Google) ---------- */
$('#loginBtn').addEventListener('click', async () => {
  const err = $('#loginErr');
  err.textContent = '';
  try { await fb.signIn(); }
  catch (ex) { if (ex.code !== 'auth/popup-closed-by-user') { err.textContent = 'Log masuk gagal: ' + (ex.code || ex.message); sfx.error(); } }
});
$('#emailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#loginErr'); err.textContent = '';
  try { await fb.signInEmail($('#em').value.trim(), $('#pw').value); }
  catch (ex) { err.textContent = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(ex.code) ? 'E-mel atau kata laluan salah.' : 'Log masuk gagal: ' + (ex.code || ex.message); sfx.error(); }
});
$('#logout').addEventListener('click', () => fb.signOut());
fb.onUser(async (user) => {
  if (!user) { $('#login').hidden = false; $('#shell').hidden = true; return; }
  if (!fb.isAdminHint(user.email)) { $('#loginErr').textContent = `${user.email} bukan akaun admin.`; sfx.error(); await fb.signOut(); return; }
  if (!user.emailVerified) {
    try { await fb.verifyEmail(user); } catch {}
    $('#loginErr').textContent = `E-mel ${user.email} belum disahkan. Pautan pengesahan dihantar, sahkan kemudian log masuk semula.`; sfx.error(); await fb.signOut(); return;
  }
  try { await load(); } catch (e) { $('#loginErr').textContent = 'Gagal memuat data: ' + e.message; return; }
  sfx.success();
  $('#login').hidden = true; $('#shell').hidden = false;
  render();
});

async function load() {
  const [site, s] = await Promise.all([fb.getSite(), fb.getStats()]);
  const st = s || {};
  const byDay = st.byDay || {};
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push({ day: d, count: byDay[d] || 0 }); }
  data = {
    ...site, days, logs: st.logs || [], today: byDay[new Date().toISOString().slice(0, 10)] || 0, activeJobs: 0,
    stats: { total: st.total || 0, failed: st.failed || 0, byPlatform: st.byPlatform || {}, byFormat: st.byFormat || {} },
  };
}
async function refresh() { await load(); render(); }

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  tab = b.dataset.tab; render(); sfx.pop();
});

function render() {
  $$('#tabs button').forEach((b) => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const c = $('#content');
  c.innerHTML = `<div class="view">${{ overview, platforms, faq, settings }[tab]()}</div>`;
  hydrateIcons(c);
  ({ overview: bindNone, platforms: bindPlatforms, faq: bindFaq, settings: bindSettings }[tab])();
}
const bindNone = () => {};
const guard = async (fn) => { try { await fn(); } catch (e) { if (e.code === 'permission-denied') { toast('Tiada kebenaran. Log masuk dengan akaun admin.'); sfx.error(); } else { toast(e.message); sfx.error(); } } };

/* ---------- Ringkasan ---------- */
function overview() {
  const s = data.stats, max = Math.max(1, ...data.days.map((d) => d.count));
  const pf = Object.entries(s.byPlatform).sort((a, b) => b[1] - a[1]);
  const ff = Object.entries(s.byFormat).sort((a, b) => b[1] - a[1]);
  const name = (id) => data.platforms.find((p) => p.id === id)?.name || id;
  const top = (arr, label) => { const m = Math.max(1, ...arr.map((x) => x[1])); return arr.length ? arr.map(([k, v]) => `<div class="hbar"><span>${esc(label(k))}</span><span class="track"><i style="width:${(v / m) * 100}%"></i></span><span>${v}</span></div>`).join('') : '<p class="empty">Belum ada data.</p>'; };
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'baru' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' j' : Math.round(m / 1440) + ' h'; };
  return `<h1>Ringkasan</h1><p class="sub2">Prestasi sistem muat turun anda.</p>
  <div class="stats">
    <div class="stat glass"><small><span class="ico" data-ico="download"></span>Jumlah muat turun</small><b>${s.total}</b></div>
    <div class="stat glass"><small><span class="ico" data-ico="clock"></span>Hari ini</small><b>${data.today}</b></div>
    <div class="stat glass"><small><span class="ico" data-ico="alert"></span>Gagal</small><b>${s.failed}</b></div>
    <div class="stat glass"><small><span class="ico" data-ico="zap"></span>Sedang berjalan</small><b>${data.activeJobs}</b></div>
  </div>
  <div class="panels">
    <div class="panel glass"><h2>14 hari terakhir</h2><div class="bars" role="img" aria-label="Carta muat turun 14 hari">${data.days.map((d, i) => `<div title="${d.day}: ${d.count}"><span>${d.count || ''}</span><i style="height:${Math.max(2, (d.count / max) * 120)}px;animation-delay:${i * 40}ms"></i></div>`).join('')}</div></div>
    <div class="panel glass"><h2>Mengikut platform</h2>${top(pf, name)}<h2 style="margin-top:1.2rem">Mengikut format</h2>${top(ff, (k) => k.toUpperCase())}</div>
  </div>
  <div class="panel glass" style="margin-top:.9rem"><h2>Aktiviti terkini</h2>${data.logs.length ? `<ul class="log" style="padding:0">${data.logs.slice(0, 30).map((l) => `<li><i class="dot ${l.ok ? '' : 'bad'}"></i><span>${esc(name(l.platform))} · ${esc(l.format.toUpperCase())}${l.title ? ' · ' + esc(l.title) : ''}</span><em>${ago(l.t)}</em></li>`).join('')}</ul>` : '<p class="empty">Belum ada aktiviti.</p>'}</div>`;
}

/* ---------- Platform ---------- */
function platforms() {
  return `<div class="toolbar"><div><h1 style="font-family:var(--display)">Platform</h1><p class="sub2" style="margin:0">Tambah laman baru dengan satu domain. Hidup/matikan bila-bila masa.</p></div><button class="btn gold" id="addP"><span class="ico" data-ico="plus"></span>Tambah platform</button></div>
  <div class="list">${data.platforms.map((p, i) => `<div class="row-item glass"><div class="pi">${platformIcon(p.icon)}</div><div class="txt"><b>${esc(p.name)}</b><small>${esc(p.domains.join(', '))}${p.note ? ' · ' + esc(p.note) : ''}</small></div><label class="switch" title="Hidup/mati"><input type="checkbox" data-sw="${i}" ${p.enabled ? 'checked' : ''} aria-label="Aktifkan ${esc(p.name)}"><span></span></label><div class="acts"><button class="icon-btn" data-edit="${i}" aria-label="Edit ${esc(p.name)}" data-ico="edit"></button><button class="icon-btn" data-del="${i}" aria-label="Padam ${esc(p.name)}" data-ico="trash"></button></div></div>`).join('')}</div>`;
}
const savePlatforms = (list) => guard(async () => { await fb.saveSite({ platforms: list }); toast('Disimpan'); sfx.success(); await refresh(); });
function bindPlatforms() {
  const c = $('.view');
  $('#addP').addEventListener('click', () => editPlatform());
  c.addEventListener('change', (e) => { const i = e.target.dataset.sw; if (i == null) return; const list = structuredClone(data.platforms); list[i].enabled = e.target.checked; sfx.pop(); savePlatforms(list); });
  c.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) editPlatform(+ed.dataset.edit);
    if (dl) { const i = +dl.dataset.del; const p = data.platforms[i]; modal({ icon: 'trash', err: true, title: `Padam ${p.name}?`, text: 'Pautan platform ini tidak lagi diterima.', actions: [{ label: 'Padam', cls: 'danger', onClick: () => savePlatforms(data.platforms.filter((_, k) => k !== i)) }] }); }
  });
}
function editPlatform(i) {
  const p = i == null ? { id: '', name: '', icon: 'globe', enabled: true, domains: [], note: '' } : data.platforms[i];
  const f = document.createElement('form'); f.className = 'f'; f.noValidate = true;
  const names = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', x: 'X', music: 'Muzik', video: 'Video', globe: 'Lain-lain' };
  f.innerHTML = `<div class="f"><label for="pn">Nama platform</label><input id="pn" value="${esc(p.name)}" maxlength="40" placeholder="cth: Pinterest"></div>
  <div class="f"><label for="pd">Domain (pisah dengan koma)</label><input id="pd" value="${esc(p.domains.join(', '))}" placeholder="pinterest.com, pin.it"><small>Hanya domain tepat. Contoh: vimeo.com</small></div>
  <div class="f"><label for="pt">Nota ringkas</label><input id="pt" value="${esc(p.note)}" maxlength="120"></div>
  <div class="f"><label>Ikon</label><div class="icons">${Object.keys(names).map((k) => `<label title="${names[k]}"><input type="radio" name="ic" value="${k}" ${p.icon === k ? 'checked' : ''}><span>${platformIcon(k)}</span></label>`).join('')}</div></div>`;
  f.addEventListener('submit', (e) => e.preventDefault());
  let close;
  close = modal({
    icon: 'layers', title: i == null ? 'Platform baru' : 'Edit platform', text: '', body: f,
    actions: [{ label: 'Simpan', keep: true, onClick: () => {
      const name = $('#pn', f).value.trim(), domains = $('#pd', f).value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!name || !domains.length) { toast('Isi nama dan sekurang-kurangnya satu domain.'); sfx.error(); return; }
      const list = structuredClone(data.platforms);
      const item = { id: p.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name, domains, note: $('#pt', f).value.trim(), icon: f.querySelector('[name=ic]:checked')?.value || 'globe', enabled: p.enabled };
      if (i == null) list.push(item); else list[i] = item;
      close(); savePlatforms(list);
    } }],
  });
  $('.sheet').classList.add('wide');
}

/* ---------- Chatbot FAQ ---------- */
function faq() {
  return `<div class="toolbar"><div><h1 style="font-family:var(--display)">Chatbot</h1><p class="sub2" style="margin:0">Soalan dan jawapan yang chatbot boleh jawab. Kata kunci membantu ia faham pelbagai cara bertanya.</p></div><button class="btn gold" id="addF"><span class="ico" data-ico="plus"></span>Tambah jawapan</button></div>
  <div class="list">${data.faq.map((q, i) => `<div class="row-item glass"><div class="pi" data-ico="bot"></div><div class="txt"><b>${esc(q.q)}</b><small>${esc(q.a)}</small></div><div class="acts"><button class="icon-btn" data-edit="${i}" aria-label="Edit" data-ico="edit"></button><button class="icon-btn" data-del="${i}" aria-label="Padam" data-ico="trash"></button></div></div>`).join('') || '<p class="empty">Belum ada jawapan.</p>'}</div>`;
}
const saveFaq = (list) => guard(async () => { await fb.saveSite({ faq: list }); toast('Disimpan'); sfx.success(); await refresh(); });
function bindFaq() {
  $('#addF').addEventListener('click', () => editFaq());
  $('.view').addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
    if (ed) editFaq(+ed.dataset.edit);
    if (dl) { const i = +dl.dataset.del; modal({ icon: 'trash', err: true, title: 'Padam jawapan ini?', text: data.faq[i].q, actions: [{ label: 'Padam', cls: 'danger', onClick: () => saveFaq(data.faq.filter((_, k) => k !== i)) }] }); }
  });
}
function editFaq(i) {
  const q = i == null ? { q: '', a: '', keywords: [], id: '' } : data.faq[i];
  const f = document.createElement('form'); f.className = 'f';
  f.innerHTML = `<div class="f"><label for="fq">Soalan</label><input id="fq" value="${esc(q.q)}" maxlength="140"></div>
  <div class="f"><label for="fa">Jawapan</label><textarea id="fa" maxlength="800">${esc(q.a)}</textarea></div>
  <div class="f"><label for="fk">Kata kunci (pisah dengan koma)</label><input id="fk" value="${esc(q.keywords.join(', '))}" placeholder="harga, bayar, percuma"></div>`;
  f.addEventListener('submit', (e) => e.preventDefault());
  let close;
  close = modal({
    icon: 'bot', title: i == null ? 'Jawapan baru' : 'Edit jawapan', body: f,
    actions: [{ label: 'Simpan', keep: true, onClick: () => {
      const item = { id: q.id || 'faq' + Date.now().toString(36), q: $('#fq', f).value.trim(), a: $('#fa', f).value.trim(), keywords: $('#fk', f).value.split(',').map((x) => x.trim()).filter(Boolean) };
      if (!item.q || !item.a) { toast('Soalan dan jawapan wajib diisi.'); sfx.error(); return; }
      const list = structuredClone(data.faq);
      if (i == null) list.push(item); else list[i] = item;
      close(); saveFaq(list);
    } }],
  });
  $('.sheet').classList.add('wide');
}

/* ---------- Tetapan ---------- */
function settings() {
  const s = data.settings;
  return `<h1>Tetapan</h1><p class="sub2">Pengumuman, penyelenggaraan dan maklumat sistem.</p>
  <div class="settings-card glass">
    <div class="f"><label for="an">Pengumuman di laman awam</label><input id="an" value="${esc(s.announcement)}" maxlength="200" placeholder="cth: Tambah sokongan Pinterest minggu depan"></div>
    <div class="row-item" style="padding:.4rem 0"><div class="txt"><b>Mod penyelenggaraan</b><small>Sekat semua muat turun baru sementara waktu.</small></div><label class="switch"><input type="checkbox" id="mt" ${s.maintenance ? 'checked' : ''} aria-label="Mod penyelenggaraan"><span></span></label></div>
    <button class="btn gold" id="saveS" style="margin-top:.6rem"><span class="t">Simpan tetapan</span></button>
  </div>
  <div class="settings-card glass" style="margin-top:.9rem">
    <h2 style="font-family:var(--display);font-size:1.05rem;margin-bottom:.4rem">Sistem</h2>
    <div class="kv"><span>Pangkalan data</span><span>Cloud Firestore (fetchr-box-izzul)</span></div>
    <div class="kv"><span>Platform aktif</span><span>${data.platforms.filter((p) => p.enabled).length} / ${data.platforms.length}</span></div>
    <div class="kv"><span>Muat turun</span><span>${window.FETCHRBOX?.DOWNLOADS_ENABLED ? 'Pelayan disambung' : 'Pelayan muat turun belum disambung (mod pratonton)'}</span></div>
    <div class="kv"><span>Akses admin</span><span>Log masuk Google. Senarai e-mel admin dalam <code>firestore.rules</code>.</span></div>
    <button class="btn ghost" id="out" style="margin-top:.8rem"><span class="ico" data-ico="logout"></span><span>Log keluar</span></button>
  </div>`;
}
function bindSettings() {
  $('#saveS').addEventListener('click', () => guard(async () => { await fb.saveSite({ settings: { announcement: $('#an').value.slice(0, 200), maintenance: $('#mt').checked } }); toast('Disimpan'); sfx.success(); await refresh(); }));
  $('#out').addEventListener('click', () => $('#logout').click());
}


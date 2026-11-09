'use strict';
/* Konfigurasi dalam ../firebase-config.js (projek GENIUS DIGITAL, app "Malaysia Image Tools") */
const FIREBASE_CONFIG = window.MIT_FIREBASE || {};

const TOOL_LIST = [
  ['jpg-to-png','JPG to PNG','convert'],['png-to-jpg','PNG to JPG','convert'],['webp-to-jpg','WEBP to JPG','convert'],['jpg-to-webp','JPG to WEBP','convert'],['png-to-webp','PNG to WEBP','convert'],['image-format-converter','Image Format Converter','convert'],['image-to-pdf','Image to PDF','convert'],['pdf-to-image','PDF to Image','convert'],
  ['image-compressor','Image Compressor','edit'],['image-resizer','Image Resizer','edit'],['image-cropper','Image Cropper','edit'],['image-rotator','Image Rotator','edit'],['image-flipper','Image Flipper','edit'],['image-color-picker','Image Color Picker','edit'],['image-brightness','Image Brightness Editor','edit'],['image-contrast','Image Contrast Editor','edit'],['image-saturation','Image Saturation Editor','edit'],['image-grayscale','Image Grayscale Converter','edit'],['image-blur','Image Blur Tool','edit'],['image-border','Image Border Maker','edit'],['remove-background','Remove Background (AI)','edit'],
  ['image-metadata','Image Metadata Viewer','util'],['image-dimension','Image Dimension Checker','util'],['color-palette','Image Color Palette Extractor','util'],['favicon-generator','Favicon Generator','util'],['youtube-thumbnail','YouTube Thumbnail Resizer','util'],['passport-photo','Passport Photo Layout Generator','util'],['profile-picture','Profile Picture Maker','util'],['image-collage','Image Collage Maker','util'],['meme-generator','Meme Generator','util'],['image-comparison','Image Comparison Tool','util']
];
const CAT_NAME = { convert: 'Converter', edit: 'Editor', util: 'Utilities' };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(n || 0).toLocaleString('ms-MY');
const dayKey = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
function toast(msg, type = '') { const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3500); }
function showMsg(text, type) { const m = $('#loginMsg'); m.hidden = !text; m.className = 'msg ' + type; m.textContent = text || ''; }

/* Logo */
const LOGO = `<img src="/icons/logo.png" alt="Logo Malaysia Image Tools" width="44" height="44">`;
$('#logoLogin').innerHTML = LOGO; $('#logoSide').innerHTML = LOGO;

/* Ikon mata (tunjuk / sembunyi kata laluan) */
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.7 10.7 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9"/><path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="m2 2 20 20"/></svg>';
const eyeBtn = $('#eyeBtn'), passInp = $('#pass');
eyeBtn.innerHTML = EYE;
eyeBtn.addEventListener('click', () => {
  const show = passInp.type === 'password';
  passInp.type = show ? 'text' : 'password';
  eyeBtn.innerHTML = show ? EYE_OFF : EYE;
  eyeBtn.setAttribute('aria-label', show ? 'Sembunyi kata laluan' : 'Tunjuk kata laluan');
  eyeBtn.setAttribute('aria-pressed', String(show));
  passInp.focus();
});

/* ---------- Lapisan data Firebase ---------- */
let API = null, user = null;
function firebaseAPI() {
  const db = firebase.firestore(), rt = FIREBASE_CONFIG.databaseURL ? firebase.database() : null;
  return {
    async getSettings() { const s = await db.doc('mit_settings/site').get(); return s.exists ? s.data() : {}; },
    async saveSettings(d) { await db.doc('mit_settings/site').set({ ...d, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: user.email }); },
    async getTools() { const out = {}; (await db.collection('mit_tools').get()).forEach(d => out[d.id] = d.data()); return out; },
    async setTool(id, patch) { await db.doc('mit_tools/' + id).set({ ...patch, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); },
    async getStats() { if (!rt) return {}; const s = await rt.ref('apps/image-tools/stats').get(); return s.val() || {}; },
    async getVisits() { if (!rt) return {}; const s = await rt.ref('apps/image-tools/visits').get(); return s.val() || {}; },
    async listFeedback() { const q = await db.collection('mit_feedback').orderBy('createdAt', 'desc').limit(200).get(); return q.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt ? d.data().createdAt.toDate() : null })); },
    async updateFeedback(id, patch) { await db.doc('mit_feedback/' + id).update(patch); },
    async deleteFeedback(id) { await db.doc('mit_feedback/' + id).delete(); }
  };
}

/* ---------- Log masuk (Firebase Authentication: e-mel + kata laluan) ---------- */
firebase.initializeApp(FIREBASE_CONFIG);
/* Semak akses admin: dokumen mit_private/ping hanya boleh dibaca admin (rules). */
async function isAdminUser() {
  try { await firebase.firestore().doc('mit_private/ping').get(); return true; }
  catch (e) { if (e.code === 'permission-denied') return false; throw e; }
}
firebase.auth().onAuthStateChanged(async u => {
  if (!u) { $('#consoleView').hidden = true; $('#loginView').hidden = false; return; }
  try {
    if (!(await isAdminUser())) {
      showMsg(`Akaun ini belum didaftarkan sebagai admin. Cipta dokumen Firestore admins/${u.uid} (medan bebas, cth. email) di Firebase Console, kemudian log masuk semula.`, 'err');
      await firebase.auth().signOut(); return;
    }
    user = u; API = firebaseAPI(); enterConsole();
  } catch (e) { showMsg('Gagal menyemak akses admin: ' + e.message, 'err'); }
});
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  showMsg('', ''); $('#loginBtn').disabled = true; $('#loginBtn').textContent = 'Sedang log masuk...';
  try { await firebase.auth().signInWithEmailAndPassword($('#email').value.trim(), $('#pass').value); }
  catch (err) { showMsg({ 'auth/invalid-credential': 'E-mel atau kata laluan salah.', 'auth/wrong-password': 'Kata laluan salah.', 'auth/user-not-found': 'Akaun tidak wujud.', 'auth/too-many-requests': 'Terlalu banyak cubaan. Cuba sebentar lagi.', 'auth/operation-not-allowed': 'Log masuk E-mel/Kata laluan belum diaktifkan di Firebase Authentication.' }[err.code] || err.message, 'err'); }
  finally { $('#loginBtn').disabled = false; $('#loginBtn').textContent = 'Log Masuk'; }
});
$('#resetBtn').addEventListener('click', async () => {
  const email = $('#email').value.trim(); if (!email) return showMsg('Isi e-mel dahulu, kemudian klik "Lupa kata laluan".', 'info');
  try { await firebase.auth().sendPasswordResetEmail(email); showMsg('Pautan set semula kata laluan telah dihantar ke ' + email + '.', 'ok'); } catch (e) { showMsg(e.message, 'err'); }
});
$('#logoutBtn').addEventListener('click', async () => { await firebase.auth().signOut(); API = null; user = null; passInp.value = ''; $('#consoleView').hidden = true; $('#loginView').hidden = false; });

/* ---------- Konsol ---------- */
let cache = { stats: {}, tools: {}, feedback: [], settings: {}, visits: {} }, fbFilter = 'all';
function enterConsole() {
  $('#loginView').hidden = true; $('#consoleView').hidden = false;
  showMsg('', ''); $('#whoText').textContent = user.email; loadAll();
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; $$('#tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab); });
$('#refreshBtn').addEventListener('click', loadAll);
async function loadAll() {
  try {
    const [stats, tools, settings, feedback, visits] = await Promise.all([API.getStats().catch(e => { toast('Statistik: ' + e.message, 'error'); return {}; }), API.getTools(), API.getSettings(), API.listFeedback().catch(e => { toast('Maklum balas: ' + e.message, 'error'); return []; }), API.getVisits().catch(() => ({}))]);
    cache = { stats, tools, settings, feedback, visits };
    renderOverview(); renderTools(); renderSettings(); renderFeedback();
  } catch (e) { toast('Gagal memuatkan data: ' + e.message, 'error'); }
}
function renderOverview() {
  const st = cache.stats || {}, t = st.tools || {}, daily = st.daily || {}, today = dayKey(new Date());
  $('#kTotal').textContent = num((st.total || {}).count);
  const vi = cache.visits || {}; $('#vUsers').textContent = num(vi.users); $('#vTotal').textContent = num(vi.total); $('#vToday').textContent = num((vi.daily || {})[today]); $('#vMonth').textContent = num((vi.monthly || {})[today.slice(0, 7)]);
  $('#kToday').textContent = num((daily[today] || {}).count); $('#kTodayDate').textContent = today;
  const active = TOOL_LIST.filter(([id]) => (cache.tools[id] || {}).enabled !== false).length; $('#kActive').textContent = active; $('#kActiveOf').textContent = `daripada ${TOOL_LIST.length} alat`;
  const nNew = cache.feedback.filter(f => f.status === 'new').length; $('#kFb').textContent = nNew; $('#fbBadge').hidden = !nNew; $('#fbBadge').textContent = nNew;
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); const k = dayKey(d); return { k, label: d.toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric' }), v: (daily[k] || {}).count || 0 }; });
  const max = Math.max(1, ...days.map(d => d.v)), mag = Math.pow(10, Math.floor(Math.log10(max))), step = mag * (max / mag > 5 ? 2 : 1), top = Math.ceil(max / step) * step;
  const L = 44, R = 12, T = 14, B = 34, W = 560 - L - R, H = 240 - T - B, bw = W / 7;
  let svg = '';
  for (let g = 0; g <= top; g += step) { const y = T + H - g / top * H; svg += `<line x1="${L}" x2="${560 - R}" y1="${y}" y2="${y}" stroke="#e3e6f2"/><text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#626b88" font-family="JetBrains Mono, monospace">${g}</text>`; }
  svg += `<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b3fe4"/><stop offset="1" stop-color="#2457f5"/></linearGradient></defs>`;
  days.forEach((d, i) => { const h = d.v / top * H, x = L + i * bw + bw * .2; svg += `<rect x="${x}" y="${T + H - h}" width="${bw * .6}" height="${Math.max(h, 0)}" rx="5" fill="url(#gb)"><title>${d.k}: ${d.v}</title></rect>${d.v ? `<text x="${x + bw * .3}" y="${T + H - h - 5}" text-anchor="middle" font-size="11" font-weight="600" fill="#0e1530" font-family="JetBrains Mono, monospace">${d.v}</text>` : ''}<text x="${x + bw * .3}" y="${240 - 12}" text-anchor="middle" font-size="11" fill="#626b88">${esc(d.label)}</text>`; });
  $('#chart').innerHTML = svg;
  const rows = TOOL_LIST.map(([id, n]) => [n, (t[id] || {}).count || 0]).sort((a, b) => b[1] - a[1]).slice(0, 8); const m = Math.max(1, ...rows.map(r => r[1]));
  $('#topTools').innerHTML = rows.some(r => r[1]) ? rows.map(([n, v]) => `<div class="bar-row"><span class="n" title="${esc(n)}">${esc(n)}</span><span class="t"><i style="width:${v / m * 100}%"></i></span><span class="v">${num(v)}</span></div>`).join('') : '<div class="empty">Belum ada data penggunaan.</div>';
}
function renderTools() {
  const t = (cache.stats || {}).tools || {};
  $('#toolRows').innerHTML = TOOL_LIST.map(([id, n, c]) => { const s = cache.tools[id] || {}; return `<tr><td><b>${esc(n)}</b><br><span class="mono" style="font-size:11.5px;color:var(--muted)">#${id}</span></td><td><span class="pill ${c}">${CAT_NAME[c]}</span></td><td class="mono">${num((t[id] || {}).count)}</td>
    <td><label class="switch" aria-label="Aktifkan ${esc(n)}"><input type="checkbox" data-id="${id}" data-k="enabled" ${s.enabled !== false ? 'checked' : ''}><span></span></label></td>
    <td><label class="switch" aria-label="Tanda pilihan ${esc(n)}"><input type="checkbox" data-id="${id}" data-k="featured" ${s.featured ? 'checked' : ''}><span></span></label></td></tr>`; }).join('');
}
$('#toolRows').addEventListener('change', async e => {
  const i = e.target; if (!i.dataset.id) return; i.disabled = true;
  try { await API.setTool(i.dataset.id, { [i.dataset.k]: i.checked }); cache.tools[i.dataset.id] = { ...(cache.tools[i.dataset.id] || {}), [i.dataset.k]: i.checked }; toast('Disimpan.', 'success'); renderOverview(); }
  catch (err) { i.checked = !i.checked; toast('Gagal simpan: ' + err.message, 'error'); } finally { i.disabled = false; }
});
let annType = 'info';
function renderSettings() {
  const s = cache.settings || {};
  $('#annOn').checked = !!s.announcementActive; $('#annText').value = s.announcement || ''; annType = s.announcementType || 'info';
  $('#mOn').checked = !!s.maintenance; $('#mText').value = s.maintenanceMessage || '';
  $$('#annType button').forEach(b => b.classList.toggle('on', b.dataset.v === annType));
  $('#siteMeta').textContent = s.updatedBy ? `Kemas kini terakhir oleh ${s.updatedBy}` : ''; preview();
}
function preview() { const p = $('#annPreview'); p.className = 'preview-banner ' + annType; p.textContent = $('#annText').value || '(tiada teks)'; }
$('#annText').addEventListener('input', preview);
$('#annType').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; annType = b.dataset.v; $$('#annType button').forEach(x => x.classList.toggle('on', x === b)); preview(); });
$('#siteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const d = { announcementActive: $('#annOn').checked, announcement: $('#annText').value.trim().slice(0, 300), announcementType: annType, maintenance: $('#mOn').checked, maintenanceMessage: $('#mText').value.trim().slice(0, 300) };
  try { await API.saveSettings(d); cache.settings = { ...d, updatedBy: user.email }; renderSettings(); toast('Tetapan disimpan.', 'success'); } catch (err) { toast('Gagal simpan: ' + err.message, 'error'); }
});
function renderFeedback() {
  const list = cache.feedback.filter(f => fbFilter === 'all' || f.status === fbFilter);
  const tname = id => (TOOL_LIST.find(t => t[0] === id) || [, 'Umum'])[1];
  $('#fbList').innerHTML = list.length ? list.map(f => `<div class="fb" data-id="${esc(f.id)}"><div class="top"><b>${esc(f.name || 'Tanpa nama')}</b><span class="pill ${f.status === 'new' ? 'new' : 'read'}">${f.status === 'new' ? 'Baharu' : 'Dibaca'}</span><span>${esc(tname(f.tool))}</span><span class="stars">${'★'.repeat(f.rating || 0)}</span><span>${f.createdAt ? f.createdAt.toLocaleString('ms-MY') : ''}</span></div><p>${esc(f.message)}</p>
    <div class="acts">${f.status === 'new' ? '<button class="btn sm" data-a="read" type="button">Tanda dibaca</button>' : '<button class="btn sm" data-a="new" type="button">Tanda baharu</button>'}<button class="btn sm danger" data-a="del" type="button">Padam</button></div></div>`).join('') : '<div class="empty">Tiada maklum balas.</div>';
}
$('#fbFilter').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fbFilter = b.dataset.v; $$('#fbFilter button').forEach(x => x.classList.toggle('on', x === b)); renderFeedback(); });
$('#fbList').addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const id = b.closest('.fb').dataset.id; const f = cache.feedback.find(x => x.id === id);
  try {
    if (b.dataset.a === 'del') { b.dataset.a = 'del2'; b.textContent = 'Klik lagi untuk sahkan'; return; }
    if (b.dataset.a === 'del2') { await API.deleteFeedback(id); cache.feedback = cache.feedback.filter(x => x.id !== id); toast('Dipadam.', 'success'); }
    else { await API.updateFeedback(id, { status: b.dataset.a }); f.status = b.dataset.a; }
    renderFeedback(); renderOverview();
  } catch (err) { toast('Gagal: ' + err.message, 'error'); }
});

/* =====================================================================
   APLIKASI: navigasi, halaman utama, halaman alat, Firebase (GENIUS DIGITAL)
   ===================================================================== */
const STATE = { disabled: new Set(), featured: new Set(), announcement: null, scope: null };
const toolById = id => TOOLS.find(t => t.id === id);
const visibleTools = () => TOOLS.filter(t => !STATE.disabled.has(t.id));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const matches = (t, q) => !q || norm(`${t.name} ${t.desc} ${CATS[t.cat].bm} ${t.id}`).includes(norm(q));

$$('[data-logo]').forEach(el => { el.innerHTML = LOGO(el.dataset.logo); });

function renderNav(q = '') {
  const cur = location.hash.slice(1);
  let html = `<a href="#" class="home-link ${!cur ? 'on' : ''}">${icon('image')}Semua Alat</a>`;
  for (const [k, c] of Object.entries(CATS)) {
    const list = visibleTools().filter(t => t.cat === k && matches(t, q));
    if (!list.length) continue;
    html += `<h4>${c.name}<span>${list.length}</span></h4>` + list.map(t => `<a href="#${t.id}" class="${cur === t.id ? 'on' : ''}">${icon(t.icon)}${esc(t.name)}</a>`).join('');
  }
  $('#nav').innerHTML = html || '<div class="empty" style="margin:8px">Tiada alat ditemui.</div>';
}
function card(t) {
  const tag = STATE.featured.has(t.id) ? 'Pilihan' : t.popular ? 'Popular' : t.isNew ? 'Baharu' : '';
  return `<a class="tcard ${CATS[t.cat].cls}" href="#${t.id}"><span class="ticon">${icon(t.icon)}</span>${tag ? `<span class="tag">${tag}</span>` : ''}<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><span class="arrow">Buka alat ${icon('arrow')}</span></a>`;
}
function bannerHTML() {
  const a = STATE.announcement; if (!a) return '';
  return `<div class="banner ${['info', 'warning', 'success'].includes(a.type) ? a.type : 'info'}">${icon('megaphone')}<div>${esc(a.text)}</div></div>`;
}
const previewNote = () => IN_FRAME ? `<div class="banner info preview-flag">${icon('info')}<div>Anda sedang melihat <b>pratonton</b>. Semua alat berfungsi, tetapi sesetengah paparan pratonton menyekat muat turun fail. Buka laman ini terus di pelayar untuk muat turun penuh.</div></div>` : '';

function renderHome() {
  const view = $('#view'); const q = '';
  const n = visibleTools().length;
  view.innerHTML = `${bannerHTML()}${previewNote()}
    <section class="hero"><div class="hero-photo" aria-hidden="true"></div><div class="hero-in">
      <span class="eyebrow"><i></i>100% percuma · tanpa daftar</span>
      <h1>MALAYSIA <span>IMAGE TOOLS</span></h1>
      <p class="sub">Alat Gambar Percuma, Lengkap &amp; Mudah Digunakan</p>
      <label class="search"><span class="sr">Cari alat</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="homeSearch" type="search" placeholder="Cari: compress, resize, PDF, favicon..." autocomplete="off"></label>
      <div class="quick"><a class="hot" href="#remove-background">Buang latar (AI)</a><a href="#image-compressor">Mampat gambar</a><a href="#image-resizer">Ubah saiz</a><a href="#png-to-jpg">PNG → JPG</a><a href="#image-to-pdf">Gambar → PDF</a><a href="#passport-photo">Foto pasport</a></div>
      <div class="hero-mini">
        <div class="mini t1"><span class="si">${icon('image')}</span><div><b>${n} alat</b><small>sedia guna</small></div></div>
        <div class="mini t2"><span class="si">${icon('shield')}</span><div><b>0 muat naik</b><small>gambar kekal di peranti</small></div></div>
        <div class="mini t3"><span class="si">${icon('star')}</span><div><b>RM0</b><small>tiada langganan</small></div></div>
        <div class="mini t4"><span class="si">${icon('upload')}</span><div><b>${CONFIG.maxImageMB} MB</b><small>had setiap gambar</small></div></div>
      </div>
    </div></section>
    <div id="homeGrids"></div>
    <section class="sec"><div class="sec-head"><div><h2>Cara guna</h2><p>Tiga langkah. Semua berlaku dalam browser anda.</p></div></div>
      <div class="how"><div><b><em>1</em>Pilih alat</b><p>Cari atau pilih daripada ${n} alat di atas atau di menu sisi.</p></div><div><b><em>2</em>Muat naik gambar</b><p>Seret &amp; lepas, klik, atau tampal (Ctrl+V). Fail kekal dalam peranti anda.</p></div><div><b><em>3</em>Simpan hasil</b><p>Pratonton, laraskan dan muat turun. Tutup tab untuk buang semua fail.</p></div></div></section>
    ${footer()}`;
  const draw = q => {
    let html = '';
    for (const [k, c] of Object.entries(CATS)) {
      const list = visibleTools().filter(t => t.cat === k && matches(t, q)); if (!list.length) continue;
      html += `<section class="sec"><div class="sec-head"><div><h2>${c.name}</h2><p>${c.bm} · ${c.desc}</p></div><span class="count">${list.length} alat</span></div><div class="grid">${list.map(card).join('')}</div></section>`;
    }
    $('#homeGrids').innerHTML = html || `<div class="sec empty">Tiada alat sepadan dengan "<b>${esc(q)}</b>". Cuba kata kunci lain seperti "jpg" atau "saiz".</div>`;
  };
  draw(q);
  const hs = $('#homeSearch'); hs.addEventListener('input', () => { draw(hs.value); renderNav(hs.value); });
  hs.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = visibleTools().find(t => matches(t, hs.value)); if (f) location.hash = f.id; } });
}
function footer() {
  const cell = (k, label, sub) => `<div class="vs"><span>${label}</span><b data-v="${k}">—</b><small>${sub}</small></div>`;
  return `<footer class="foot">
    <div class="vstats" aria-label="Statistik pelawat">
      ${cell('users', 'Jumlah Pengguna', 'pengguna unik sejak mula')}
      ${cell('today', 'Pelawat Hari Ini', 'set semula 12:00 malam')}
      ${cell('month', 'Pelawat Bulan Ini', 'set semula awal bulan')}
      ${cell('total', 'Keseluruhan Lawatan', 'campuran semua hari')}
    </div>
    <p class="vnote" id="vnote"></p>
    <div class="foot-brand">
      <div><span class="foot-id">${LOGO('ft')}<b class="foot-name">MALAYSIA IMAGE TOOLS</b></span><blockquote class="slogan">“Memacu Inovasi Digital Melalui Sistem Pintar, Kreatif dan Efisien.”</blockquote></div>
      <span class="foot-priv">${icon('shield')}Semua fail diproses dalam browser anda. Tiada muat naik, tiada simpanan.</span>
    </div>
    <div class="foot-bottom"><span>© Hak Cipta Terpelihara Genius Digital 2026</span><span>Alat Gambar Percuma untuk Semua</span></div>
  </footer>`;
}

/* ---------- Statistik pelawat (Realtime Database, waktu Malaysia) ---------- */
const MYT = 'Asia/Kuala_Lumpur';
function mytKeys(d = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: MYT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return { day, month: day.slice(0, 7) };
}
function msToMidnightMYT() { const now = Date.now(), off = 8 * 3600e3; return Math.floor((now + off) / 864e5 + 1) * 864e5 - off - now + 1500; }
const APP_ID = 'image-tools'; /* skema RTDB kongsi: apps/<APP_ID>/visits|stats */
const rt = path => FB.rtdb.ref(`apps/${APP_ID}/${path}`);
const VIS = { users: null, today: null, month: null, total: null };
function paintVisits() {
  $$('[data-v]').forEach(el => { const v = VIS[el.dataset.v]; el.textContent = v == null ? '—' : Number(v).toLocaleString('ms-MY'); });
  const n = $('#vnote'); if (!n) return;
  n.textContent = FB.rtdb ? 'Dikemas kini secara langsung · Pelawat hari ini set semula pada 12:00 tengah malam dan pelawat bulan ini set semula pada awal setiap bulan (waktu Malaysia). Keseluruhan terus bertambah.'
    : 'Statistik pelawat dipaparkan selepas Firebase Realtime Database disambungkan.';
}
const lsx = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
function countVisit() {
  const { day, month } = mytKeys(), inc = v => (typeof v === 'number' ? v : 0) + 1, T = p => rt(p).transaction(inc);
  if (!lsx('mit_visitor')) { lsx('mit_visitor', '1'); T('visits/users'); }
  if (lsx('mit_v_day') !== day) { lsx('mit_v_day', day); T('visits/daily/' + day); T('visits/total'); }
  if (lsx('mit_v_month') !== month) { lsx('mit_v_month', month); T('visits/monthly/' + month); }
}
let visitRefs = [];
function watchVisits() {
  visitRefs.forEach(r => r.off()); visitRefs = [];
  const { day, month } = mytKeys();
  [['users', 'visits/users'], ['total', 'visits/total'], ['today', 'visits/daily/' + day], ['month', 'visits/monthly/' + month]].forEach(([k, path]) => {
    const r = rt(path); r.on('value', s => { VIS[k] = s.val() || 0; paintVisits(); }, e => console.warn(e)); visitRefs.push(r);
  });
  setTimeout(() => { countVisit(); watchVisits(); }, msToMidnightMYT());
}

function cleanupScope() {
  const s = STATE.scope; if (!s) return;
  s.cleanup.forEach(fn => { try { fn(); } catch { } });
  setTimeout(() => s.urls.forEach(u => URL.revokeObjectURL(u)), 1000);
  STATE.scope = null; pasteTarget = null;
}
function mountTool(id) {
  const t = toolById(id); const view = $('#view');
  cleanupScope();
  if (!t) { renderHome(); return; }
  const c = CATS[t.cat];
  const related = visibleTools().filter(x => x.cat === t.cat && x.id !== t.id).slice(0, 4);
  view.innerHTML = `${bannerHTML()}${previewNote()}
    <nav class="crumbs" aria-label="Laluan"><a href="#">Utama</a><span>/</span><span>${c.name}</span><span>/</span><span style="color:var(--ink)">${esc(t.name)}</span></nav>
    <div class="tool-head ${c.cls}"><span class="ticon">${icon(t.icon)}</span><div><h1>${esc(t.name)}</h1><p>${esc(t.desc)}</p>
      <div class="chips"><span class="chip ok">${icon('shield')}Diproses dalam browser anda</span><span class="chip">${icon('check')}Percuma</span><span class="chip">Had ${t.id === 'pdf-to-image' ? CONFIG.maxPdfMB : CONFIG.maxImageMB} MB / fail</span></div></div></div>
    <div id="toolRoot"></div>
    ${related.length ? `<section class="sec"><div class="sec-head"><div><h2>Alat berkaitan</h2><p>${c.bm}</p></div></div><div class="grid">${related.map(card).join('')}</div></section>` : ''}
    ${footer()}`;
  if (STATE.disabled.has(t.id)) { $('#toolRoot').innerHTML = `<div class="empty">Alat ini dimatikan sementara oleh pentadbir. Sila cuba alat lain.</div>`; return; }
  STATE.scope = { urls: [], cleanup: [] };
  try { t.mount($('#toolRoot'), STATE.scope); } catch (e) { console.error(e); $('#toolRoot').innerHTML = `<div class="empty">Alat gagal dimuatkan: ${esc(e.message)}</div>`; }
}
function route() {
  const id = decodeURIComponent(location.hash.slice(1));
  $('#app').classList.remove('drawer');
  if (id && toolById(id)) { mountTool(id); document.title = `${toolById(id).name} · Malaysia Image Tools`; }
  else { cleanupScope(); renderHome(); document.title = 'Malaysia Image Tools'; }
  renderNav($('#navSearch').value);
  paintVisits();
  window.scrollTo(0, 0);
}

/* ---------- Firebase (GENIUS DIGITAL): tetapan admin, statistik & maklum balas ----------
   Firestore: mit_settings/site, mit_tools/{id}, mit_feedback/{id}
   Realtime DB (skema kongsi): apps/image-tools/visits/*, apps/image-tools/stats/*  */
const FB = { ready: false, db: null, rtdb: null };
async function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) return;
  try {
    await loadScript(LIBS.fbApp); await loadScript(LIBS.fbStore);
    if (FIREBASE_CONFIG.databaseURL) await loadScript(LIBS.fbDb);
    /* Guna nama app berasingan supaya tidak berlanggar dengan skrip lain pada domain yang sama */
    const app = firebase.apps.find(a => a.name === 'mit') || firebase.initializeApp(FIREBASE_CONFIG, 'mit');
    FB.db = app.firestore(); FB.rtdb = FIREBASE_CONFIG.databaseURL ? app.database() : null; FB.ready = true;
    if (FB.rtdb) { try { countVisit(); watchVisits(); } catch (e) { console.warn(e); } }
    try {
      const s = await FB.db.doc('mit_settings/site').get();
      if (s.exists) { const d = s.data(); if (d.announcementActive && d.announcement) STATE.announcement = { text: d.announcement, type: d.announcementType || 'info' }; if (d.maintenance) STATE.announcement = { text: d.maintenanceMessage || 'Penyelenggaraan sedang dijalankan.', type: 'warning' }; }
    } catch (e) { console.warn('Tetapan laman:', e.message); }
    try {
      const tools = await FB.db.collection('mit_tools').get();
      tools.forEach(d => { const x = d.data(); if (x.enabled === false) STATE.disabled.add(d.id); if (x.featured) STATE.featured.add(d.id); });
    } catch (e) { console.warn('Tetapan alat:', e.message); }
    route();
  } catch (e) { console.warn('Firebase tidak aktif:', e.message); }
}
function track(id) {
  if (!FB.rtdb) return;
  try {
    const day = mytKeys().day, inc = v => (typeof v === 'number' ? v : 0) + 1;
    rt('stats/tools/' + id + '/count').transaction(inc); rt('stats/total/count').transaction(inc); rt(`stats/daily/${day}/count`).transaction(inc);
  } catch (e) { console.warn(e); }
}
function feedback() {
  const f = document.createElement('form'); f.style.cssText = 'display:grid;gap:12px;width:100%';
  if (!FB.ready) {
    f.innerHTML = `<div class="note">Borang maklum balas belum dapat disambungkan ke pelayan. Cuba muat semula halaman. Tiada data dihantar.</div>`;
    openModal('Maklum Balas', f, { left: true }); return;
  }
  const cur = location.hash.slice(1);
  f.innerHTML = `<label class="fld">Nama (pilihan)<input class="inp" name="name" maxlength="60"></label>
    <label class="fld">Alat<select class="inp" name="tool"><option value="umum">Umum</option>${TOOLS.map(t => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
    <div class="fld"><span>Penilaian</span><div class="seg" id="fbRate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" class="${n === 5 ? 'on' : ''}">${'★'.repeat(n)}</button>`).join('')}</div></div>
    <label class="fld">Mesej<textarea class="inp" name="message" maxlength="1000" required rows="4" placeholder="Cadangan, aduan pepijat atau alat baharu yang anda mahu..."></textarea></label>
    <div class="note">Hanya teks di atas dihantar. Tiada gambar dihantar.</div><button class="btn primary" type="submit">Hantar</button>`;
  let rating = 5; $('#fbRate', f).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; rating = +b.dataset.n; $$('#fbRate button', f).forEach(x => x.classList.toggle('on', x === b)); });
  const m = openModal('Maklum Balas', f, { left: true });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const fd = new FormData(f); const message = String(fd.get('message') || '').trim(); if (!message) return;
    try {
      await FB.db.collection('mit_feedback').add({ name: String(fd.get('name') || '').trim().slice(0, 60), message: message.slice(0, 1000), tool: String(fd.get('tool')).slice(0, 40), rating, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      m.close(); toast('Terima kasih! Maklum balas dihantar.', 'success');
    } catch (err) { toast('Gagal menghantar: ' + err.message, 'error'); }
  });
}

/* ---------- Mula ---------- */
$('#menuBtn').addEventListener('click', () => $('#app').classList.add('drawer'));
$('#scrim').addEventListener('click', () => $('#app').classList.remove('drawer'));
$('#navSearch').addEventListener('input', e => renderNav(e.target.value));
$('#navSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = visibleTools().find(t => matches(t, e.target.value)); if (f) location.hash = f.id; } });
$('#fbBtn').addEventListener('click', feedback);
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); const hs = $('#homeSearch'); (hs && hs.offsetParent ? hs : $('#navSearch')).focus(); if (innerWidth < 900 && !hs) $('#app').classList.add('drawer'); }
});
window.addEventListener('hashchange', route);
route();
initFirebase();

/* ---------- PWA: pasang ke skrin utama / desktop ---------- */
let deferredInstall = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function showInstall(on) { $('#installBtn').hidden = !on; }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (!isStandalone()) showInstall(true); });
window.addEventListener('appinstalled', () => { deferredInstall = null; showInstall(false); toast('Aplikasi berjaya dipasang.', 'success'); });
if (isIOS && !isStandalone()) showInstall(true);
$('#installBtn').addEventListener('click', async () => {
  if (deferredInstall) {
    deferredInstall.prompt();
    const r = await deferredInstall.userChoice.catch(() => null);
    if (r && r.outcome === 'accepted') showInstall(false);
    deferredInstall = null; return;
  }
  const b = document.createElement('div'); b.style.cssText = 'display:grid;gap:12px;width:100%';
  b.innerHTML = isIOS
    ? `<p style="margin:0">Untuk pasang di iPhone / iPad (Safari):</p><ol style="margin:0;padding-left:20px;display:grid;gap:6px"><li>Ketik butang <b>Kongsi</b> (kotak dengan anak panah ke atas) di bahagian bawah.</li><li>Pilih <b>Tambah ke Skrin Utama</b>.</li><li>Ketik <b>Tambah</b>.</li></ol>`
    : `<p style="margin:0">Pelayar ini belum menawarkan pemasangan automatik. Cuba:</p><ul style="margin:0;padding-left:20px;display:grid;gap:6px"><li><b>Chrome / Edge (komputer):</b> klik ikon pasang di hujung bar alamat, atau menu ⋮ → <i>Pasang Malaysia Image Tools</i>.</li><li><b>Android Chrome:</b> menu ⋮ → <i>Pasang aplikasi</i> / <i>Tambah ke skrin utama</i>.</li></ul>`;
  openModal('Pasang Aplikasi', b, { left: true });
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW:', e.message)));
}

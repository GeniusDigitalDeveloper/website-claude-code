import { api, fileUrl, DEMO } from './api.js';
import { fb } from './firebase.js';
import { platformIcon } from './icons.js';
import { sfx } from './sfx.js';
import { t, pick, getLang, setLang, applyI18n } from './i18n.js';
import { $, $$, esc, hydrateIcons, setupReveal, toast, modal, reduced } from './ui.js';
import { initChat } from './chat.js';
import { initNotify } from './notify.js';
import { setupPwToggles } from './pw.js';
import { openCropper } from './cropper.js';

const VIDEO = ['mp4', 'mov', 'mkv'];
const AUDIO = ['mp3', 'wav', 'm4a', 'flac'];
const QUALITIES = [['best', null], ['2160', '4K'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']];
const st = { cfg: null, user: null, info: null, mode: 'video', format: 'mp4', quality: 'best', busy: false, registering: false, phase: 'preparing', pct: 0 };

const fmtTime = (s) => { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

hydrateIcons();
applyI18n();
setupReveal();
setupPwToggles();
const notifyApi = initNotify();

/* ---------- Halaman berasingan: Utama / Cara guna / Soalan lazim / Profil ---------- */
const VIEWS = ['home', 'cara', 'faq', 'profil', 'terma'];
function route() {
  let v = location.hash.replace('#', '') || 'home';
  if (!VIEWS.includes(v)) v = 'home';
  if (v === 'profil' && !st.user) v = 'home';
  $$('.view').forEach((el) => { const on = el.dataset.view === v; if (el.hidden === on) el.hidden = !on; });
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.body.dataset.theme = v;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- Bahasa ---------- */
function paintLangs() { $$('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()))); }
$$('.langs button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
paintLangs();
document.addEventListener('langchange', () => {
  paintLangs(); renderPlatforms(); renderFaq(); paintAnnounce(); detect();
  if (st.info) { renderMeta(st.info); buildChoices(true); }
  if ($('#progress').classList.contains('show')) setProgress(st.pct, st.phase);
});

/* ---------- Tetapan masa nyata dari Firestore (perubahan admin terus sampai) ---------- */
let chatApi;
fb.watchSite((cfg) => {
  st.cfg = cfg;
  renderPlatforms(); renderFaq(); paintAnnounce(); detect();
  if (!chatApi) { chatApi = initChat(() => st.cfg.faq, { onInsertUrl }); chatApi.setUser(st.user); }
});
function onInsertUrl(u) {
  if (!st.user) { toast(t('login_first')); return; }
  $('#url').value = u; $('#url').focus(); $('#url').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); detect();
}
function paintAnnounce() {
  const el = $('#announce'), s = st.cfg?.settings || {};
  const text = pick(s.announcement);
  el.hidden = !text; el.textContent = text;
  // Sistem dimatikan oleh admin: paparan penuh skrin yang hilang sendiri bila sistem dihidupkan semula.
  const on = !!s.maintenance;
  $('#maint').hidden = !on;
  document.body.style.overflow = on ? 'hidden' : '';
  if (on) $('#maintM').textContent = pick(s.maintenanceMsg) || t('maint_default');
}
function renderPlatforms() {
  if (!st.cfg) return;
  $('#platforms').innerHTML = st.cfg.platforms.filter((p) => p.enabled).map((p) => `<span class="pchip" data-id="${esc(p.id)}"><span class="ico">${platformIcon(p.icon)}</span>${esc(p.name)}</span>`).join('');
}
function renderFaq() {
  if (!st.cfg) return;
  const open = new Set($$('#faqList details[open]').map((d) => d.dataset.id));
  $('#faqList').innerHTML = st.cfg.faq.map((f) => `<details class="faq-i" data-id="${esc(f.id)}" ${open.has(f.id) ? 'open' : ''}><summary><img class="mk" src="assets/logo.svg" alt="" width="22" height="22"><span class="q">${esc(pick(f.q))}</span><span class="ico" data-ico="chevron"></span></summary><p>${esc(pick(f.a))}</p></details>`).join('');
  hydrateIcons($('#faqList'));
}

/* ---------- Pengesahan: daftar → log masuk (e-mel + kata laluan sahaja) ---------- */
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function errKey(e) {
  const c = e.code || '';
  if (c === 'auth/email-already-in-use') return 'err_used';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(c)) return 'err_cred';
  if (c === 'auth/user-not-found') return 'err_nouser';
  if (c === 'auth/too-many-requests') return 'err_many';
  if (c === 'auth/network-request-failed') return 'err_net';
  if (c === 'auth/weak-password') return 'err_pw_short';
  if (c === 'auth/invalid-email') return 'err_email';
  if (c === 'app/username-taken') return 'err_user_taken';
  return 'err_generic';
}
const say = (id, key, kind = 'err', vars) => { const el = $(id); el.textContent = key ? t(key, vars) : ''; el.className = 'msgline ' + (key ? kind : ''); };
let hasAccount = false;
try { hasAccount = !!localStorage.getItem('fetchrbox:hasAccount'); } catch { /* abaikan */ }

function showView(view) {
  $$('#authBox form').forEach((f) => { f.hidden = f.dataset.view !== view; });
  const tab = view === 'register' ? 'register' : 'login';
  $$('#authBox .tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('#authBox .tabs').hidden = view === 'forgot';
}
$$('#authBox .tabs button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.tab)));
$('#toForgot').addEventListener('click', () => { $('#fgEmail').value = $('#logEmail').value; say('#fgMsg', ''); showView('forgot'); });
$('#backLogin').addEventListener('click', () => showView('login'));
showView(hasAccount ? 'login' : 'register');

function busy(btn, on) {
  btn.disabled = on;
  const tt = btn.querySelector('.t');
  if (on) { btn.dataset.html = tt.innerHTML; tt.innerHTML = '<span class="spin"></span>'; } else if (btn.dataset.html) tt.innerHTML = btn.dataset.html;
}

$('#regForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#regUser').value.trim().toLowerCase(), email = $('#regEmail').value.trim(), pw = $('#regPw').value, pw2 = $('#regPw2').value, btn = e.submitter || $('#regForm button[type=submit]');
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return fail('#regMsg', 'err_user');
  if (!emailOk(email)) return fail('#regMsg', 'err_email');
  if (pw.length < 6) return fail('#regMsg', 'err_pw_short');
  if (pw !== pw2) return fail('#regMsg', 'err_pw_mismatch');
  say('#regMsg', ''); busy(btn, true); st.registering = true;
  try {
    if (!(await fb.usernameFree(username))) { st.registering = false; busy(btn, false); return fail('#regMsg', 'err_user_taken'); }
    await fb.register(email, pw, getLang(), username);
    try { localStorage.setItem('fetchrbox:hasAccount', '1'); } catch { /* abaikan */ }
    $('#regForm').reset(); $('#logEmail').value = email; $('#logPw').value = '';
    showView('login'); say('#logMsg', 'reg_ok', 'ok'); sfx.success(); $('#logPw').focus();
  } catch (ex) { fail('#regMsg', errKey(ex)); }
  finally { st.registering = false; busy(btn, false); }
});
function fail(id, key) { say(id, key); sfx.error(); }

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#logEmail').value.trim(), pw = $('#logPw').value, btn = e.submitter || $('#loginForm button[type=submit]');
  if (!emailOk(email) || !pw) return fail('#logMsg', !emailOk(email) ? 'err_email' : 'err_cred');
  say('#logMsg', ''); busy(btn, true);
  try { await fb.login(email, pw); sfx.success(); $('#loginForm').reset(); try { localStorage.setItem('fetchrbox:hasAccount', '1'); } catch { /* abaikan */ } }
  catch (ex) { fail('#logMsg', errKey(ex)); }
  finally { busy(btn, false); }
});

$('#forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#fgEmail').value.trim(), btn = e.submitter || $('#forgotForm button[type=submit]');
  if (!emailOk(email)) return fail('#fgMsg', 'err_email');
  say('#fgMsg', ''); busy(btn, true);
  try { await fb.resetPassword(email); say('#fgMsg', 'reset_sent', 'ok', { email }); sfx.success(); }
  catch (ex) { fail('#fgMsg', errKey(ex)); }
  finally { busy(btn, false); }
});

$('#logoutBtn').addEventListener('click', () => fb.logout());

let stopProfile = null, stopReq = null, stopDl = null, requests = [], downloads = [], nRecent = 0, ptab = 'dl';

/* ---------- Permohonan kelulusan admin untuk kandungan berhak cipta ---------- */
async function approval() { return st.approval ? { id: st.approval, token: await fb.idToken() } : null; }
function applyTab() {
  $$('[data-ptab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ptab === ptab)));
  $('#dlList').hidden = !(ptab === 'dl' && nRecent > 0);
  $('#ttEmpty').hidden = !(ptab === 'dl' && nRecent === 0);
  $('#reqList').hidden = !(ptab === 'req' && requests.length > 0);
  $('#reqEmpty').hidden = !(ptab === 'req' && requests.length === 0);
}
$$('[data-ptab]').forEach((b) => b.addEventListener('click', () => { ptab = b.dataset.ptab; applyTab(); sfx.pop(); }));
function paintRequests() {
  const pending = requests.filter((r) => r.status === 'pending').length;
  $('#reqCnt').hidden = pending === 0; $('#reqCnt').textContent = String(pending);
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  $('#reqList').innerHTML = requests.map((r) => {
    const s = ['approved', 'rejected'].includes(r.status) ? r.status : 'pending';
    return `<li class="dl-row req-row"><span class="fmt s-${s}">${esc(t('req_' + s))}</span><span class="ttl">${esc(r.title || r.url)}</span><span class="when">${esc([host(r.url), r.adminNote ? t('req_note') + ': ' + r.adminNote : ''].filter(Boolean).join(' · '))}</span>${s === 'approved' ? `<button type="button" class="btn gold sm rq-dl" data-rq="${esc(r.id)}"><span class="ico" data-ico="download"></span><span class="t">${esc(t('req_dl'))}</span></button>` : ''}</li>`;
  }).join('');
  hydrateIcons($('#reqList'));
  applyTab();
}
document.addEventListener('langchange', paintRequests);
$('#reqList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rq]');
  const r = b && requests.find((x) => x.id === b.dataset.rq);
  if (!r || r.status !== 'approved') return;
  // Muat turun kandungan yang telah dibenarkan admin: isi pautan, tanda pengakuan dan imbas semula.
  st.approval = r.id; location.hash = '';
  $('#url').value = r.url; $('#decl').checked = true; detect();
  sfx.pop(); setTimeout(() => $('#form').requestSubmit(), 350);
});

/** Borang permohonan kelulusan selepas pautan ditolak atas sebab hak cipta. */
function openRequest(err) {
  const d = err.data || {};
  const dup = requests.find((r) => r.url === d.url && ['pending', 'approved'].includes(r.status));
  if (dup) { toast(t('req_dup')); sfx.error(); return; }
  const f = document.createElement('form'); f.noValidate = true;
  f.innerHTML = `<div class="f"><label for="rqMsg" class="sr">${esc(t('req_title'))}</label><textarea id="rqMsg" maxlength="300" rows="4" placeholder="${esc(t('req_ph'))}"></textarea></div><p class="msgline" id="rqErr" role="alert"></p>`;
  f.addEventListener('submit', (e) => e.preventDefault());
  const close = modal({
    icon: 'shield', title: t('req_title'), text: t('req_hint'), body: f,
    actions: [{ label: t('req_send'), cls: 'gold', keep: true, onClick: async () => {
      const message = $('#rqMsg', f).value.trim();
      if (message.length < 5) { say('#rqErr', 'req_short'); sfx.error(); return; }
      try {
        await fb.createRequest({ uid: st.user.uid, email: st.user.email, username: profile.username || (st.user.email || '').split('@')[0], url: d.url || '', title: String(d.title || '').slice(0, 200), platform: d.platform || '', code: String(err.code || '').replace('copyright_', ''), message });
        close(); toast(t('req_sent')); sfx.success();
      } catch { say('#rqErr', 'req_err'); sfx.error(); }
    } }],
  });
}

fb.onUser((user) => {
  if (st.registering) return; // abaikan log masuk sementara semasa pendaftaran
  st.user = user;
  $('#authBox').hidden = !!user;
  $('#dlBox').hidden = !user;
  $('#navProfile').hidden = !user;
  notifyApi.setUser(user);
  if (chatApi) chatApi.setUser(user);
  if (stopProfile) { stopProfile(); stopProfile = null; }
  if (stopReq) { stopReq(); stopReq = null; }
  if (stopDl) { stopDl(); stopDl = null; }
  requests = []; paintRequests(); downloads = [];
  if (user) {
    paintProfile({});
    fb.ensureProfile(user, getLang());
    stopProfile = fb.watchProfile(user.uid, paintProfile);
    stopReq = fb.watchMyRequests(user.uid, (r) => { requests = r; paintRequests(); });
    stopDl = fb.watchDownloads(user.uid, (l) => { downloads = l; paintDownloads(); });
  } else {
    hideResult(); $('#url').value = ''; $('#detected').textContent = '';
    $$('.pchip').forEach((c) => c.classList.toggle('on', false));
    paintProfile({});
  }
  route();
});

/* ---------- Profil: gambar, e-mel, jumlah berjaya (masa nyata) ---------- */
const nf = (n) => Number(n || 0).toLocaleString('en-US');
let profile = {};
function paintProfile(d) {
  profile = d;
  const email = st.user?.email || '';
  const username = d.username || (email.split('@')[0] || 'pengguna').toLowerCase();
  $('#profh').textContent = '@' + username;
  $('#pfEmail').textContent = email;
  $('#avatarInit').textContent = username.charAt(0).toUpperCase();
  const bio = (d.bio || '').trim();
  $('#bioText').textContent = bio || t('prof_bio_empty'); $('#bioText').hidden = !bio && !!d.link;
  $('#bioText').classList.toggle('muted', !bio);
  const lk = cleanLink(d.link), a = $('#bioLink');
  a.hidden = !lk; if (lk) { a.href = lk; $('#bioLinkTxt').textContent = lk.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); }
  if ($('#pedit') && !$('#pedit').hidden) paintEditAvatar();
  paintDownloads();
  const img = $('#avatarImg');
  if (d.photo) { img.src = d.photo; img.hidden = false; $('#avatarInit').hidden = true; } else { img.hidden = true; $('#avatarInit').hidden = false; }
}
/* Semua muat turun pengguna (MP4, MP3, MOV, WAV dan lain-lain) dari users/{uid}/downloads, masa nyata */
const LKEY = () => 'fbx_dl_' + (st.user?.uid || '');
const localGet = () => { try { return JSON.parse(localStorage.getItem(LKEY()) || '[]'); } catch { return []; } };
const localAdd = (rec) => { try { localStorage.setItem(LKEY(), JSON.stringify([{ ...rec, id: 'l' + Date.now(), at: Date.now() }, ...localGet()].slice(0, 200))); } catch { /* abaikan */ } };
const tms = (v) => (v?.toMillis ? v.toMillis() : v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : Date.now());
function paintDownloads() {
  const list = [...downloads, ...(st.user ? localGet() : [])].sort((a, b) => tms(b.at) - tms(a.at)).slice(0, 200), fmts = list.map((r) => String(r.format || '').toLowerCase());
  const count = (f) => fmts.filter((x) => x === f).length;
  const mp4 = count('mp4'), mp3 = count('mp3'), wav = count('wav'), other = list.length - mp4 - mp3 - wav;
  $('#stTotal').textContent = nf(list.length);
  $('#stWav').textContent = nf(wav); $('#stWavBox').hidden = wav === 0;
  $('#stMp4').textContent = nf(mp4); $('#stMp3').textContent = nf(mp3);
  $('#stOther').textContent = nf(other); $('#stOtherBox').hidden = other === 0;
  const when = (v) => { try { const dt = v?.toDate ? v.toDate() : v ? new Date(v) : new Date(); return new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar' : getLang() === 'en' ? 'en-GB' : 'ms-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' }).format(dt); } catch { return ''; } };
  $('#dlList').innerHTML = list.map((r, i) => {
    const fmt = fmts[i];
    return `<li class="dl-row"><span class="fmt f-${esc(fmt)}">${esc(fmt.toUpperCase())}</span><span class="ttl">${esc(r.title || '')}</span><span class="when">${esc([r.platform, when(r.at)].filter(Boolean).join(' · '))}</span></li>`;
  }).join('');
  nRecent = list.length; applyTab();
}
document.addEventListener('langchange', () => paintProfile(profile));

/* ---------- Edit profil: gambar (pangkas semula / tukar), bio dan satu pautan ---------- */
const cleanLink = (v) => {
  v = String(v || '').trim(); if (!v) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || /\s/.test(v) || v.length > 200) return null; return u.href; } catch { return null; }
};
// Simpan gambar asal (kecil sedikit) supaya pengguna boleh pangkas bahagian lain tanpa pilih gambar baru
function shrinkOriginal(file, max = 960) {
  return new Promise((resolve, reject) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      let q = 0.82, out = c.toDataURL('image/jpeg', q);
      while (out.length > 240000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      out.length > 240000 ? reject(new Error('big')) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('img')); };
    img.src = u;
  });
}
function paintEditAvatar() {
  const img = $('#peImg'), has = !!profile.photo;
  img.hidden = !has; if (has) img.src = profile.photo;
  $('#peInit').hidden = has; $('#peInit').textContent = $('#avatarInit').textContent;
  $('#peCrop').disabled = !(profile.photoSrc || profile.photo);
}
const editOpen = (on) => {
  const box = $('#pedit');
  if (on) { $('#peBio').value = (profile.bio || '').trim(); $('#peLink').value = profile.link || ''; say('#peMsg', ''); paintEditAvatar(); box.hidden = false; document.body.style.overflow = 'hidden'; sfx.open(); $('#peBio').focus(); }
  else { box.hidden = true; document.body.style.overflow = ''; }
};
$('#editProfile').addEventListener('click', () => editOpen(true));
$('#peCancel').addEventListener('click', () => editOpen(false));
$('#pedit').addEventListener('click', (e) => { if (e.target.id === 'pedit') editOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#pedit').hidden && !document.querySelector('.crop:not(.pedit)')) editOpen(false); });
$('#peForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!st.user) return;
  const link = cleanLink($('#peLink').value);
  if (link === null) { say('#peMsg', 'pe_link_bad'); sfx.error(); return; }
  try { await fb.saveProfileInfo(st.user.uid, $('#peBio').value.trim(), link); sfx.success(); editOpen(false); }
  catch { say('#peMsg', 'prof_err'); sfx.error(); }
});
$('#navChat').addEventListener('click', () => $('#fab').click());
// Edit gambar sedia ada: pangkas bahagian lain tanpa pilih gambar baru
$('#peCrop').addEventListener('click', async () => {
  const src = profile.photoSrc || profile.photo;
  if (!src || !st.user) return;
  say('#peMsg', '');
  try { const cropped = await openCropper(src); if (cropped) { await fb.savePhoto(st.user.uid, cropped); paintEditAvatar(); } }
  catch { say('#peMsg', 'prof_err'); sfx.error(); }
});
$('#peChange').addEventListener('click', () => $('#photoInput').click());
$('#photoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file || !st.user) return;
  say('#peMsg', '');
  if (!file.type.startsWith('image/')) { say('#peMsg', 'prof_err'); sfx.error(); return; }
  try {
    // Pengguna memilih bahagian gambar (muka, badan dan sebagainya) dengan menyeret dan zum, kemudian tekan Selesai.
    const cropped = await openCropper(file);
    if (!cropped) return; // dibatalkan
    await fb.savePhoto(st.user.uid, cropped, await shrinkOriginal(file));
    paintEditAvatar();
  } catch { say('#peMsg', 'prof_err'); sfx.error(); }
});

/* ---------- Kesan platform ketika menaip ---------- */
function hostOf(v) { try { return new URL(v.match(/https?:\/\/\S+/)?.[0] || '').hostname.toLowerCase(); } catch { return ''; } }
function detect() {
  if (!st.cfg) return;
  const v = ($('#url').value || '').trim();
  const host = hostOf(v);
  const p = host && st.cfg.platforms.find((x) => x.domains.some((d) => host === d || host.endsWith('.' + d)));
  $$('.pchip').forEach((c) => c.classList.toggle('on', !!p && c.dataset.id === p.id));
  const d = $('#detected');
  if (!v) d.textContent = '';
  else if (!host) d.textContent = t('det_bad');
  else if (!p) d.textContent = t('det_unsupported');
  else if (!p.enabled) d.textContent = t('det_off', { name: p.name });
  else d.innerHTML = t('det_ok', { name: esc(p.name) });
}
$('#url').addEventListener('input', () => { st.approval = null; detect(); }); // menaip semula = kelulusan tidak terpakai lagi
$('#pasteBtn').addEventListener('click', async () => {
  try {
    const v = await navigator.clipboard.readText();
    if (v) { $('#url').value = v.trim(); detect(); sfx.pop(); if (/https?:\/\//.test(v)) $('#form').requestSubmit(); }
  } catch { toast(t('paste_fail')); $('#url').focus(); }
});

/* ---------- Semak pautan ---------- */
$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (st.busy || !st.user) return;
  const url = $('#url').value.trim();
  if (!url) { toast(t('empty_url')); sfx.error(); $('#url').focus(); return; }
  if (!needDecl()) return;
  setBusy($('#checkBtn'), true, t('checking'));
  hideResult();
  try { st.info = await api.info(url, await approval()); sfx.pop(); renderResult(st.info); }
  catch (err) { failModal(err); }
  finally { setBusy($('#checkBtn'), false, t('btn_check')); }
});
function setBusy(btn, on, label) {
  st.busy = on; btn.disabled = on;
  const ico = btn.querySelector('.ico'), tt = btn.querySelector('.t');
  if (on) { btn.dataset.ico = ico.innerHTML; ico.innerHTML = '<span class="spin"></span>'; tt.removeAttribute('data-i18n'); }
  else { if (btn.dataset.ico) ico.innerHTML = btn.dataset.ico; }
  tt.textContent = label;
  if (!on) { tt.dataset.i18n = btn.id === 'goBtn' ? 'btn_download' : 'btn_check'; }
}
/** Pengakuan hak cipta wajib ditandakan sebelum mengimbas atau memuat turun. */
function needDecl() {
  const box = $('#decl');
  if (box.checked) return true;
  const lab = $('#declBox');
  lab.classList.add('shake'); setTimeout(() => lab.classList.toggle('shake', false), 600);
  toast(t('cr_need_decl')); sfx.error(); box.focus();
  return false;
}
function failModal(err) {
  if (String(err.code || '').startsWith('copyright_')) {
    const key = 'cr_' + err.code.slice('copyright_'.length);
    return modal({ icon: 'shield', err: true, title: t('cr_title'), text: t(key) === key ? err.message : t(key), actions: [{ label: t('cr_apply'), cls: 'gold', keep: true, onClick: () => openRequest(err) }, { label: t('chat_wa'), cls: 'ghost', href: 'https://wa.me/60177977935?text=' + encodeURIComponent(t('wa_text')), external: true }] });
  }
  if (err.offline) modal({ icon: 'alert', err: true, title: t('m_off_title'), text: t('m_off_text') });
  else modal({ icon: 'alert', err: true, title: t('m_fail_title'), text: err.message });
}

/* ---------- Kad hasil ---------- */
function hideResult() { $('#result').classList.remove('show'); }
function renderMeta(info) {
  $('#title').textContent = info.title;
  $('#metaLine').innerHTML = [esc(info.platform.name), info.uploader && esc(info.uploader), info.duration && fmtTime(info.duration)].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
}
function renderResult(info) {
  renderMeta(info);
  $('#thumb').src = info.thumbnail || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  st.mode = 'video'; buildChoices();
  const r = $('#result');
  r.classList.add('show'); $('#progress').classList.remove('show');
  if (!reduced) r.animate([{ opacity: 0, transform: 'translate3d(0,40px,0) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.32,.72,0,1)' });
  r.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
}
const chip = (group, value, label, checked, disabled) => `<label class="chip"><input type="radio" name="${group}" value="${value}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`;
function buildChoices(keep) {
  $('#modeVideo').setAttribute('aria-pressed', st.mode === 'video'); $('#modeAudio').setAttribute('aria-pressed', st.mode === 'audio');
  const list = st.mode === 'video' ? VIDEO : AUDIO;
  if (!keep || !list.includes(st.format)) st.format = list[0];
  if (!keep) st.quality = 'best';
  $('#formats').innerHTML = list.map((f) => chip('format', f, f.toUpperCase(), f === st.format)).join('');
  $('#qualityWrap').hidden = st.mode === 'audio';
  const max = st.info?.maxHeight || 0;
  $('#qualities').innerHTML = QUALITIES.map(([q, l]) => chip('quality', q, l || t('q_best'), q === st.quality, q !== 'best' && max && Number(q) > max + 8)).join('');
}
$('#modeVideo').addEventListener('click', () => { st.mode = 'video'; buildChoices(); });
$('#modeAudio').addEventListener('click', () => { st.mode = 'audio'; buildChoices(); });
$('#formats').addEventListener('change', (e) => { st.format = e.target.value; sfx.pop(); });
$('#qualities').addEventListener('change', (e) => { st.quality = e.target.value; sfx.pop(); });

/* ---------- Muat turun ---------- */
$('#goBtn').addEventListener('click', async () => {
  if (st.busy || !st.info || !st.user) return;
  if (!needDecl()) return;
  const btn = $('#goBtn');
  setBusy(btn, true, t('preparing'));
  $('#progress').classList.add('show'); setProgress(0, 'preparing');
  try {
    const { id } = await api.startJob(st.info.url, st.format, st.mode === 'audio' ? 'best' : st.quality, await approval());
    for (;;) {
      await new Promise((r) => setTimeout(r, 800));
      const j = await api.job(id);
      if (j.status === 'error') throw new Error(j.error || t('err_generic'));
      setProgress(j.progress, j.phase === 'process' ? 'processing' : 'downloading');
      if (j.status === 'done') { done(id, j.name); break; }
    }
  } catch (err) { $('#progress').classList.remove('show'); failModal(err); }
  finally { setBusy(btn, false, t('btn_download')); }
});
function setProgress(p, phase) {
  st.pct = p; st.phase = phase;
  $('#barFill').style.transform = `scaleX(${Math.max(0.03, p / 100)})`;
  $('#progLabel').textContent = t(phase === 'finished' ? 'finished' : phase);
  $('#progPct').textContent = Math.round(p) + '%';
}
function done(id, name) {
  setProgress(100, 'finished');
  const href = DEMO ? '#' : fileUrl(id);
  if (!DEMO) { const a = document.createElement('a'); a.href = href; a.download = name || ''; document.body.append(a); a.click(); a.remove(); }
  if (!DEMO && st.user) { const ext = (String(name || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1] || st.format; const rec = { title: st.info?.title || String(name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), format: ext, platform: st.info?.platform?.name || st.info?.platform?.id || '' }; fb.addDownload(st.user.uid, rec).catch(() => { localAdd(rec); paintDownloads(); }); }
  sfx.success();
  setTimeout(() => modal({
    icon: 'check', title: t('m_done_title'), text: isIOS ? t('m_done_ios') : t('m_done_text'),
    actions: [{ label: DEMO ? t('m_demo') : t('m_again'), href, cls: 'gold', keep: true }, { label: t('m_other'), cls: 'ghost', onClick: () => { hideResult(); $('#url').value = ''; detect(); $('#url').focus(); } }],
  }), 350);
}

route();

/* ---------- Statistik kecil di footer (masa nyata, waktu Malaysia, reset pukul 12 malam) ---------- */
let pub = {};
const myt = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date()); // YYYY-MM-DD
function paintStats() {
  const days = pub.days || {}, today = myt(), month = today.slice(0, 7);
  const todayN = days[today] || 0;
  const monthN = Object.entries(days).reduce((a, [k, v]) => (k.startsWith(month) ? a + (v || 0) : a), 0);
  const total = pub.total ?? Object.values(days).reduce((a, v) => a + (v || 0), 0);
  $('#footStats').textContent = [`${t('stat_today')} ${nf(todayN)}`, `${t('stat_month')} ${nf(monthN)}`, `${t('stat_total')} ${nf(total)}`].join(' · ');
}
fb.watchPublicStats((d) => { pub = d; paintStats(); });
setInterval(paintStats, 30000); // bertukar tepat pada tengah malam
document.addEventListener('langchange', paintStats);
paintStats();

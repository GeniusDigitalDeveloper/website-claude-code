import { api, fileUrl, DEMO } from './api.js';
import { fb } from './firebase.js';
import { platformIcon } from './icons.js';
import { sfx } from './sfx.js';
import { t, pick, getLang, setLang, applyI18n } from './i18n.js';
import { $, $$, esc, hydrateIcons, setupReveal, toast, modal, reduced } from './ui.js';
import { initChat } from './chat.js';

const VIDEO = ['mp4', 'mov', 'mkv'];
const AUDIO = ['mp3', 'm4a', 'wav', 'flac'];
const QUALITIES = [['best', null], ['2160', '4K'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']];
const st = { cfg: null, user: null, info: null, mode: 'video', format: 'mp4', quality: 'best', busy: false, registering: false, phase: 'preparing', pct: 0 };

const fmtTime = (s) => { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

hydrateIcons();
applyI18n();
setupReveal();

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
  if (!chatApi) chatApi = initChat(() => st.cfg.faq, { onInsertUrl });
});
function onInsertUrl(u) {
  if (!st.user) { toast(t('login_first')); return; }
  $('#url').value = u; $('#url').focus(); $('#url').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); detect();
}
function paintAnnounce() {
  const el = $('#announce'), s = st.cfg?.settings || {};
  const text = s.maintenance ? t('maint') : pick(s.announcement) || (DEMO ? t('demo_banner') : '');
  el.hidden = !text; el.textContent = text;
}
function renderPlatforms() {
  if (!st.cfg) return;
  $('#platforms').innerHTML = st.cfg.platforms.filter((p) => p.enabled).map((p) => `<span class="pchip" data-id="${esc(p.id)}"><span class="ico">${platformIcon(p.icon)}</span>${esc(p.name)}</span>`).join('');
}
function renderFaq() {
  if (!st.cfg) return;
  const open = new Set($$('#faqList details[open]').map((d) => d.dataset.id));
  $('#faqList').innerHTML = st.cfg.faq.map((f, i) => `<details class="glass reveal in" data-id="${esc(f.id)}" ${open.has(f.id) ? 'open' : ''} style="--d:${i * 0.04}s"><summary>${esc(pick(f.q))}<span class="ico" data-ico="chevron"></span></summary><p>${esc(pick(f.a))}</p></details>`).join('');
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
  const email = $('#regEmail').value.trim(), pw = $('#regPw').value, pw2 = $('#regPw2').value, btn = e.submitter || $('#regForm button[type=submit]');
  if (!emailOk(email)) return fail('#regMsg', 'err_email');
  if (pw.length < 6) return fail('#regMsg', 'err_pw_short');
  if (pw !== pw2) return fail('#regMsg', 'err_pw_mismatch');
  say('#regMsg', ''); busy(btn, true); st.registering = true;
  try {
    await fb.register(email, pw, getLang());
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

fb.onUser((user) => {
  if (st.registering) return; // abaikan log masuk sementara semasa pendaftaran
  st.user = user;
  $('#authBox').hidden = !!user;
  $('#dlBox').hidden = !user;
  $('#userEmail').textContent = user ? user.email : '';
  if (!user) { hideResult(); $('#url').value = ''; $('#detected').textContent = ''; }
});

/* ---------- Kesan platform ketika menaip ---------- */
const hostOf = (v) => { try { return new URL(v.match(/https?:\/\/\S+/)?.[0] || '').hostname.toLowerCase(); } catch { return ''; } };
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
$('#url').addEventListener('input', detect);
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
  setBusy($('#checkBtn'), true, t('checking'));
  hideResult();
  try { st.info = await api.info(url); sfx.pop(); renderResult(st.info); }
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
function failModal(err) {
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
  const btn = $('#goBtn');
  setBusy(btn, true, t('preparing'));
  $('#progress').classList.add('show'); setProgress(0, 'preparing');
  try {
    const { id } = await api.startJob(st.info.url, st.format, st.mode === 'audio' ? 'best' : st.quality);
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
  sfx.success();
  setTimeout(() => modal({
    icon: 'check', title: t('m_done_title'), text: isIOS ? t('m_done_ios') : t('m_done_text'),
    actions: [{ label: DEMO ? t('m_demo') : t('m_again'), href, cls: 'gold', keep: true }, { label: t('m_other'), cls: 'ghost', onClick: () => { hideResult(); $('#url').value = ''; detect(); $('#url').focus(); } }],
  }), 350);
}

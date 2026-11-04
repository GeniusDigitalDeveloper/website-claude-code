import { api, fileUrl, DEMO } from './api.js';
import { platformIcon } from './icons.js';
import { sfx } from './sfx.js';
import { $, $$, esc, hydrateIcons, setupReveal, setupSound, toast, modal, reduced } from './ui.js';
import { initChat } from './chat.js';

const VIDEO = ['mp4', 'mov', 'mkv'];
const AUDIO = ['mp3', 'm4a', 'wav', 'flac'];
const QUALITY_LABEL = [['best', 'Terbaik'], ['2160', '4K'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']];
const st = { cfg: null, info: null, mode: 'video', format: 'mp4', quality: 'best', busy: false };

const fmtTime = (s) => { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

hydrateIcons();
setupSound($('#soundBtn'));
setupReveal();

/* ---------- Konfigurasi dari pelayan (platform, FAQ, pengumuman) ---------- */
async function loadConfig() {
  try { st.cfg = await api.config(); }
  catch (e) {
    st.cfg = { platforms: [
      { id: 'youtube', name: 'YouTube', icon: 'youtube', enabled: true, domains: ['youtube.com', 'youtu.be'] },
      { id: 'tiktok', name: 'TikTok', icon: 'tiktok', enabled: true, domains: ['tiktok.com'] },
      { id: 'instagram', name: 'Instagram', icon: 'instagram', enabled: true, domains: ['instagram.com'] },
      { id: 'facebook', name: 'Facebook', icon: 'facebook', enabled: true, domains: ['facebook.com', 'fb.watch'] },
    ], faq: null, settings: {}, offline: true };
  }
  if (!st.cfg.faq) { try { st.cfg.faq = (await (await fetch('assets/defaults.json')).json()).faq; } catch { st.cfg.faq = []; } }
  renderPlatforms(); renderFaq(); detect();
  const a = st.cfg.settings?.announcement;
  if (a || st.cfg.settings?.maintenance) { const el = $('#announce'); el.hidden = false; el.textContent = st.cfg.settings.maintenance ? 'Sistem dalam penyelenggaraan. Cuba lagi sebentar lagi.' : a; }
  initChat(st.cfg.faq, { onInsertUrl: (u) => { $('#url').value = u; $('#url').focus(); $('#url').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); detect(); } });
}

function renderPlatforms() {
  $('#platforms').innerHTML = st.cfg.platforms.filter((p) => p.enabled).map((p) => `<span class="pchip" data-id="${esc(p.id)}"><span class="ico">${platformIcon(p.icon)}</span>${esc(p.name)}</span>`).join('');
}
function renderFaq() {
  $('#faqList').innerHTML = st.cfg.faq.map((f, i) => `<details class="glass reveal in" style="--d:${i * 0.04}s"><summary>${esc(f.q)}<span class="ico" data-ico="chevron"></span></summary><p>${esc(f.a)}</p></details>`).join('');
  hydrateIcons($('#faqList'));
}

/* ---------- Kesan platform ketika menaip ---------- */
const hostOf = (v) => { try { return new URL(v.match(/https?:\/\/\S+/)?.[0] || '').hostname.toLowerCase(); } catch { return ''; } };
function detect() {
  if (!st.cfg) return;
  const v = $('#url').value.trim();
  const host = hostOf(v);
  const p = host && st.cfg?.platforms.find((x) => x.domains.some((d) => host === d || host.endsWith('.' + d)));
  $$('.pchip').forEach((c) => c.classList.toggle('on', !!p && c.dataset.id === p.id));
  const d = $('#detected');
  if (!v) d.textContent = '';
  else if (!host) d.textContent = 'Tampal pautan penuh yang bermula dengan https://';
  else if (!p) d.textContent = 'Platform ini belum disokong.';
  else if (!p.enabled) d.textContent = `${p.name} dimatikan buat sementara.`;
  else d.innerHTML = `Dikesan: <b>${esc(p.name)}</b>`;
}
$('#url').addEventListener('input', detect);

$('#pasteBtn').addEventListener('click', async () => {
  try {
    const t = await navigator.clipboard.readText();
    if (t) { $('#url').value = t.trim(); detect(); sfx.pop(); if (/https?:\/\//.test(t)) $('#form').requestSubmit(); }
  } catch { toast('Tekan lama pada kotak untuk Tampal.'); $('#url').focus(); }
});

/* ---------- Semak pautan ---------- */
$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (st.busy) return;
  const url = $('#url').value.trim();
  if (!url) { toast('Tampal pautan video dahulu.'); sfx.error(); $('#url').focus(); return; }
  setBusy($('#checkBtn'), true, 'Menyemak…');
  hideResult();
  try {
    const info = await api.info(url);
    st.info = info; sfx.pop();
    renderResult(info);
  } catch (err) { fail(err); }
  finally { setBusy($('#checkBtn'), false, 'Semak'); }
});

function setBusy(btn, on, label) {
  st.busy = on; btn.disabled = on;
  const ico = btn.querySelector('.ico'), t = btn.querySelector('.t');
  if (on) { btn.dataset.ico = ico.innerHTML; ico.innerHTML = '<span class="spin"></span>'; }
  else if (btn.dataset.ico) ico.innerHTML = btn.dataset.ico;
  t.textContent = label;
}
function fail(err) {
  if (err.offline) modal({ icon: 'alert', err: true, title: 'Pelayan belum bersambung', text: 'Zamrud tidak dapat menghubungi pelayan muat turun. Cuba lagi sebentar, atau hubungi admin.' });
  else modal({ icon: 'alert', err: true, title: 'Tidak berjaya', text: err.message });
}

/* ---------- Kad hasil ---------- */
function hideResult() { $('#result').classList.remove('show'); }
function renderResult(info) {
  $('#title').textContent = info.title;
  $('#metaLine').innerHTML = [esc(info.platform.name), info.uploader && esc(info.uploader), info.duration && fmtTime(info.duration)].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
  const img = $('#thumb');
  img.src = info.thumbnail || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  setMode('video');
  const r = $('#result');
  r.classList.add('show');
  $('#progress').classList.remove('show');
  if (!reduced) r.animate([{ opacity: 0, transform: 'translate3d(0,40px,0) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.32,.72,0,1)' });
  r.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
}
function chip(group, value, label, checked, disabled) {
  return `<label class="chip"><input type="radio" name="${group}" value="${value}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`;
}
function setMode(mode) {
  st.mode = mode;
  $('#modeVideo').setAttribute('aria-pressed', mode === 'video');
  $('#modeAudio').setAttribute('aria-pressed', mode === 'audio');
  const list = mode === 'video' ? VIDEO : AUDIO;
  st.format = list[0];
  $('#formats').innerHTML = list.map((f, i) => chip('format', f, f.toUpperCase(), i === 0)).join('');
  $('#qualityWrap').hidden = mode === 'audio';
  const max = st.info?.maxHeight || 0;
  st.quality = 'best';
  $('#qualities').innerHTML = QUALITY_LABEL.map(([q, l]) => chip('quality', q, l, q === 'best', q !== 'best' && max && Number(q) > max + 8)).join('');
}
$('#modeVideo').addEventListener('click', () => setMode('video'));
$('#modeAudio').addEventListener('click', () => setMode('audio'));
$('#formats').addEventListener('change', (e) => { st.format = e.target.value; sfx.pop(); });
$('#qualities').addEventListener('change', (e) => { st.quality = e.target.value; sfx.pop(); });

/* ---------- Muat turun ---------- */
$('#goBtn').addEventListener('click', async () => {
  if (st.busy || !st.info) return;
  const btn = $('#goBtn');
  setBusy(btn, true, 'Menyediakan…');
  const prog = $('#progress'); prog.classList.add('show');
  setProgress(0, 'Menyediakan…');
  try {
    const { id } = await api.startJob(st.info.url, st.format, st.mode === 'audio' ? 'best' : st.quality);
    for (;;) {
      await new Promise((r) => setTimeout(r, 800));
      const j = await api.job(id);
      if (j.status === 'error') throw new Error(j.error || 'Muat turun gagal.');
      setProgress(j.progress, j.phase === 'process' ? 'Memproses fail…' : 'Memuat turun…');
      if (j.status === 'done') { done(id, j.name); break; }
    }
  } catch (err) { prog.classList.remove('show'); fail(err); }
  finally { setBusy(btn, false, 'Muat Turun'); }
});
function setProgress(p, label) {
  $('#barFill').style.transform = `scaleX(${Math.max(0.03, p / 100)})`;
  $('#progLabel').textContent = label; $('#progPct').textContent = Math.round(p) + '%';
}
function done(id, name) {
  setProgress(100, 'Siap');
  const href = DEMO ? '#' : fileUrl(id);
  if (!DEMO) {
    const a = document.createElement('a'); a.href = href; a.download = name || ''; document.body.append(a); a.click(); a.remove();
  }
  sfx.success();
  setTimeout(() => modal({
    icon: 'check', title: 'Siap! Fail anda dimuat turun',
    text: isIOS ? 'Di iPhone/iPad: tekan ikon anak panah muat turun di Safari, pilih fail, kemudian Share > Save Video untuk simpan ke Photos.' : 'Semak folder Downloads anda. Tak muncul? Tekan butang di bawah.',
    actions: [{ label: DEMO ? 'Mod demo' : 'Muat turun semula', href, cls: 'gold', keep: true }, { label: 'Muat turun lain', cls: 'ghost', onClick: () => { hideResult(); $('#url').value = ''; detect(); $('#url').focus(); } }],
  }), 350);
}

/* ---------- Mula ---------- */
document.addEventListener('DOMContentLoaded', () => {});
loadConfig();
if (DEMO) { const a = $('#announce'); a.hidden = false; a.textContent = 'Pratonton reka bentuk: muat turun sebenar aktif selepas pelayan disambung.'; }

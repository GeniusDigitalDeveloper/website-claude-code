// Panel admin: kelulusan kandungan berhak cipta. Admin putuskan Dibenarkan / Ditolak, pengguna dimaklumkan melalui notis peribadi.
import { fb } from './firebase.js';
import { sfx } from './sfx.js';
import { $, $$, esc, hydrateIcons, toast } from './ui.js';

const TZ = 'Asia/Kuala_Lumpur';
const LABEL = { pending: 'Menunggu', approved: 'Dibenarkan', rejected: 'Ditolak' };
const CODE = { music: 'muzik', media: 'filem/siri', restricted: 'terhad' };
let ctx = { getTab: () => '', getMe: () => ({}) };
let reqs = [], lastPending = -1, filter = 'pending';

export const initApprovals = (c) => { ctx = c; };
export function resetApprovals() { reqs = []; lastPending = -1; filter = 'pending'; }
const when = (ts) => { try { return ts?.toDate ? new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts.toDate()) : ''; } catch { return ''; } };
const pendingN = () => reqs.filter((r) => r.status === 'pending').length;

function badge() { const n = pendingN(), b = $('#reqBadge'); if (b) { b.hidden = n === 0; b.textContent = n > 9 ? '9+' : String(n); } return n; }

export function onRequests(list) {
  reqs = list;
  const n = badge();
  if (lastPending >= 0 && n > lastPending) sfx.msg();
  lastPending = n;
  if (ctx.getTab() === 'approvals') paintReq();
}

export function approvalsView() {
  return `<h1>Kelulusan <span class="live">LANGSUNG</span></h1><p class="sub2">Permohonan pengguna untuk memuat turun kandungan yang ditolak atas sebab hak cipta. Putuskan <b>Dibenarkan</b> atau <b>Ditolak</b>. Pengguna dimaklumkan serta-merta melalui notifikasi khas.</p>
  <div class="rq-filter" id="rqFilter" role="tablist"></div>
  <div class="list" id="rqList"></div>`;
}

function paintReq() {
  const f = $('#rqFilter'), list = $('#rqList');
  if (!f || !list) return;
  const count = (s) => (s === 'all' ? reqs.length : reqs.filter((r) => r.status === s).length);
  f.innerHTML = [['pending', 'Menunggu'], ['approved', 'Dibenarkan'], ['rejected', 'Ditolak'], ['all', 'Semua']]
    .map(([k, l]) => `<button type="button" role="tab" data-f="${k}" aria-selected="${filter === k}">${l} <em>${count(k)}</em></button>`).join('');
  const rows = reqs.filter((r) => filter === 'all' || r.status === filter);
  // Jangan padam catatan yang sedang ditaip semasa kemas kini masa nyata.
  const typing = Object.fromEntries($$('.rq-note', list).map((i) => [i.closest('[data-id]')?.dataset.id, i.value]));
  list.innerHTML = rows.length ? rows.map((r) => {
    const s = ['approved', 'rejected'].includes(r.status) ? r.status : 'pending';
    const note = typing[r.id] ?? r.adminNote ?? '';
    return `<div class="row-item glass rq" data-id="${esc(r.id)}">
      <div class="pi" data-ico="shield"></div>
      <div class="txt"><b>${esc(r.title || r.url)}</b>
        <small>@${esc(r.username || '')} · ${esc(r.email || '')} · ${esc(r.platform || '')} · jenis: ${esc(CODE[r.code] || r.code || '')} · ${esc(when(r.createdAt))}</small>
        <a class="rq-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>
        <p class="rq-msg">“${esc(r.message || '')}”</p>
        <input class="rq-note" maxlength="200" value="${esc(note)}" placeholder="Catatan untuk pengguna (pilihan)" aria-label="Catatan untuk pengguna">
      </div>
      <span class="rq-chip ${s}">${LABEL[s]}</span>
      <div class="acts rq-acts"><button class="btn gold sm" data-act="approved" ${s === 'approved' ? 'disabled' : ''}>Dibenarkan</button><button class="btn danger sm" data-act="rejected" ${s === 'rejected' ? 'disabled' : ''}>Ditolak</button></div>
    </div>`;
  }).join('') : '<p class="empty">Tiada permohonan dalam senarai ini.</p>';
  hydrateIcons(list);
}

/** Notis peribadi tiga bahasa untuk pengguna yang memohon. */
function notice(status, title, note) {
  const t = String(title || '').slice(0, 80), n = note ? note.trim() : '';
  if (status === 'approved') {
    return {
      title: { ms: 'Permohonan dibenarkan', en: 'Request approved', ar: 'تمت الموافقة على طلبك' },
      body: {
        ms: `Pautan "${t}" telah dibenarkan oleh admin. Sila ke Profil > Permohonan untuk memuat turun.${n ? ' Catatan: ' + n : ''}`,
        en: `Your link "${t}" has been approved by the admin. Go to Profile > Requests to download it.${n ? ' Note: ' + n : ''}`,
        ar: `وافق المشرف على الرابط "${t}". يمكنك تحميله من الملف الشخصي ثم الطلبات.${n ? ' ملاحظة: ' + n : ''}`,
      },
    };
  }
  return {
    title: { ms: 'Permohonan ditolak', en: 'Request declined', ar: 'تم رفض الطلب' },
    body: {
      ms: `Permohonan anda untuk "${t}" tidak dapat dibenarkan.${n ? ' Catatan: ' + n : ''}`,
      en: `Your request for "${t}" could not be approved.${n ? ' Note: ' + n : ''}`,
      ar: `تعذّرت الموافقة على طلبك للرابط "${t}".${n ? ' ملاحظة: ' + n : ''}`,
    },
  };
}

async function decide(id, status, noteEl, btn) {
  const r = reqs.find((x) => x.id === id);
  if (!r) return;
  const note = (noteEl?.value || '').trim();
  btn.disabled = true;
  try {
    await fb.decideRequest(id, status, note, ctx.getMe().email || '');
    await fb.sendNotice(r.uid, { ...notice(status, r.title || r.url, note), kind: 'approval', requestId: id });
    toast(status === 'approved' ? 'Dibenarkan. Pengguna dimaklumkan.' : 'Ditolak. Pengguna dimaklumkan.'); sfx.success();
  } catch (e) { toast(e.code === 'permission-denied' ? 'Tiada kebenaran.' : 'Gagal menyimpan keputusan.'); sfx.error(); btn.disabled = false; }
}

export function bindApprovals() {
  $('#rqFilter').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; sfx.pop(); paintReq(); } });
  $('#rqList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const row = b.closest('[data-id]');
    decide(row.dataset.id, b.dataset.act, row.querySelector('.rq-note'), b);
  });
  paintReq();
}

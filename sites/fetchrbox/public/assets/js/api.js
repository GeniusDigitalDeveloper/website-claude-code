const base = () => (window.FETCHRBOX?.API_BASE || '').replace(/\/$/, '');
// Mod demo hanya untuk pratonton reka bentuk (?demo). Tanpa itu, tiada keputusan palsu dipaparkan.
export const DEMO = new URLSearchParams(location.search).has('demo');

async function req(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Tidak dapat bersambung ke pelayan Fetchr Box.'); e.offline = true; throw e;
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (!data && (res.status === 404 || res.status === 405)) { const e = new Error('Pelayan muat turun belum bersambung.'); e.offline = true; throw e; }
    const e = new Error(data?.error || 'Ralat pelayan'); e.status = res.status; e.code = data?.code || ''; e.data = data || {}; throw e;
  }
  return data;
}
export const fileUrl = (id) => `${base()}/api/jobs/${id}/file`;

/* ---------- Mod demo (?demo) — data contoh tanpa pelayan, untuk pratonton reka bentuk ---------- */
const demoCfg = {
  platforms: [
    { id: 'youtube', name: 'YouTube', icon: 'youtube', enabled: true, domains: ['youtube.com', 'youtu.be'], note: 'Video, Shorts, Muzik' },
    { id: 'tiktok', name: 'TikTok', icon: 'tiktok', enabled: true, domains: ['tiktok.com'], note: 'Tanpa watermark' },
    { id: 'instagram', name: 'Instagram', icon: 'instagram', enabled: true, domains: ['instagram.com'], note: 'Reels' },
    { id: 'facebook', name: 'Facebook', icon: 'facebook', enabled: true, domains: ['facebook.com', 'fb.watch'], note: 'Video & Reels' },
  ],
  faq: null, settings: { announcement: '', maintenance: false }, formats: {},
};
const demoJobs = new Map();
async function demo(path, opts) {
  await new Promise((r) => setTimeout(r, 650));
  if (path === '/api/config') return demoCfg;
  if (path === '/api/info') return { title: 'Contoh: Pemandangan Subuh di Masjid Biru', thumbnail: '', duration: 214, uploader: 'Saluran Contoh', maxHeight: 2160, platform: { id: 'youtube', name: 'YouTube' }, url: opts.body.url };
  if (path === '/api/jobs') { const id = 'demo' + Math.random().toString(36).slice(2, 12); demoJobs.set(id, Date.now()); return { id }; }
  const m = path.match(/^\/api\/jobs\/(\w+)$/);
  if (m) { const p = Math.min(100, (Date.now() - demoJobs.get(m[1])) / 45); return { status: p >= 100 ? 'done' : 'running', phase: p > 92 ? 'process' : 'download', progress: Math.round(p), name: 'contoh.mp4' }; }
  throw new Error('Mod demo');
}
const call = (path, opts) => (DEMO ? demo(path, opts) : req(path, opts));

export const api = {
  config: async () => (await import('./firebase.js')).fb.getSite(),
  // declared: pengguna telah menandakan pengakuan hak cipta (diwajibkan oleh borang, disemak semula oleh pelayan).
  // ap = { id, token }: kelulusan admin untuk pautan ini (pelayan menyemak melalui token pengguna).
  info: (url, ap) => call('/api/info', { method: 'POST', body: { url, declared: true, ...(ap ? { approvalId: ap.id, idToken: ap.token } : {}) } }),
  startJob: (url, format, quality, ap) => call('/api/jobs', { method: 'POST', body: { url, format, quality, declared: true, ...(ap ? { approvalId: ap.id, idToken: ap.token } : {}) } }),
  job: (id) => call('/api/jobs/' + id),
  health: () => (DEMO ? Promise.resolve({ ok: true }) : req('/api/health')),
};

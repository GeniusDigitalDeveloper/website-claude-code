// Sauk — pelayan muat turun. Tiada dependency npm; perlukan yt-dlp + ffmpeg dalam PATH.
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'));
const TMP_DIR = path.join(DATA_DIR, 'tmp');
const PORT = Number(process.env.PORT || 8080);
const YTDLP = process.env.YTDLP_BIN || 'yt-dlp';
const COOKIES = process.env.YTDLP_COOKIES && fs.existsSync(process.env.YTDLP_COOKIES) ? process.env.YTDLP_COOKIES : '';
const MAX_DURATION = Number(process.env.MAX_DURATION_MIN || 180) * 60;
const MAX_JOBS = Number(process.env.MAX_JOBS || 3);
const JOB_TTL_MS = 10 * 60 * 1000;
const TRUST_PROXY = process.env.TRUST_PROXY ? process.env.TRUST_PROXY === '1' : process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

fs.mkdirSync(TMP_DIR, { recursive: true });
for (const d of fs.readdirSync(TMP_DIR)) fs.rmSync(path.join(TMP_DIR, d), { recursive: true, force: true });

/* ---------------- Admin auth ---------------- */
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(9).toString('base64url');
  console.log(`[sauk] ADMIN_PASSWORD tidak ditetapkan. Kata laluan sementara: ${ADMIN_PASSWORD}`);
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('sauk:' + ADMIN_PASSWORD).digest('hex');
const sign = (s) => crypto.createHmac('sha256', SESSION_SECRET).update(s).digest('base64url');
const safeEq = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};
const makeToken = () => { const exp = String(Date.now() + 12 * 3600e3); return `${exp}.${sign(exp)}`; };
const checkToken = (t) => {
  if (!t) return false;
  const [exp, sig] = String(t).split('.');
  return !!sig && Number(exp) > Date.now() && safeEq(sig, sign(exp));
};

/* ---------------- Database (fail JSON) ---------------- */
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ICONS = ['youtube', 'tiktok', 'instagram', 'facebook', 'x', 'music', 'video', 'globe'];
const DEFAULT_DB = {
  platforms: [
    { id: 'youtube', name: 'YouTube', icon: 'youtube', enabled: true, domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'], note: 'Video, Shorts, Live, Muzik, unlisted' },
    { id: 'tiktok', name: 'TikTok', icon: 'tiktok', enabled: true, domains: ['tiktok.com'], note: 'Tanpa watermark, kualiti tertinggi' },
    { id: 'instagram', name: 'Instagram', icon: 'instagram', enabled: true, domains: ['instagram.com', 'instagr.am'], note: 'Reels dan video awam' },
    { id: 'facebook', name: 'Facebook', icon: 'facebook', enabled: true, domains: ['facebook.com', 'fb.watch', 'fb.com'], note: 'Video dan Reels awam' },
    { id: 'x', name: 'X (Twitter)', icon: 'x', enabled: false, domains: ['x.com', 'twitter.com'], note: 'Aktifkan di panel admin' },
    { id: 'soundcloud', name: 'SoundCloud', icon: 'music', enabled: false, domains: ['soundcloud.com'], note: 'Aktifkan di panel admin' },
    { id: 'vimeo', name: 'Vimeo', icon: 'video', enabled: false, domains: ['vimeo.com'], note: 'Aktifkan di panel admin' },
  ],
  faq: [
    { id: 'cara', q: 'Macam mana nak muat turun?', keywords: ['cara', 'macam mana', 'how', 'guna', 'mula', 'download', 'muat turun', 'tutorial'], a: '1) Buka video, tekan Share lalu Salin pautan. 2) Tampal di kotak Sauk dan tekan Semak. 3) Pilih format dan kualiti. 4) Tekan Muat Turun.' },
    { id: 'format', q: 'Format apa yang ada?', keywords: ['format', 'mp3', 'mp4', 'mov', 'wav', 'mkv', 'audio', 'video', 'lagu'], a: 'Video: MP4, MOV, MKV. Audio: MP3, M4A, WAV, FLAC. MP4 paling serasi untuk iPhone dan Android.' },
    { id: 'tiktok', q: 'TikTok ada watermark tak?', keywords: ['tiktok', 'watermark', 'logo', 'tanda air'], a: 'Sauk ambil sumber TikTok asal tanpa watermark pada kualiti tertinggi yang TikTok sediakan.' },
    { id: 'kualiti', q: 'Macam mana nak kualiti terbaik?', keywords: ['kualiti', 'quality', '4k', '1080', 'hd', 'pecah', 'blur', 'jelas'], a: 'Pilih "Terbaik" untuk kualiti tertinggi. 4K hanya ada jika video asal memang 4K. Untuk iPhone lama, pilih 1080p MP4 supaya terus boleh main.' },
    { id: 'peribadi', q: 'Video peribadi atau private boleh?', keywords: ['private', 'peribadi', 'privasi', 'login', 'umur', 'age', 'berdaftar', 'unlisted'], a: 'Video awam dan unlisted (ada pautan) boleh. Video private atau had umur perlukan akaun, jadi tidak disokong kecuali admin menetapkan cookies.' },
    { id: 'iphone', q: 'Macam mana simpan di iPhone?', keywords: ['iphone', 'ipad', 'apple', 'ios', 'safari', 'simpan', 'galeri', 'photos', 'files'], a: 'Guna Safari. Lepas muat turun, tekan ikon anak panah di bar alamat, pilih fail, lalu Share > Save Video untuk masuk Photos. Atau ia tersimpan dalam app Files.' },
    { id: 'android', q: 'Android / PC macam mana?', keywords: ['android', 'pc', 'laptop', 'komputer', 'chrome', 'windows', 'mac'], a: 'Fail akan masuk folder Downloads secara automatik. Di Android, buka app Files atau Galeri.' },
    { id: 'gagal', q: 'Kenapa gagal?', keywords: ['gagal', 'error', 'ralat', 'tak boleh', 'tak jadi', 'fail', 'rosak', 'masalah'], a: 'Semak pautan lengkap dan video itu awam. Cuba lagi sebentar, kadang-kadang platform sekat sementara. Kalau masih gagal, hubungi admin.' },
    { id: 'percuma', q: 'Percuma ke?', keywords: ['percuma', 'free', 'bayar', 'harga', 'kos', 'langganan'], a: 'Percuma sepenuhnya, tanpa akaun. Muat turun hanya kandungan yang anda ada hak untuk simpan.' },
    { id: 'platform', q: 'Platform apa disokong?', keywords: ['platform', 'sokong', 'support', 'youtube', 'instagram', 'facebook', 'twitter', 'laman'], a: 'YouTube, TikTok, Instagram dan Facebook. Platform baru ditambah dari masa ke masa.' },
  ],
  settings: { announcement: '', maintenance: false },
  stats: { total: 0, byPlatform: {}, byFormat: {}, byDay: {}, failed: 0 },
  logs: [],
};
let db;
try { db = { ...structuredClone(DEFAULT_DB), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; }
catch { db = structuredClone(DEFAULT_DB); }
let saveTimer;
const saveDb = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
};
const today = () => new Date().toISOString().slice(0, 10);
function record(platform, format, quality, ok, title) {
  const s = db.stats;
  if (ok) {
    s.total++;
    s.byPlatform[platform] = (s.byPlatform[platform] || 0) + 1;
    s.byFormat[format] = (s.byFormat[format] || 0) + 1;
    s.byDay[today()] = (s.byDay[today()] || 0) + 1;
    const days = Object.keys(s.byDay).sort();
    for (const d of days.slice(0, Math.max(0, days.length - 60))) delete s.byDay[d];
  } else s.failed++;
  db.logs.unshift({ t: Date.now(), platform, format, quality, ok, title: String(title || '').slice(0, 80) });
  db.logs.length = Math.min(db.logs.length, 100);
  saveDb();
}

/* ---------------- Utiliti ---------------- */
const clientIp = (req) => (TRUST_PROXY && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || '?';
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (b.length >= max) { buckets.set(key, b); return true; }
  b.push(now); buckets.set(key, b); return false;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (!v.some((t) => now - t < 600e3)) buckets.delete(k); }, 60e3).unref();

function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
const hostMatches = (host, domain) => host === domain || host.endsWith('.' + domain);
function resolveUrl(raw) {
  const m = String(raw || '').match(/https?:\/\/[^\s<>"']+/i);
  if (!m || m[0].length > 2048) return { error: 'Pautan tidak sah. Salin pautan penuh dari butang Share.' };
  let u; try { u = new URL(m[0]); } catch { return { error: 'Pautan tidak sah.' }; }
  const host = u.hostname.toLowerCase();
  const all = db.platforms.find((p) => p.domains.some((d) => hostMatches(host, d)));
  if (!all) return { error: 'Platform ini belum disokong.' };
  if (!all.enabled) return { error: `${all.name} sedang dimatikan oleh admin.` };
  return { url: u.toString(), platform: all };
}
const cookieArgs = () => (COOKIES ? ['--cookies', COOKIES] : []);

function run(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const p = spawn(YTDLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const to = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('timeout')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; if (out.length > 20e6) p.kill('SIGKILL'); });
    p.stderr.on('data', (d) => { err += d; if (err.length > 1e5) err = err.slice(-5e4); });
    p.on('error', (e) => { clearTimeout(to); reject(e); });
    p.on('close', (code) => { clearTimeout(to); code === 0 ? resolve(out) : reject(Object.assign(new Error('ytdlp'), { stderr: err })); });
  });
}
function friendly(stderr = '') {
  const s = stderr.toLowerCase();
  if (s.includes('private') || s.includes('login') || s.includes('sign in') || s.includes('cookies')) return 'Video ini peribadi atau perlukan log masuk, jadi tidak boleh dimuat turun.';
  if (s.includes('not available') || s.includes('unavailable') || s.includes('removed') || s.includes('404')) return 'Video tidak ditemui atau sudah dipadam.';
  if (s.includes('confirm you') && s.includes('bot')) return 'Platform sedang sekat pelayan kami sementara. Cuba lagi sebentar.';
  if (s.includes('unsupported url')) return 'Pautan ini bukan pautan video.';
  return 'Gagal mengambil video. Pastikan pautan awam dan cuba lagi.';
}

/* ---------------- Maklumat video ---------------- */
async function getInfo(url) {
  const out = await run(['-J', '--no-playlist', '--no-warnings', '--skip-download', ...cookieArgs(), '--', url], 60_000);
  const j = JSON.parse(out);
  const heights = [...new Set((j.formats || []).map((f) => f.height).filter(Boolean))].sort((a, b) => b - a);
  return { title: j.title || 'Video', thumbnail: j.thumbnail || '', duration: j.duration || 0, uploader: j.uploader || j.channel || '', maxHeight: heights[0] || 0, isLive: !!j.is_live };
}

/* ---------------- Kerja muat turun ---------------- */
const VIDEO_FORMATS = ['mp4', 'mov', 'mkv'];
const AUDIO_FORMATS = ['mp3', 'm4a', 'wav', 'flac'];
const QUALITIES = ['best', '2160', '1440', '1080', '720', '480', '360'];
const MIME = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac' };
const jobs = new Map();

function buildArgs(format, quality, dir) {
  const base = ['--no-playlist', '--no-warnings', '--newline', '--windows-filenames', '--no-mtime', '--concurrent-fragments', '4', ...cookieArgs(), '-o', path.join(dir, '%(title).100B.%(ext)s')];
  if (AUDIO_FORMATS.includes(format)) {
    return [...base, '-f', 'bestaudio/best', '-x', '--audio-format', format, '--audio-quality', '0', '--embed-metadata'];
  }
  // Pilih h264/aac dahulu supaya serasi iPhone; kualiti "best" tetap ambil resolusi tertinggi sedia ada.
  const cap = quality !== 'best' ? `[height<=${quality}]` : '';
  const sort = quality === '2160' || quality === '1440' ? 'res,fps,vcodec,acodec' : 'res,vcodec:h264,acodec:aac,fps';
  return [...base, '-f', `bv*${cap}+ba/b${cap}/b`, '-S', sort, '--merge-output-format', format, '--remux-video', format];
}

function startJob({ url, platform, format, quality, ip }) {
  const id = crypto.randomBytes(12).toString('base64url');
  const dir = path.join(TMP_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const job = { id, ip, status: 'running', phase: 'download', progress: 0, error: '', file: '', name: '', mime: MIME[format], platform: platform.id, format, quality, timer: null };
  jobs.set(id, job);
  const merged = VIDEO_FORMATS.includes(format) && ['youtube', 'facebook'].includes(platform.id);
  let stream = 0;
  const child = spawn(YTDLP, [...buildArgs(format, quality, dir), '--', url], { stdio: ['ignore', 'pipe', 'pipe'] });
  job.child = child;
  const killTimer = setTimeout(() => child.kill('SIGKILL'), 20 * 60 * 1000);
  let errBuf = '';
  const onLine = (line) => {
    if (line.includes('[download] Destination:')) stream++;
    const m = line.match(/\[download\]\s+([\d.]+)%/);
    if (m) {
      const p = parseFloat(m[1]);
      const scaled = merged ? (stream <= 1 ? p * 0.6 : 60 + p * 0.3) : p * 0.9;
      job.progress = Math.max(job.progress, Math.min(95, scaled));
    }
    if (/^\[(Merger|ExtractAudio|VideoRemuxer|VideoConvertor|FFmpeg)/.test(line)) { job.phase = 'process'; job.progress = Math.max(job.progress, 95); }
  };
  let buf = '';
  child.stdout.on('data', (d) => { buf += d; const lines = buf.split('\n'); buf = lines.pop(); lines.forEach(onLine); });
  child.stderr.on('data', (d) => { errBuf += d; if (errBuf.length > 5e4) errBuf = errBuf.slice(-2e4); });
  child.on('close', (code) => {
    clearTimeout(killTimer);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !/\.(part|ytdl|temp)$/i.test(f) && f.toLowerCase().endsWith('.' + format)) : [];
    if (code === 0 && files[0]) {
      job.status = 'done'; job.progress = 100; job.file = path.join(dir, files[0]); job.name = files[0];
      record(platform.id, format, quality, true, files[0].replace(/\.[^.]+$/, ''));
    } else {
      job.status = 'error'; job.error = friendly(errBuf);
      record(platform.id, format, quality, false, '');
      console.error('[sauk] job gagal:', errBuf.split('\n').filter(Boolean).slice(-2).join(' | '));
    }
    job.timer = setTimeout(() => dropJob(id), JOB_TTL_MS);
  });
  child.on('error', () => { job.status = 'error'; job.error = 'yt-dlp tidak dipasang pada pelayan.'; });
  return job;
}
function dropJob(id) {
  const j = jobs.get(id); if (!j) return;
  clearTimeout(j.timer); jobs.delete(id);
  fs.rm(path.join(TMP_DIR, id), { recursive: true, force: true }, () => {});
}
const activeJobs = () => [...jobs.values()].filter((j) => j.status === 'running');

/* ---------------- Admin: pengesahan input ---------------- */
function cleanPlatforms(list) {
  if (!Array.isArray(list) || list.length > 60) throw new Error('Senarai platform tidak sah');
  const seen = new Set();
  return list.map((p) => {
    const id = String(p.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
    const name = String(p.name || '').trim().slice(0, 40);
    if (!id || !name || seen.has(id)) throw new Error('ID/nama platform tidak sah atau berganda');
    seen.add(id);
    const domains = (Array.isArray(p.domains) ? p.domains : []).map((d) => String(d).toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''))
      .filter((d) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)).slice(0, 12);
    if (!domains.length) throw new Error(`${name}: tambah sekurang-kurangnya satu domain sah`);
    return { id, name, icon: ICONS.includes(p.icon) ? p.icon : 'globe', enabled: !!p.enabled, domains, note: String(p.note || '').slice(0, 120) };
  });
}
function cleanFaq(list) {
  if (!Array.isArray(list) || list.length > 100) throw new Error('Senarai FAQ tidak sah');
  return list.map((f, i) => {
    const q = String(f.q || '').trim().slice(0, 140), a = String(f.a || '').trim().slice(0, 800);
    if (!q || !a) throw new Error('Soalan dan jawapan wajib diisi');
    return { id: String(f.id || 'faq' + i).slice(0, 30), q, a, keywords: (Array.isArray(f.keywords) ? f.keywords : []).map((k) => String(k).toLowerCase().trim().slice(0, 40)).filter(Boolean).slice(0, 20) };
  });
}

/* ---------------- Penghala ---------------- */
const publicConfig = () => ({ platforms: db.platforms.map(({ id, name, icon, enabled, domains, note }) => ({ id, name, icon, enabled, domains, note })), faq: db.faq, settings: db.settings, formats: { video: VIDEO_FORMATS, audio: AUDIO_FORMATS, qualities: QUALITIES } });

async function api(req, res, url) {
  const ip = clientIp(req);
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/health') return send(res, 200, { ok: true, activeJobs: activeJobs().length, time: Date.now() });
  if (route === 'GET /api/config') return send(res, 200, publicConfig());

  if (route === 'POST /api/info') {
    if (limited('info:' + ip, 20, 60e3)) return send(res, 429, { error: 'Terlalu banyak permintaan. Tunggu sebentar.' });
    if (db.settings.maintenance) return send(res, 503, { error: 'Sistem dalam penyelenggaraan. Cuba lagi nanti.' });
    const body = await readJson(req);
    const r = resolveUrl(body.url);
    if (r.error) return send(res, 400, { error: r.error });
    try {
      const info = await getInfo(r.url);
      if (info.isLive) return send(res, 400, { error: 'Siaran langsung belum boleh dimuat turun. Tunggu ia tamat.' });
      if (info.duration > MAX_DURATION) return send(res, 400, { error: `Video terlalu panjang (had ${MAX_DURATION / 60} minit).` });
      return send(res, 200, { ...info, platform: { id: r.platform.id, name: r.platform.name }, url: r.url });
    } catch (e) {
      if (e.code === 'ENOENT') return send(res, 500, { error: 'yt-dlp tidak dipasang pada pelayan.' });
      console.error('[sauk] info gagal:', (e.stderr || e.message).split('\n').filter(Boolean).slice(-2).join(' | '));
      return send(res, 422, { error: friendly(e.stderr) });
    }
  }

  if (route === 'POST /api/jobs') {
    if (limited('job:' + ip, 8, 60e3)) return send(res, 429, { error: 'Terlalu banyak permintaan. Tunggu sebentar.' });
    if (db.settings.maintenance) return send(res, 503, { error: 'Sistem dalam penyelenggaraan.' });
    const body = await readJson(req);
    const r = resolveUrl(body.url);
    if (r.error) return send(res, 400, { error: r.error });
    const format = String(body.format || 'mp4').toLowerCase();
    const quality = String(body.quality || 'best');
    if (![...VIDEO_FORMATS, ...AUDIO_FORMATS].includes(format) || !QUALITIES.includes(quality)) return send(res, 400, { error: 'Format atau kualiti tidak sah.' });
    if ([...jobs.values()].filter((j) => j.ip === ip && j.status === 'running').length >= 2) return send(res, 429, { error: 'Selesaikan muat turun sedia ada dahulu.' });
    if (activeJobs().length >= MAX_JOBS) return send(res, 503, { error: 'Pelayan sibuk. Cuba lagi sebentar.' });
    const job = startJob({ url: r.url, platform: r.platform, format, quality, ip });
    return send(res, 202, { id: job.id });
  }

  const jm = url.pathname.match(/^\/api\/jobs\/([\w-]{10,})(\/file)?$/);
  if (jm && req.method === 'GET') {
    const job = jobs.get(jm[1]);
    if (!job) return send(res, 404, { error: 'Kerja tamat tempoh. Mulakan semula.' });
    if (!jm[2]) return send(res, 200, { status: job.status, phase: job.phase, progress: Math.round(job.progress), error: job.error, name: job.name });
    if (job.status !== 'done') return send(res, 409, { error: 'Belum siap.' });
    const stat = fs.statSync(job.file);
    const ascii = job.name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    res.writeHead(200, {
      'Content-Type': job.mime || 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(job.name)}`,
      'Cache-Control': 'no-store',
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    fs.createReadStream(job.file).pipe(res);
    return;
  }

  /* ---- Admin ---- */
  if (route === 'POST /api/admin/login') {
    if (limited('login:' + ip, 5, 60e3)) return send(res, 429, { error: 'Cuba terlalu kerap. Tunggu seminit.' });
    const body = await readJson(req);
    if (!safeEq(body.password || '', ADMIN_PASSWORD)) return send(res, 401, { error: 'Kata laluan salah.' });
    return send(res, 200, { token: makeToken() });
  }
  if (url.pathname.startsWith('/api/admin/')) {
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!checkToken(auth)) return send(res, 401, { error: 'Sesi tamat. Log masuk semula.' });
    if (route === 'GET /api/admin/overview') {
      const days = [];
      for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push({ day: d, count: db.stats.byDay[d] || 0 }); }
      return send(res, 200, { stats: db.stats, days, logs: db.logs, today: db.stats.byDay[today()] || 0, activeJobs: activeJobs().length, cookies: !!COOKIES, ytdlp: true, ...publicConfig() });
    }
    if (route === 'PUT /api/admin/platforms') { db.platforms = cleanPlatforms((await readJson(req)).platforms); saveDb(); return send(res, 200, { ok: true, platforms: db.platforms }); }
    if (route === 'PUT /api/admin/faq') { db.faq = cleanFaq((await readJson(req)).faq); saveDb(); return send(res, 200, { ok: true }); }
    if (route === 'PUT /api/admin/settings') {
      const b = await readJson(req);
      db.settings = { announcement: String(b.announcement || '').slice(0, 200), maintenance: !!b.maintenance };
      saveDb(); return send(res, 200, { ok: true, settings: db.settings });
    }
  }
  return send(res, 404, { error: 'Tidak ditemui' });
}

/* ---------------- Fail statik ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  if (p === '/admin') p = '/admin.html';
  const file = path.resolve(PUBLIC_DIR, '.' + p);
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Tidak ditemui');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const origin = req.headers.origin;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!url.pathname.startsWith('/api/')) res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'");
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Kaedah tidak dibenarkan');
    return serveStatic(req, res, url);
  } catch (e) {
    if (e.message === 'bad_json' || e.message === 'too_large') return send(res, 400, { error: 'Permintaan tidak sah.' });
    if (!res.headersSent) return send(res, 400, { error: e.message || 'Ralat' });
    res.end();
  }
});
server.requestTimeout = 0;
server.listen(PORT, () => console.log(`[sauk] berjalan di http://localhost:${PORT}`));

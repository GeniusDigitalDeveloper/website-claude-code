/* =====================================================================
   STREAMVERSE — Firebase Cloud Functions (2nd gen, Node 20)
   Perlukan pelan Blaze (billing). Rahsia dibaca dari Secret Manager pada
   runtime; jika rahsia tiada, fungsi memulangkan status "not configured"
   (tiada respons palsu).
   ===================================================================== */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { getDownloadURL } = require("firebase-admin/storage");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const crypto = require("crypto");

const REGION = "asia-southeast1";
setGlobalOptions({ region: REGION, maxInstances: 10 });
admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const APP_URL = () => (process.env.APP_URL || "").replace(/\/$/, "");
const CALL = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };

/* ---------------- Secret Manager (pilihan, dibaca bila perlu) ---------------- */
const sm = new SecretManagerServiceClient();
const secretCache = new Map();
async function secret(name) {
  if (secretCache.has(name)) return secretCache.get(name);
  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  try {
    const [v] = await sm.accessSecretVersion({ name: `projects/${project}/secrets/${name}/versions/latest` });
    const val = v.payload.data.toString("utf8").trim();
    secretCache.set(name, val);
    return val;
  } catch (e) {
    if (e.code === 5 || e.code === 7) { secretCache.set(name, null); return null; } // NOT_FOUND / PERMISSION_DENIED
    throw e;
  }
}
async function requireSecret(name, what) {
  const v = await secret(name);
  if (!v) throw new HttpsError("failed-precondition", `${what} belum dikonfigurasi (secret ${name} tiada dalam Secret Manager).`);
  return v;
}

/* ---------------- Helpers ---------------- */
function needUser(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sila log masuk.");
  if (req.auth.token.email_verified !== true) throw new HttpsError("permission-denied", "Sahkan email dahulu.");
  return req.auth.uid;
}
function needAdmin(req) { needUser(req); if (req.auth.token.admin !== true) throw new HttpsError("permission-denied", "Admin sahaja."); return req.auth.uid; }
async function log(level, event, message, extra = {}) {
  try { await db.collection("systemLogs").add({ level, event, message: String(message).slice(0, 1000), ...extra, createdAt: FieldValue.serverTimestamp() }); } catch (e) { console.error(e); }
}
async function notify(uid, type, text, extra = {}) {
  await db.collection("users").doc(uid).collection("notifications").add({ type, text: text.slice(0, 300), read: false, ...extra, createdAt: FieldValue.serverTimestamp() });
}
const clip = (v, n) => String(v ?? "").slice(0, n);
async function fetchJSON(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!r.ok) { const msg = body.error?.message || body.error_description || body.error?.description || body.message || text.slice(0, 300); const e = new Error(`${r.status}: ${msg}`); e.status = r.status; throw e; }
  return body;
}

/* ---------------- Token encryption (AES-256-GCM) ---------------- */
async function encKey() {
  const k = await requireSecret("TOKEN_ENC_KEY", "Kunci penyulitan token");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new HttpsError("failed-precondition", "TOKEN_ENC_KEY mesti 32 bait (base64).");
  return buf;
}
async function encrypt(obj) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv("aes-256-gcm", await encKey(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return { iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") };
}
async function decrypt(e) {
  const d = crypto.createDecipheriv("aes-256-gcm", await encKey(), Buffer.from(e.iv, "base64"));
  d.setAuthTag(Buffer.from(e.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(e.data, "base64")), d.final()]).toString("utf8"));
}
const tokenRef = (uid, p) => db.collection("_private").doc("platformTokens").collection("items").doc(`${uid}_${p}`);
const connRef = (uid, p) => db.collection("users").doc(uid).collection("platformConnections").doc(p);

/* =====================================================================
   WebRTC TURN
   ===================================================================== */
exports.getIceServers = onCall(CALL, async req => {
  needUser(req);
  const iceServers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const [urls, username, credential] = await Promise.all([secret("TURN_URLS"), secret("TURN_USERNAME"), secret("TURN_CREDENTIAL")]);
  if (urls && username && credential) iceServers.push({ urls: urls.split(",").map(s => s.trim()), username, credential });
  return { iceServers, turn: !!(urls && username && credential) };
});

/* =====================================================================
   AI STREAM CREATOR
   ===================================================================== */
async function aiConfig() {
  const s = await db.doc("config/ai").get();
  return { textProvider: "anthropic", textModel: "claude-sonnet-5-5", imageProvider: "openai", imageModel: "gpt-image-1", dailyLimit: 20, enabled: true, ...(s.exists ? s.data() : {}) };
}
async function textKey(cfg) { return secret(cfg.textProvider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"); }
exports.aiProviderStatus = onCall(CALL, async req => {
  needUser(req);
  const cfg = await aiConfig();
  const [tk, ik] = await Promise.all([textKey(cfg), secret("OPENAI_API_KEY")]);
  return {
    enabled: cfg.enabled !== false,
    text: { configured: cfg.enabled !== false && !!tk, provider: cfg.textProvider, model: cfg.textModel },
    image: { configured: cfg.enabled !== false && !!ik, provider: cfg.imageProvider, model: cfg.imageModel }
  };
});
async function consumeQuota(uid, cfg) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.collection("aiUsage").doc(`${uid}_${day}`);
  await db.runTransaction(async tx => {
    const s = await tx.get(ref); const n = s.exists ? s.data().count : 0;
    if (n >= (cfg.dailyLimit || 20)) throw new HttpsError("resource-exhausted", `Had harian AI (${cfg.dailyLimit}) telah dicapai. Cuba esok.`);
    tx.set(ref, { uid, day, count: n + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
const TEXT_PROMPTS = {
  copy: i => `Tulis copywriting gaming untuk: "${i.topic}". Platform: ${i.platform}. Nada: ${i.tone}. Beri: 3 pilihan title, 1 caption/description, dan 15 hashtag relevan.`,
  schedule: i => `Rancang jadual livestream mingguan. Game: ${i.games}. Masa tersedia: ${i.hours}. Matlamat: ${i.goal}. Beri jadual hari/masa, tema setiap sesi, dan tips konsistensi. Gunakan jadual ringkas.`,
  planner: i => `Hasilkan content plan untuk niche "${i.niche}" di ${i.platforms} bagi tempoh ${i.period}. Untuk setiap minggu: idea video, format, hook, CTA, dan platform utama.`,
  branding: i => `Bantu bina identiti streamer. Tentang: ${i.about}. Kata kunci: ${i.keywords}. Beri 10 cadangan nama, 5 tagline, cadangan palet warna (hex), gaya font, dan personaliti brand.`,
  overlayIdea: i => `Cadangkan reka bentuk overlay livestream. Tema: ${i.theme}. Elemen: ${i.elements}. Beri susun atur (posisi webcam, bar, alert), palet warna hex, font, animasi, dan senarai aset yang perlu dibuat.`
};
const IMAGE_PROMPTS = {
  poster: i => `Gaming livestream event poster, vertical. Event: "${i.event}". Details to display as text: ${i.details}. Visual style: ${i.style}. Bold esports typography, high contrast, professional composition.`,
  thumbnail: i => `YouTube gaming thumbnail, 16:9. Game: ${i.game}. Video title concept: "${i.title}". Style: ${i.style}. Large readable short text, dramatic lighting, high contrast, eye-catching.`,
  overlay: i => `Livestream overlay design mockup, 16:9, transparent-looking frame on dark background. Theme: ${i.theme}. Elements: ${i.elements}. Clean HUD, webcam frame, lower bar, alert area.`
};
const sanitize = input => Object.fromEntries(Object.entries(input || {}).slice(0, 8).map(([k, v]) => [clip(k, 30), clip(v, 300)]));
exports.aiGenerateText = onCall({ ...CALL, timeoutSeconds: 120 }, async req => {
  const uid = needUser(req);
  const cfg = await aiConfig();
  if (cfg.enabled === false) throw new HttpsError("failed-precondition", "AI Creator dinyahaktifkan oleh admin.");
  const tool = clip(req.data?.tool, 20); const mk = TEXT_PROMPTS[tool];
  if (!mk) throw new HttpsError("invalid-argument", "Tool tidak sah.");
  const key = await textKey(cfg);
  if (!key) throw new HttpsError("failed-precondition", "Text provider belum dikonfigurasi.");
  await consumeQuota(uid, cfg);
  const prompt = mk(sanitize(req.data.input));
  const system = "Anda pembantu kreatif untuk gamer dan livestreamer Malaysia. Jawab dalam Bahasa Melayu santai kecuali diminta lain. Jangan reka statistik atau fakta tentang pengguna.";
  let text;
  try {
    if (cfg.textProvider === "openai") {
      const r = await fetchJSON("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: cfg.textModel, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 1500 }) });
      text = r.choices?.[0]?.message?.content || "";
    } else {
      const r = await fetchJSON("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: cfg.textModel, max_tokens: 1500, system, messages: [{ role: "user", content: prompt }] }) });
      text = (r.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    }
  } catch (e) { await log("error", "ai.text", e.message, { uid }); throw new HttpsError("unavailable", "Provider AI gagal: " + e.message); }
  await db.collection("users").doc(uid).collection("aiAssets").add({ type: "text", tool, toolName: tool, prompt: clip(prompt, 500), text: clip(text, 20000), provider: cfg.textProvider, model: cfg.textModel, createdAt: FieldValue.serverTimestamp() });
  return { text };
});
exports.aiGenerateImage = onCall({ ...CALL, timeoutSeconds: 180, memory: "512MiB" }, async req => {
  const uid = needUser(req);
  const cfg = await aiConfig();
  if (cfg.enabled === false) throw new HttpsError("failed-precondition", "AI Creator dinyahaktifkan oleh admin.");
  const tool = clip(req.data?.tool, 20); const mk = IMAGE_PROMPTS[tool];
  if (!mk) throw new HttpsError("invalid-argument", "Tool tidak sah.");
  const size = ["1024x1024", "1024x1536", "1536x1024"].includes(req.data.size) ? req.data.size : "1024x1024";
  const key = await secret("OPENAI_API_KEY");
  if (!key) throw new HttpsError("failed-precondition", "Image generation provider belum dikonfigurasi (OPENAI_API_KEY).");
  await consumeQuota(uid, cfg);
  const prompt = mk(sanitize(req.data.input));
  let b64;
  try {
    const r = await fetchJSON("https://api.openai.com/v1/images/generations", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: cfg.imageModel, prompt, size, n: 1 }) });
    b64 = r.data?.[0]?.b64_json;
    if (!b64 && r.data?.[0]?.url) b64 = Buffer.from(await (await fetch(r.data[0].url)).arrayBuffer()).toString("base64");
    if (!b64) throw new Error("Tiada imej dipulangkan.");
  } catch (e) { await log("error", "ai.image", e.message, { uid }); throw new HttpsError("unavailable", "Provider imej gagal: " + e.message); }
  const id = crypto.randomUUID();
  const file = admin.storage().bucket().file(`users/${uid}/ai/${id}.png`);
  await file.save(Buffer.from(b64, "base64"), { contentType: "image/png", resumable: false });
  const url = await getDownloadURL(file);
  await db.collection("users").doc(uid).collection("aiAssets").doc(id).set({ type: "image", tool, toolName: tool, prompt: clip(prompt, 500), url, storagePath: file.name, size, provider: cfg.imageProvider, model: cfg.imageModel, createdAt: FieldValue.serverTimestamp() });
  return { url, storagePath: file.name, prompt };
});

/* =====================================================================
   STREAMVERSE CONNECT — OAuth & live session (API rasmi)
   ===================================================================== */
const redirectUri = () => `${APP_URL()}/oauth/callback`;
const PROVIDERS = {
  youtube: {
    ids: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    authUrl: (id, state) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: id, redirect_uri: redirectUri(), response_type: "code", scope: "https://www.googleapis.com/auth/youtube", access_type: "offline", prompt: "consent", include_granted_scopes: "true", state })}`,
    async exchange(code, id, sec) {
      const t = await fetchJSON("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: id, client_secret: sec, redirect_uri: redirectUri(), grant_type: "authorization_code" }) });
      return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    },
    async refresh(tok, id, sec) {
      if (Date.now() < tok.expires_at) return tok;
      const t = await fetchJSON("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: tok.refresh_token, client_id: id, client_secret: sec, grant_type: "refresh_token" }) });
      return { ...tok, access_token: t.access_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    },
    async verify(tok) {
      const r = await fetchJSON("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      const ch = r.items?.[0]; if (!ch) throw new Error("Akaun Google ini tiada saluran YouTube.");
      return { accountName: ch.snippet.title, accountId: ch.id, status: "connected" };
    },
    async revoke(tok) { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tok.refresh_token || tok.access_token)}`, { method: "POST" }).catch(() => {}); },
    async createLive(tok, s) {
      const H = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };
      const start = s.schedule ? new Date(s.schedule).toISOString() : new Date(Date.now() + 60000).toISOString();
      const b = await fetchJSON("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails", { method: "POST", headers: H, body: JSON.stringify({ snippet: { title: clip(s.title || "STREAMVERSE Live", 100), description: clip(s.description, 5000), scheduledStartTime: start }, status: { privacyStatus: ["public", "unlisted", "private"].includes(s.privacy) ? s.privacy : "unlisted", selfDeclaredMadeForKids: false }, contentDetails: { enableAutoStart: true, enableAutoStop: true } }) });
      const st = await fetchJSON("https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,contentDetails", { method: "POST", headers: H, body: JSON.stringify({ snippet: { title: `STREAMVERSE ${b.id}` }, cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" } }) });
      await fetchJSON(`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${b.id}&part=id,contentDetails&streamId=${st.id}`, { method: "POST", headers: H });
      return { id: b.id, ingestUrl: st.cdn.ingestionInfo.ingestionAddress, streamKey: st.cdn.ingestionInfo.streamName, watchUrl: `https://youtu.be/${b.id}` };
    }
  },
  facebook: {
    ids: ["META_APP_ID", "META_APP_SECRET"],
    authUrl: (id, state) => `https://www.facebook.com/v19.0/dialog/oauth?${new URLSearchParams({ client_id: id, redirect_uri: redirectUri(), state, response_type: "code", scope: "pages_show_list,pages_read_engagement,pages_manage_posts,publish_video" })}`,
    async exchange(code, id, sec) {
      const s = await fetchJSON(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({ client_id: id, client_secret: sec, redirect_uri: redirectUri(), code })}`);
      const l = await fetchJSON(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: id, client_secret: sec, fb_exchange_token: s.access_token })}`);
      return { access_token: l.access_token, expires_at: Date.now() + ((l.expires_in || 5184000) - 3600) * 1000 };
    },
    async refresh(tok) { if (Date.now() > tok.expires_at) throw new Error("Token Facebook tamat tempoh. Sila Connect semula."); return tok; },
    async verify(tok) {
      const me = await fetchJSON(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(tok.access_token)}`);
      const pages = await fetchJSON(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name&access_token=${encodeURIComponent(tok.access_token)}`);
      if (!pages.data?.length) return { accountName: me.name, accountId: me.id, status: "restricted", message: "Akaun disahkan, tetapi tiada Facebook Page yang diberi kebenaran. Live melalui API memerlukan Page." };
      return { accountName: `${me.name} · Page: ${pages.data[0].name}`, accountId: me.id, pageId: pages.data[0].id, status: "connected" };
    },
    async revoke(tok) { await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(tok.access_token)}`, { method: "DELETE" }).catch(() => {}); },
    async createLive(tok, s, conn) {
      const pages = await fetchJSON(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(tok.access_token)}`);
      const page = pages.data?.find(p => p.id === conn.pageId) || pages.data?.[0];
      if (!page) throw new Error("Tiada Facebook Page dengan kebenaran live.");
      const body = new URLSearchParams({ title: clip(s.title || "STREAMVERSE Live", 100), description: clip(s.description, 5000), status: "UNPUBLISHED", access_token: page.access_token });
      const lv = await fetchJSON(`https://graph.facebook.com/v19.0/${page.id}/live_videos`, { method: "POST", body });
      const url = lv.secure_stream_url || lv.stream_url; const i = url.lastIndexOf("/");
      return { id: lv.id, ingestUrl: url.slice(0, i + 1), streamKey: url.slice(i + 1), watchUrl: `https://www.facebook.com/${page.id}/videos/${lv.id}` };
    }
  },
  tiktok: {
    ids: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    authUrl: (id, state) => `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({ client_key: id, scope: "user.info.basic", response_type: "code", redirect_uri: redirectUri(), state })}`,
    async exchange(code, id, sec) {
      const t = await fetchJSON("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: id, client_secret: sec, code, grant_type: "authorization_code", redirect_uri: redirectUri() }) });
      return { access_token: t.access_token, refresh_token: t.refresh_token, open_id: t.open_id, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    },
    async refresh(tok, id, sec) {
      if (Date.now() < tok.expires_at) return tok;
      const t = await fetchJSON("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: id, client_secret: sec, grant_type: "refresh_token", refresh_token: tok.refresh_token }) });
      return { ...tok, access_token: t.access_token, refresh_token: t.refresh_token || tok.refresh_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 };
    },
    async verify(tok) {
      const r = await fetchJSON("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      return { accountName: r.data?.user?.display_name || "TikTok", accountId: r.data?.user?.open_id, status: "restricted", message: "Akaun TikTok disahkan melalui Login Kit. TikTok tidak menyediakan LIVE API umum; stream key hanya untuk akaun layak melalui TikTok LIVE Studio / LIVE Center." };
    },
    async revoke(tok, id, sec) { await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: id, client_secret: sec, token: tok.access_token }) }).catch(() => {}); },
    async createLive() { throw new HttpsError("failed-precondition", "TikTok LIVE API tidak tersedia untuk integrasi umum. Guna stream key dari TikTok LIVE Studio jika akaun anda layak."); }
  }
};
async function providerCreds(p) {
  const P = PROVIDERS[p]; if (!P) throw new HttpsError("invalid-argument", "Platform tidak sah.");
  const cfg = (await db.doc("config/platforms").get()).data() || {};
  if (cfg[p]?.enabled === false) throw new HttpsError("failed-precondition", "Platform ini dinyahaktifkan oleh admin.");
  const [id, sec] = await Promise.all(P.ids.map(n => secret(n)));
  if (!id || !sec) throw new HttpsError("failed-precondition", `Integrasi ${p} belum dikonfigurasi oleh admin (${P.ids.join(", ")}).`);
  if (!APP_URL()) throw new HttpsError("failed-precondition", "APP_URL belum ditetapkan dalam functions/.env.");
  return { P, id, sec };
}
exports.platformAuthUrl = onCall(CALL, async req => {
  const uid = needUser(req); const p = req.data?.platform;
  const { P, id } = await providerCreds(p);
  await encKey();
  const state = crypto.randomBytes(24).toString("hex");
  await db.collection("_private").doc("oauthStates").collection("items").doc(state).set({ uid, platform: p, createdAt: Date.now() });
  return { url: P.authUrl(id, state) };
});
exports.oauthCallback = onRequest(async (req, res) => {
  const back = (q) => res.redirect(302, `${APP_URL()}/?${new URLSearchParams(q)}`);
  const { state, code, error } = req.query;
  if (!state) return back({ oauth: "fail", reason: "state tiada" });
  const sref = db.collection("_private").doc("oauthStates").collection("items").doc(String(state));
  const s = await sref.get(); await sref.delete().catch(() => {});
  if (!s.exists || Date.now() - s.data().createdAt > 10 * 60000) return back({ oauth: "fail", reason: "sesi OAuth tamat atau tidak sah" });
  const { uid, platform } = s.data();
  if (error || !code) return back({ oauth: "fail", platform, reason: String(error || "dibatalkan") });
  try {
    const { P, id, sec } = await providerCreds(platform);
    const tok = await P.exchange(String(code), id, sec);
    const info = await P.verify(tok);
    await tokenRef(uid, platform).set({ uid, platform, enc: await encrypt(tok), updatedAt: FieldValue.serverTimestamp() });
    await connRef(uid, platform).set({ ...info, platform, verifiedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await log("info", "platform.connect", `${platform} disambung`, { uid });
    return back({ oauth: "ok", platform });
  } catch (e) {
    await log("error", "platform.connect", e.message, { uid, platform });
    await connRef(uid, platform).set({ platform, status: "error", message: clip(e.message, 300), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return back({ oauth: "fail", platform, reason: clip(e.message, 120) });
  }
});
async function loadToken(uid, p, P, id, sec) {
  const s = await tokenRef(uid, p).get();
  if (!s.exists) throw new HttpsError("failed-precondition", "Platform belum disambung.");
  let tok = await decrypt(s.data().enc);
  const fresh = await P.refresh(tok, id, sec);
  if (fresh !== tok) { tok = fresh; await tokenRef(uid, p).update({ enc: await encrypt(tok), updatedAt: FieldValue.serverTimestamp() }); }
  return tok;
}
exports.platformVerify = onCall(CALL, async req => {
  const uid = needUser(req); const p = req.data?.platform;
  const { P, id, sec } = await providerCreds(p);
  try {
    const tok = await loadToken(uid, p, P, id, sec);
    const info = await P.verify(tok);
    await connRef(uid, p).set({ ...info, platform: p, verifiedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  } catch (e) {
    await connRef(uid, p).set({ status: "error", message: clip(e.message, 300), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: false, message: e.message };
  }
});
exports.platformDisconnect = onCall(CALL, async req => {
  const uid = needUser(req); const p = req.data?.platform;
  if (!PROVIDERS[p]) throw new HttpsError("invalid-argument", "Platform tidak sah.");
  const s = await tokenRef(uid, p).get();
  if (s.exists) {
    try { const [id, sec] = await Promise.all(PROVIDERS[p].ids.map(n => secret(n))); await PROVIDERS[p].revoke(await decrypt(s.data().enc), id, sec); } catch (e) { console.warn(e.message); }
    await tokenRef(uid, p).delete();
  }
  await connRef(uid, p).delete();
  await log("info", "platform.disconnect", `${p} diputuskan`, { uid });
  return { ok: true };
});
exports.platformCreateLive = onCall({ ...CALL, timeoutSeconds: 60 }, async req => {
  const uid = needUser(req); const p = req.data?.platform;
  const { P, id, sec } = await providerCreds(p);
  const conn = (await connRef(uid, p).get()).data();
  if (!conn || conn.status !== "connected") throw new HttpsError("failed-precondition", "Platform belum disambung dan disahkan.");
  const settings = (await db.collection("users").doc(uid).collection("streamSettings").doc(p).get()).data() || {};
  try {
    const tok = await loadToken(uid, p, P, id, sec);
    const r = await P.createLive(tok, settings, conn);
    await log("info", "platform.live", `${p} live session ${r.id}`, { uid });
    return r; // stream key dipulangkan sekali kepada pemilik; tidak disimpan di Firestore
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await log("error", "platform.live", e.message, { uid, platform: p });
    throw new HttpsError("unavailable", `${p}: ${e.message}`);
  }
});

/* =====================================================================
   ADMIN
   ===================================================================== */
exports.adminListUsers = onCall(CALL, async req => {
  needAdmin(req);
  const r = await admin.auth().listUsers(50, req.data?.pageToken || undefined);
  return {
    users: r.users.map(u => ({ uid: u.uid, email: u.email, emailVerified: u.emailVerified, disabled: u.disabled, admin: u.customClaims?.admin === true, createdAt: u.metadata.creationTime, lastSignIn: u.metadata.lastSignInTime })),
    nextPageToken: r.pageToken || null
  };
});
exports.adminSetRole = onCall(CALL, async req => {
  const me = needAdmin(req); const { uid, admin: makeAdmin } = req.data || {};
  if (!uid || uid === me) throw new HttpsError("invalid-argument", "UID tidak sah.");
  const u = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, { ...(u.customClaims || {}), admin: !!makeAdmin });
  await admin.auth().revokeRefreshTokens(uid);
  await log("warn", "admin.role", `${u.email} admin=${!!makeAdmin}`, { by: me });
  return { ok: true };
});
exports.adminSetDisabled = onCall(CALL, async req => {
  const me = needAdmin(req); const { uid, disabled } = req.data || {};
  if (!uid || uid === me) throw new HttpsError("invalid-argument", "UID tidak sah.");
  await admin.auth().updateUser(uid, { disabled: !!disabled });
  if (disabled) await admin.auth().revokeRefreshTokens(uid);
  await log("warn", "admin.disable", `${uid} disabled=${!!disabled}`, { by: me });
  return { ok: true };
});
exports.adminSystemStatus = onCall(CALL, async req => {
  needAdmin(req);
  const names = ["TOKEN_ENC_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "META_APP_ID", "META_APP_SECRET", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TURN_URLS", "TURN_USERNAME", "TURN_CREDENTIAL"];
  const vals = await Promise.all(names.map(n => secret(n).catch(() => null)));
  const checks = Object.fromEntries(names.map((n, i) => [n, !!vals[i]]));
  checks.APP_URL = APP_URL() || false;
  checks.ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === "true";
  return { checks, region: REGION, generatedAt: Date.now() };
});

/* =====================================================================
   COMMUNITY TRIGGERS (kiraan & notifikasi — klien tidak boleh ubah kiraan)
   ===================================================================== */
const postPath = "users/{ownerUid}/communityPosts/{postId}";
exports.onLikeCreated = onDocumentCreated(`${postPath}/likes/{likerUid}`, async ev => {
  const { ownerUid, postId, likerUid } = ev.params;
  await db.doc(`users/${ownerUid}/communityPosts/${postId}`).update({ likeCount: FieldValue.increment(1) }).catch(() => {});
  if (likerUid !== ownerUid) { const p = (await db.doc(`profiles/${likerUid}`).get()).data(); await notify(ownerUid, "like", `${p?.username || "Seseorang"} menyukai posting anda.`, { fromUid: likerUid, postId }); }
});
exports.onLikeDeleted = onDocumentDeleted(`${postPath}/likes/{likerUid}`, async ev => {
  const { ownerUid, postId } = ev.params;
  await db.doc(`users/${ownerUid}/communityPosts/${postId}`).update({ likeCount: FieldValue.increment(-1) }).catch(() => {});
});
exports.onCommentCreated = onDocumentCreated(`${postPath}/comments/{commentId}`, async ev => {
  const { ownerUid, postId } = ev.params; const c = ev.data.data();
  await db.doc(`users/${ownerUid}/communityPosts/${postId}`).update({ commentCount: FieldValue.increment(1) }).catch(() => {});
  if (c.ownerUid !== ownerUid) await notify(ownerUid, "comment", `${c.authorName} mengulas: "${clip(c.text, 80)}"`, { fromUid: c.ownerUid, postId });
});
exports.onCommentDeleted = onDocumentDeleted(`${postPath}/comments/{commentId}`, async ev => {
  const { ownerUid, postId } = ev.params;
  await db.doc(`users/${ownerUid}/communityPosts/${postId}`).update({ commentCount: FieldValue.increment(-1) }).catch(() => {});
});
exports.onFollowCreated = onDocumentCreated("users/{uid}/following/{targetUid}", async ev => {
  const { uid, targetUid } = ev.params;
  const batch = db.batch();
  batch.set(db.doc(`users/${targetUid}/followers/${uid}`), { uid, createdAt: FieldValue.serverTimestamp() });
  batch.set(db.doc(`profiles/${targetUid}`), { followerCount: FieldValue.increment(1) }, { merge: true });
  batch.set(db.doc(`profiles/${uid}`), { followingCount: FieldValue.increment(1) }, { merge: true });
  await batch.commit();
  const p = (await db.doc(`profiles/${uid}`).get()).data();
  await notify(targetUid, "follow", `${p?.username || "Seseorang"} mula mengikuti anda.`, { fromUid: uid });
});
exports.onFollowDeleted = onDocumentDeleted("users/{uid}/following/{targetUid}", async ev => {
  const { uid, targetUid } = ev.params;
  const batch = db.batch();
  batch.delete(db.doc(`users/${targetUid}/followers/${uid}`));
  batch.set(db.doc(`profiles/${targetUid}`), { followerCount: FieldValue.increment(-1) }, { merge: true });
  batch.set(db.doc(`profiles/${uid}`), { followingCount: FieldValue.increment(-1) }, { merge: true });
  await batch.commit();
});
exports.onMemberCreated = onDocumentCreated("groups/{gid}/members/{uid}", ev => db.doc(`groups/${ev.params.gid}`).update({ memberCount: FieldValue.increment(1) }).catch(() => {}));
exports.onMemberDeleted = onDocumentDeleted("groups/{gid}/members/{uid}", ev => db.doc(`groups/${ev.params.gid}`).update({ memberCount: FieldValue.increment(-1) }).catch(() => {}));
exports.onAnnouncementCreated = onDocumentCreated("announcements/{id}", ev => log("info", "announcement", clip(ev.data.data().title, 100)));

/* =====================================================================
   MAINTENANCE — padam pairing tamat tempoh (signaling WebRTC)
   ===================================================================== */
exports.cleanupPairings = onSchedule("every 30 minutes", async () => {
  const snap = await db.collectionGroup("pairings").where("expiresAt", "<", admin.firestore.Timestamp.now()).limit(200).get();
  for (const d of snap.docs) await db.recursiveDelete(d.ref);
  if (snap.size) await log("info", "cleanup.pairings", `${snap.size} pairing dipadam`);
});

/* =====================================================================
   GAME CONNECT — webhook kill (CS2 / Dota 2 GSI, game-bridge, Stream Deck)
   ===================================================================== */
const hookCol = () => db.collection("_private").doc("gameHooks").collection("items");
exports.gameHookCreate = onCall(CALL, async req => {
  const uid = needUser(req);
  if (!APP_URL()) throw new HttpsError("failed-precondition", "APP_URL belum ditetapkan dalam functions/.env.");
  const old = await hookCol().where("uid", "==", uid).get();
  const batch = db.batch(); old.forEach(d => batch.delete(d.ref));
  const token = crypto.randomBytes(24).toString("hex");
  const url = `${APP_URL()}/hook/game/${token}`;
  batch.set(hookCol().doc(token), { uid, createdAt: Date.now(), state: {}, lastAt: 0 });
  batch.set(db.doc(`users/${uid}/settings/gameHook`), { url, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  await log("info", "game.hook", "Webhook game dijana", { uid });
  return { url };
});
exports.gameHookRevoke = onCall(CALL, async req => {
  const uid = needUser(req);
  const old = await hookCol().where("uid", "==", uid).get();
  const batch = db.batch(); old.forEach(d => batch.delete(d.ref)); batch.delete(db.doc(`users/${uid}/settings/gameHook`));
  await batch.commit();
  return { ok: true };
});
function parseCS2(b, prev) {
  const p = b.player, prov = b.provider; const ev = [];
  if (!p || !prov || p.steamid !== prov.steamid) return { ev, state: prev };       // spectate / data tidak lengkap
  const kills = p.match_stats?.kills, rk = p.state?.round_kills || 0, rhs = p.state?.round_killhs || 0;
  if (typeof kills !== "number") return { ev, state: prev };
  if (typeof prev.kills === "number" && kills > prev.kills && kills - prev.kills <= 5 && (b.map?.phase || "live") === "live") {
    const n = kills - prev.kills; const hsGain = Math.max(0, rhs - (prev.rhs || 0));
    const w = Object.values(p.weapons || {}).find(x => x.state === "active");
    for (let i = 0; i < n; i++) ev.push({ game: "cs2", streak: rk ? Math.max(1, rk - n + i + 1) : null, headshot: i >= n - hsGain, weapon: (w?.name || "").replace(/^weapon_/, "") });
  }
  return { ev, state: { kills, rhs } };
}
function parseDota(b, prev) {
  const p = b.player; const ev = [];
  if (!p || typeof p.kills !== "number") return { ev, state: prev };
  if (typeof prev.kills === "number" && p.kills > prev.kills && p.kills - prev.kills <= 5) {
    for (let i = 0; i < p.kills - prev.kills; i++) ev.push({ game: "dota2", streak: p.kill_streak || null, headshot: false, weapon: b.hero?.name?.replace(/^npc_dota_hero_/, "") || "" });
  }
  return { ev, state: { kills: p.kills } };
}
exports.gameEvent = onRequest({ cors: false, maxInstances: 20 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("POST sahaja");
  const token = String(req.path.split("/").filter(Boolean).pop() || "");
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).send("not found");
  const ref = hookCol().doc(token);
  let body = req.body;
  if (typeof body === "string" || Buffer.isBuffer(body)) { try { body = JSON.parse(body.toString()); } catch { return res.status(400).send("JSON tidak sah"); } }
  if (!body || typeof body !== "object") return res.status(400).send("tiada body");
  try {
    const out = await db.runTransaction(async tx => {
      const s = await tx.get(ref); if (!s.exists) return null;
      const d = s.data(); const nowMs = Date.now();
      let ev = [], state = d.state || {};
      const appid = body.provider?.appid;
      if (appid === 730) { const r = parseCS2(body, state.cs2 || {}); ev = r.ev; state = { ...state, cs2: r.state }; }
      else if (appid === 570) { const r = parseDota(body, state.dota2 || {}); ev = r.ev; state = { ...state, dota2: r.state }; }
      else if (body.type === "kill") {
        if (nowMs - (d.lastAt || 0) < 150) return { uid: d.uid, ev: [] };              // had kadar asas
        ev = [{ game: clip(body.game || "generic", 20), streak: Number(body.streak) > 0 ? Math.min(99, Number(body.streak)) : null, headshot: body.headshot === true, weapon: clip(body.weapon, 40), victim: clip(body.victim, 40) }];
      }
      tx.update(ref, { state, lastAt: ev.length ? nowMs : d.lastAt || 0, lastSeen: nowMs });
      return { uid: d.uid, ev };
    });
    if (!out) return res.status(404).send("not found");
    for (const e of out.ev.slice(0, 5)) {
      await db.collection("users").doc(out.uid).collection("gameEvents").add({ type: "kill", source: "webhook", ...e, createdAt: FieldValue.serverTimestamp() });
    }
    return res.status(200).send("ok");
  } catch (e) { console.error(e); return res.status(500).send("error"); }
});

/* =====================================================================
   LIVE CHAT — YouTube liveChatMessages & Facebook live comments (API rasmi)
   ===================================================================== */
exports.platformChatPoll = onCall({ ...CALL, timeoutSeconds: 30 }, async req => {
  const uid = needUser(req); const p = req.data?.platform;
  if (p === "tiktok") throw new HttpsError("failed-precondition", "TikTok tidak menyediakan API rasmi untuk membaca komen LIVE.");
  if (!["youtube", "facebook"].includes(p)) throw new HttpsError("invalid-argument", "Platform tidak sah.");
  const { P, id, sec } = await providerCreds(p);
  const conn = (await connRef(uid, p).get()).data();
  if (!conn || conn.status !== "connected") throw new HttpsError("failed-precondition", "Platform belum disambung dan disahkan.");
  const tok = await loadToken(uid, p, P, id, sec);
  try {
    if (p === "youtube") {
      const H = { Authorization: `Bearer ${tok.access_token}` };
      let chatId = clip(req.data.chatId, 200);
      if (!chatId) {
        const r = await fetchJSON("https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=1", { headers: H });
        chatId = r.items?.[0]?.snippet?.liveChatId;
        if (!chatId) return { status: "no-live", pollMs: 30000 };
      }
      const q = new URLSearchParams({ liveChatId: chatId, part: "snippet,authorDetails", maxResults: "200" });
      if (req.data.pageToken) q.set("pageToken", clip(req.data.pageToken, 300));
      const r = await fetchJSON(`https://www.googleapis.com/youtube/v3/liveChat/messages?${q}`, { headers: H });
      const messages = (r.items || []).map(m => ({ id: "yt_" + m.id, platform: "youtube", author: m.authorDetails?.displayName, text: m.snippet?.displayMessage || "", at: m.snippet?.publishedAt,
        badge: m.authorDetails?.isChatOwner ? "owner" : m.authorDetails?.isChatModerator ? "mod" : m.authorDetails?.isChatSponsor ? "member" : "", amount: m.snippet?.superChatDetails?.amountDisplayString || m.snippet?.superStickerDetails?.amountDisplayString || "" }));
      return { status: "ok", messages, cursor: { chatId, pageToken: r.nextPageToken }, pollMs: Math.max(5000, r.pollingIntervalMillis || 5000) };
    }
    const pages = await fetchJSON(`https://graph.facebook.com/v19.0/me/accounts?fields=id,access_token&access_token=${encodeURIComponent(tok.access_token)}`);
    const page = pages.data?.find(x => x.id === conn.pageId) || pages.data?.[0];
    if (!page) return { status: "no-live", pollMs: 60000 };
    let liveId = clip(req.data.liveId, 60);
    if (!liveId) {
      const lv = await fetchJSON(`https://graph.facebook.com/v19.0/${page.id}/live_videos?broadcast_status=${encodeURIComponent('["LIVE"]')}&fields=id&limit=1&access_token=${encodeURIComponent(page.access_token)}`);
      liveId = lv.data?.[0]?.id;
      if (!liveId) return { status: "no-live", pollMs: 30000 };
    }
    const c = await fetchJSON(`https://graph.facebook.com/v19.0/${liveId}/comments?live_filter=no_filter&order=reverse_chronological&fields=id,from{name},message,created_time&limit=50&access_token=${encodeURIComponent(page.access_token)}`);
    const messages = (c.data || []).reverse().map(m => ({ id: "fb_" + m.id, platform: "facebook", author: m.from?.name || "Viewer", text: m.message || "", at: m.created_time }));
    return { status: "ok", messages, cursor: { liveId }, pollMs: 4000 };
  } catch (e) {
    if (e.status === 403 || e.status === 404) return { status: "no-live", pollMs: 30000 };
    throw new HttpsError("unavailable", `${p}: ${e.message}`);
  }
});

exports.cleanupGameEvents = onSchedule("every 6 hours", async () => {
  const cut = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000);
  const snap = await db.collectionGroup("gameEvents").where("createdAt", "<", cut).limit(500).get();
  const batch = db.batch(); snap.forEach(d => batch.delete(d.ref)); if (snap.size) await batch.commit();
});

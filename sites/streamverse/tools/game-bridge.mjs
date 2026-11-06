#!/usr/bin/env node
/* STREAMVERSE Game Bridge (percuma, jalan di PC gaming anda, Node.js 18+).
   Tiada server, tiada VPS, tiada Firebase Functions.

   Fungsi:
   1) Terima Game State Integration (CS2 / Dota 2) di http://127.0.0.1:3000/
   2) --lol : baca Live Client Data API rasmi League of Legends (https://127.0.0.1:2999)
   3) POST http://127.0.0.1:3000/kill  (Stream Deck, Touch Portal, skrip / mod sendiri)
   4) Hantar semua kill ke STREAMVERSE (dalam browser) melalui http://127.0.0.1:3000/events

   Guna:
     node game-bridge.mjs
     node game-bridge.mjs --lol
     node game-bridge.mjs --port 3100
*/
import http from "node:http";
import https from "node:https";

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const PORT = Number(opt("--port") || 3000);
const clients = new Set();
const state = { cs2: {}, dota2: {}, lastGeneric: 0 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

function emit(ev) {
  const line = "data: " + JSON.stringify(ev) + "\n\n";
  clients.forEach(res => res.write(line));
  console.log("KILL ->", ev.game, ev.headshot ? "(headshot)" : "", ev.weapon || ev.victim || "", "| pelayar disambung:", clients.size);
}

function parseCS2(b) {
  const p = b.player, prov = b.provider;
  if (!p || !prov || p.steamid !== prov.steamid) return [];          // spectate / data tidak lengkap
  const kills = p.match_stats && p.match_stats.kills;
  if (typeof kills !== "number") return [];
  const prev = state.cs2;
  const rk = (p.state && p.state.round_kills) || 0;
  const rhs = (p.state && p.state.round_killhs) || 0;
  const out = [];
  if (typeof prev.kills === "number" && kills > prev.kills && kills - prev.kills <= 5) {
    const n = kills - prev.kills;
    const hs = Math.max(0, rhs - (prev.rhs || 0));
    const w = Object.values(p.weapons || {}).find(x => x.state === "active");
    for (let i = 0; i < n; i++) {
      out.push({ type: "kill", game: "cs2", streak: rk ? Math.max(1, rk - n + i + 1) : null, headshot: i >= n - hs, weapon: ((w && w.name) || "").replace(/^weapon_/, "") });
    }
  }
  state.cs2 = { kills, rhs };
  return out;
}

function parseDota(b) {
  const p = b.player;
  if (!p || typeof p.kills !== "number") return [];
  const prev = state.dota2;
  const out = [];
  if (typeof prev.kills === "number" && p.kills > prev.kills && p.kills - prev.kills <= 5) {
    const hero = ((b.hero && b.hero.name) || "").replace(/^npc_dota_hero_/, "");
    for (let i = 0; i < p.kills - prev.kills; i++) out.push({ type: "kill", game: "dota2", streak: p.kill_streak || null, headshot: false, weapon: hero });
  }
  state.dota2 = { kills: p.kills };
  return out;
}

function handlePost(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    let j;
    try { j = JSON.parse(body); } catch { return; }
    if (!j || typeof j !== "object") return;
    const appid = j.provider && j.provider.appid;
    if (appid === 730) return parseCS2(j).forEach(emit);
    if (appid === 570) return parseDota(j).forEach(emit);
    if (j.type === "kill") {
      const now = Date.now();
      if (now - state.lastGeneric < 150) return;                      // had kadar asas
      state.lastGeneric = now;
      emit({
        type: "kill",
        game: String(j.game || "generic").slice(0, 20),
        streak: Number(j.streak) > 0 ? Math.min(99, Number(j.streak)) : null,
        headshot: j.headshot === true,
        weapon: String(j.weapon || "").slice(0, 40),
        victim: String(j.victim || "").slice(0, 40)
      });
    }
  });
}

http.createServer((req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (req.method === "GET" && req.url.startsWith("/events")) {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write('data: {"type":"hello"}\n\n');
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (req.method === "POST") return handlePost(req, res);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("STREAMVERSE Game Bridge OK");
}).listen(PORT, "127.0.0.1", () => {
  console.log("STREAMVERSE Game Bridge sedia di http://127.0.0.1:" + PORT);
  console.log("  Pelayar  : tekan Connect Bridge dalam STREAMVERSE > Game Connect & Kill");
  console.log("  CS2/Dota : set uri config GSI kepada http://127.0.0.1:" + PORT + "/");
  console.log("  Webhook  : POST http://127.0.0.1:" + PORT + "/kill  {\"type\":\"kill\",\"game\":\"mlbb\"}");
});

setInterval(() => clients.forEach(r => r.write(": ping\n\n")), 15000);

if (args.includes("--lol")) {
  // Sijil Riot pada 127.0.0.1:2999 ialah self-signed; hanya sambungan loopback ini yang tidak disahkan sijilnya.
  const agent = new https.Agent({ rejectUnauthorized: false });
  const get = path => new Promise((res, rej) => https.get({ host: "127.0.0.1", port: 2999, path, agent }, r => {
    let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
  }).on("error", rej));
  let lastId = -1, me = null, gameOn = false;
  console.log("  LoL      : menunggu perlawanan League of Legends...");
  setInterval(async () => {
    try {
      if (!me) me = await get("/liveclientdata/activeplayername");
      const ev = await get("/liveclientdata/eventdata");
      const list = ev.Events || [];
      if (!gameOn) { gameOn = true; lastId = list.length ? list[list.length - 1].EventID : -1; console.log("  LoL      : perlawanan dikesan, pemain:", me); return; }
      for (const e of list) {
        if (e.EventID <= lastId) continue;
        lastId = e.EventID;
        const mine = e.KillerName === me || e.KillerName === String(me).split("#")[0];
        if (e.EventName === "ChampionKill" && mine) emit({ type: "kill", game: "lol", streak: null, headshot: false, weapon: "", victim: e.VictimName || "" });
      }
    } catch { if (gameOn) { console.log("  LoL      : perlawanan tamat / API tidak tersedia."); gameOn = false; me = null; } }
  }, 1000);
}

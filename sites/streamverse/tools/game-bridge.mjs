#!/usr/bin/env node
/* STREAMVERSE game-bridge — jalankan di PC gaming (Node.js 18+).
   1) Penerima GSI tempatan (CS2 / Dota 2): game POST ke http://127.0.0.1:3000/ → bridge forward ke Webhook URL (HTTPS).
   2) --lol: baca Live Client Data API rasmi Riot (https://127.0.0.1:2999) dan hantar kill pemain anda.
   Guna:
     node game-bridge.mjs --forward "https://DOMAIN/hook/game/TOKEN"            (GSI relay)
     node game-bridge.mjs --lol --forward "https://DOMAIN/hook/game/TOKEN"      (League of Legends)
*/
import http from "node:http";
import https from "node:https";

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const FORWARD = opt("--forward");
const PORT = Number(opt("--port") || 3000);
if (!FORWARD || !/^https:\/\/.+\/hook\/game\/[a-f0-9]{48}$/.test(FORWARD)) {
  console.error("Ralat: --forward mesti Webhook URL STREAMVERSE (https://…/hook/game/<token>).");
  process.exit(1);
}
async function send(body) {
  try {
    const r = await fetch(FORWARD, { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
    if (!r.ok) console.warn("Webhook membalas", r.status);
  } catch (e) { console.warn("Gagal hantar:", e.message); }
}

if (args.includes("--lol")) {
  // Sijil Riot pada 127.0.0.1:2999 ialah self-signed; hanya sambungan localhost ini yang tidak disahkan sijilnya.
  const agent = new https.Agent({ rejectUnauthorized: false });
  const get = path => new Promise((res, rej) => https.get({ host: "127.0.0.1", port: 2999, path, agent }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on("error", rej));
  let lastId = -1, me = null, gameOn = false;
  console.log("Menunggu perlawanan League of Legends…");
  setInterval(async () => {
    try {
      if (!me) me = await get("/liveclientdata/activeplayername");
      const { Events = [] } = await get("/liveclientdata/eventdata");
      if (!gameOn) { gameOn = true; lastId = Events.length ? Events[Events.length - 1].EventID : -1; console.log("Perlawanan dikesan. Pemain:", me); return; }
      for (const e of Events) {
        if (e.EventID <= lastId) continue;
        lastId = e.EventID;
        const mine = (e.KillerName || "") === String(me).split("#")[0] || e.KillerName === me;
        if (e.EventName === "ChampionKill" && mine) { await send({ type: "kill", game: "lol", victim: e.VictimName || "" }); console.log("KILL →", e.VictimName); }
      }
    } catch { if (gameOn) { console.log("Perlawanan tamat / API tidak tersedia."); gameOn = false; me = null; } }
  }, 1000);
} else {
  http.createServer((req, res) => {
    if (req.method !== "POST") { res.writeHead(405); return res.end(); }
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => { res.writeHead(200); res.end("ok"); send(body); });
  }).listen(PORT, "127.0.0.1", () => console.log(`GSI relay sedia: http://127.0.0.1:${PORT}/ → ${FORWARD.replace(/[a-f0-9]{48}$/, "…")}`));
}

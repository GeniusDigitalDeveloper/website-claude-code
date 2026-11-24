// Jana "Buku Pautan" Flash Link: satu fail HTML untuk dibuka dalam chat (pratonton panel + 3 pautan, butang Buka dan Salin).
// Guna: node scripts/buku-pautan.mjs   (dari folder sites/flash-link)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "buku-pautan.html");
const AWAM = "https://genius-digital-flashlink-40bc9-5effc.web.app";
const LINKS = [
  { id: "awam", t: "Laman awam", d: "Halaman utama Flash Link untuk semua pengguna.", u: AWAM, ic: "globe" },
  { id: "admin", t: "Panel admin", d: "Kawal kolaborasi, teks, imej dan pengguna. Boleh dipasang sebagai app.", u: AWAM + "/admin", ic: "shield" },
  { id: "exe", t: "App Windows (.exe)", d: "Pemasang untuk laptop dan PC Windows. Muat turun terus.", u: "https://github.com/GeniusDigitalDeveloper/website-claude-code/releases/download/flashlink-latest/Flash-Link-Setup.exe", ic: "download" },
];
const version = JSON.parse(fs.readFileSync(path.join(ROOT, "public/version.json"), "utf8")).version || "";

// tangkapan skrin panel hidup (jika Playwright ada); jika gagal, buku tetap dijana tanpa gambar
let shot = "";
try {
  const require = createRequire(import.meta.url);
  let pw; try { pw = require("playwright"); } catch { pw = require(path.join(process.env.NODE_PATH || "", "playwright")); }
  const b = await pw.chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  await p.route(/e-solat|ipwho|waktusolat/, r => r.abort());
  await p.goto(AWAM, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {}); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: "#fabs,#cbtip,#cbpanel{display:none!important}" }); await p.waitForTimeout(400);
  shot = "data:image/jpeg;base64," + (await p.screenshot({ type: "jpeg", quality: 72 })).toString("base64"); await b.close();
} catch (e) { console.error("Tiada tangkapan skrin:", e.message); }

const IC = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
  ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
};
const svg = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const now = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }).format(new Date());

const html = `<title>Buku Pautan Flash Link</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root{color-scheme:dark;--bg:#07080d;--card:#11131c;--line:rgba(255,255,255,.12);--text:#F4F4F5;--mute:#A1A1AA;--red:#E11D2A;--blue:#38BDF8}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(60% 50% at 15% 0%,rgba(225,29,42,.28),transparent 70%),radial-gradient(60% 50% at 100% 30%,rgba(56,189,248,.2),transparent 70%),var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100%;padding-block:24px 40px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.wrap{max-width:860px;margin:0 auto}
h1{font-size:26px;margin:0}.sub{color:var(--mute);margin:4px 0 18px;font-size:13.5px}
.ver{display:inline-block;margin-left:8px;padding:2px 10px;border-radius:99px;background:rgba(56,189,248,.15);border:1px solid rgba(56,189,248,.45);color:#BAE6FD;font-size:12.5px;font-weight:700;vertical-align:middle}
.panel{border-radius:20px;overflow:hidden;border:1px solid var(--line);background:var(--card);box-shadow:0 24px 60px -30px #000}
.panel .bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:13px;color:var(--mute)}
.dot{width:10px;height:10px;border-radius:50%}.panel img{display:block;width:100%;height:auto}
.noshot{padding:40px;text-align:center;color:var(--mute)}
.list{display:grid;gap:12px;margin-top:18px}
.item{display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px 14px;align-items:center;padding:14px;border-radius:18px;background:var(--card);border:1px solid var(--line)}
.ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#ff4d5a,#9b0d17);color:#fff}
.item:nth-child(2) .ic{background:linear-gradient(145deg,#60a5fa,#1d4ed8)}.item:nth-child(3) .ic{background:linear-gradient(145deg,#34d399,#047857)}
.t{font-weight:700;font-size:16px}.d{color:var(--mute);font-size:13px}
.row{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
.url{flex:1 1 260px;min-width:0;padding:10px 12px;border-radius:12px;background:#0a0b11;border:1px solid var(--line);color:#E5E7EB;font:13px ui-monospace,Menlo,Consolas,monospace}
.btn{display:inline-flex;align-items:center;gap:7px;padding:0 16px;min-height:42px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.07);color:var(--text);font-weight:700;font-size:14px;text-decoration:none;cursor:pointer}
.btn:hover{background:rgba(255,255,255,.13)}.btn.red{background:var(--red);border-color:var(--red);color:#fff}.btn.red:hover{filter:brightness(1.1)}
.btn:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.foot{margin-top:18px;color:var(--mute);font-size:12.5px;text-align:center}
#toast{position:fixed;left:50%;bottom:22px;transform:translate(-50%,20px);opacity:0;padding:10px 16px;border-radius:12px;background:#0f2a1d;border:1px solid #34D399;color:#D1FAE5;font-weight:600;transition:.25s}
#toast.on{opacity:1;transform:translate(-50%,0)}
</style><div class="wrap">
<h1>Buku Pautan Flash Link <span class="ver">${esc(version)}</span></h1>
<p class="sub">Dikemas kini ${esc(now)}. Tekan Buka untuk pergi ke pautan, atau Salin untuk menyalinnya.</p>
<div class="panel"><div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span style="margin-left:6px">Pratonton panel: ${esc(AWAM.replace("https://", ""))}</span></div>
${shot ? `<a href="${AWAM}" target="_blank" rel="noopener" aria-label="Buka laman awam"><img src="${shot}" alt="Pratonton laman utama Flash Link"></a>` : `<div class="noshot">Pratonton tidak tersedia. Tekan Buka pada Laman awam di bawah.</div>`}</div>
<div class="list">
${LINKS.map(l => `<section class="item"><span class="ic">${svg(l.ic, 22)}</span><div><div class="t">${esc(l.t)}</div><div class="d">${esc(l.d)}</div></div>
<div class="row"><input class="url" id="u-${l.id}" value="${esc(l.u)}" readonly aria-label="Pautan ${esc(l.t)}"><a class="btn red" href="${esc(l.u)}" target="_blank" rel="noopener">${svg("ext", 16)} Buka</a><button class="btn" type="button" data-copy="u-${l.id}">${svg("copy", 16)} Salin</button></div></section>`).join("\n")}
</div>
<p class="foot">Genius Digital Flash Link</p></div>
<div id="toast" role="status" aria-live="polite"></div>
<script>
const toast = t => { const e = document.getElementById("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("on"), 1800); };
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-copy]"); if (!b) return; const inp = document.getElementById(b.dataset.copy), v = inp.value;
  try { await navigator.clipboard.writeText(v); toast("Pautan disalin ✓"); return; } catch {}
  inp.focus(); inp.select(); inp.setSelectionRange(0, v.length);
  try { if (document.execCommand("copy")) { toast("Pautan disalin ✓"); return; } } catch {}
  toast("Pautan dipilih. Tekan Ctrl+C (atau Cmd+C) untuk salin.");
});
</script>`;
fs.writeFileSync(OUT, html);
console.log("Buku pautan:", OUT, Math.round(html.length / 1024) + " KB", shot ? "(dengan pratonton)" : "(tanpa pratonton)");

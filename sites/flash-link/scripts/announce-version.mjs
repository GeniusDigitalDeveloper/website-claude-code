// Umumkan versi terkini kepada SEMUA tetingkap Flash Link yang sedang terbuka (masa nyata).
// Tulis flashlink/stats/version dan versionNotes dalam Realtime Database (hanya nod Flash Link).
// Setiap pelanggan yang membuka app menerima bar "Versi baharu tersedia" serta-merta, tanpa tekan apa-apa.
// Guna SELEPAS deploy hosting:   FIREBASE_TOKEN=... node scripts/announce-version.mjs
import { readFileSync } from "node:fs";

const tok = process.env.FIREBASE_TOKEN;
if (!tok) throw new Error("FIREBASE_TOKEN tiada");
const vj = JSON.parse(readFileSync(new URL("../public/version.json", import.meta.url), "utf8"));

const tr = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token", refresh_token: tok,
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com", // klien awam firebase-tools
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
  }),
});
const { access_token } = await tr.json();
if (!access_token) throw new Error("Gagal dapat token akses");

const base = "https://genius-digital-40bc9-default-rtdb.asia-southeast1.firebasedatabase.app/flashlink/stats";
for (const [k, v] of [["versionNotes", vj.notes || ""], ["version", vj.version]]) {
  const r = await fetch(`${base}/${k}.json`, { method: "PUT", headers: { authorization: "Bearer " + access_token }, body: JSON.stringify(v) });
  if (!r.ok) throw new Error(`${k}: HTTP ${r.status}`);
}
console.log("Diumumkan kepada semua pengguna:", vj.version);

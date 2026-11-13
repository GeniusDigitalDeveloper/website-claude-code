// Bina ZIP versi web Flash Link (sedia untuk Netlify) daripada sites/flash-link/public.
// Guna: node scripts/make-zip.mjs   -> out/Flash-Link-Web.zip
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(root, "..", "flash-link", "public");
const out = join(root, "out");
const dir = join(out, "Flash-Link-Web");
const ver = JSON.parse(readFileSync(join(src, "version.json"), "utf8")).version;

rmSync(out, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
cpSync(src, dir, { recursive: true });

// Netlify: laluan /username mesti memuatkan index.html
writeFileSync(join(dir, "_redirects"), "/*    /index.html   200\n");
writeFileSync(join(dir, "netlify.toml"), `[[headers]]\n  for = "/index.html"\n  [headers.values]\n    Cache-Control = "no-cache"\n\n[[headers]]\n  for = "/version.json"\n  [headers.values]\n    Cache-Control = "no-store"\n`);
writeFileSync(join(dir, "BACA-SAYA.txt"), `GENIUS DIGITAL FLASH LINK — versi web (${ver})
=====================================

CARA PASANG DI NETLIFY (2 minit)
1. Ekstrak fail ZIP ini.
2. Buka https://app.netlify.com/drop dan seret folder "Flash-Link-Web" ke situ.
3. Netlify beri satu pautan (contoh: nama-anda.netlify.app). Itulah aplikasi anda.

PENTING — LOG MASUK GOOGLE
Tambah domain Netlify anda dalam Firebase Console > Authentication > Settings > Authorized domains.
Tanpa itu, log masuk Google tidak berfungsi (log masuk e-mel tetap berfungsi).

KEMAS KINI
Aplikasi ada butang "Kemas kini" (atas) dan pautan "Semak kemas kini" (bawah). Apabila versi baharu diterbitkan, bar "Versi baharu tersedia" muncul dengan butang memuat turun ZIP terbaru.
Ganti fail di Netlify: Deploys > seret folder baharu ke kawasan "Drag and drop".
(Versi EXE Windows dikemas kini serta-merta tanpa pasang semula.)

Versi ZIP ini: ${ver}
`);

if (!existsSync(dir)) throw new Error("folder keluaran tiada");
execSync(`zip -r -q Flash-Link-Web.zip Flash-Link-Web`, { cwd: out, stdio: "inherit" });
console.log("Siap:", join(out, "Flash-Link-Web.zip"), "(" + ver + ")");

// Sahkan kiraan Hijrah dalam repo terhadap Kalkulator JAKIM (langsung). Guna: node scripts/verify-hijri.mjs [bilangan=120]
import { hijriFromGregorian, HIJRI_MONTHS } from "../lib/hijri-core.mjs";
const N = +process.argv[2] || 120; let ok = 0, bad = [];
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "").replace("rabiulawwal", "rabiulawal").replace("rabiulakhir", "rabiulakhir").replace("jamadilawwal", "jamadilawal").replace("ramadhan", "ramadan").replace("syaban", "syaaban").replace("zulqaidah", "zulkaedah");
for (let i = 0; i < N; i++) {
  const t = Date.UTC(2000, 0, 1) + Math.floor(Math.random() * (Date.UTC(2026, 11, 31) - Date.UTC(2000, 0, 1))); const dt = new Date(t), iso = dt.toISOString().slice(0, 10);
  const r = await (await fetch(`https://www.e-solat.gov.my/index.php?r=esolatApi/istilahiCalculation&date=${iso}`)).json();
  const h = hijriFromGregorian(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  const same = r.hari === h.d && r.tahun === h.y && norm(r.namabulan) === norm(HIJRI_MONTHS[h.m - 1]);
  same ? ok++ : bad.push([iso, `${r.hari} ${r.namabulan} ${r.tahun}`, `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y}`]);
}
console.log(`${ok}/${N} sepadan dengan JAKIM`); if (bad.length) { console.log("Tidak sepadan:", bad.slice(0, 10)); process.exit(1); }

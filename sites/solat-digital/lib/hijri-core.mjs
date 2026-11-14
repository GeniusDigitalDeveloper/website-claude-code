// Kalendar Hijrah kaedah ISTILAHI (jadual, kitaran 30 tahun) seperti Kalkulator JAKIM (e-Falak).
// Sumber rujukan: https://www.e-solat.gov.my/index.php?siteId=27&pageId=39  (esolatApi/istilahiCalculation)
// Disahkan sepadan 2912/2912 tarikh JAKIM (1999-2026). Tahun lompat dalam kitaran 30 tahun: 2,5,7,10,13,16,18,21,24,26,29.
const LEAP = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);
const yearLen = (y) => (LEAP.has(((y - 1) % 30) + 1) ? 355 : 354);
const CYCLE = 10631; // 30 tahun
/** Nombor hari Julian (tengah hari) bagi tarikh Gregorian. */
export const jdn = (y, m, d) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };
/** Tarikh Hijrah {d, m, y} (m: 1-12) bagi tarikh Gregorian. */
export function hijriFromGregorian(y, m, d) {
  let n = jdn(y, m, d) - 1948440; const c = Math.floor(n / CYCLE); n -= c * CYCLE; let yr = c * 30 + 1;
  while (n >= yearLen(yr)) { n -= yearLen(yr); yr++; }
  const ml = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, yearLen(yr) === 355 ? 30 : 29]; let mo = 0;
  while (n >= ml[mo]) { n -= ml[mo]; mo++; }
  return { d: n + 1, m: mo + 1, y: yr };
}
export const HIJRI_MONTHS = ["Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"];

// Masa Malaysia (Asia/Kuala_Lumpur, UTC+8, tiada DST). Semua kunci hari/bulan dikira dari zon ini,
// BUKAN dari jam peranti pengguna, supaya reset tepat pada 12:00 tengah malam waktu Malaysia.
export const KL_TZ = 'Asia/Kuala_Lumpur';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: KL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Pecahkan masa kepada komponen waktu Malaysia. */
export function klParts(date = new Date()) {
  const o = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o; // {year, month, day, hour, minute, second}
}

const p2 = (n) => String(n).padStart(2, '0');

/** Kunci hari: 'YYYY-MM-DD' (waktu Malaysia). Berubah tepat pada 00:00 MYT. */
export function dayKey(date = new Date()) {
  const k = klParts(date);
  return `${k.year}-${p2(k.month)}-${p2(k.day)}`;
}

/** Kunci bulan: 'YYYY-MM' (waktu Malaysia). Berubah pada 00:00 MYT hari pertama bulan baharu. */
export function monthKey(date = new Date()) {
  const k = klParts(date);
  return `${k.year}-${p2(k.month)}`;
}

// Malaysia = UTC+8 sepanjang tahun → 00:00 MYT = 16:00 UTC hari sebelumnya.
const MYT_OFFSET_MS = 8 * 3600 * 1000;

/** Masa (ms) sehingga reset harian seterusnya (00:00 MYT). */
export function msUntilNextDay(date = new Date()) {
  const myt = date.getTime() + MYT_OFFSET_MS;
  return 86400000 - (myt % 86400000);
}

/** Tarikh (Date UTC) bagi 00:00 MYT hari pertama bulan hadapan. */
export function nextMonthStart(date = new Date()) {
  const k = klParts(date);
  const y = k.month === 12 ? k.year + 1 : k.year;
  const m = k.month === 12 ? 1 : k.month + 1;
  return new Date(Date.UTC(y, m - 1, 1) - MYT_OFFSET_MS);
}

export const msUntilNextMonth = (date = new Date()) => nextMonthStart(date).getTime() - date.getTime();

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return (d ? `${d}d ` : '') + `${p2(hh)}:${p2(mm)}:${p2(ss)}`;
}

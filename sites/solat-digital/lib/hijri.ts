import { HIJRI_MONTHS, hijriFromGregorian } from "./hijri-core.mjs";

/**
 * Tarikh Hijrah untuk dipaparkan, dikira dengan kaedah istilahi JAKIM (lihat hijri-core.mjs).
 * Dikira daripada jam Malaysia yang disegerakkan dengan pelayan JAKIM, jadi sama pada setiap TV, panel masjid dan panel Owner.
 * mode "jakim" (lalai): ikut tarikh sivil, bertukar tengah malam (seperti Kalkulator JAKIM).
 * mode "maghrib" (pilihan): bertukar pada waktu Maghrib (selepas Maghrib = hari Hijrah berikutnya).
 */
export function hijriText(dayISO: string, nowSec: number, maghribSec: number, mode: "maghrib" | "jakim" = "jakim"): string {
  const m = dayISO.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return "";
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (mode === "maghrib" && nowSec >= maghribSec) dt.setUTCDate(dt.getUTCDate() + 1);
  const h = hijriFromGregorian(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  return `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y}H`;
}

import { zInfo } from "./zones";
export type Times = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };
export const PRAYERS = [
  { k: "fajr", n: "Subuh", ar: "الفجر", pop: "subuh", place: "Masjidil Haram, Makkah", credit: "Moataz Egbaria, CC BY-SA 3.0" },
  { k: "dhuhr", n: "Zuhur", ar: "الظهر", pop: "zuhur", place: "Masjid Nabawi, Madinah", credit: "TheHadiRahim, CC0" },
  { k: "asr", n: "Asar", ar: "العصر", pop: "asar", place: "Masjid Kristal, Terengganu", credit: "Ikhwan Salleh, CC BY-SA 4.0" },
  { k: "maghrib", n: "Maghrib", ar: "المغرب", pop: "maghrib", place: "Masjid Sultan Salahuddin Abdul Aziz Shah", credit: "Ezry Abdul Rahman, CC BY 2.0" },
  { k: "isha", n: "Isyak", ar: "العشاء", pop: "isyak", place: "Masjid Wilayah Persekutuan", credit: "Uwe Aranas, CC BY-SA 3.0" },
] as const;

export const clk = { off: 0 };
export const klNow = () => new Date(Date.now() + clk.off);
export const klDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const klSec = (d: Date) => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d).split(":").map(Number); return p[0] * 3600 + p[1] * 60 + p[2]; };
const API = "https://www.e-solat.gov.my/index.php?r=esolatApi/TakwimSolat&period=today&zone=";

export async function syncClock() {
  try {
    const j = await (await fetch(API + "SGR01", { cache: "no-store" })).json();
    const m = String(j.serverTime || "").match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
    if (m) clk.off = new Date(`${m[1]}T${m[2]}+08:00`).getTime() - Date.now();
  } catch {}
}
async function zoneFromCoords(lat: number, lon: number) {
  const j = await (await fetch(`https://api.waktusolat.app/zones/${lat}/${lon}`)).json();
  if (!j.zone || !zInfo(j.zone)) throw new Error("zon"); return j.zone as string;
}
const geoZone = () => new Promise<string>((res, rej) => {
  if (!navigator.geolocation) return rej(new Error("tiada"));
  navigator.geolocation.getCurrentPosition((p) => zoneFromCoords(p.coords.latitude, p.coords.longitude).then(res, rej), rej, { timeout: 12000, maximumAge: 600000 });
});
export async function detectZone(): Promise<string> {
  try { const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName }); if (st?.state === "granted") return await geoZone(); } catch {}
  try { const g = await (await fetch("https://ipwho.is/")).json(); if (g.success && g.country_code === "MY") return await zoneFromCoords(g.latitude, g.longitude); } catch {}
  return "SGR01";
}
export async function loadTimes(zone: string): Promise<Times> {
  const key = `ss_pt_${zone}_${klDay(klNow())}`;
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c) return c; } catch {}
  const j = await (await fetch(API + zone, { cache: "no-store" })).json(); const t = j.prayerTime?.[0];
  if (!t) throw new Error("tiada data");
  const out: Times = { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
  try { localStorage.setItem(key, JSON.stringify(out)); } catch {} return out;
}
export const secOf = (t: string) => { const [h, m, s = 0] = t.split(":").map(Number); return h * 3600 + m * 60 + s; };
export const to12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
export const hms = (d: number) => `${String(Math.floor(d / 3600)).padStart(2, "0")}:${String(Math.floor((d % 3600) / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
export function prayIdx(t: Times, sec: number) {
  const ts = PRAYERS.map((p) => secOf(t[p.k])); let cur = -1; ts.forEach((x, i) => { if (x <= sec) cur = i; });
  let ni = ts.findIndex((x) => x > sec), diff, tomorrow = false;
  if (ni < 0) { ni = 0; diff = ts[0] + 86400 - sec; tomorrow = true; } else diff = ts[ni] - sec;
  return { sec, ts, cur, ni, diff, tomorrow };
}

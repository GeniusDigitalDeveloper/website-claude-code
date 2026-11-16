import { secOf, type Item } from "./prayer";
/** Jadual paparan TV (minit). Semua boleh diubah oleh pengurus masjid. */
export type Sched = {
  slideMin: number; prayerMin: number; leadMin: number; finalMin: number; iqamahMin: number; solatMin: number; khutbahMin: number; jSolatMin: number;
  raya?: { on?: boolean; fitri?: string; haji?: string; time?: string; solatMin?: number; khutbahMin?: number };
};
export const DEF_SCHED: Sched = { slideMin: 10, prayerMin: 5, leadMin: 10, finalMin: 5, iqamahMin: 10, solatMin: 10, khutbahMin: 30, jSolatMin: 10 };
export type View = "full" | "slides" | "final" | "iqamah" | "solat" | "khutbah" | "jwait" | "jlead" | "raya" | "rkhutbah";
export type Phase = { view: View; remain: number; label?: string };
type In = { sec: number; day: string; fri: boolean; items: Item[]; cur: number; ni: number; diff: number; hasSlides: boolean; sc: Sched };
const n = (v: unknown, d: number, lo = 1, hi = 180) => { const x = Number(v); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
/** Tentukan skrin TV pada masa ini mengikut kitaran: slaid ↔ waktu solat, 10 minit sebelum azan, azan, iqamah, solat berlangsung, khutbah Jumaat dan hari raya. */
export function computePhase(i: In): Phase {
  const sc = { ...DEF_SCHED, ...i.sc };
  const slideS = n(sc.slideMin, 10) * 60, prayS = n(sc.prayerMin, 5) * 60, leadS = n(sc.leadMin, 10, 1, 60) * 60, finS = n(sc.finalMin, 5, 1, 60) * 60;
  const iqS = n(sc.iqamahMin, 10) * 60, solS = n(sc.solatMin, 10) * 60, khS = n(sc.khutbahMin, 30) * 60, jsS = n(sc.jSolatMin, 10) * 60;
  const r = sc.raya;
  if (r?.on && (i.day === r.fitri || i.day === r.haji)) {
    const t0 = secOf(/^\d{1,2}:\d{2}/.test(r.time || "") ? r.time! : "08:30"), rs = n(r.solatMin, 10) * 60, rk = n(r.khutbahMin, 30) * 60;
    const nm = i.day === r.fitri ? "Aidilfitri" : "Aidiladha";
    if (i.sec >= t0 && i.sec < t0 + rs) return { view: "raya", remain: t0 + rs - i.sec, label: nm };
    if (i.sec >= t0 + rs && i.sec < t0 + rs + rk) return { view: "rkhutbah", remain: t0 + rs + rk - i.sec, label: nm };
  }
  const cur = i.cur >= 0 ? i.items[i.cur] : null; let anchor = 0;
  if (cur) {
    const since = i.sec - cur.sec;
    if (cur.k === "jumaat") {
      if (since < iqS) return { view: "jwait", remain: iqS - since, label: cur.n };
      if (since < iqS + khS) return { view: "khutbah", remain: iqS + khS - since, label: cur.n };
      if (since < iqS + khS + jsS) return { view: "solat", remain: iqS + khS + jsS - since, label: cur.n };
      anchor = cur.sec + iqS + khS + jsS;
    } else {
      if (since < iqS) return { view: "iqamah", remain: iqS - since, label: cur.n };
      if (since < iqS + solS) return { view: "solat", remain: iqS + solS - since, label: cur.n };
      anchor = cur.sec + iqS + solS;
    }
  }
  const nx = i.items[i.ni];
  if (i.diff <= finS) return { view: "final", remain: i.diff, label: nx?.n };
  if (i.diff <= leadS) return { view: nx?.k === "jumaat" ? "jlead" : "full", remain: i.diff, label: nx?.n };
  if (!i.hasSlides) return { view: "full", remain: 0 };
  const cyc = prayS + slideS, pos = Math.max(0, i.sec - anchor) % cyc;
  return pos < prayS ? { view: "full", remain: prayS - pos } : { view: "slides", remain: cyc - pos };
}

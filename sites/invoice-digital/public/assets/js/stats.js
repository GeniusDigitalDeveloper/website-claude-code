// Statistik awam footer — hari/bulan ikut waktu Malaysia (Asia/Kuala_Lumpur).
// Kunci harian "YYYY-MM-DD" dan bulanan "YYYY-MM" dikira dalam waktu Malaysia, jadi reset tepat pada 12 tengah malam MYT
// dan permulaan bulan MYT. Keseluruhan = kaunter kumulatif (tidak pernah reset).
import { db, F } from "./firebase.js";
import { todayMY, monthMY } from "./util.js";

export async function trackVisit() {
  const day = todayMY(), mon = monthMY();
  let seen = null; try { seen = localStorage.getItem("inv_visit_day"); } catch {}
  if (seen === day) return; // satu pelawat (pelayar) dikira sekali sehari
  try {
    await Promise.all([
      F.setDoc(F.doc(db, "inv_stats", "total"), { visits: F.increment(1) }, { merge: true }),
      F.setDoc(F.doc(db, "inv_stats_daily", day), { visits: F.increment(1) }, { merge: true }),
      F.setDoc(F.doc(db, "inv_stats_monthly", mon), { visits: F.increment(1) }, { merge: true }),
    ]);
    try { localStorage.setItem("inv_visit_day", day); } catch {}
  } catch (e) { console.warn("stats", e.code); }
}
export async function loadStats() {
  const g = async (c, id, k) => { try { const s = await F.getDoc(F.doc(db, c, id)); return s.exists() ? s.data()[k] || 0 : 0; } catch { return null; } };
  const [users, today, month, total] = await Promise.all([
    g("inv_stats", "users", "count"), g("inv_stats_daily", todayMY(), "visits"), g("inv_stats_monthly", monthMY(), "visits"), g("inv_stats", "total", "visits"),
  ]);
  return { users, today, month, total };
}

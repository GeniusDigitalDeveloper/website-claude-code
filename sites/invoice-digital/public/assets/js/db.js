import { db, F } from "./firebase.js";
import { yearMY } from "./util.js";

export const colRef = (uid, name) => F.collection(db, "inv_users", uid, name);
export const docRef = (uid, name, id) => F.doc(db, "inv_users", uid, name, id);

export async function listAll(uid, name, max = 1000) {
  const q = F.query(colRef(uid, name), F.orderBy("createdAt", "desc"), F.limit(max));
  const s = await F.getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// Stale-while-revalidate: jika senarai ini pernah dimuat pada peranti ini, paparkan dari cache serta-merta, kemudian segarkan dari pelayan.
const swrKey = (uid, name) => `inv_swr_${uid}_${name}`;
export async function listSWR(uid, name, onData, max = 1000) {
  const q = F.query(colRef(uid, name), F.orderBy("createdAt", "desc"), F.limit(max)); const map = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
  let done = false, seen = false; try { seen = localStorage.getItem(swrKey(uid, name)) === "1"; } catch {}
  if (seen) F.getDocsFromCache(q).then((c) => { if (!done && !c.empty) onData(map(c), false); }).catch(() => {});
  const s = await F.getDocs(q); done = true; try { localStorage.setItem(swrKey(uid, name), "1"); } catch {}
  const rows = map(s); onData(rows, true); return rows;
}
export async function getOne(uid, name, id) {
  const s = await F.getDoc(docRef(uid, name, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function create(uid, name, data) {
  const ref = await F.addDoc(colRef(uid, name), { ...data, ownerUid: uid, createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() });
  return ref.id;
}
export async function update(uid, name, id, data) {
  await F.updateDoc(docRef(uid, name, id), { ...data, updatedAt: F.serverTimestamp() });
}
export const remove = (uid, name, id) => F.deleteDoc(docRef(uid, name, id));

export async function getMeta(uid, id) {
  const s = await F.getDoc(docRef(uid, "meta", id)); return s.exists() ? s.data() : {};
}
export async function setMeta(uid, id, data) {
  await F.setDoc(docRef(uid, "meta", id), { ...data, ownerUid: uid, updatedAt: F.serverTimestamp() });
}

// Format nombor: INV-{YYYY}-{NNNN}
export function formatNumber(fmt, n, year) {
  return fmt.replace(/\{YYYY\}/g, year).replace(/\{YY\}/g, String(year).slice(2)).replace(/\{(N+)\}/g, (_, ns) => String(n).padStart(ns.length, "0"));
}
const KIND_COL = { invoice: "invoices", quotation: "quotations", receipt: "receipts" };

// Cipta dokumen bernombor dalam SATU transaksi: kaunter per pengguna/jenis/tahun naik tepat +1, jadi tiada nombor bertindih
// walaupun dua tab/peranti mencipta serentak (transaksi akan cuba semula jika kaunter berubah).
// pre(tx) -> ctx (bacaan tambahan, mesti sebelum tulisan); build(ctx, number) -> { data, writes: [(tx)=>void] }
export async function createNumbered(uid, kind, fmt, pre, build) {
  const year = yearMY();
  const cref = docRef(uid, "counters", `${kind}_${year}`);
  const dref = F.doc(colRef(uid, KIND_COL[kind]));
  let number = "";
  await F.runTransaction(db, async (tx) => {
    const cs = await tx.get(cref);
    const ctx = pre ? await pre(tx) : null;
    const n = (cs.exists() ? cs.data().n : 0) + 1;
    number = formatNumber(fmt, n, year);
    const { data, writes = [] } = build(ctx, number);
    tx.set(cref, { n, kind, year: Number(year), ownerUid: uid });
    tx.set(dref, { ...data, number, ownerUid: uid, createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp() });
    writes.forEach((w) => w(tx));
  });
  return { id: dref.id, number };
}

export async function getAppSettings() {
  try { const s = await F.getDoc(F.doc(db, "inv_settings", "app")); return s.exists() ? s.data() : {}; } catch { return {}; }
}

// Log aktiviti ringkas untuk dashboard admin (tiada data sensitif). Gagal senyap jika tidak dapat ditulis.
export async function logActivity(user, kind, number) {
  try { await F.addDoc(F.collection(db, "inv_activity"), { uid: user.uid, email: user.email || "", kind, number: number || "", at: F.serverTimestamp() }); } catch (e) { console.warn("activity", e.code); }
}

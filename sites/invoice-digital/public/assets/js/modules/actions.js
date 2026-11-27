import { buildPdf, printPdf, sharePdf } from "../pdf.js";
import { toast, download, todayMY, calc, num, round2 } from "../util.js";
import { t } from "../i18n.js";
import { F } from "../firebase.js";
import { colRef, docRef } from "../db.js";

// Resit: jumlah invois / dibayar setakat ini / baki dikira dinamik daripada SEMUA resit invois (kekal betul walaupun resit diedit/dipadam).
export async function receiptContext(ctx, r, cache = {}) {
  if (!r.invoiceId) return r;
  const c = (cache[r.invoiceId] ||= (async () => {
    const [is, rs] = await Promise.all([F.getDoc(docRef(ctx.uid, "invoices", r.invoiceId)), F.getDocs(F.query(colRef(ctx.uid, "receipts"), F.where("invoiceId", "==", r.invoiceId)))]);
    return { inv: is.exists() ? is.data() : null, receipts: rs.docs.map((d) => ({ id: d.id, ...d.data() })) };
  })());
  const { inv, receipts } = await c; if (!inv) return r;
  const secs = (x) => (x.createdAt && x.createdAt.seconds) || 9e12;
  const sorted = receipts.slice().sort((a, b) => (a.date === b.date ? secs(a) - secs(b) : a.date < b.date ? -1 : 1));
  let run = 0, idx = 0; for (const x of sorted) { run += num(x.amount); idx++; if (x.id === r.id) break; }
  const total = calc(inv).total;
  return { ...r, invoiceTotal: total, paidToDate: round2(run), balanceAfter: round2(Math.max(total - run, 0)), seq: idx };
}

// o.pdf = PDF sedia ada (untuk cetak pukal: dokumen digabung dalam satu fail); o.cache = cache resit per invois
export async function makePdf(ctx, type, doc, o = {}) {
  const company = await ctx.getCompany();
  const d = type === "receipt" ? await receiptContext(ctx, doc, o.cache || {}) : doc;
  return buildPdf(type, d, company, { template: d.template, color: d.color, pdf: o.pdf });
}
// Cache PDF terakhir (ikut dokumen + masa kemas kini + profil syarikat) -> klik kedua serta-merta
const CACHE = new Map(); let running = null;
const stamp = (x) => (x && x.updatedAt && (x.updatedAt.seconds || x.updatedAt.toMillis && x.updatedAt.toMillis())) || "";
async function cachedPdf(ctx, type, doc) {
  const company = await ctx.getCompany();
  const key = [type, doc.id || doc.number, stamp(doc), stamp(company), doc.amount || "", doc.paidToDate || ""].join("|");
  let hit = CACHE.get(key);
  if (!hit) { hit = { pdf: await makePdf(ctx, type, doc) }; if (type !== "receipt") { CACHE.set(key, hit); if (CACHE.size > 12) CACHE.delete(CACHE.keys().next().value); } }
  return hit;
}
// Buka tetingkap pratonton SERTA-MERTA (dalam klik pengguna) supaya tidak disekat pelayar; PDF dimasukkan apabila siap
export async function previewPdf(make) {
  const w = window.open("", "_blank");
  try { if (w) w.document.write(`<title>PDF</title><p style="font-family:sans-serif;padding:24px;color:#475569">${t("pdf_making")}</p>`); } catch { /* abaikan */ }
  try { const pdf = await make(); const url = URL.createObjectURL(pdf.output("blob")); if (w && !w.closed) w.location.href = url; else window.open(url, "_blank"); }
  catch (e) { try { w && w.close(); } catch { /* abaikan */ } throw e; }
}
export async function pdfAction(ctx, type, doc, what, btn) {
  if (running) return toast(t("pdf_wait")); // elak klik berulang menjana banyak kali
  running = what; if (btn) { btn.disabled = true; btn.classList.add("busy"); }
  try {
    const name = `${doc.number}.pdf`;
    if (what === "preview") { await previewPdf(async () => (await cachedPdf(ctx, type, doc)).pdf); return; }
    const hit = await cachedPdf(ctx, type, doc); const pdf = hit.pdf;
    if (what === "download") { pdf.save(name); toast(t("pdf_done")); }
    else if (what === "print") await printPdf(pdf, hit);
    else if (what === "share") {
      const r = await sharePdf(pdf, name, `${doc.number}`);
      if (r === "unsupported") { download(pdf.output("blob"), name); const msg = encodeURIComponent(`${doc.number} - ${(doc.customer && doc.customer.name) || ""}`); toast(t("share_fallback")); window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener"); }
    }
  } catch (e) { console.error(e); toast(t("pdf_fail"), "err"); }
  finally { running = null; if (btn) { btn.disabled = false; btn.classList.remove("busy"); } }
}

// ---- Pukal: items = [{ k: "invoice"|"quotation"|"receipt", doc }]
export async function bulkPrint(ctx, items) {
  if (running) return toast(t("pdf_wait")); running = "bulk";
  try {
    const cache = {}; let pdf = null;
    for (const it of items) pdf = await makePdf(ctx, it.k, it.doc, { cache, pdf }); // semua dokumen dalam SATU PDF untuk dicetak sekali gus
    await printPdf(pdf);
  } finally { running = null; }
}
let zipP;
const loadZip = () => (zipP ||= new Promise((res, rej) => {
  if (window.JSZip) return res(window.JSZip);
  const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload = () => res(window.JSZip); s.onerror = () => { zipP = null; rej(new Error("JSZip")); }; document.head.append(s);
}));
export async function bulkZip(ctx, items) {
  const JSZip = await loadZip(); const zip = new JSZip(); const cache = {}; const used = new Set();
  for (const it of items) {
    const pdf = await makePdf(ctx, it.k, it.doc, { cache }); let name = `${it.doc.number}.pdf`; if (used.has(name)) name = `${it.k}-${name}`; used.add(name);
    zip.file(name, pdf.output("arraybuffer"));
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  download(blob, `dokumen-${todayMY()}.zip`); toast(t("zip_done", { n: items.length }));
}

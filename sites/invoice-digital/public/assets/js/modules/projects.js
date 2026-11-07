// Padam projek dengan betul: resit memulihkan baki invoice; invoice memadam resit berkaitan; invoice daripada quotation melepaskan quotation.
import { F, db } from "../firebase.js";
import { colRef, docRef, remove } from "../db.js";
import { calc, round2, num } from "../util.js";

export async function deleteProject(ctx, kind, doc) {
  if (kind === "receipt") {
    const rref = docRef(ctx.uid, "receipts", doc.id);
    await F.runTransaction(db, async (tx) => {
      let inv = null, iref = null;
      if (doc.invoiceId) { iref = docRef(ctx.uid, "invoices", doc.invoiceId); const s = await tx.get(iref); if (s.exists()) inv = s.data(); }
      tx.delete(rref);
      if (inv) {
        const paid = round2(Math.max(num(inv.receiptsPaid) - num(doc.amount), 0)); const c = calc({ ...inv, receiptsPaid: paid }); let status = inv.status;
        if (["paid", "partial", "unpaid", "sent"].includes(status)) status = c.balance <= 0.004 ? "paid" : paid > 0.004 ? "partial" : status === "partial" || status === "paid" ? "unpaid" : status;
        tx.update(iref, { receiptsPaid: paid, status, updatedAt: F.serverTimestamp() });
      }
    });
    return;
  }
  if (kind === "invoice") {
    const rs = await F.getDocs(F.query(colRef(ctx.uid, "receipts"), F.where("invoiceId", "==", doc.id)));
    let q = null; if (doc.fromQuotationId) { const s = await F.getDoc(docRef(ctx.uid, "quotations", doc.fromQuotationId)); if (s.exists() && s.data().convertedInvoiceId === doc.id) q = s.ref; }
    const b = F.writeBatch(db); rs.docs.forEach((r) => b.delete(r.ref)); b.delete(docRef(ctx.uid, "invoices", doc.id));
    if (q) b.update(q, { status: "accepted", convertedInvoiceId: "", convertedInvoiceNumber: "", updatedAt: F.serverTimestamp() });
    await b.commit(); return;
  }
  await remove(ctx.uid, "quotations", doc.id);
}
export const confirmKey = (kind) => ({ invoice: "confirm_del_invoice", quotation: "confirm_del_quotation", receipt: "confirm_del_receipt" }[kind]);

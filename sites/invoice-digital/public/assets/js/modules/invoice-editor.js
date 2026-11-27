// Borang Invois: TIADA isian maklumat pelanggan / pakej / diskaun (semua itu diisi di Sebut Harga sahaja).
// Invois baharu: pilih pelanggan daripada sebut harga yang telah dibuat -> invois dijana dengan maklumat sebut harga itu.
// Edit invois: paparan ringkas (baca sahaja) + Status Bayaran.
import { t, getLang } from "../i18n.js";
import { esc, $, money, num, round2, calc, fmtDate, todayMY, addDays, toast, setBusy, PAY, payOf, payAutoInvoice } from "../util.js";
import { listAll, getOne, update, remove, createNumbered, logActivity, docRef } from "../db.js";
import { METHODS } from "./receipts.js";
import { F } from "../firebase.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading } from "./ui.js";
import { makePdf, previewPdf } from "./actions.js";

const COPY = ["customer", "customerId", "items", "pkgSel", "pkgNames", "docDiscount", "docDiscountPct", "taxRate", "taxName", "note", "terms", "template", "color", "imgScale"];
const pick = (q) => { const o = {}; COPY.forEach((k) => { if (q[k] !== undefined) o[k] = q[k]; }); return o; };

// Ringkasan baca-sahaja: pelanggan, pakej, produk, jumlah
export function summaryHtml(d) {
  const cu = d.customer || {}, c = calc(d);
  return `<div class="iv-sum">
    <div class="iv-cust"><span class="iv-l">${t("sec_customer")}</span><b>${esc(cu.name || "-")}</b>
      ${cu.company ? `<small>${esc(cu.company)}${cu.regNo ? ` (${esc(cu.regNo)})` : ""}</small>` : ""}<small>${esc(cu.address || "")}</small><small>${esc(cu.phone || "")}</small></div>
    <div class="qe-box">${d.pkgNames && d.pkgNames[0] ? `<div class="qe-pkg"><span>${t("qe_package")}</span><b>${esc(d.pkgNames[0])}</b></div>` : ""}
      <div class="qe-prods">${(d.items || []).map((i) => `<div class="qe-prod"><b>${esc(i.name)}</b><span>${money(num(i.qty || 1) * num(i.price))}</span></div>`).join("")}</div>
      <div class="qe-row"><div><span>${t("qe_price")}</span><b>${money(c.subtotal)}</b></div><div><span>${t("pdf_discount")}</span><b>${c.docDiscount ? "- " + money(c.docDiscount) : money(0)}</b></div><div class="qe-total"><span>${t("qe_total")}</span><b>${money(c.total)}</b></div></div></div>
  </div>`;
}

export async function render(el, ctx, id, numberFmt) {
  el.innerHTML = loading();
  let inv = null, quos = [];
  try {
    if (id) { inv = await getOne(ctx.uid, "invoices", id); if (!inv) { el.innerHTML = empty("doc", t("not_found")); return; } }
    else quos = (await listAll(ctx.uid, "quotations")).sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }

  if (!id && !quos.length) {
    el.innerHTML = `<div class="page-h"><div><h1>${t("invoice_new")}</h1></div><a class="btn ghost" href="#/app/invoices">${t("back")}</a></div>${empty("quote", t("inv_q_none"), `<a class="btn primary" href="#/app/quotations/new">${ico("plus")}${t("quotation_new_btn")}</a>`)}`;
    return;
  }
  const preQ = new URLSearchParams(location.hash.split("?")[1] || "").get("quotation") || "";
  el.innerHTML = `<div class="page-h"><div><h1>${inv ? esc(inv.number) : t("invoice_new")}</h1><p class="sub">${inv ? t("edit") : t("new")}</p></div><a class="btn ghost" href="#/app/invoices${inv ? "/" + id : ""}">${t("back")}</a></div>
  <form id="f" class="doc-form" novalidate>
   <section class="card form"><h2>${t("sec_customer")}</h2>
    ${inv ? "" : `<label><span class="lt">${t("inv_pick_q")} <span class="req">*</span></span><select name="q" required><option value="">${t("inv_pick_ph")}</option>${quos.map((q) => `<option value="${q.id}" ${q.id === preQ ? "selected" : ""}>${esc((q.customer && q.customer.name) || "-")}${q.customer && q.customer.phone ? " · " + esc(q.customer.phone) : ""} — ${esc(q.number)} — ${money(calc(q).total)}</option>`).join("")}</select></label>`}
    <div id="ivs">${inv ? summaryHtml(inv) : ""}</div>
    <p class="muted">${t("inv_from_q_note")}</p>
   </section>
   <section class="card form"><h2>${t("f_paystatus")}</h2>
    <div class="grid2"><label>${t("f_paystatus")}<select name="payStatus">${PAY.map((s) => `<option value="${s}" ${inv && s === payOf("invoice", inv) ? "selected" : ""}>${t("ps_" + s)}</option>`).join("")}</select></label>
     <label id="depW">${t("f_deposit_amt")}<input name="dep" type="number" min="0" step="0.01" inputmode="decimal" value="${inv && num(inv.depositPaid) ? num(inv.depositPaid) : ""}" placeholder="0.00"></label>
     <label id="metW">${t("pdf_method")}<select name="method">${METHODS.map((m) => `<option value="${m}" ${inv && inv.depositMethod === m ? "selected" : ""}>${t("pm_" + m)}</option>`).join("")}</select></label></div>
    <div id="pays" class="iv-pay" aria-live="polite"></div>
    <p class="muted">${t("inv_bal_note")}</p></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/invoices">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el);
  const curQ = () => (inv ? null : quos.find((q) => q.id === f.q.value));
  const showQ = () => {
    const q = curQ(); const box = $("#ivs", el); if (!q) { box.innerHTML = ""; return; }
    box.innerHTML = summaryHtml(q) + (q.convertedInvoiceId ? `<p class="note-red qi-note">${t("inv_has", { n: esc(q.convertedInvoiceNumber || "") })} <a href="#/app/invoices/${esc(q.convertedInvoiceId)}">${t("act_open")}</a></p>` : "");
  };
  // Bayaran di invois: Belum Dibayar (deposit 0) · Deposit (jumlah ditaip) · Selesai (deposit = jumlah penuh). Baki -> dibayar melalui resit.
  const base = () => inv || curQ();
  const totalOf = () => { const d = base(); return d ? calc(d).total : 0; };
  const receiptsOf = () => (inv ? num(inv.receiptsPaid) : 0);
  const depVal = () => { const st = f.payStatus.value, tot = totalOf(); return st === "paid" ? Math.max(round2(tot - receiptsOf()), 0) : st === "deposit" ? round2(num(f.dep.value)) : 0; };
  const drawPay = () => {
    const st = f.payStatus.value; $("#depW", el).hidden = st !== "deposit"; $("#metW", el).hidden = st === "unpaid";
    const tot = totalOf(), dep = depVal(), rc = receiptsOf(), bal = round2(Math.max(tot - dep - rc, 0));
    $("#pays", el).innerHTML = base() ? `<div><span>${t("qe_total")}</span><b>${money(tot)}</b></div><div><span>${t("pdf_deposit_paid")}</span><b>- ${money(dep)}</b></div>${rc ? `<div><span>${t("pdf_paid")}</span><b>- ${money(rc)}</b></div>` : ""}<div class="iv-bal"><span>${t("pdf_balance")}</span><b>${money(bal)}</b></div>` : "";
  };
  f.payStatus.addEventListener("change", drawPay); f.dep.addEventListener("input", drawPay);
  if (!inv) { f.q.onchange = () => { showQ(); drawPay(); }; showQ(); }
  drawPay();
  const payFields = (d) => {
    const ci = calc({ ...d, depositPaid: depVal() }); const paidAny = ci.paidTotal > 0.004;
    const status = d.status === "cancelled" ? "cancelled" : ci.balance <= 0.004 && ci.total > 0 ? "paid" : paidAny ? "partial" : "unpaid";
    return { depositPaid: depVal(), depositMethod: f.method.value, payStatus: f.payStatus.value, status };
  };
  const draftDoc = () => {
    if (inv) return { ...inv, ...payFields(inv) };
    const q = curQ(); if (!q) return null; const date = todayMY();
    const d0 = { ...pick(q), number: "PRATONTON", date, dueDate: addDays(date, 14), status: "unpaid", receiptsPaid: 0, receiptCount: 0, deposit: 0, fromQuotationId: q.id, fromQuotationNumber: q.number };
    return { ...d0, ...payFields(d0) };
  };
  $("#prev", el).onclick = async (e) => {
    const d = draftDoc(); if (!d) return ($("#err", el).textContent = t("err_pick_q"));
    const btn = e.currentTarget; setBusy(btn, true);
    try { await previewPdf(() => makePdf(ctx, "invoice", d)); } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    if (!inv && !curQ()) { err.textContent = t("err_pick_q"); return f.q.focus(); }
    if (f.payStatus.value === "deposit") { const dv = num(f.dep.value), room = round2(totalOf() - receiptsOf()); if (!(dv > 0) || dv > room + 0.005) { err.textContent = t("err_deposit"); return f.dep.focus(); } }
    setBusy(btn, true);
    try {
      if (inv) {
        const pf = payFields(inv); await update(ctx.uid, "invoices", id, pf);
        await syncDepositReceipt(ctx, { ...inv, ...pf, id });
        toast(t("saved")); return ctx.nav(`#/app/invoices/${id}`);
      }
      const q = curQ(), date = todayMY(), qref = docRef(ctx.uid, "quotations", q.id);
      const data0 = { ...pick(q), date, dueDate: addDays(date, 14), status: "unpaid", deposit: 0, receiptsPaid: 0, receiptCount: 0, fromQuotationId: q.id, fromQuotationNumber: q.number };
      const data = { ...data0, ...payFields(data0) };
      const r = await createNumbered(ctx.uid, "invoice", await numberFmt(ctx, "invoice"), null, (_, n, newId) => ({
        data, writes: q.convertedInvoiceId ? [] : [(tx) => tx.update(qref, { convertedInvoiceId: newId, convertedInvoiceNumber: n, updatedAt: F.serverTimestamp() })],
      }));
      logActivity(ctx.user, "invoice", r.number);
      await syncDepositReceipt(ctx, { ...data, id: r.id, number: r.number });
      toast(t("saved")); ctx.nav(`#/app/invoices/${r.id}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}

// Bayaran yang dibuat di invois (Deposit / Selesai) JUGA direkodkan sebagai RESIT (resit penting untuk pelanggan).
// Satu resit "bayaran invois" bagi setiap invois: dicipta, dikemas kini atau dibuang mengikut deposit di invois.
// Resit ini TIDAK menambah receiptsPaid (deposit sudah dikira melalui depositPaid) -> tiada kiraan berganda.
export async function syncDepositReceipt(ctx, inv) {
  const amt = round2(num(inv.depositPaid)); const rid = inv.depositReceiptId;
  const c = calc(inv); const balanceAfter = round2(Math.max(c.total - amt - num(inv.receiptsPaid), 0));
  const fields = { date: todayMY(), amount: amt, method: inv.depositMethod || "cash", invoiceTotal: c.total, paidToDate: amt, balanceAfter, payStatus: balanceAfter <= 0.004 ? "paid" : "deposit",
    customer: inv.customer || {}, customerId: inv.customerId || "", customerName: (inv.customer && inv.customer.name) || "", template: inv.template || "classic", color: inv.color || "#2563eb" };
  const iref = docRef(ctx.uid, "invoices", inv.id);
  if (!(amt > 0)) { if (rid) { try { await remove(ctx.uid, "receipts", rid); } catch (e) { console.warn("resit deposit", e); } await update(ctx.uid, "invoices", inv.id, { depositReceiptId: "" }); } return; }
  if (rid) { try { const old = await getOne(ctx.uid, "receipts", rid); if (old) { await update(ctx.uid, "receipts", rid, { ...fields, date: old.date || fields.date, invoiceId: old.invoiceId }); return; } } catch (e) { console.warn("resit deposit", e); } }
  const st = await ctx.getSettings(); const fmt = (st.numberFormat && st.numberFormat.receipt) || "REC-{YYYY}-{NNNN}";
  const r = await createNumbered(ctx.uid, "receipt", fmt, null, (_, n, newId) => ({
    data: { ...fields, invoiceId: inv.id, invoiceNumber: inv.number || "", isDeposit: true, seq: 1, note: t(balanceAfter <= 0.004 ? "rc_full_note" : "rc_dep_note") },
    writes: [(tx) => tx.update(iref, { depositReceiptId: newId, updatedAt: F.serverTimestamp() })],
  }));
  logActivity(ctx.user, "receipt", r.number);
}

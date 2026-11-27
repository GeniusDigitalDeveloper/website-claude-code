// Borang Invois: TIADA isian maklumat pelanggan / pakej / diskaun (semua itu diisi di Sebut Harga sahaja).
// Invois baharu: pilih pelanggan daripada sebut harga yang telah dibuat -> invois dijana dengan maklumat sebut harga itu.
// Edit invois: paparan ringkas (baca sahaja) + Status Bayaran.
import { t, getLang } from "../i18n.js";
import { esc, $, money, num, calc, fmtDate, todayMY, addDays, toast, setBusy, PAY, payOf, payAutoInvoice } from "../util.js";
import { listAll, getOne, update, createNumbered, logActivity, docRef } from "../db.js";
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
   <section class="card form"><div class="grid2"><label>${t("f_paystatus")}<select name="payStatus">${PAY.map((s) => `<option value="${s}" ${inv && s === payOf("invoice", inv) ? "selected" : ""}>${t("ps_" + s)}</option>`).join("")}</select></label></div></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/invoices">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el);
  const curQ = () => (inv ? null : quos.find((q) => q.id === f.q.value));
  const showQ = () => {
    const q = curQ(); const box = $("#ivs", el); if (!q) { box.innerHTML = ""; return; }
    box.innerHTML = summaryHtml(q) + (q.convertedInvoiceId ? `<p class="note-red qi-note">${t("inv_has", { n: esc(q.convertedInvoiceNumber || "") })} <a href="#/app/invoices/${esc(q.convertedInvoiceId)}">${t("act_open")}</a></p>` : "");
  };
  if (!inv) { f.q.onchange = showQ; showQ(); }
  const draftDoc = () => {
    if (inv) return { ...inv, payStatus: f.payStatus.value };
    const q = curQ(); if (!q) return null; const date = todayMY();
    return { ...pick(q), number: "PRATONTON", date, dueDate: addDays(date, 14), status: "unpaid", payStatus: f.payStatus.value, receiptsPaid: 0, receiptCount: 0, deposit: 0, fromQuotationId: q.id, fromQuotationNumber: q.number };
  };
  $("#prev", el).onclick = async (e) => {
    const d = draftDoc(); if (!d) return ($("#err", el).textContent = t("err_pick_q"));
    const btn = e.currentTarget; setBusy(btn, true);
    try { await previewPdf(() => makePdf(ctx, "invoice", d)); } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    if (!inv && !curQ()) { err.textContent = t("err_pick_q"); return f.q.focus(); }
    setBusy(btn, true);
    try {
      if (inv) {
        const ps = f.payStatus.value; await update(ctx.uid, "invoices", id, { payStatus: ps === payAutoInvoice({ ...inv, payStatus: "" }) ? "" : ps });
        toast(t("saved")); return ctx.nav(`#/app/invoices/${id}`);
      }
      const q = curQ(), date = todayMY(), qref = docRef(ctx.uid, "quotations", q.id);
      const data = { ...pick(q), date, dueDate: addDays(date, 14), status: "unpaid", deposit: 0, receiptsPaid: 0, receiptCount: 0, fromQuotationId: q.id, fromQuotationNumber: q.number };
      data.payStatus = f.payStatus.value === payAutoInvoice({ ...data, payStatus: "" }) ? "" : f.payStatus.value;
      const r = await createNumbered(ctx.uid, "invoice", await numberFmt(ctx, "invoice"), null, (_, n, newId) => ({
        data, writes: q.convertedInvoiceId ? [] : [(tx) => tx.update(qref, { convertedInvoiceId: newId, convertedInvoiceNumber: n, updatedAt: F.serverTimestamp() })],
      }));
      logActivity(ctx.user, "invoice", r.number); toast(t("saved")); ctx.nav(`#/app/invoices/${r.id}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}

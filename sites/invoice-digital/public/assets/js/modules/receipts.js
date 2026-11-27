// Resit: satu invois boleh dijana resit BERKALI-KALI (deposit, bayaran ansuran, baki) sehingga baki habis. Resit boleh diedit (pensel).
import { t, getLang } from "../i18n.js";
import { esc, $, money, num, round2, calc, fmtDate, todayMY, toast, setBusy, debounce, confirmBox, applyPayment, suggestAmount, PAY, payOf, payAutoReceipt, payAutoInvoice } from "../util.js";
import { createNumbered, docRef, getOne, listAll, listLive, logActivity } from "../db.js";
import { F, db } from "../firebase.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading } from "./ui.js";
import { pdfAction, makePdf, previewPdf } from "./actions.js";
import { summaryHtml } from "./invoice-editor.js";
import { deleteProject, confirmKey } from "./projects.js";
import { bulkBarHtml, chkTh, chkTd, bulkController, limitRows } from "./bulk.js";
import { buildPdf } from "../pdf.js";

export const METHODS = ["cash", "bank", "duitnow", "card", "ewallet", "other"];

// Jana satu resit baharu untuk invois. Dalam SATU transaksi: nombor resit unik + resit + kemas kini invois (jumlah dibayar, bil. resit, status).
export async function recordPayment(ctx, invoice, p) {
  const st = await ctx.getSettings();
  const fmt = (st.numberFormat && st.numberFormat.receipt) || "REC-{YYYY}-{NNNN}";
  const iref = docRef(ctx.uid, "invoices", invoice.id);
  const res = await createNumbered(ctx.uid, "receipt", fmt,
    async (tx) => { const s = await tx.get(iref); if (!s.exists()) throw new Error("inv"); return s.data(); },
    (inv) => {
      if (inv.status === "cancelled") throw new Error("status");
      const a = applyPayment(inv, p.amount);
      const ps = PAY.includes(p.payStatus) ? p.payStatus : payAutoReceipt({ invoiceTotal: a.total, balanceAfter: a.balanceAfter, seq: a.seq });
      const invAfter = { ...inv, receiptsPaid: a.paid, receiptCount: a.seq, status: a.status, payStatus: "" };
      const invPs = ps === payAutoInvoice(invAfter) ? "" : ps; // invois ikut status resit terkini
      return {
        data: { date: p.date, amount: a.amt, method: p.method, note: (p.note || "").slice(0, 500), invoiceId: invoice.id, invoiceNumber: inv.number, customerId: inv.customerId || "", customer: inv.customer || {}, customerName: (inv.customer && inv.customer.name) || "",
          invoiceTotal: a.total, paidToDate: a.paid, balanceAfter: a.balanceAfter, seq: a.seq, payStatus: ps, template: inv.template || "classic", color: inv.color || "#2563eb", ...(p.imgScale ? { imgScale: p.imgScale } : {}) },
        writes: [(tx) => tx.update(iref, { receiptsPaid: a.paid, receiptCount: a.seq, status: a.status, payStatus: invPs, updatedAt: F.serverTimestamp() })],
      };
    });
  logActivity(ctx.user, "receipt", res.number);
  return res;
}

// Edit resit (tarikh, jumlah, kaedah, nota, saiz imej). Jika jumlah berubah, baki & status invois dikemas kini dalam transaksi yang sama.
export async function updateReceipt(ctx, r, p) {
  const rref = docRef(ctx.uid, "receipts", r.id); const iref = r.invoiceId ? docRef(ctx.uid, "invoices", r.invoiceId) : null;
  await F.runTransaction(db, async (tx) => {
    const rs = await tx.get(rref); if (!rs.exists()) throw new Error("nf"); const old = rs.data();
    let inv = null; if (iref) { const is = await tx.get(iref); if (is.exists()) inv = is.data(); }
    const amt = round2(num(p.amount)); if (!(amt > 0)) throw new Error("amount");
    if (inv) {
      const ci = calc(inv), total = ci.total, paid = round2(num(inv.receiptsPaid) + (amt - num(old.amount)));
      if (paid < -0.005 || paid + ci.depositPaid > total + 0.005) throw new Error("amount");
      const bal = round2(Math.max(total - ci.depositPaid - paid, 0)); let status = inv.status;
      if (inv.status !== "cancelled") status = bal <= 0.004 ? "paid" : paid + ci.depositPaid > 0.004 ? "partial" : ["paid", "partial"].includes(inv.status) ? "unpaid" : inv.status;
      const patch = { receiptsPaid: Math.max(paid, 0), status };
      if (PAY.includes(p.payStatus)) { const auto = payAutoInvoice({ ...inv, ...patch, payStatus: "" }); patch.payStatus = p.payStatus === auto ? "" : p.payStatus; }
      tx.update(iref, { ...patch, updatedAt: F.serverTimestamp() });
    }
    tx.update(rref, { date: p.date, amount: amt, method: p.method, note: (p.note || "").slice(0, 500), ...(PAY.includes(p.payStatus) ? { payStatus: p.payStatus } : {}), ...(p.imgScale ? { imgScale: p.imgScale } : {}), updatedAt: F.serverTimestamp() });
  });
}

export async function renderList(el, ctx) {
  el.innerHTML = loading(); let rows = [], shown = [], mounted = false, draw = () => {}, bulk = null;
  const mount = () => {
    el.innerHTML = `<div class="page-h"><div><h1>${t("nav_receipts")}</h1><p class="sub">${t("receipts_sub")}</p></div></div>
    <div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div></div><div class="q-new in-card"><a class="btn primary" href="#/app/receipts/new">${ico("plus")}${t("receipt_new_btn")}</a></div>${bulkBarHtml()}<div id="tbl" class="scrollbox"></div></div>`;
    bulk = bulkController(ctx, el, () => shown.map((r) => ({ k: "receipt", id: r.id, doc: r })), () => rows.map((r) => ({ k: "receipt", id: r.id, doc: r })));
    draw = () => {
      const q = $("#q", el).value.toLowerCase();
      shown = rows.filter((r) => !q || [r.number, r.customerName, r.invoiceNumber].join(" ").toLowerCase().includes(q));
      $("#tbl", el).innerHTML = shown.length ? `<table class="tbl"><thead><tr>${chkTh()}<th class="idx">${t("col_index")}</th><th>${t("col_docno")}</th><th>${t("col_date_gen")}</th><th>${t("col_invref")}</th><th>${t("col_customer")}</th><th>${t("col_method")}</th><th class="r">${t("col_amount")}</th><th></th></tr></thead><tbody>${shown.map((r, i) => `<tr>
        ${chkTd("receipt:" + r.id, r.number)}<td class="idx" data-l="${t("col_index")}">${i + 1}</td>
        <td data-l="${t("col_docno")}"><b>${esc(r.number)}</b><br><span class="badge b-${payOf("receipt", r)}">${esc(t("ps_" + payOf("receipt", r)))}</span></td><td class="nw" data-l="${t("col_date_gen")}">${fmtDate(r.date, getLang())}</td><td data-l="${t("col_invref")}">${r.invoiceId ? `<a href="#/app/invoices/${esc(r.invoiceId)}">${esc(r.invoiceNumber)}</a>` : esc(r.invoiceNumber)}</td><td data-l="${t("col_customer")}">${esc(r.customerName)}</td><td data-l="${t("col_method")}">${esc(t("pm_" + r.method))}</td><td class="r" data-l="${t("col_amount")}"><b>${money(r.amount)}</b></td>
        <td class="acts"><a class="icon-btn" href="#/app/receipts/${r.id}/edit" aria-label="${t("act_edit")}" title="${t("act_edit")}">${ico("edit")}</a><button class="icon-btn" data-a="preview" data-id="${r.id}" aria-label="${t("act_preview")}" title="${t("act_preview")}">${ico("eye")}</button><button class="icon-btn" data-a="download" data-id="${r.id}" aria-label="${t("act_download")}" title="${t("act_download")}">${ico("download")}</button><button class="icon-btn" data-a="print" data-id="${r.id}" aria-label="${t("act_print")}" title="${t("act_print")}">${ico("print")}</button><button class="icon-btn danger" data-a="del" data-id="${r.id}" aria-label="${t("delete")}" title="${t("delete")}">${ico("trash")}</button></td></tr>`).join("")}</tbody></table>` : empty("receipt", t("receipts_empty"));
      limitRows($("#tbl", el)); bulk.sync();
    };
    draw(); $("#q", el).oninput = debounce(() => draw(), 150);
    el.onclick = async (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
      if (b.dataset.a === "del") { if (!(await confirmBox(t("delete"), t(confirmKey("receipt"), { n: r.number }), t("delete")))) return; try { await deleteProject(ctx, "receipt", r); toast(t("deleted")); } catch (x) { toast(errMsg(x), "err"); } return; }
      pdfAction(ctx, "receipt", r, b.dataset.a, b);
    };
  };
  ctx.live(listLive(ctx.uid, "receipts", (r) => { rows = r; if (!mounted) { mounted = true; mount(); } else draw(); }, (e) => { if (!mounted) el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }));
}

export async function renderForm(el, ctx, params) {
  el.innerHTML = loading();
  let invs, company; try { [invs, company] = await Promise.all([listAll(ctx.uid, "invoices"), ctx.getCompany()]); invs = invs.filter((i) => i.status !== "cancelled" && calc(i).balance > 0.004).sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0)); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const pre = params.get("invoice") || "";
  el.innerHTML = `<div class="page-h"><div><h1>${t("receipt_new")}</h1></div><a class="btn ghost" href="#/app/receipts">${t("back")}</a></div>
  <form class="card form" id="f" novalidate>${invs.length ? `
    <label><span class="lt">${t("inv_pick_q")} <span class="req">*</span></span><select name="invoice" required>${invs.map((i) => `<option value="${i.id}" ${i.id === pre ? "selected" : ""}>${esc((i.customer && i.customer.name) || "-")}${i.customer && i.customer.phone ? " · " + esc(i.customer.phone) : ""} — ${esc(i.fromQuotationNumber ? i.fromQuotationNumber + " / " : "")}${esc(i.number)} (${t("pdf_balance")} ${money(calc(i).balance)})</option>`).join("")}</select></label>
    <div id="rsum"></div>
    <p class="muted" id="info" aria-live="polite"></p>
    <div class="grid2"><label>${t("f_amount")} (RM)<input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" required></label><label>${t("f_date")}<input name="date" type="date" value="${todayMY()}" required></label></div>
    <div class="grid2"><label>${t("f_paystatus")}<select name="payStatus">${PAY.map((s) => `<option value="${s}" >${t("ps_" + s)}</option>`).join("")}</select></label>
    <label>${t("pdf_method")}<select name="method">${METHODS.map((m) => `<option value="${m}">${t("pm_" + m)}</option>`).join("")}</select></label></div>
    <label>${t("pdf_note")}<textarea name="note" maxlength="500" rows="2"></textarea></label>
    <p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${t("receipt_save")}</button></div>` : empty("receipt", t("receipt_no_inv"), `<a class="btn primary" href="#/app/invoices/new">${t("invoice_new")}</a>`)}</form>`;
  const f = $("#f", el); if (!invs.length) return;
  const cur = () => invs.find((x) => x.id === f.invoice.value);
  const fill = (v) => { f.amount.value = v ? Number(v).toFixed(2) : ""; };
  // Status bayaran dicadang automatik (ikut jumlah & bilangan resit) sehingga pengguna memilih sendiri
  let psTouched = false;
  const autoPs = () => { if (psTouched) return; const i = cur(); if (!i) return; const c = calc(i), amt = num(f.amount.value); f.payStatus.value = payAutoReceipt({ invoiceTotal: c.total, balanceAfter: round2(c.balance - amt), seq: (num(i.receiptCount) || 0) + 1 }); };
  const refresh = () => { const i = cur(); if (!i) return; const c = calc(i); f.amount.max = c.balance.toFixed(2); fill(c.balance);
    $("#info", el).textContent = t("receipt_summary2", { t: money(c.total), d: money(c.depositPaid), p: money(c.paidReceipts), b: money(c.balance) }); $("#rsum", el).innerHTML = summaryHtml(i); autoPs(); };
  f.payStatus.onchange = () => (psTouched = true); f.amount.addEventListener("input", autoPs);
  f.invoice.onchange = refresh; refresh();
  $("#prev", el).onclick = async (e) => {
    const btn = e.currentTarget, inv = cur(); if (!inv) return; setBusy(btn, true);
    try {
      const c = calc(inv), amt = num(f.amount.value), paid = round2(c.paidTotal + amt);
      const doc = { number: "PRATONTON", date: f.date.value, amount: amt, method: f.method.value, note: f.note.value.trim(), invoiceId: inv.id, invoiceNumber: inv.number, customer: inv.customer || {}, customerName: (inv.customer && inv.customer.name) || "", invoiceTotal: c.total, paidToDate: paid, balanceAfter: round2(Math.max(c.total - paid, 0)), seq: (num(inv.receiptCount) || 0) + 1, payStatus: f.payStatus.value, template: inv.template, color: inv.color, imgScale: {} };
      await previewPdf(() => buildPdf("receipt", doc, company, { template: doc.template, color: doc.color }));
    } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    const inv = cur(); const amount = num(f.amount.value);
    if (!inv) return (err.textContent = t("err_required")); if (amount <= 0 || amount > calc(inv).balance + 0.005) return (err.textContent = t("err_amount"));
    if (!f.date.value) return (err.textContent = t("err_required"));
    setBusy(btn, true);
    try { const r = await recordPayment(ctx, inv, { amount, method: f.method.value, date: f.date.value, note: f.note.value.trim(), payStatus: f.payStatus.value }); toast(t("receipt_saved", { n: r.number })); ctx.nav("#/app/invoices/" + inv.id); }
    catch (x) { console.error(x); err.textContent = x.message === "amount" ? t("err_amount") : errMsg(x); setBusy(btn, false); }
  };
}

// Edit resit sedia ada (butang pensel pada senarai)
export async function renderEdit(el, ctx, id) {
  el.innerHTML = loading();
  let r, company, inv = null;
  try { [r, company] = await Promise.all([getOne(ctx.uid, "receipts", id), ctx.getCompany()]); if (r && r.invoiceId) inv = await getOne(ctx.uid, "invoices", r.invoiceId); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  if (!r) { el.innerHTML = empty("receipt", t("not_found")); return; }
  const maxAmt = inv ? round2(calc(inv).total - calc(inv).depositPaid - (num(inv.receiptsPaid) - num(r.amount))) : null; // jumlah maksimum yang masih dibenarkan untuk resit ini
  el.innerHTML = `<div class="page-h"><div><h1>${t("edit_receipt")} · ${esc(r.number)}</h1><p class="sub">${esc(r.invoiceNumber || "")} · ${esc(r.customerName || "")}</p></div><a class="btn ghost" href="#/app/receipts">${t("back")}</a></div>
  <form class="card form" id="f" novalidate>
    <div class="grid2"><label>${t("f_amount")} (RM)<input name="amount" type="number" step="0.01" min="0.01" ${maxAmt != null ? `max="${maxAmt.toFixed(2)}"` : ""} inputmode="decimal" value="${num(r.amount)}" required></label><label>${t("f_date")}<input name="date" type="date" value="${esc(r.date)}" required></label></div>
    ${maxAmt != null ? `<p class="muted">${t("pdf_balance")}: ${money(Math.max(calc(inv).balance, 0))} · max ${money(maxAmt)}</p>` : ""}
    <div class="grid2"><label>${t("f_paystatus")}<select name="payStatus">${PAY.map((s) => `<option value="${s}" ${s === payOf("receipt", r) ? "selected" : ""}>${t("ps_" + s)}</option>`).join("")}</select></label>
    <label>${t("pdf_method")}<select name="method">${METHODS.map((m) => `<option value="${m}" ${m === r.method ? "selected" : ""}>${t("pm_" + m)}</option>`).join("")}</select></label></div>
    <label>${t("pdf_note")}<textarea name="note" maxlength="500" rows="2">${esc(r.note)}</textarea></label>
    <p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", el);
  const draft = () => ({ ...r, amount: num(f.amount.value), date: f.date.value, method: f.method.value, payStatus: f.payStatus.value, note: f.note.value.trim() });
  $("#prev", el).onclick = async (e) => { const btn = e.currentTarget; setBusy(btn, true); try { await previewPdf(() => makePdf(ctx, "receipt", draft())); } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false); };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f); const d = draft();
    if (!(d.amount > 0) || (maxAmt != null && d.amount > maxAmt + 0.005)) return (err.textContent = t("err_amount")); if (!d.date) return (err.textContent = t("err_required"));
    setBusy(btn, true);
    try { await updateReceipt(ctx, r, { amount: d.amount, date: d.date, method: d.method, note: d.note, payStatus: d.payStatus }); toast(t("receipt_updated")); ctx.nav("#/app/receipts"); }
    catch (x) { console.error(x); err.textContent = x.message === "amount" ? t("err_amount") : errMsg(x); setBusy(btn, false); }
  };
}

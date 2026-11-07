import { t, getLang } from "../i18n.js";
import { esc, $, $$, money, num, round2, calc, fmtDate, todayMY, toast, setBusy, invoiceStatus, debounce } from "../util.js";
import { createNumbered, docRef, listAll, logActivity } from "../db.js";
import { F } from "../firebase.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading, badge } from "./ui.js";
import { pdfAction } from "./actions.js";
import { deleteProject, confirmKey } from "./projects.js";
import { confirmBox } from "../util.js";

export const METHODS = ["cash", "bank", "duitnow", "card", "ewallet", "other"];

export async function recordPayment(ctx, invoice, p) {
  const st = await ctx.getSettings();
  const fmt = (st.numberFormat && st.numberFormat.receipt) || "REC-{YYYY}-{NNNN}";
  const iref = docRef(ctx.uid, "invoices", invoice.id);
  const res = await createNumbered(ctx.uid, "receipt", fmt,
    async (tx) => { const s = await tx.get(iref); if (!s.exists()) throw new Error("inv"); return s.data(); },
    (inv) => {
      if (inv.status === "cancelled" || inv.status === "draft") throw new Error("status");
      const c = calc(inv); const amt = round2(num(p.amount));
      if (amt <= 0 || amt > c.balance + 0.005) throw new Error("amount");
      const balanceAfter = round2(Math.max(c.balance - amt, 0));
      return {
        data: { date: p.date, amount: amt, method: p.method, note: (p.note || "").slice(0, 500), invoiceId: invoice.id, invoiceNumber: inv.number, customerId: inv.customerId || "", customer: inv.customer || {}, customerName: (inv.customer && inv.customer.name) || "", balanceAfter, template: inv.template || "classic", color: inv.color || "#2563eb" },
        writes: [(tx) => tx.update(iref, { receiptsPaid: round2(num(inv.receiptsPaid) + amt), status: balanceAfter <= 0.004 ? "paid" : "partial", updatedAt: F.serverTimestamp() })],
      };
    });
  logActivity(ctx.user, "receipt", res.number);
  return res;
}

export async function renderList(el, ctx) {
  el.innerHTML = loading();
  let rows; try { rows = await listAll(ctx.uid, "receipts"); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_receipts")}</h1><p class="sub">${t("receipts_sub")}</p></div><a class="btn primary" href="#/app/receipts/new">${ico("plus")}${t("receipt_new")}</a></div>
  <div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div></div><div id="tbl"></div></div>`;
  const draw = () => {
    const q = $("#q", el).value.toLowerCase();
    const list = rows.filter((r) => !q || [r.number, r.customerName, r.invoiceNumber].join(" ").toLowerCase().includes(q));
    $("#tbl", el).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("col_number")}</th><th>${t("col_date")}</th><th>${t("col_invref")}</th><th>${t("col_customer")}</th><th>${t("col_method")}</th><th class="r">${t("col_amount")}</th><th></th></tr></thead><tbody>${list.map((r) => `<tr>
      <td data-l="${t("col_number")}"><b>${esc(r.number)}</b></td><td data-l="${t("col_date")}">${fmtDate(r.date, getLang())}</td><td data-l="${t("col_invref")}">${esc(r.invoiceNumber)}</td><td data-l="${t("col_customer")}">${esc(r.customerName)}</td><td data-l="${t("col_method")}">${esc(t("pm_" + r.method))}</td><td class="r" data-l="${t("col_amount")}"><b>${money(r.amount)}</b></td>
      <td class="acts"><button class="icon-btn" data-a="preview" data-id="${r.id}" aria-label="${t("act_preview")}">${ico("eye")}</button><button class="icon-btn" data-a="download" data-id="${r.id}" aria-label="${t("act_download")}">${ico("download")}</button><button class="icon-btn" data-a="print" data-id="${r.id}" aria-label="${t("act_print")}">${ico("print")}</button><button class="icon-btn danger" data-a="del" data-id="${r.id}" aria-label="${t("delete")}">${ico("trash")}</button></td></tr>`).join("")}</tbody></table>` : empty("receipt", t("receipts_empty"));
  };
  draw(); $("#q", el).oninput = debounce(draw, 150);
  el.onclick = async (e) => { const b = e.target.closest("[data-a]"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.a === "del") { if (!(await confirmBox(t("delete"), t(confirmKey("receipt"), { n: r.number }), t("delete")))) return; try { await deleteProject(ctx, "receipt", r); toast(t("deleted")); renderList(el, ctx); } catch (x) { toast(errMsg(x), "err"); } return; }
    pdfAction(ctx, "receipt", r, b.dataset.a); };
}

export async function renderForm(el, ctx, params) {
  el.innerHTML = loading();
  let invs; try { invs = (await listAll(ctx.uid, "invoices")).filter((i) => !["cancelled", "draft"].includes(i.status) && calc(i).balance > 0.004); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const pre = params.get("invoice") || "";
  el.innerHTML = `<div class="page-h"><div><h1>${t("receipt_new")}</h1></div><a class="btn ghost" href="#/app/receipts">${t("back")}</a></div>
  <form class="card form" id="f" novalidate>${invs.length ? `
    <label>${t("f_invoice")}<select name="invoice" required>${invs.map((i) => `<option value="${i.id}" ${i.id === pre ? "selected" : ""}>${esc(i.number)} — ${esc((i.customer && i.customer.name) || "")} (${t("pdf_balance")} ${money(calc(i).balance)})</option>`).join("")}</select></label>
    <div class="grid2"><label>${t("f_amount")} (RM)<input name="amount" type="number" step="0.01" min="0.01" required></label><label>${t("f_date")}<input name="date" type="date" value="${todayMY()}" required></label></div>
    <label>${t("pdf_method")}<select name="method">${METHODS.map((m) => `<option value="${m}">${t("pm_" + m)}</option>`).join("")}</select></label>
    <label>${t("pdf_note")}<textarea name="note" maxlength="500" rows="2"></textarea></label>
    <p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("receipt_save")}</button></div>` : empty("receipt", t("receipt_no_inv"), `<a class="btn primary" href="#/app/invoices/new">${t("invoice_new")}</a>`)}</form>`;
  const f = $("#f", el); if (!invs.length) return;
  const fill = () => { const i = invs.find((x) => x.id === f.invoice.value); f.amount.value = i ? calc(i).balance.toFixed(2) : ""; f.amount.max = i ? calc(i).balance.toFixed(2) : ""; };
  f.invoice.onchange = fill; fill();
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    const inv = invs.find((x) => x.id === f.invoice.value); const amount = num(f.amount.value);
    if (!inv) return (err.textContent = t("err_required")); if (amount <= 0 || amount > calc(inv).balance + 0.005) return (err.textContent = t("err_amount"));
    if (!f.date.value) return (err.textContent = t("err_required"));
    setBusy(btn, true);
    try { const r = await recordPayment(ctx, inv, { amount, method: f.method.value, date: f.date.value, note: f.note.value.trim() }); toast(t("receipt_saved", { n: r.number })); ctx.nav("#/app/receipts"); }
    catch (x) { console.error(x); err.textContent = x.message === "amount" ? t("err_amount") : errMsg(x); setBusy(btn, false); }
  };
}

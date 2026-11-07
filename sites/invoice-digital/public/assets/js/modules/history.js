import { t, getLang } from "../i18n.js";
import { esc, $, money, calc, fmtDate, debounce, invoiceStatus, quotationStatus } from "../util.js";
import { listAll } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading, badge } from "./ui.js";

export async function render(el, ctx) {
  el.innerHTML = loading(); let all;
  try { const [i, q, r] = await Promise.all([listAll(ctx.uid, "invoices"), listAll(ctx.uid, "quotations"), listAll(ctx.uid, "receipts")]);
    all = [...i.map((x) => ({ ...x, type: "invoice", st: invoiceStatus(x), amt: calc(x).total, route: "invoices" })), ...q.map((x) => ({ ...x, type: "quotation", st: quotationStatus(x), amt: calc(x).total, route: "quotations" })), ...r.map((x) => ({ ...x, type: "receipt", st: "", amt: x.amount, route: "receipts" }))].sort((a, b) => ((a.createdAt && a.createdAt.seconds) || 0) < ((b.createdAt && b.createdAt.seconds) || 0) ? 1 : -1);
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_history")}</h1><p class="sub">${t("history_sub")}</p></div></div><div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div>
  <select id="tf" aria-label="${esc(t("f_type"))}"><option value="">${t("all_types")}</option><option value="invoice">${t("nav_invoices")}</option><option value="quotation">${t("nav_quotations")}</option><option value="receipt">${t("nav_receipts")}</option></select></div><div id="tbl"></div></div>`;
  const draw = () => { const q = $("#q", el).value.toLowerCase(), tf = $("#tf", el).value; const list = all.filter((x) => (!tf || x.type === tf) && (!q || [x.number, x.customer && x.customer.name, x.customerName].join(" ").toLowerCase().includes(q))).slice(0, 300);
    $("#tbl", el).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("f_type")}</th><th>${t("col_number")}</th><th>${t("col_customer")}</th><th>${t("col_date")}</th><th class="r">${t("col_total")}</th><th>${t("f_status")}</th></tr></thead><tbody>${list.map((x) => `<tr><td data-l="${t("f_type")}">${t("nav_" + x.route)}</td><td data-l="${t("col_number")}">${x.type === "receipt" ? `<b>${esc(x.number)}</b>` : `<a href="#/app/${x.route}/${x.id}"><b>${esc(x.number)}</b></a>`}</td><td data-l="${t("col_customer")}">${esc((x.customer && x.customer.name) || x.customerName || "-")}</td><td data-l="${t("col_date")}">${fmtDate(x.date, getLang())}</td><td class="r" data-l="${t("col_total")}">${money(x.amt)}</td><td data-l="${t("f_status")}">${x.st ? badge(x.st) : ""}</td></tr>`).join("")}</tbody></table>` : empty("clock", t("history_empty")); };
  draw(); $("#q", el).oninput = debounce(draw, 150); $("#tf", el).onchange = draw;
}

import { t, getLang } from "../i18n.js";
import { esc, $, money, calc, fmtDate, toast, modal, confirmBox, debounce, invoiceStatus, quotationStatus } from "../util.js";
import { listAll, create, update, remove } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading, badge } from "./ui.js";

const FIELDS = ["name", "company", "address", "phone", "email", "regNo", "notes"];
function formHtml(c) {
  c = c || {};
  return `<form class="form" novalidate><label>${t("f_name")} *<input name="name" maxlength="120" required value="${esc(c.name)}"></label><label>${t("f_company")}<input name="company" maxlength="120" value="${esc(c.company)}"></label>
  <label>${t("f_address")}<textarea name="address" rows="2" maxlength="300">${esc(c.address)}</textarea></label><div class="grid2"><label>${t("f_phone")}<input name="phone" maxlength="30" inputmode="tel" value="${esc(c.phone)}"></label><label>${t("f_email")}<input name="email" type="email" maxlength="120" value="${esc(c.email)}"></label></div>
  <label>${t("f_regno")}<input name="regNo" maxlength="40" value="${esc(c.regNo)}"></label><label>${t("f_notes")}<textarea name="notes" rows="2" maxlength="500">${esc(c.notes)}</textarea></label></form>`;
}
export async function renderList(el, ctx) {
  el.innerHTML = loading(); let rows, invs, quos;
  try { [rows, invs, quos] = await Promise.all([listAll(ctx.uid, "customers"), listAll(ctx.uid, "invoices"), listAll(ctx.uid, "quotations")]); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_customers")}</h1><p class="sub">${t("customers_sub")}</p></div><button class="btn primary" id="add">${ico("plus")}${t("customer_add")}</button></div>
  <div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div></div><div id="tbl"></div></div>`;
  const total = (id) => invs.filter((i) => i.customerId === id && i.status !== "cancelled").reduce((s, i) => s + calc(i).total, 0);
  const draw = () => {
    const q = $("#q", el).value.toLowerCase(); const list = rows.filter((r) => !q || [r.name, r.company, r.phone, r.email].join(" ").toLowerCase().includes(q));
    $("#tbl", el).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("f_name")}</th><th>${t("f_company")}</th><th>${t("f_phone")}</th><th>${t("f_email")}</th><th class="r">${t("cust_total")}</th><th></th></tr></thead><tbody>${list.map((r) => `<tr><td data-l="${t("f_name")}"><b>${esc(r.name)}</b></td><td data-l="${t("f_company")}">${esc(r.company)}</td><td data-l="${t("f_phone")}">${esc(r.phone)}</td><td data-l="${t("f_email")}">${esc(r.email)}</td><td class="r" data-l="${t("cust_total")}">${money(total(r.id))}</td>
      <td class="acts"><button class="icon-btn" data-a="view" data-id="${r.id}" aria-label="${t("act_view")}">${ico("eye")}</button><button class="icon-btn" data-a="edit" data-id="${r.id}" aria-label="${t("act_edit")}">${ico("edit")}</button><button class="icon-btn danger" data-a="del" data-id="${r.id}" aria-label="${t("delete")}">${ico("trash")}</button></td></tr>`).join("")}</tbody></table>` : empty("users", t("customers_empty"));
  };
  draw(); $("#q", el).oninput = debounce(draw, 150);
  const edit = async (c) => {
    const r = await modal({ title: c ? t("customer_edit") : t("customer_add"), body: formHtml(c), actions: [{ label: t("cancel"), value: null }, { label: t("save"), cls: "primary", onClick: async (ov) => {
      const data = {}; FIELDS.forEach((k) => (data[k] = (ov.querySelector(`[name=${k}]`).value || "").trim())); if (!data.name) { toast(t("err_cust"), "err"); return false; }
      try { c ? await update(ctx.uid, "customers", c.id, data) : await create(ctx.uid, "customers", data); return true; } catch (x) { toast(errMsg(x), "err"); return false; } } }] });
    if (r) { toast(t("saved")); renderList(el, ctx); }
  };
  $("#add", el).onclick = () => edit(null);
  el.onclick = async (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return; const c = rows.find((x) => x.id === b.dataset.id); if (!c) return;
    if (b.dataset.a === "edit") return edit(c);
    if (b.dataset.a === "del") { if (await confirmBox(t("delete"), t("confirm_delete", { n: c.name }), t("delete"))) { try { await remove(ctx.uid, "customers", c.id); toast(t("deleted")); renderList(el, ctx); } catch (x) { toast(errMsg(x), "err"); } } return; }
    if (b.dataset.a === "view") {
      const ci = invs.filter((i) => i.customerId === c.id), cq = quos.filter((i) => i.customerId === c.id);
      const rowsH = (arr, type, route, eff) => arr.length ? arr.map((i) => `<a class="mini link" href="#/app/${route}/${i.id}"><span>${esc(i.number)} · ${fmtDate(i.date, getLang())} ${badge(eff(i))}</span><b>${money(calc(i).total)}</b></a>`).join("") : `<p class="muted">-</p>`;
      modal({ title: c.name, wide: true, body: `<div class="kv"><div><span>${t("cust_total")}</span><b>${money(total(c.id))}</b></div><div><span>${t("nav_invoices")}</span><b>${ci.length}</b></div><div><span>${t("nav_quotations")}</span><b>${cq.length}</b></div></div><p class="muted">${esc([c.company, c.address, c.phone, c.email, c.regNo].filter(Boolean).join(" · "))}</p><h3>${t("nav_invoices")}</h3>${rowsH(ci, "invoice", "invoices", invoiceStatus)}<h3>${t("nav_quotations")}</h3>${rowsH(cq, "quotation", "quotations", quotationStatus)}`, actions: [{ label: t("close"), value: null }, { label: t("invoice_new"), cls: "primary", onClick: () => { location.hash = `#/app/invoices/new?customer=${c.id}`; } }] });
    }
  };
}

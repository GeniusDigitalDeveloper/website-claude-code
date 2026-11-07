import { t } from "../i18n.js";
import { esc, $, money, num, toast, modal, confirmBox, debounce } from "../util.js";
import { listAll, create, update, remove } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading } from "./ui.js";

const formHtml = (p) => (p = p || {}, `<form class="form" novalidate><label>${t("f_pname")} *<input name="name" maxlength="150" required value="${esc(p.name)}"></label>
  <div class="grid2"><label>${t("f_sku")}<input name="sku" maxlength="40" value="${esc(p.sku)}"></label><label>${t("f_category")}<input name="category" maxlength="60" value="${esc(p.category)}"></label></div>
  <label>${t("f_desc")}<textarea name="description" rows="2" maxlength="300">${esc(p.description)}</textarea></label><div class="grid2"><label>${t("f_price")} (RM) *<input name="price" type="number" min="0" step="0.01" value="${p.price ?? ""}" required></label><label>${t("f_unit")}<input name="unit" maxlength="20" placeholder="unit / jam / kg" value="${esc(p.unit)}"></label></div></form>`);
export async function renderList(el, ctx) {
  el.innerHTML = loading(); let rows; try { rows = await listAll(ctx.uid, "products"); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_products")}</h1><p class="sub">${t("products_sub")}</p></div><button class="btn primary" id="add">${ico("plus")}${t("product_add")}</button></div>
  <div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div></div><div id="tbl"></div></div>`;
  const draw = () => { const q = $("#q", el).value.toLowerCase(); const list = rows.filter((r) => !q || [r.name, r.sku, r.category].join(" ").toLowerCase().includes(q));
    $("#tbl", el).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("f_pname")}</th><th>${t("f_sku")}</th><th>${t("f_category")}</th><th>${t("f_unit")}</th><th class="r">${t("f_price")}</th><th></th></tr></thead><tbody>${list.map((r) => `<tr><td data-l="${t("f_pname")}"><b>${esc(r.name)}</b><br><small>${esc(r.description)}</small></td><td data-l="${t("f_sku")}">${esc(r.sku)}</td><td data-l="${t("f_category")}">${esc(r.category)}</td><td data-l="${t("f_unit")}">${esc(r.unit)}</td><td class="r" data-l="${t("f_price")}"><b>${money(r.price)}</b></td>
      <td class="acts"><button class="icon-btn" data-a="edit" data-id="${r.id}" aria-label="${t("act_edit")}">${ico("edit")}</button><button class="icon-btn danger" data-a="del" data-id="${r.id}" aria-label="${t("delete")}">${ico("trash")}</button></td></tr>`).join("")}</tbody></table>` : empty("box", t("products_empty")); };
  draw(); $("#q", el).oninput = debounce(draw, 150);
  const edit = async (p) => { const r = await modal({ title: p ? t("product_edit") : t("product_add"), body: formHtml(p), actions: [{ label: t("cancel"), value: null }, { label: t("save"), cls: "primary", onClick: async (ov) => {
    const g = (k) => ov.querySelector(`[name=${k}]`).value.trim(); const price = num(g("price")); if (!g("name")) { toast(t("err_required"), "err"); return false; } if (price < 0 || price > 1e9) { toast(t("err_num"), "err"); return false; }
    const data = { name: g("name"), sku: g("sku"), category: g("category"), description: g("description"), price, unit: g("unit") };
    try { p ? await update(ctx.uid, "products", p.id, data) : await create(ctx.uid, "products", data); return true; } catch (x) { toast(errMsg(x), "err"); return false; } } }] }); if (r) { toast(t("saved")); renderList(el, ctx); } };
  $("#add", el).onclick = () => edit(null);
  el.onclick = async (e) => { const b = e.target.closest("[data-a]"); if (!b) return; const p = rows.find((x) => x.id === b.dataset.id); if (!p) return; if (b.dataset.a === "edit") return edit(p);
    if (await confirmBox(t("delete"), t("confirm_delete", { n: p.name }), t("delete"))) { try { await remove(ctx.uid, "products", p.id); toast(t("deleted")); renderList(el, ctx); } catch (x) { toast(errMsg(x), "err"); } } };
}

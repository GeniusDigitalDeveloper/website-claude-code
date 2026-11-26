// Profil → Maklumat Sebut Harga.
// Soalan "Adakah anda mempunyai pakej?" (suis):
//   - YA   : pakej dipaparkan sebagai kotak (kiri ke kanan). Klik kotak -> tetingkap edit (nama pakej + senarai produk: nama & harga).
//   - TIDAK: satu senarai produk biasa (nama & harga).
// Diskaun / peratus / kuantiti TIDAK di sini; ia ditetapkan semasa membuat sebut harga.
// Disimpan dalam satu dokumen meta "quotePackages": { hasPackages, packages: [{ id, name, items: [{ name, price }] }], products: [{ name, price }] }
import { t } from "../i18n.js";
import { $, $$, esc, num, money, round2, toast, setBusy, confirmBox, modal } from "../util.js";
import { getMeta, setMeta } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, loading } from "./ui.js";

export const PKG_META = "quotePackages";
const uid = () => Math.random().toString(36).slice(2, 10);
const cleanItems = (arr) => (Array.isArray(arr) ? arr : []).map((i) => ({ name: String(i.name || "").trim(), price: round2(Math.max(num(i.price), 0)) })).filter((i) => i.name);
const sum = (items) => items.reduce((s, i) => s + num(i.price), 0);

async function readMeta(ctx) {
  const m = await getMeta(ctx.uid, PKG_META);
  const packages = (Array.isArray(m.packages) ? m.packages : []).map((p) => ({ id: p.id || uid(), name: String(p.name || ""), items: cleanItems(p.items) }));
  const products = cleanItems(m.products);
  const hasPackages = typeof m.hasPackages === "boolean" ? m.hasPackages : packages.length > 0;
  return { hasPackages, packages, products };
}
const writeMeta = (ctx, s) => setMeta(ctx.uid, PKG_META, { hasPackages: !!s.hasPackages, packages: s.packages.map((p) => ({ id: p.id, name: p.name, items: cleanItems(p.items) })), products: cleanItems(s.products) });

// Untuk borang/senarai sebut harga: kumpulan produk yang boleh dipilih
export async function loadPackages(ctx) {
  const s = await readMeta(ctx);
  const groups = s.hasPackages ? s.packages : s.products.length ? [{ id: "products", name: t("qi_products"), items: s.products }] : [];
  return groups.filter((g) => g.items.length).map((g) => ({ ...g, items: g.items.map((i) => ({ name: i.name, desc: "", qty: 1, price: i.price, discount: 0 })) }));
}

// Penyunting senarai produk (nama + harga), setiap produk dipisahkan garisan
const rowsHtml = (items) => items.map((i, k) => `<div class="qi-row"><span class="qi-no">${k + 1}</span>
  <label class="qi-name">${t("qi_item_name")}<input data-k="name" maxlength="150" value="${esc(i.name)}" placeholder="${esc(t("item_ph"))}"></label>
  <label class="qi-price">${t("qi_price")}<input data-k="price" type="number" min="0" step="0.01" inputmode="decimal" value="${i.price === "" ? "" : num(i.price)}"></label>
  <button type="button" class="icon-btn danger" data-del="${k}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${ico("trash")}</button></div>`).join("");
function bindRows(box, items) {
  const read = () => $$(".qi-row", box).forEach((r, k) => { items[k].name = r.querySelector("[data-k=name]").value; items[k].price = r.querySelector("[data-k=price]").value; });
  const draw = () => { box.querySelector(".qi-rows").innerHTML = items.length ? rowsHtml(items) : `<p class="muted qi-none">${t("qi_no_items")}</p>`; };
  box.addEventListener("click", (e) => {
    const d = e.target.closest("[data-del]"); if (d) { read(); items.splice(+d.dataset.del, 1); draw(); return; }
    if (e.target.closest("[data-additem]")) { read(); items.push({ name: "", price: "" }); draw(); const ins = $$(".qi-row [data-k=name]", box); ins.at(-1).focus(); }
  });
  draw(); return read;
}
const editorHtml = () => `<div class="qi-rows"></div><button type="button" class="btn ghost sm" data-additem>${ico("plus")}${t("qi_add_item")}</button>`;

export async function render(el, ctx) {
  el.innerHTML = loading();
  let s;
  try { s = await readMeta(ctx); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const save = async (next) => { await writeMeta(ctx, next); s = next; };

  const paint = () => {
    el.innerHTML = `<div class="card form">
      <p class="muted">${t("qi_sub")}</p>
      <div class="qi-ask"><div><b>${t("qi_ask")}</b><p class="muted">${t("qi_ask_d")}</p></div>
        <label class="switch"><input type="checkbox" id="hasPkg" ${s.hasPackages ? "checked" : ""}><span class="sw-track" aria-hidden="true"></span><span class="sw-lbl">${s.hasPackages ? t("qi_yes") : t("qi_no")}</span></label></div>
      <div id="qibody"></div></div>`;
    const body = $("#qibody", el);
    $("#hasPkg", el).onchange = async (e) => {
      const next = { ...s, hasPackages: e.target.checked };
      try { await save(next); toast(t("qi_saved")); } catch (x) { e.target.checked = !e.target.checked; return toast(errMsg(x), "err"); }
      paint();
    };
    if (s.hasPackages) {
      // Kotak pakej (grid kiri ke kanan) + kotak "Tambah Pakej"
      body.innerHTML = `<h2 class="sec-t">${t("qi_packages")}</h2><div class="pk-grid">${s.packages.map((p, i) => `<button type="button" class="pk-box" data-open="${i}" aria-label="${esc(t("qi_edit_pkg"))}: ${esc(p.name)}">
          <span class="pk-num">${i + 1}</span><b class="pk-title">${esc(p.name || t("qi_pkg_default", { n: i + 1 }))}</b>
          <span class="pk-meta">${t("qi_n_products", { n: p.items.length })}</span>
          <ul class="pk-prev">${p.items.slice(0, 4).map((it) => `<li><span>${esc(it.name)}</span><b>${money(it.price)}</b></li>`).join("")}${p.items.length > 4 ? `<li class="more">+${p.items.length - 4}</li>` : ""}</ul>
          <span class="pk-tot">${money(sum(p.items))}</span><span class="pk-edit">${ico("edit")}${t("qi_edit_pkg")}</span></button>`).join("")}
        <button type="button" class="pk-box pk-add" data-new>${ico("plus")}<b>${t("qi_add_pkg")}</b></button></div>`;
      $$("[data-open]", body).forEach((b) => (b.onclick = () => editPackage(+b.dataset.open)));
      $("[data-new]", body).onclick = () => editPackage(-1);
    } else {
      // Tiada pakej: satu senarai produk (nama + harga)
      const items = s.products.map((i) => ({ ...i })); if (!items.length) items.push({ name: "", price: "" });
      body.innerHTML = `<h2 class="sec-t">${t("qi_products")}</h2><div class="qi-edit" id="plist">${editorHtml()}</div><p class="err" id="err" role="alert"></p>
        <div class="form-f"><button class="btn primary" type="button" id="saveP">${ico("check")}${t("save")}</button></div>`;
      const read = bindRows($("#plist", body), items);
      $("#saveP", body).onclick = async (e) => {
        read(); const err = $("#err", body); err.textContent = "";
        const bad = items.some((i) => (String(i.name).trim() && i.price === "") || (!String(i.name).trim() && i.price !== "" && num(i.price)));
        if (bad) return (err.textContent = t("qi_err_row"));
        const btn = e.currentTarget; setBusy(btn, true);
        try { await save({ ...s, products: cleanItems(items) }); toast(t("qi_saved")); paint(); } catch (x) { err.textContent = errMsg(x); setBusy(btn, false); }
      };
    }
  };

  // Tetingkap edit pakej: nama pakej + produk (nama & harga). idx = -1 untuk pakej baharu.
  const editPackage = (idx) => {
    const isNew = idx < 0; const p = isNew ? { id: uid(), name: t("qi_pkg_default", { n: s.packages.length + 1 }), items: [] } : s.packages[idx];
    const items = p.items.map((i) => ({ ...i })); if (!items.length) items.push({ name: "", price: "" });
    const wrap = document.createElement("div"); wrap.className = "form qi-modal";
    wrap.innerHTML = `<label>${t("qi_pkg_name")} *<input id="pkName" maxlength="80" value="${esc(p.name)}"></label>
      <h4 class="qi-h">${t("qi_products")}</h4><div class="qi-edit">${editorHtml()}</div><p class="err" id="perr" role="alert"></p>`;
    const read = bindRows($(".qi-edit", wrap), items);
    const actions = [];
    if (!isNew) actions.push({ label: t("qi_del_pkg"), cls: "danger", onClick: async () => {
      if (!(await confirmBox(t("qi_del_pkg"), t("qi_del_confirm", { n: p.name }), t("delete")))) return false;
      try { await save({ ...s, packages: s.packages.filter((_, i) => i !== idx) }); toast(t("deleted")); paint(); } catch (x) { toast(errMsg(x), "err"); return false; }
    } });
    actions.push({ label: t("cancel"), cls: "ghost" });
    actions.push({ label: t("save"), cls: "primary", onClick: async () => {
      read(); const err = $("#perr", wrap); err.textContent = ""; const name = $("#pkName", wrap).value.trim();
      if (!name) { err.textContent = t("qi_err_name"); return false; }
      if (items.some((i) => (String(i.name).trim() && i.price === "") || (!String(i.name).trim() && i.price !== "" && num(i.price)))) { err.textContent = t("qi_err_row"); return false; }
      const np = { id: p.id, name, items: cleanItems(items) };
      if (!np.items.length) { err.textContent = t("qi_err_empty"); return false; }
      const packages = s.packages.slice(); isNew ? packages.push(np) : (packages[idx] = np);
      try { await save({ ...s, packages }); toast(t("qi_saved")); paint(); } catch (x) { err.textContent = errMsg(x); return false; }
    } });
    modal({ title: isNew ? t("qi_add_pkg") : t("qi_edit_pkg"), body: wrap, wide: true, actions });
  };
  paint();
}

// ---- Pemilih dalam borang/senarai sebut harga: tanda produk yang dipilih pelanggan
export function pickerHtml(pkgs, btnLabel = t("qi_insert"), desc = t("qi_pick_d")) {
  return `<section class="card form qpick"><h2>${t("qi_pick")}</h2><p class="muted">${desc}</p>
    ${pkgs.map((p, pi) => `<details class="qp-pkg" ${pi === 0 ? "open" : ""}><summary><b>${esc(p.name)}</b><span class="qp-sum">${money(sum(p.items))}</span></summary>
      <label class="chk qp-all"><input type="checkbox" data-qall="${pi}"> ${t("qi_all")}</label>
      <ul class="qp-list">${p.items.map((i, ii) => `<li><label class="chk"><input type="checkbox" data-qi="${pi}:${ii}"><span class="qp-name">${esc(i.name)}</span><span class="qp-price">${money(i.price)}</span></label></li>`).join("")}</ul></details>`).join("")}
    <div class="inline-actions"><button type="button" class="btn accent" id="qpIns">${ico("plus")}${btnLabel}</button></div></section>`;
}
export function bindPicker(root, pkgs, onInsert) {
  root.querySelectorAll("[data-qall]").forEach((a) => (a.onchange = () => root.querySelectorAll(`[data-qi^="${a.dataset.qall}:"]`).forEach((c) => (c.checked = a.checked))));
  const ins = root.querySelector("#qpIns"); if (!ins) return;
  ins.onclick = () => {
    const picked = [...root.querySelectorAll("[data-qi]:checked")].map((c) => { const [pi, ii] = c.dataset.qi.split(":").map(Number); const i = pkgs[pi].items[ii]; return { name: i.name, desc: "", qty: 1, price: num(i.price), discount: 0 }; });
    if (!picked.length) return toast(t("qi_none_sel"), "err");
    if (onInsert(picked) === false) return; root.querySelectorAll("[data-qi]:checked, [data-qall]:checked").forEach((c) => (c.checked = false)); toast(t("qi_added", { n: picked.length }));
  };
}

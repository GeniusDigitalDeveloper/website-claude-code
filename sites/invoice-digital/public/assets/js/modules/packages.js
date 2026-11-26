// Profil → Maklumat Sebut Harga: pakej (Pakej 1, Pakej 2, ...) yang mengandungi produk/perkhidmatan beserta harga.
// Disimpan dalam satu dokumen meta "quotePackages". Borang sebut harga memilih produk daripada senarai ini.
import { t } from "../i18n.js";
import { $, $$, esc, num, money, round2, toast, setBusy, confirmBox } from "../util.js";
import { getMeta, setMeta } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, loading } from "./ui.js";

export const PKG_META = "quotePackages";
const uid = () => Math.random().toString(36).slice(2, 10);
const blankItem = () => ({ name: "", desc: "", qty: 1, price: 0, discount: 0 });
export const itemAmount = (i) => round2(num(i.qty) * num(i.price) * (1 - Math.min(Math.max(num(i.discount), 0), 100) / 100));

// Baca pakej (hanya pakej & item yang sah)
export async function loadPackages(ctx) {
  const m = await getMeta(ctx.uid, PKG_META);
  return (Array.isArray(m.packages) ? m.packages : []).map((p) => ({ id: p.id || uid(), name: p.name || "", desc: p.desc || "", items: (p.items || []).map((i) => ({ ...blankItem(), ...i })) }));
}

export async function render(el, ctx) {
  el.innerHTML = loading();
  let pkgs;
  try { pkgs = await loadPackages(ctx); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  if (!pkgs.length) pkgs = [{ id: uid(), name: t("qi_pkg_default", { n: 1 }), desc: "", items: [blankItem()] }];

  el.innerHTML = `<form id="qf" class="card form" novalidate>
    <p class="muted">${t("qi_sub")}</p>
    <div id="pkgs" class="pkgs"></div>
    <button type="button" class="btn ghost" id="addPkg">${ico("plus")}${t("qi_add_pkg")}</button>
    <p class="err" id="err" role="alert"></p>
    <div class="form-f sticky"><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div></form>`;
  const box = $("#pkgs", el), f = $("#qf", el);

  const read = () => $$(".pkg", box).forEach((card, pi) => {
    const p = pkgs[pi]; p.name = card.querySelector("[data-p=name]").value; p.desc = card.querySelector("[data-p=desc]").value;
    $$(".pkg-row", card).forEach((row, ii) => { const it = p.items[ii]; ["name", "desc"].forEach((k) => (it[k] = row.querySelector(`[data-k=${k}]`).value)); ["qty", "price", "discount"].forEach((k) => (it[k] = num(row.querySelector(`[data-k=${k}]`).value))); });
  });
  const totals = () => $$(".pkg", box).forEach((card, pi) => {
    const p = pkgs[pi]; $$(".pkg-row", card).forEach((row, ii) => (row.querySelector(".amt").textContent = money(itemAmount(p.items[ii]))));
    card.querySelector(".pkg-tot b").textContent = money(p.items.reduce((s, i) => s + itemAmount(i), 0));
  });
  const draw = () => {
    box.innerHTML = pkgs.map((p, pi) => `<section class="pkg" aria-label="${esc(p.name || t("qi_pkg_name"))}">
      <div class="pkg-h"><span class="pkg-n">${pi + 1}</span>
        <label class="grow">${t("qi_pkg_name")} *<input data-p="name" maxlength="80" value="${esc(p.name)}" placeholder="${esc(t("qi_pkg_default", { n: pi + 1 }))}"></label>
        <div class="pkg-acts"><button type="button" class="icon-btn" data-dup="${pi}" aria-label="${esc(t("qi_dup"))}" title="${esc(t("qi_dup"))}">${ico("copy")}</button><button type="button" class="icon-btn danger" data-delp="${pi}" aria-label="${esc(t("qi_del_pkg"))}" title="${esc(t("qi_del_pkg"))}">${ico("trash")}</button></div></div>
      <label>${t("qi_pkg_desc")}<input data-p="desc" maxlength="200" value="${esc(p.desc)}"></label>
      <div class="pkg-items">${p.items.map((i, ii) => `<div class="item pkg-row"><div class="item-main"><label>${t("qi_item_name")} *<input data-k="name" maxlength="150" value="${esc(i.name)}" placeholder="${esc(t("item_ph"))}"></label><label>${t("item_detail")}<input data-k="desc" maxlength="300" value="${esc(i.desc)}"></label></div>
        <div class="item-nums"><label>${t("pdf_qty")}<input data-k="qty" type="number" min="0" step="any" value="${num(i.qty)}"></label><label>${t("pdf_price")} (RM)<input data-k="price" type="number" min="0" step="0.01" inputmode="decimal" value="${num(i.price)}"></label><label>${t("pdf_disc")} %<input data-k="discount" type="number" min="0" max="100" step="0.01" value="${num(i.discount)}"></label>
        <div class="amt-w"><span>${t("pdf_amount")}</span><b class="amt"></b></div><button type="button" class="icon-btn danger" data-deli="${pi}:${ii}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${ico("trash")}</button></div></div>`).join("")}</div>
      <div class="row-between"><button type="button" class="btn ghost sm" data-addi="${pi}">${ico("plus")}${t("qi_add_item")}</button><span class="pkg-tot">${t("qi_total")}: <b></b></span></div>
    </section>`).join("");
    totals();
  };
  draw();

  box.addEventListener("input", () => { read(); totals(); });
  box.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return; read();
    if (b.dataset.addi != null) { pkgs[+b.dataset.addi].items.push(blankItem()); draw(); $$(".pkg", box)[+b.dataset.addi].querySelector(".pkg-row:last-child input").focus(); }
    else if (b.dataset.deli) { const [pi, ii] = b.dataset.deli.split(":").map(Number); pkgs[pi].items.splice(ii, 1); if (!pkgs[pi].items.length) pkgs[pi].items.push(blankItem()); draw(); }
    else if (b.dataset.dup != null) { const p = pkgs[+b.dataset.dup]; pkgs.splice(+b.dataset.dup + 1, 0, { ...p, id: uid(), name: p.name + " " + t("qi_copy"), items: p.items.map((i) => ({ ...i })) }); draw(); }
    else if (b.dataset.delp != null) { const pi = +b.dataset.delp; if (!(await confirmBox(t("qi_del_pkg"), t("qi_del_confirm", { n: pkgs[pi].name || pi + 1 }), t("delete")))) return; pkgs.splice(pi, 1); draw(); }
  });
  $("#addPkg", el).onclick = () => { read(); pkgs.push({ id: uid(), name: t("qi_pkg_default", { n: pkgs.length + 1 }), desc: "", items: [blankItem()] }); draw(); $$(".pkg", box).at(-1).querySelector("[data-p=name]").focus(); };

  f.onsubmit = async (e) => {
    e.preventDefault(); read(); const err = $("#err", el); err.textContent = "";
    // Buang baris produk yang kosong sepenuhnya; setiap pakej & produk mesti bernama
    const clean = pkgs.map((p) => ({ id: p.id, name: p.name.trim(), desc: p.desc.trim(), items: p.items.filter((i) => i.name.trim() || num(i.price)).map((i) => ({ name: i.name.trim(), desc: i.desc.trim(), qty: num(i.qty) || 1, price: round2(num(i.price)), discount: Math.min(Math.max(num(i.discount), 0), 100) })) }));
    if (clean.some((p) => !p.name || p.items.some((i) => !i.name)) ) return (err.textContent = t("qi_err_name"));
    if (clean.some((p) => p.items.some((i) => i.price < 0 || i.qty < 0))) return (err.textContent = t("err_num"));
    if (clean.length > 30 || clean.some((p) => p.items.length > 100)) return (err.textContent = t("err_num"));
    const btn = $("button[type=submit]", f); setBusy(btn, true);
    try { await setMeta(ctx.uid, PKG_META, { packages: clean }); pkgs = clean.map((p) => ({ ...p, items: p.items.length ? p.items : [blankItem()] })); draw(); toast(t("qi_saved")); }
    catch (x) { console.error(x); err.textContent = errMsg(x); }
    setBusy(btn, false);
  };
}

// ---- Pemilih dalam borang sebut harga: tanda produk yang dipilih pelanggan, kemudian masukkan sebagai item
export function pickerHtml(pkgs) {
  return `<section class="card form qpick"><h2>${t("qi_pick")}</h2><p class="muted">${t("qi_pick_d")}</p>
    ${pkgs.map((p, pi) => `<details class="qp-pkg" ${pi === 0 ? "open" : ""}><summary><b>${esc(p.name)}</b>${p.desc ? ` <small>${esc(p.desc)}</small>` : ""}<span class="qp-sum">${money(p.items.reduce((s, i) => s + itemAmount(i), 0))}</span></summary>
      <label class="chk qp-all"><input type="checkbox" data-qall="${pi}"> ${t("qi_all")}</label>
      <ul class="qp-list">${p.items.map((i, ii) => `<li><label class="chk"><input type="checkbox" data-qi="${pi}:${ii}"><span class="qp-name">${esc(i.name)}${i.desc ? `<small>${esc(i.desc)}</small>` : ""}</span><span class="qp-price">${num(i.qty) !== 1 ? `${num(i.qty)} × ` : ""}${money(i.price)}${num(i.discount) ? ` <em>-${num(i.discount)}%</em>` : ""}</span></label></li>`).join("")}</ul></details>`).join("")}
    <div class="inline-actions"><button type="button" class="btn accent" id="qpIns">${ico("plus")}${t("qi_insert")}</button></div></section>`;
}
export function bindPicker(root, pkgs, onInsert) {
  root.querySelectorAll("[data-qall]").forEach((a) => (a.onchange = () => root.querySelectorAll(`[data-qi^="${a.dataset.qall}:"]`).forEach((c) => (c.checked = a.checked))));
  const ins = root.querySelector("#qpIns"); if (!ins) return;
  ins.onclick = () => {
    const picked = [...root.querySelectorAll("[data-qi]:checked")].map((c) => { const [pi, ii] = c.dataset.qi.split(":").map(Number); const i = pkgs[pi].items[ii]; return { name: i.name, desc: i.desc || "", qty: num(i.qty) || 1, price: num(i.price), discount: num(i.discount) }; });
    if (!picked.length) return toast(t("qi_none_sel"), "err");
    onInsert(picked); root.querySelectorAll("[data-qi]:checked, [data-qall]:checked").forEach((c) => (c.checked = false)); toast(t("qi_added", { n: picked.length }));
  };
}

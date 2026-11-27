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
export const pkgPrice = (p) => (num(p.price) > 0 ? round2(num(p.price)) : round2(sum(p.items || []))); // harga pakej tetap (atau jumlah produk bagi pakej lama)
const fixed = (p) => num(p.price) > 0;
// Kandungan pakej = TEKS BEBAS (satu kotak). Pakej versi sebelum (senarai kandungan) ditukar kepada teks, satu baris setiap item.
export const pkgText = (p) => (typeof p.text === "string" && p.text.trim() ? p.text.trim() : fixed(p) || ((p.items || []).length && (p.items || []).every((i) => !num(i.price))) ? (p.items || []).map((i) => i.name).filter(Boolean).join("\n") : "");

async function readMeta(ctx) {
  const m = await getMeta(ctx.uid, PKG_META);
  const packages = (Array.isArray(m.packages) ? m.packages : []).map((p) => ({ id: p.id || uid(), name: String(p.name || ""), price: round2(Math.max(num(p.price), 0)), text: typeof p.text === "string" ? p.text : "", items: cleanItems(p.items) }));
  const products = cleanItems(m.products);
  const hasPackages = typeof m.hasPackages === "boolean" ? m.hasPackages : packages.length > 0;
  return { hasPackages, packages, products };
}
const writeMeta = (ctx, s) => setMeta(ctx.uid, PKG_META, { hasPackages: !!s.hasPackages, packages: s.packages.map((p) => ({ id: p.id, name: p.name, price: round2(Math.max(num(p.price), 0)), text: String(p.text || "").slice(0, 4000), items: cleanItems(p.items) })), products: cleanItems(s.products) });

// Untuk borang/senarai sebut harga: kumpulan produk yang boleh dipilih
export async function loadPackages(ctx) {
  const s = await readMeta(ctx);
  const groups = s.hasPackages ? s.packages : s.products.length ? [{ id: "products", name: t("qi_products"), items: s.products }] : [];
  return groups.filter((g) => g.items.length || pkgText(g)).map((g) => ({ ...g, items: g.items.map((i) => ({ name: i.name, desc: "", qty: 1, price: i.price, discount: 0 })) }));
}

// Penyunting senarai produk (nama + harga), setiap produk dipisahkan garisan
const rowsHtml = (items, noPrice) => items.map((i, k) => `<div class="qi-row ${noPrice ? "np" : ""}"><span class="qi-no">${k + 1}</span>
  <label class="qi-name">${noPrice ? `<span class="sr-only">${t("qi_item_name")}</span>` : t("qi_item_name")}<input data-k="name" maxlength="150" value="${esc(i.name)}" placeholder="${esc(noPrice ? t("qi_content_ph") : t("item_ph"))}"></label>
  ${noPrice ? "" : `<label class="qi-price">${t("qi_price")}<input data-k="price" type="number" min="0" step="0.01" inputmode="decimal" value="${i.price === "" ? "" : num(i.price)}"></label>`}
  <button type="button" class="icon-btn danger" data-del="${k}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${ico("trash")}</button></div>`).join("");
function bindRows(box, items, noPrice) {
  const read = () => $$(".qi-row", box).forEach((r, k) => { items[k].name = r.querySelector("[data-k=name]").value; const pr = r.querySelector("[data-k=price]"); items[k].price = pr ? pr.value : 0; });
  const draw = () => { box.querySelector(".qi-rows").innerHTML = items.length ? rowsHtml(items, noPrice) : `<p class="muted qi-none">${t("qi_no_items")}</p>`; };
  box.addEventListener("click", (e) => {
    const d = e.target.closest("[data-del]"); if (d) { read(); items.splice(+d.dataset.del, 1); draw(); return; }
    if (e.target.closest("[data-additem]")) { read(); items.push({ name: "", price: "" }); draw(); const ins = $$(".qi-row [data-k=name]", box); ins.at(-1).focus(); }
  });
  draw(); return read;
}
const editorHtml = (label = t("qi_add_item")) => `<div class="qi-rows"></div><button type="button" class="btn ghost sm" data-additem>${ico("plus")}${label}</button>`;

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
          ${fixed(p) ? `<p class="pk-text">${esc(pkgText(p))}</p>` : `<span class="pk-meta">${t("qi_n_products", { n: p.items.length })}</span>
          <ul class="pk-prev">${p.items.slice(0, 4).map((it) => `<li><span>${esc(it.name)}</span>${fixed(p) ? "" : `<b>${money(it.price)}</b>`}</li>`).join("")}${p.items.length > 4 ? `<li class="more">+${p.items.length - 4}</li>` : ""}</ul>`}
          <span class="pk-tot">${money(pkgPrice(p))}</span><span class="pk-edit">${ico("edit")}${t("qi_edit_pkg")}</span></button>`).join("")}
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
    const curPrice = isNew ? "" : pkgPrice(p) || "";
    const wrap = document.createElement("div"); wrap.className = "form qi-modal";
    wrap.innerHTML = `<label><span class="lt">${t("qi_pkg_name")} <span class="req">*</span></span><input id="pkName" maxlength="80" value="${esc(p.name)}"></label>
      <label><span class="lt">${t("qi_pkg_price")} <span class="req">*</span></span><input id="pkPrice" type="number" min="0" step="0.01" inputmode="decimal" value="${curPrice}" placeholder="0.00"></label>
      <label><span class="lt">${t("qi_contents")} <span class="req">*</span></span><textarea id="pkText" rows="9" maxlength="4000" placeholder="${esc(t("qi_text_ph"))}">${esc(isNew ? "" : pkgText(p))}</textarea></label>
      <p class="muted qi-hint">${t("qi_text_d")}</p><p class="err" id="perr" role="alert"></p>`;
    const read = () => {};
    wrap.addEventListener("input", () => ($("#perr", wrap).textContent = "")); // ralat hilang sebaik pengguna menaip
    const actions = [];
    if (!isNew) actions.push({ label: t("qi_del_pkg"), cls: "danger", onClick: async () => {
      if (!(await confirmBox(t("qi_del_pkg"), t("qi_del_confirm", { n: p.name }), t("delete")))) return false;
      try { await save({ ...s, packages: s.packages.filter((_, i) => i !== idx) }); toast(t("deleted")); paint(); } catch (x) { toast(errMsg(x), "err"); return false; }
    } });
    actions.push({ label: t("cancel"), cls: "ghost" });
    actions.push({ label: t("save"), cls: "primary", onClick: async () => {
      read(); const err = $("#perr", wrap); err.textContent = ""; const name = $("#pkName", wrap).value.trim();
      if (!name) { err.textContent = t("qi_err_name"); $("#pkName", wrap).focus(); return false; }
      const price = round2(num($("#pkPrice", wrap).value)); if (!(price > 0)) { err.textContent = t("qi_err_price"); $("#pkPrice", wrap).focus(); return false; }
      const text = $("#pkText", wrap).value.replace(/\s+$/g, "").replace(/^\s*\n/, ""); if (!text.trim()) { err.textContent = t("qi_err_content"); $("#pkText", wrap).focus(); return false; }
      const np = { id: p.id, name, price, text, items: [] };
      const packages = s.packages.slice(); isNew ? packages.push(np) : (packages[idx] = np);
      try { await save({ ...s, packages }); toast(t("qi_saved")); paint(); } catch (x) { err.textContent = errMsg(x); return false; }
    } });
    modal({ title: isNew ? t("qi_add_pkg") : t("qi_edit_pkg"), body: wrap, wide: true, actions });
  };
  paint();
}

// ---- Pemilih pakej (borang sebut harga/invois & senarai sebut harga)
// Kotak pakej tersusun kiri ke kanan (5 sebaris di skrin besar, seterusnya turun ke baris bawah; tiada scroll).
// Klik "Pilih Pakej" -> senarai produk pakej itu muncul (semua ditanda) -> nyahtanda produk yang tidak mahu.
// sel = { [pakejId]: [indeks produk dipilih] }
export const selTotal = (p, idx) => (fixed(p) ? (idx.length ? pkgPrice(p) : 0) : idx.reduce((s, k) => s + num(p.items[k] && p.items[k].price), 0));
export function selToItems(pkgs, sel) {
  const out = []; pkgs.forEach((p) => { const idx = sel[p.id] || []; if ((fixed(p) || pkgText(p)) && idx.length) { const txt = pkgText(p); out.push({ name: p.name, desc: txt, contentsText: txt, qty: 1, price: pkgPrice(p), discount: 0, pkg: p.id }); return; } idx.forEach((k) => { const i = p.items[k]; if (i) out.push({ name: i.name, desc: "", qty: 1, price: num(i.price), discount: 0, pkg: p.id }); }); }); return out;
}
export function selHtml(pkgs, sel, { title = t("qs_title"), desc = t("qs_desc"), action = "" } = {}) {
  return `<section class="card form qsel"><h2>${title}</h2><p class="muted">${desc}</p><div class="qs-grid">${pkgs.map((p) => {
    const on = Array.isArray(sel[p.id]); const idx = on ? sel[p.id] : [];
    return `<div class="qs-box ${on ? "on" : ""}" data-pk="${esc(p.id)}"><div class="qs-top"><b class="qs-name">${esc(p.name)}</b><span class="qs-full">${t("qs_pkg_price")}: <b>${money(pkgPrice(p))}</b></span></div>
      ${on ? `<span class="qs-badge">${ico("check")}${t("qs_picked")}</span>
      ${fixed(p) ? `<p class="pk-text">${esc(pkgText(p))}</p>` : `<ul class="qs-list">${idx.map((k) => p.items[k]).filter(Boolean).map((i) => `<li><span class="qs-in">${esc(i.name)}</span><b>${money(i.price)}</b></li>`).join("")}</ul>`}
      <div class="qs-tot">${t("qs_sel_total")}: <b>${money(selTotal(p, idx))}</b></div>
      <div class="qs-acts"><button type="button" class="btn ghost sm" data-pick="${esc(p.id)}">${ico("edit")}${t("qs_change")}</button><button type="button" class="btn ghost sm danger" data-unpick="${esc(p.id)}">${ico("x")}${t("qs_remove")}</button></div>`
      : `<button type="button" class="btn ghost sm qs-btn" data-pick="${esc(p.id)}">${ico("plus")}${t("qs_pick_pkg")}</button>${fixed(p) ? `<p class="pk-text">${esc(pkgText(p))}</p>` : `<span class="qs-cnt">${t("qi_n_products", { n: p.items.length })}</span>`}`}</div>`;
  }).join("")}</div>${action}</section>`;
}
// Hanya SATU pakej boleh dipilih. Klik "Pilih Pakej" -> tetingkap produk pakej itu; pengguna mesti tanda sekurang-kurangnya satu produk.
function pickProducts(p, current, confirmLabel = t("qs_confirm")) {
  const wrap = document.createElement("div"); wrap.className = "form qs-modal";
  if (fixed(p) || pkgText(p) || (p.items || []).every((i) => !num(i.price))) { // pakej berharga tetap / teks: papar kandungan + harga tetap; sahkan pilihan
    const txt = pkgText(p) || (p.items || []).map((i) => i.name).filter(Boolean).join("\n");
    wrap.innerHTML = `<div class="qs-pkgtxt">${esc(txt)}</div><div class="qs-tot qs-fixed">${t("qs_pkg_price")}: <b>${money(pkgPrice(p))}</b></div>`;
    let ok = null; return modal({ title: p.name, body: wrap, actions: [{ label: t("cancel"), cls: "ghost" }, { label: confirmLabel, cls: "primary", onClick: () => { ok = [0]; } }] }).then(() => ok);
  }
  wrap.innerHTML = `<p class="note-red qs-note" role="alert">${t("qs_note")}</p>
    <ul class="qs-list qs-mlist">${p.items.map((i, k) => `<li><label class="chk"><input type="checkbox" data-mi="${k}" ${current.includes(k) ? "checked" : ""}><span class="qs-in">${esc(i.name)}</span>${fixed(p) ? "" : `<b>${money(i.price)}</b>`}</label></li>`).join("")}</ul>
    <div class="qs-tot">${t("qs_sel_total")}: <b id="mtot">${money(selTotal(p, current))}</b></div>`;
  const picked = () => [...wrap.querySelectorAll("[data-mi]:checked")].map((c) => +c.dataset.mi);
  wrap.addEventListener("change", () => { wrap.querySelector("#mtot").textContent = money(selTotal(p, picked())); });
  let result = null;
  return modal({ title: p.name, body: wrap, actions: [{ label: t("cancel"), cls: "ghost" }, { label: confirmLabel, cls: "primary", onClick: () => { const k = picked(); if (!k.length) { const n = wrap.querySelector(".qs-note"); n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash"); return false; } result = k; } }] }).then(() => result);
}
export function bindSel(root, pkgs, sel, onChange, opts) {
  const box = root.querySelector(".qsel"); if (!box) return;
  const redraw = () => { const tmp = document.createElement("div"); tmp.innerHTML = selHtml(pkgs, sel, opts); box.replaceWith(tmp.firstElementChild); bindSel(root, pkgs, sel, onChange, opts); };
  box.addEventListener("click", async (e) => {
    const un = e.target.closest("[data-unpick]"); if (un) { delete sel[un.dataset.unpick]; onChange(sel); return redraw(); }
    const b = e.target.closest("[data-pick]"); if (!b) return; const id = b.dataset.pick, p = pkgs.find((x) => x.id === id); if (!p) return;
    const k = await pickProducts(p, Array.isArray(sel[id]) ? sel[id] : [], opts && opts.confirmLabel); if (!k) return;
    Object.keys(sel).forEach((x) => delete sel[x]); sel[id] = k; // satu pakej sahaja
    onChange(sel); redraw();
  });
}

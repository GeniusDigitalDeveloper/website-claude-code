// Borang Sebut Harga (ringkas): Pelanggan -> Pilih Pakej & Produk -> Senarai Item (automatik) -> Nota/Terma + Diskaun & Jumlah.
// Tiada "Maklumat Dokumen": tarikh = hari ini (automatik), status = Draf, logo/tandatangan/cop/saiz ikut Profil → Perniagaan.
import { t } from "../i18n.js";
import { esc, $, money, num, round2, todayMY, addDays, toast, setBusy } from "../util.js";
import { listAll, getOne, create, update, createNumbered, logActivity } from "../db.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading } from "./ui.js";
import { makePdf } from "./actions.js";
import { loadPackages, selHtml, bindSel, selToItems } from "./packages.js";

export async function render(el, ctx, id, numberFmt) {
  el.innerHTML = loading();
  let doc = null, customers = [], company = {}, pkgs = [];
  try {
    [customers, company, pkgs] = await Promise.all([listAll(ctx.uid, "customers"), ctx.getCompany(), loadPackages(ctx).catch(() => [])]);
    if (id) { doc = await getOne(ctx.uid, "quotations", id); if (!doc) { el.innerHTML = empty("doc", t("not_found")); return; } }
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  pkgs = pkgs.filter((p) => p.items.length);
  if (!doc && !pkgs.length) {
    el.innerHTML = `<div class="page-h"><div><h1>${t("quotation_new")}</h1></div><a class="btn ghost" href="#/app/quotations">${t("back")}</a></div>${empty("quote", t("qi_need"), `<p class="muted">${t("qi_need_d")}</p><a class="btn primary" href="#/app/profile/quoteinfo">${ico("quote")}${t("qi_go")}</a>`)}`;
    return;
  }
  const st = await ctx.getSettings(); const today = todayMY();
  const d = doc || { note: "", terms: company.terms || st.terms || "", template: company.template || "classic", color: company.color || "#2563eb", customer: {}, docDiscount: 0, docDiscountPct: 0 };
  const cust = d.customer || {};
  if (!doc) { const pc = new URLSearchParams(location.hash.split("?")[1] || "").get("customer"); const c = customers.find((x) => x.id === pc); if (c) { d.customerId = c.id; Object.assign(cust, { name: c.name || "", company: c.company || "", address: c.address || "", phone: c.phone || "", email: c.email || "", regNo: c.regNo || "" }); } }

  // Pilihan pakej (satu sahaja). Dari halaman senarai Sebut Harga, pilihan dibawa melalui sessionStorage.
  const sel = d.pkgSel && typeof d.pkgSel === "object" ? JSON.parse(JSON.stringify(d.pkgSel)) : {};
  if (!doc) { try { const pre = JSON.parse(sessionStorage.getItem("qp_sel") || "null"); sessionStorage.removeItem("qp_sel"); if (pre && typeof pre === "object") Object.assign(sel, pre); } catch { /* abaikan */ } }
  Object.keys(sel).forEach((k) => { if (!pkgs.some((p) => p.id === k)) delete sel[k]; });
  Object.keys(sel).slice(1).forEach((k) => delete sel[k]);
  // Item: daripada pilihan pakej; dokumen lama tanpa pakej mengekalkan item asal
  let items = Object.keys(sel).length ? selToItems(pkgs, sel) : (doc ? (doc.items || []).map((i) => ({ ...i })) : []);
  const pkgName = () => { const p = pkgs.find((x) => sel[x.id]); return p ? p.name : (doc && doc.pkgNames && doc.pkgNames[0]) || ""; };
  const subtotal = () => round2(items.reduce((s, i) => s + num(i.qty || 1) * num(i.price) * (1 - num(i.discount) / 100), 0));

  el.innerHTML = `<div class="page-h"><div><h1>${doc ? esc(doc.number) : t("quotation_new")}</h1><p class="sub">${doc ? t("edit") : t("new")}</p></div><a class="btn ghost" href="#/app/quotations${doc ? "/" + id : ""}">${t("back")}</a></div>
  <form id="f" class="doc-form" novalidate>
   <section class="card form"><h2>${t("sec_customer")}</h2>
    <label><span class="lt">${t("f_name")} <span class="req">*</span></span><input name="cname" maxlength="120" value="${esc(cust.name)}" required autocomplete="name"></label>
    <label><span class="lt">${t("f_address")} <span class="req">*</span></span><textarea name="caddress" rows="2" maxlength="300" required>${esc(cust.address)}</textarea></label>
    <div class="grid3"><label><span class="lt">${t("f_phone")} <span class="req">*</span></span><input name="cphone" maxlength="30" value="${esc(cust.phone)}" inputmode="tel" required autocomplete="tel"></label>
     <label>${t("f_company_opt")}<input name="ccompany" maxlength="120" value="${esc(cust.company)}"></label>
     <label><span class="lt">${t("f_regno")} <span class="req" id="regReq" ${cust.company ? "" : "hidden"}>*</span></span><input name="cregNo" maxlength="40" value="${esc(cust.regNo)}"></label></div>
    <label class="chk ${d.customerId ? "hide" : ""}"><input type="checkbox" name="saveCust" checked> ${t("save_customer")}</label>
   </section>
   ${pkgs.length ? selHtml(pkgs, sel) : ""}
   <section class="card form"><h2>${t("sec_items")}</h2><div id="qeItems"></div></section>
   <section class="card form"><div class="grid2 qe-bottom">
    <div class="form"><label><span class="lt">${t("pdf_note")} <em class="opt">(${t("if_needed")})</em></span><textarea name="note" rows="3" maxlength="1000">${esc(d.note)}</textarea></label>
     <label><span class="lt">${t("pdf_terms")} <em class="opt">(${t("if_needed")})</em></span><textarea name="terms" rows="4" maxlength="2000">${esc(d.terms)}</textarea></label>
     ${pickerHtml(d.template, d.color)}</div>
    <div class="form sum"><div class="grid2"><label>${t("f_docdisc_pct")}<input name="pct" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${num(d.docDiscountPct) || ""}" placeholder="0"></label>
     <label>${t("f_after_disc")}<input name="after" type="number" min="0" step="0.01" inputmode="decimal"></label></div>
     <div id="sum" class="totals qe-sum" aria-live="polite"></div></div></div></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/quotations">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el);
  let disc = round2(num(d.docDiscount));

  const draw = () => {
    const sub = subtotal(); disc = Math.min(Math.max(disc, 0), sub); const tot = round2(sub - disc);
    $("#qeItems", el).innerHTML = items.length ? `<p class="qe-lbl">${t("pdf_desc")}</p><div class="qe-box">
      ${pkgName() ? `<div class="qe-pkg"><span>${t("qe_package")}</span><b>${esc(pkgName())}</b></div>` : ""}
      <div class="qe-prods">${items.map((i) => `<div class="qe-prod"><b>${esc(i.name)}</b><span>${money(num(i.qty || 1) * num(i.price))}</span></div>`).join("")}</div>
      <div class="qe-row"><div><span>${t("qe_price")}</span><b>${money(sub)}</b></div><div><span>${t("pdf_discount")}</span><b>${disc ? "- " + money(disc) : money(0)}</b></div><div class="qe-total"><span>${t("qe_total")}</span><b>${money(tot)}</b></div></div></div>`
      : `<p class="muted qe-empty">${t("qe_pick_first")}</p>`;
    $("#sum", el).innerHTML = `<div class="qe-sub"><span>${t("pdf_subtotal")}</span><b>${money(sub)}</b></div>${disc ? `<div><span>${t("pdf_discount")}${num(f.pct.value) ? ` (${num(f.pct.value)}%)` : ""}</span><b>- ${money(disc)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(tot)}</b></div>`;
    if (document.activeElement !== f.after) f.after.value = tot.toFixed(2);
  };
  const fromPct = () => { const p = Math.min(Math.max(num(f.pct.value), 0), 100); disc = f.pct.value === "" ? 0 : round2(subtotal() * p / 100); };
  f.pct.addEventListener("input", () => { fromPct(); draw(); });
  f.after.addEventListener("input", () => { const sub = subtotal(); if (f.after.value === "") return; disc = round2(Math.min(Math.max(sub - num(f.after.value), 0), sub)); f.pct.value = sub ? String(round2((disc / sub) * 100)) : ""; draw(); });
  f.after.addEventListener("blur", draw);
  if (f.pct.value) fromPct();
  draw(); bindPicker(el);
  if (pkgs.length) bindSel(el, pkgs, sel, () => { items = selToItems(pkgs, sel); if (f.pct.value) fromPct(); draw(); });
  f.ccompany.addEventListener("input", () => ($("#regReq", el).hidden = !f.ccompany.value.trim()));

  const build = () => {
    const date = doc ? doc.date : today; const sub = subtotal();
    return {
      date, status: doc ? doc.status : "draft", payStatus: doc ? (doc.payStatus || "unpaid") : "unpaid",
      validUntil: doc && doc.validUntil && doc.validUntil >= date ? doc.validUntil : addDays(date, 30),
      customer: { name: f.cname.value.trim(), company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: cust.email || "", regNo: f.cregNo.value.trim() },
      items: items.map((i) => ({ name: i.name, desc: "", qty: num(i.qty) || 1, price: num(i.price), discount: num(i.discount) || 0, ...(i.pkg ? { pkg: i.pkg } : {}) })),
      pkgSel: sel, pkgNames: pkgName() ? [pkgName()] : [],
      docDiscount: Math.min(disc, sub), docDiscountPct: f.pct.value ? Math.min(Math.max(num(f.pct.value), 0), 100) : 0, taxRate: 0, taxName: d.taxName || "SST",
      note: f.note.value.trim(), terms: f.terms.value.trim(), template: f.template.value, color: f.color.value, imgScale: (doc && doc.imgScale) || {},
    };
  };
  $("#prev", el).onclick = async (e) => {
    const btn = e.currentTarget; setBusy(btn, true);
    try { const pdf = await makePdf(ctx, "quotation", { ...build(), number: doc ? doc.number : "PRATONTON", customer: { ...build().customer, name: f.cname.value.trim() || "-" } }); window.open(URL.createObjectURL(pdf.output("blob")), "_blank"); }
    catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    const fail = (m, node) => { err.textContent = m; node && node.focus(); };
    if (!f.cname.value.trim()) return fail(t("err_cust"), f.cname);
    if (!f.caddress.value.trim()) return fail(t("err_cust_addr"), f.caddress);
    if (!f.cphone.value.trim()) return fail(t("err_cust_phone"), f.cphone);
    if (f.ccompany.value.trim() && !f.cregNo.value.trim()) return fail(t("err_cust_reg"), f.cregNo);
    if (!items.length) return fail(t("qe_pick_first"));
    setBusy(btn, true);
    try {
      const data = build();
      let customerId = d.customerId || "";
      if (!customerId && f.saveCust.checked) {
        const c = data.customer; const same = customers.find((x) => (x.name || "").trim().toLowerCase() === c.name.toLowerCase() && (x.phone || "").replace(/\D/g, "") === c.phone.replace(/\D/g, ""));
        customerId = same ? same.id : await create(ctx.uid, "customers", { ...c, notes: "" });
      }
      data.customerId = customerId;
      let rid = id;
      if (doc) await update(ctx.uid, "quotations", id, data);
      else { const r = await createNumbered(ctx.uid, "quotation", await numberFmt(ctx, "quotation"), null, () => ({ data })); rid = r.id; logActivity(ctx.user, "quotation", r.number); }
      toast(t("saved")); ctx.nav(`#/app/quotations/${rid}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}

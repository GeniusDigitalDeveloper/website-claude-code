// Borang Sebut Harga (ringkas): Pelanggan -> Pilih Pakej & Produk -> Senarai Item (automatik) -> Nota/Terma + Diskaun & Jumlah.
// Tiada "Maklumat Dokumen": tarikh = hari ini (automatik), status = Draf, logo/tandatangan/cop/saiz ikut Profil → Perniagaan.
import { t } from "../i18n.js";
import { esc, $, money, num, round2, todayMY, addDays, toast, setBusy } from "../util.js";
import { listAll, getOne, create, update, createNumbered, logActivity, docRef } from "../db.js";
import { F } from "../firebase.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading } from "./ui.js";
import { makePdf, previewPdf } from "./actions.js";
import { loadPackages, selHtml, bindSel, selToItems } from "./packages.js";

export async function render(el, ctx, id, numberFmt) {
  el.innerHTML = loading();
  let doc = null, customers = [], company = {}, pkgs = [];
  try {
    [customers, company, pkgs] = await Promise.all([listAll(ctx.uid, "customers"), ctx.getCompany(), loadPackages(ctx).catch(() => [])]);
    if (id) { doc = await getOne(ctx.uid, "quotations", id); if (!doc) { el.innerHTML = empty("doc", t("not_found")); return; } }
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  // loadPackages sudah menapis pakej kosong (termasuk pakej teks bebas)
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
  let items = Object.keys(sel).length ? selToItems(pkgs, sel) : (doc ? (doc.items || []).filter((i) => i.pkg).map((i) => ({ ...i })) : []);
  // Add-on = item tambahan di luar pakej (cth: Homestay). Dokumen lama: item bukan-pakej dianggap add-on.
  let addons = doc ? (doc.items || []).filter((i) => !i.pkg).map((i) => ({ name: i.name || "", price: round2(num(i.qty || 1) * num(i.price) * (1 - num(i.discount) / 100)) })) : [];
  if (doc && !Object.keys(sel).length && !(doc.items || []).some((i) => i.pkg)) { items = []; } // dokumen lama tanpa pakej: semua item jadi add-on
  const pkgName = () => { const p = pkgs.find((x) => sel[x.id]); return p ? p.name : (doc && doc.pkgNames && doc.pkgNames[0]) || ""; };
  const pkgTotal = () => round2(items.reduce((s, i) => s + num(i.qty || 1) * num(i.price) * (1 - num(i.discount) / 100), 0));
  const addonTotal = () => round2(addons.reduce((s, a) => s + (String(a.name).trim() ? num(a.price) : 0), 0));
  const subtotal = () => round2(pkgTotal() + addonTotal());

  el.innerHTML = `<div class="page-h"><div><h1>${doc ? esc(doc.number) : t("quotation_new")}</h1><p class="sub">${doc ? t("edit") : t("new")}</p></div><a class="btn ghost" href="#/app/quotations${doc ? "/" + id : ""}">${t("back")}</a></div>
  <form id="f" class="doc-form" novalidate>
   <section class="card form"><h2>${t("sec_customer")}</h2>
    <label><span class="lt">${t("f_name")} <span class="req">*</span></span><input name="cname" maxlength="120" value="${esc(cust.name)}" required autocomplete="name"></label>
    <label><span class="lt">${t("f_address")} <span class="req">*</span></span><textarea name="caddress" rows="2" maxlength="300" required>${esc(cust.address)}</textarea></label>
    <div class="grid3"><label><span class="lt">${t("f_phone")} <span class="req">*</span></span><input name="cphone" maxlength="30" value="${esc(cust.phone)}" inputmode="tel" required autocomplete="tel"></label>
     <label><span class="lt">${t("f_company")} <em class="opt-red">(${t("if_needed")})</em></span><input name="ccompany" maxlength="120" value="${esc(cust.company)}"></label>
     <label><span class="lt">${t("f_regno")} <em class="opt-red">(${t("if_needed")})</em> <span class="req" id="regReq" ${cust.company ? "" : "hidden"}>*</span></span><input name="cregNo" maxlength="40" value="${esc(cust.regNo)}"></label></div>
    <label class="chk ${d.customerId ? "hide" : ""}"><input type="checkbox" name="saveCust" checked> ${t("save_customer")}</label>
   </section>
   ${pkgs.length ? selHtml(pkgs, sel, { confirmLabel: t("save") }) : ""}
   <section class="card form"><h2>${t("qe_pkg_sel")}</h2><div id="qeItems"></div></section>
   <section class="card form"><h2>${t("ao_title")}</h2><p class="muted">${t("ao_desc")}</p>
    <div class="qi-edit"><div id="aoRows"></div><button type="button" class="btn ghost sm" id="aoAdd">${ico("plus")}${t("ao_add")}</button></div>
    <div class="ao-sum" id="aoSum" aria-live="polite"></div>
    <div class="grid2 ao-disc"><label>${t("f_disc_rm")}<input name="disc" type="number" min="0" step="0.01" inputmode="decimal" value="${num(d.docDiscount) || ""}" placeholder="0.00"></label>
     <div class="ao-after"><span>${t("f_after_disc_lbl")}</span><b id="aoAfter"></b></div></div>
   </section>
   <section class="card form"><div class="grid2 qe-bottom">
    <div class="form"><label><span class="lt">${t("pdf_terms")} <em class="opt">(${t("if_needed")})</em></span><textarea name="terms" rows="5" maxlength="2000">${esc(d.terms)}</textarea></label>
     ${pickerHtml(d.template, d.color)}</div>
    <div class="form sum"><div id="sum" class="totals qe-sum" aria-live="polite"></div></div></div></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/quotations">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el);
  let disc = round2(num(d.docDiscount));
  const aoRows = $("#aoRows", el);
  const readAo = () => aoRows.querySelectorAll(".ao-row").forEach((r, k) => { addons[k].name = r.querySelector("[data-k=name]").value; addons[k].price = r.querySelector("[data-k=price]").value; });
  const drawAo = () => { aoRows.innerHTML = addons.length ? addons.map((a, k) => `<div class="qi-row ao-row"><span class="qi-no">${k + 1}</span>
      <label class="qi-name">${t("ao_name")}<input data-k="name" maxlength="150" value="${esc(a.name)}" placeholder="${esc(t("ao_ph"))}"></label>
      <label class="qi-price">${t("qi_price")}<input data-k="price" type="number" min="0" step="0.01" inputmode="decimal" value="${a.price === "" ? "" : num(a.price)}"></label>
      <button type="button" class="icon-btn danger" data-aodel="${k}" aria-label="${esc(t("delete"))}" title="${esc(t("delete"))}">${ico("trash")}</button></div>`).join("") : `<p class="muted qi-none">${t("ao_none")}</p>`; };

  const draw = () => {
    const sub = subtotal(); disc = Math.min(Math.max(disc, 0), sub); const tot = round2(sub - disc);
    $("#qeItems", el).innerHTML = items.length ? `<p class="qe-lbl">${t("pdf_desc")}</p><div class="qe-box">
      ${pkgName() ? `<div class="qe-pkg"><span>${t("qe_package")}</span><b>${esc(pkgName())}</b></div>` : ""}
      <div class="qe-prods">${items.flatMap((i) => (i.contentsText ? [`<div class="qe-text">${esc(i.contentsText)}</div>`] : i.contents && i.contents.length ? i.contents.map((n) => `<div class="qe-prod"><b>${esc(n)}</b></div>`) : [`<div class="qe-prod"><b>${esc(i.name)}</b><span>${money(num(i.qty || 1) * num(i.price))}</span></div>`])).join("")}</div>
      <div class="qe-row qe-row1"><div class="qe-total"><span>${t("qs_pkg_price")}</span><b>${money(pkgTotal())}</b></div></div></div>`
      : `<p class="muted qe-empty">${t("qe_pick_first")}</p>`;
    $("#aoSum", el).innerHTML = `<div><span>${t("qs_pkg_price")}</span><b>${money(pkgTotal())}</b></div><div><span>${t("ao_total")}</span><b>${money(addonTotal())}</b></div><div class="ao-grand"><span>${t("ao_grand")}</span><b>${money(sub)}</b></div>`;
    $("#aoAfter", el).textContent = money(tot);
    $("#sum", el).innerHTML = `<div class="qe-sub"><span>${t("pdf_subtotal")}</span><b>${money(sub)}</b></div>${disc ? `<div><span>${t("pdf_discount")}</span><b>- ${money(disc)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(tot)}</b></div>`;
  };
  f.disc.addEventListener("input", () => { disc = round2(Math.max(num(f.disc.value), 0)); draw(); });
  aoRows.addEventListener("input", () => { readAo(); draw(); });
  aoRows.addEventListener("click", (e) => { const b = e.target.closest("[data-aodel]"); if (!b) return; readAo(); addons.splice(+b.dataset.aodel, 1); drawAo(); draw(); });
  $("#aoAdd", el).onclick = () => { readAo(); addons.push({ name: "", price: "" }); drawAo(); const ins = aoRows.querySelectorAll("[data-k=name]"); ins[ins.length - 1].focus(); };
  drawAo(); draw(); bindPicker(el);
  if (pkgs.length) bindSel(el, pkgs, sel, () => { items = selToItems(pkgs, sel); draw(); }, { confirmLabel: t("save") });
  f.ccompany.addEventListener("input", () => ($("#regReq", el).hidden = !f.ccompany.value.trim()));

  const build = () => {
    const date = doc ? doc.date : today; const sub = subtotal();
    return {
      date, status: doc ? doc.status : "draft", payStatus: doc ? (doc.payStatus || "unpaid") : "unpaid",
      validUntil: doc && doc.validUntil && doc.validUntil >= date ? doc.validUntil : addDays(date, 30),
      customer: { name: f.cname.value.trim(), company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: cust.email || "", regNo: f.cregNo.value.trim() },
      items: items.map((i) => ({ name: i.name, desc: i.desc || "", qty: num(i.qty) || 1, price: num(i.price), discount: num(i.discount) || 0, ...(i.pkg ? { pkg: i.pkg } : {}), ...(i.contents ? { contents: i.contents } : {}), ...(i.contentsText ? { contentsText: i.contentsText } : {}) }))
        .concat(addons.filter((a) => String(a.name).trim()).map((a) => ({ name: String(a.name).trim(), desc: "", qty: 1, price: round2(Math.max(num(a.price), 0)), discount: 0, addon: true }))),
      pkgSel: sel, pkgNames: pkgName() ? [pkgName()] : [],
      docDiscount: Math.min(disc, sub), docDiscountPct: 0, taxRate: 0, taxName: d.taxName || "SST",
      note: d.note || "", terms: f.terms.value.trim(), template: f.template.value, color: f.color.value, imgScale: (doc && doc.imgScale) || {},
    };
  };
  $("#prev", el).onclick = async (e) => {
    const btn = e.currentTarget; setBusy(btn, true);
    try { await previewPdf(() => makePdf(ctx, "quotation", { ...build(), number: doc ? doc.number : "PRATONTON", customer: { ...build().customer, name: f.cname.value.trim() || "-" } })); }
    catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    const fail = (m, node) => { err.textContent = m; node && node.focus(); };
    if (!f.cname.value.trim()) return fail(t("err_cust"), f.cname);
    if (!f.caddress.value.trim()) return fail(t("err_cust_addr"), f.caddress);
    if (!f.cphone.value.trim()) return fail(t("err_cust_phone"), f.cphone);
    if (f.ccompany.value.trim() && !f.cregNo.value.trim()) return fail(t("err_cust_reg"), f.cregNo);
    readAo();
    if (!items.length && !addons.some((a) => String(a.name).trim())) return fail(t("qe_pick_first"));
    if (addons.some((a) => String(a.name).trim() && (a.price === "" || num(a.price) < 0))) return fail(t("ao_err"));
    if (disc > subtotal() + 0.005) return fail(t("ao_err_disc"), f.disc);
    setBusy(btn, true);
    try {
      const data = build();
      let customerId = d.customerId || "";
      if (!customerId && f.saveCust.checked) {
        const c = data.customer; const same = customers.find((x) => (x.name || "").trim().toLowerCase() === c.name.toLowerCase() && (x.phone || "").replace(/\D/g, "") === c.phone.replace(/\D/g, ""));
        customerId = same ? same.id : await create(ctx.uid, "customers", { ...c, notes: "" });
      }
      data.customerId = customerId;
      let rid = id, qnum = doc ? doc.number : "";
      if (doc) await update(ctx.uid, "quotations", id, data);
      else { const r = await createNumbered(ctx.uid, "quotation", await numberFmt(ctx, "quotation"), null, () => ({ data })); rid = r.id; qnum = r.number; logActivity(ctx.user, "quotation", r.number); }
      await syncInvoice(ctx, numberFmt, rid, qnum, data, doc);
      toast(t("saved")); ctx.nav(`#/app/quotations/${rid}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}

// Invois dijana AUTOMATIK daripada setiap sebut harga (tiada butang "Tukar kepada Invois").
// Sebut harga diedit -> invois berkaitan dikemas kini (pelanggan, item, diskaun, nota, terma, tema). Bayaran/resit invois tidak disentuh.
async function syncInvoice(ctx, numberFmt, qid, qnum, data, doc) {
  const shared = { customer: data.customer, customerId: data.customerId || "", items: data.items, pkgSel: data.pkgSel, pkgNames: data.pkgNames, docDiscount: data.docDiscount, docDiscountPct: data.docDiscountPct, taxRate: data.taxRate, taxName: data.taxName, note: data.note, terms: data.terms, template: data.template, color: data.color, imgScale: data.imgScale };
  const linked = doc && doc.convertedInvoiceId;
  if (linked) {
    try { const inv = await getOne(ctx.uid, "invoices", linked); if (inv) { await update(ctx.uid, "invoices", linked, shared); return; } } catch (e) { console.warn("invois", e); }
  }
  const date = todayMY(); const qref = docRef(ctx.uid, "quotations", qid);
  const r = await createNumbered(ctx.uid, "invoice", await numberFmt(ctx, "invoice"), null, (_, n, newId) => ({
    data: { ...shared, date, dueDate: addDays(date, 14), status: "unpaid", payStatus: "", deposit: 0, receiptsPaid: 0, receiptCount: 0, fromQuotationId: qid, fromQuotationNumber: qnum },
    writes: [(tx) => tx.update(qref, { convertedInvoiceId: newId, convertedInvoiceNumber: n, updatedAt: F.serverTimestamp() })],
  }));
  logActivity(ctx.user, "invoice", r.number);
}

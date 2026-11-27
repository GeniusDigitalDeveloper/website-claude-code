// Modul Invoice & Quotation: senarai, borang (cipta/edit), paparan + tindakan.
import { t, getLang } from "../i18n.js";
import { esc, $, $$, money, num, round2, calc, fmtDate, todayMY, addDays, toast, setBusy, fitImage, invoiceStatus, quotationStatus, PAY, payOf, payAutoInvoice, debounce, modal, confirmBox } from "../util.js";
import { listAll, listLive, queryLive, docLive, docRef, getOne, create, update, remove, createNumbered, logActivity, setMeta } from "../db.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { F } from "../firebase.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading, badge } from "./ui.js";
import { pdfAction, makePdf, previewPdf } from "./actions.js";
import { deleteProject, confirmKey } from "./projects.js";
import { recordPayment, METHODS } from "./receipts.js";
import { TEMPLATES } from "../pdf.js";
import { bulkBarHtml, chkTh, chkTd, bulkController, limitRows } from "./bulk.js";
import { loadPackages, selHtml, bindSel, selToItems } from "./packages.js";

const CFG = {
  invoice: { col: "invoices", route: "invoices", fmt: "INV-{YYYY}-{NNNN}", statuses: ["draft", "sent", "unpaid", "partial", "paid", "cancelled"], eff: (r) => (["draft", "cancelled"].includes(r.status) ? r.status : payOf("invoice", r)), filter: ["draft", "unpaid", "deposit", "partial", "paid", "overdue", "cancelled"] },
  quotation: { col: "quotations", route: "quotations", fmt: "QUO-{YYYY}-{NNNN}", statuses: ["draft", "sent", "accepted", "rejected", "expired", "converted"], eff: quotationStatus, filter: ["draft", "sent", "accepted", "rejected", "expired", "converted"] },
};
const dueOf = (type, d) => (type === "invoice" ? d.dueDate : d.validUntil);

// ------------------------------------------------------------------ SENARAI
export async function renderList(el, ctx, type) {
  const C = CFG[type]; el.innerHTML = loading();
  let rows = [], shown = [], mounted = false, draw = () => {}, bulk = null;
  // Sebut harga: pakej daripada Profil → Maklumat Sebut Harga dipaparkan di sini; tanda produk -> terus buat sebut harga.
  const showPackages = async () => {
    if (type !== "quotation") return; let pkgs = [];
    try { pkgs = (await loadPackages(ctx)).filter((p) => p.items.some((i) => i.name)); } catch (e) { console.warn("pakej", e); }
    const note = $("#qinote", el), box = $("#qpk", el); if (!note || !box) return;
    if (!pkgs.length) { note.innerHTML = `<p class="note-red qi-note">${t("qi_note_empty")} <a href="#/app/profile/quoteinfo">${t("qi_go")}</a></p>`; box.innerHTML = `<div class="q-new"><a class="btn primary lg" href="#/app/${C.route}/new">${ico("plus")}${t("quotation_new_btn")}</a></div>`; return; }
    // Pilih pakej -> tanda produk -> tekan "Sebut Harga" dalam tetingkap -> terus ke borang sebut harga
    note.innerHTML = ""; box.innerHTML = `<div class="q-new"><a class="btn primary lg" href="#/app/${C.route}/new">${ico("plus")}${t("quotation_new_btn")}</a></div>`;
  };
  const mount = () => {
    el.innerHTML = `<div class="page-h"><div><h1>${t("nav_" + C.route)}</h1><p class="sub">${t(type + "_sub")}</p><div id="qinote"></div></div>${type === "quotation" ? "" : `<a class="btn primary" href="#/app/${C.route}/new">${ico("plus")}${t(type + "_new")}</a>`}</div>
    <div id="qpk"></div><div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div>
    <select id="sf" aria-label="${esc(t("f_status"))}" ${type === "quotation" ? "hidden" : ""}><option value="">${t("all_status")}</option>${C.filter.map((s) => `<option value="${s}">${t((type === "invoice" && !["draft", "cancelled"].includes(s) ? "ps_" : "st_") + s)}</option>`).join("")}</select></div>${bulkBarHtml()}<div id="tbl" class="scrollbox"></div></div>`;
    bulk = bulkController(ctx, el, () => shown.map((r) => ({ k: type, id: r.id, doc: r })), () => rows.map((r) => ({ k: type, id: r.id, doc: r })));
    draw = () => {
      const q = $("#q", el).value.toLowerCase(), sf = $("#sf", el).value;
      shown = rows.filter((r) => (!sf || C.eff(r) === sf) && (!q || [r.number, r.customer && r.customer.name, r.customer && r.customer.company].join(" ").toLowerCase().includes(q)));
      $("#tbl", el).innerHTML = shown.length ? `<table class="tbl"><thead><tr>${chkTh()}<th class="idx">${t("col_index")}</th><th class="c">${t("col_docno")}</th><th class="c">${t("col_customer")}</th><th class="c">${t("f_phone")}</th><th class="c">${t("col_date_gen")}</th>${type === "invoice" ? `<th class="c">${t("f_status")}</th>` : ""}<th class="r">${t("col_total")}</th><th></th></tr></thead><tbody>${shown.map((r, i) => `<tr>
        ${chkTd(type + ":" + r.id, r.number)}<td class="idx" data-l="${t("col_index")}">${i + 1}</td>
        <td class="c" data-l="${t("col_docno")}"><a href="#/app/${C.route}/${r.id}"><b>${esc(r.number)}</b></a></td><td class="c" data-l="${t("col_customer")}">${esc((r.customer && r.customer.name) || "-")}</td>
        <td class="c nw" data-l="${t("f_phone")}">${esc((r.customer && r.customer.phone) || "-")}</td><td class="c nw" data-l="${t("col_date_gen")}">${fmtDate(r.date, getLang())}</td>
        ${type === "invoice" ? `<td class="c" data-l="${t("f_status")}">${type === "invoice" && !["draft", "cancelled"].includes(r.status) ? `<span class="badge b-${C.eff(r)}">${esc(t("ps_" + C.eff(r)))}</span>` : badge(C.eff(r))}</td>` : ""}
        <td class="r tot-red" data-l="${t("col_total")}"><b>${money(calc(r).total)}</b></td>
        <td class="acts"><a class="icon-btn" href="#/app/${C.route}/${r.id}/edit" aria-label="${t("act_edit")}" title="${t("act_edit")}">${ico("edit")}</a><a class="icon-btn" href="#/app/${C.route}/${r.id}" aria-label="${t("act_view")}" title="${t("act_view")}">${ico("eye")}</a><button class="icon-btn" data-a="download" data-id="${r.id}" aria-label="${t("act_download")}" title="${t("act_download")}">${ico("download")}</button>${type === "quotation" ? "" : `<button class="icon-btn" data-a="dup" data-id="${r.id}" aria-label="${t("act_duplicate")}" title="${t("act_duplicate")}">${ico("copy")}</button>`}</td></tr>`).join("")}</tbody></table>` : (type === "quotation" ? empty("quote", t("quotation_empty_btn")) : empty("doc", t(type + "_empty"), `<a class="btn primary" href="#/app/${C.route}/new">${t(type + "_new")}</a>`));
      limitRows($("#tbl", el)); bulk.sync();
    };
    draw(); $("#q", el).oninput = debounce(() => draw(), 150); $("#sf", el).onchange = () => draw();
    el.onclick = async (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
      if (b.dataset.a === "download") pdfAction(ctx, type, r, "download", b);
      if (b.dataset.a === "dup") { setBusy(b, true); try { const id = await duplicate(ctx, type, r); toast(t("duplicated")); ctx.nav(`#/app/${C.route}/${id}`); } catch (x) { toast(errMsg(x), "err"); setBusy(b, false); } }
    };
  };
  ctx.live(listLive(ctx.uid, C.col, (r) => { rows = r; if (!mounted) { mounted = true; mount(); showPackages(); } else draw(); }, (e) => { if (!mounted) el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }));
}

export async function numberFmt(ctx, type) { const s = await ctx.getSettings(); return (s.numberFormat && s.numberFormat[type]) || CFG[type].fmt; }

export async function duplicate(ctx, type, src) {
  const today = todayMY(); const { id, number, createdAt, updatedAt, ownerUid, status, receiptsPaid, receiptCount, convertedInvoiceId, convertedInvoiceNumber, fromQuotationId, fromQuotationNumber, ...rest } = src;
  const data = { ...rest, date: today, status: "draft", ...(type === "invoice" ? { dueDate: addDays(today, 14), receiptsPaid: 0, receiptCount: 0 } : { validUntil: addDays(today, 30) }) };
  const r = await createNumbered(ctx.uid, type, await numberFmt(ctx, type), null, () => ({ data }));
  logActivity(ctx.user, type, r.number); return r.id;
}

// ------------------------------------------------------------------ BORANG
export async function renderEditor(el, ctx, type, id) {
  if (type === "quotation") return (await import("./quote-editor.js")).render(el, ctx, id, numberFmt); // borang sebut harga ringkas
  if (type === "invoice") return (await import("./invoice-editor.js")).render(el, ctx, id, numberFmt); // invois: pilih daripada sebut harga
  const C = CFG[type]; el.innerHTML = loading();
  let doc, customers, products, company;
  try {
    [customers, products, company] = await Promise.all([listAll(ctx.uid, "customers"), listAll(ctx.uid, "products"), ctx.getCompany()]);
    doc = id ? await getOne(ctx.uid, C.col, id) : null; if (id && !doc) { el.innerHTML = empty("doc", t("not_found")); return; }
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  // Sebut harga: produk dipilih daripada Profil → Maklumat Sebut Harga (pakej). Mesti diisi dahulu sebelum sebut harga baharu.
  let pkgs = [];
  { try { pkgs = (await loadPackages(ctx)).filter((p) => p.items.some((i) => i.name)); } catch (e) { console.warn("pakej", e); } }
  if (type === "quotation" && !doc && !pkgs.length) {
    el.innerHTML = `<div class="page-h"><div><h1>${t("quotation_new")}</h1></div><a class="btn ghost" href="#/app/${C.route}">${t("back")}</a></div>${empty("quote", t("qi_need"), `<p class="muted">${t("qi_need_d")}</p><a class="btn primary" href="#/app/profile/quoteinfo">${ico("quote")}${t("qi_go")}</a>`)}`;
    return;
  }
  const st = await ctx.getSettings(); const today = todayMY();
  const d = doc || { date: today, status: "draft", items: [{ name: "", desc: "", qty: 1, price: 0, discount: 0 }], docDiscount: 0, deposit: 0, receiptsPaid: 0,
    taxRate: num(company.taxRate ?? st.taxRate), taxName: company.taxName || st.taxName || "SST", note: "", terms: company.terms || st.terms || "", template: company.template || "classic", color: company.color || "#2563eb",
    customer: {}, ...(type === "invoice" ? { dueDate: addDays(today, 14) } : { validUntil: addDays(today, 30) }) };
  if (!doc) { const pc = new URLSearchParams(location.hash.split("?")[1] || "").get("customer"); const c = customers.find((x) => x.id === pc); if (c) { d.customerId = c.id; d.customer = custSnap(c); } }
  let items = d.items.map((i) => ({ ...i }));
  const sel = d.pkgSel && typeof d.pkgSel === "object" ? JSON.parse(JSON.stringify(d.pkgSel)) : {};
  if (!doc) { try { const pre = JSON.parse(sessionStorage.getItem("qp_sel") || "null"); sessionStorage.removeItem("qp_sel"); if (pre && typeof pre === "object") { Object.assign(sel, pre); items = []; } } catch { /* abaikan */ } }
  Object.keys(sel).forEach((k) => { if (!pkgs.some((p) => p.id === k)) delete sel[k]; });
  Object.keys(sel).slice(1).forEach((k) => delete sel[k]); // satu pakej sahaja
  const cust = d.customer || {};
  el.innerHTML = `<div class="page-h"><div><h1>${doc ? esc(doc.number) : t(type + "_new")}</h1><p class="sub">${doc ? t("edit") : t("new")}</p></div><a class="btn ghost" href="#/app/${C.route}${doc ? "/" + id : ""}">${t("back")}</a></div>
  <form id="f" class="doc-form" novalidate>
   <section class="card form"><h2>${t("sec_customer")}</h2>
    <label><span class="lt">${t("f_name")} <span class="req">*</span></span><input name="cname" maxlength="120" value="${esc(cust.name)}" required autocomplete="name"></label>
    <label><span class="lt">${t("f_address")} <span class="req">*</span></span><textarea name="caddress" rows="2" maxlength="300" required>${esc(cust.address)}</textarea></label>
    <div class="grid3"><label><span class="lt">${t("f_phone")} <span class="req">*</span></span><input name="cphone" maxlength="30" value="${esc(cust.phone)}" inputmode="tel" required autocomplete="tel"></label>
     <label><span class="lt">${t("f_company")} <em class="opt-red">(${t("if_needed")})</em></span><input name="ccompany" maxlength="120" value="${esc(cust.company)}"></label>
     <label><span class="lt">${t("f_regno")} <em class="opt-red">(${t("if_needed")})</em> <span class="req" id="regReq" ${cust.company ? "" : "hidden"}>*</span></span><input name="cregNo" maxlength="40" value="${esc(cust.regNo)}"></label></div>
    <label class="chk ${d.customerId ? "hide" : ""}" id="saveCustW"><input type="checkbox" name="saveCust" checked> ${t("save_customer")}</label>
   </section>
   ${pkgs.length ? selHtml(pkgs, sel) : ""}
   <section class="card form"><h2>${t("sec_details")}</h2>
    <div class="grid3"><label>${t("f_date")}<input name="date" type="date" value="${esc(d.date)}" required></label>
    <label>${t("f_status")}<select name="status">${C.statuses.map((s) => `<option value="${s}" ${s === d.status ? "selected" : ""} ${type === "quotation" && s === "converted" && !d.convertedInvoiceId ? "disabled" : ""}>${t("st_" + s)}</option>`).join("")}</select></label>
    <label>${t("f_paystatus")}<select name="payStatus">${PAY.map((s) => `<option value="${s}" ${s === payOf(type, d) ? "selected" : ""}>${t("ps_" + s)}</option>`).join("")}</select></label></div>
   </section>
   <section class="card form"><div class="row-between"><h2>${t("sec_items")}</h2><div class="inline-actions"><select id="pickProd" aria-label="${esc(t("pick_product"))}"><option value="">${t("pick_product")}</option>${products.map((p) => `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("")}</select><button type="button" class="btn ghost" id="addItem">${ico("plus")}${t("add_item")}</button></div></div>
    <div id="items" class="items"></div></section>
   <section class="card form"><div class="grid2">
    <div class="form"><label>${t("pdf_note")}<textarea name="note" rows="3" maxlength="1000">${esc(d.note)}</textarea></label><label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(d.terms)}</textarea></label>
     ${pickerHtml(d.template, d.color)}</div>
    <div class="form sum"><div class="grid3"><label>${t("f_docdisc_pct")}<input name="docDiscountPct" type="number" min="0" max="100" step="0.01" inputmode="decimal" value="${num(d.docDiscountPct) || ""}" placeholder="0"></label><label>${t("f_docdisc")} (RM)<input name="docDiscount" type="number" min="0" step="0.01" inputmode="decimal" value="${num(d.docDiscount)}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(d.taxRate)}"></label></div>
     <div id="sum" class="totals" aria-live="polite"></div></div></div></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/${C.route}">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el); const itemsEl = $("#items", el);
  const readItems = () => $$(".item", itemsEl).forEach((row, k) => { items[k] = { ...items[k], name: row.querySelector("[data-k=name]").value, desc: row.querySelector("[data-k=desc]").value, qty: num(row.querySelector("[data-k=qty]").value), price: num(row.querySelector("[data-k=price]").value), discount: num(row.querySelector("[data-k=discount]").value) }; });
  const syncPct = () => { const pct = Math.min(Math.max(num(f.docDiscountPct.value), 0), 100); if (!f.docDiscountPct.value) return; readItems(); const sub = calc({ items, docDiscount: 0, taxRate: 0 }).subtotal; f.docDiscount.value = round2(sub * pct / 100).toFixed(2); };
  const docNow = () => { readItems(); return { items, docDiscount: num(f.docDiscount.value), taxRate: num(f.taxRate.value), deposit: 0, receiptsPaid: d.receiptsPaid || 0 }; };
  const drawSum = () => {
    const c = calc(docNow()); $$(".item", itemsEl).forEach((row, k) => (row.querySelector(".amt").textContent = money(c.items[k] ? c.items[k].amount : 0)));
    $("#sum", el).innerHTML = `<div><span>${t("pdf_subtotal")}</span><b>${money(c.subtotal)}</b></div>${c.docDiscount ? `<div><span>${t("pdf_discount")}</span><b>- ${money(c.docDiscount)}</b></div>` : ""}${c.taxRate ? `<div><span>${t("pdf_tax")} (${c.taxRate}%)</span><b>${money(c.tax)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(c.total)}</b></div>${type === "invoice" ? `${c.paidReceipts ? `<div><span>${t("pdf_paid")}</span><b>- ${money(c.paidReceipts)}</b></div>` : ""}<div class="grand alt"><span>${t("pdf_balance")}</span><b>${money(c.balance)}</b></div>` : ""}`;
  };
  const drawItems = () => {
    itemsEl.innerHTML = items.map((i, k) => `<div class="item"><div class="item-main"><label>${t("pdf_desc")}<input data-k="name" maxlength="150" value="${esc(i.name)}" placeholder="${esc(t("item_ph"))}"></label><label>${t("item_detail")}<input data-k="desc" maxlength="300" value="${esc(i.desc)}"></label></div>
      <div class="item-nums"><label>${t("pdf_qty")}<input data-k="qty" type="number" min="0" step="any" value="${num(i.qty)}"></label><label>${t("pdf_price")}<input data-k="price" type="number" min="0" step="0.01" value="${num(i.price)}"></label><label>${t("pdf_disc")} %<input data-k="discount" type="number" min="0" max="100" step="0.01" value="${num(i.discount)}"></label><div class="amt-w"><span>${t("pdf_amount")}</span><b class="amt"></b></div><button type="button" class="icon-btn danger" data-del="${k}" aria-label="${t("delete")}">${ico("trash")}</button></div></div>`).join("");
    syncPct(); drawSum();
  };
  // Item daripada pakej dijana semula setiap kali pilihan berubah (kuantiti/diskaun yang diubah dikekalkan); item tambahan sendiri tidak disentuh.
  const syncSel = () => {
    readItems(); const keep = new Map(items.filter((i) => i.pkg).map((i) => [i.pkg + "|" + i.name, i]));
    const fromPkg = selToItems(pkgs, sel).map((n) => { const o = keep.get(n.pkg + "|" + n.name); return o ? { ...n, qty: o.qty, discount: o.discount, desc: o.desc || "" } : n; });
    const manual = items.filter((i) => !i.pkg && (i.name.trim() || num(i.price)));
    items = [...fromPkg, ...manual]; if (!items.length) items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 }); drawItems();
  };
  if (!doc && Object.keys(sel).length) items = [];
  if (!items.length) items = selToItems(pkgs, sel); if (!items.length) items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 });
  drawItems(); bindPicker(el);
  if (pkgs.length) bindSel(el, pkgs, sel, syncSel);
  f.ccompany.addEventListener("input", () => ($("#regReq", el).hidden = !f.ccompany.value.trim()));
  $("#prev", el).onclick = async (e) => {
    const btn = e.currentTarget; setBusy(btn, true); const dn = docNow();
    try {
      const docObj = { number: doc ? doc.number : "PRATONTON", date: f.date.value, status: f.status.value, customer: { name: f.cname.value.trim() || "-", company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: cust.email || "", regNo: f.cregNo.value.trim() },
        items: items.filter((i) => i.name.trim()), docDiscount: dn.docDiscount, taxRate: dn.taxRate, taxName: d.taxName || "SST", deposit: 0, receiptsPaid: d.receiptsPaid || 0, receiptCount: d.receiptCount || 0, payStatus: f.payStatus.value, note: f.note.value.trim(), terms: f.terms.value.trim(), template: f.template.value, color: f.color.value, imgScale: d.imgScale || {},
        ...autoDue() };
      await previewPdf(() => makePdf(ctx, type, docObj));
    } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.addEventListener("input", (e) => {
    if (e.target.name === "docDiscount") f.docDiscountPct.value = ""; // RM ditaip sendiri
    if (e.target.closest("#items") || e.target.name === "docDiscountPct") syncPct();
    if (e.target.closest("#items") || ["docDiscount", "docDiscountPct", "taxRate"].includes(e.target.name)) drawSum();
  });
  itemsEl.onclick = (e) => { const b = e.target.closest("[data-del]"); if (!b) return; readItems(); items.splice(+b.dataset.del, 1); if (!items.length) items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 }); drawItems(); };
  $("#addItem", el).onclick = () => { readItems(); items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 }); drawItems(); itemsEl.querySelector(".item:last-child input").focus(); };
  $("#pickProd", el).onchange = (e) => { const p = products.find((x) => x.id === e.target.value); if (!p) return; readItems(); const blank = items.length === 1 && !items[0].name && !num(items[0].price); const row = { name: p.name, desc: p.description || "", qty: 1, price: num(p.price), discount: 0, productId: p.id }; blank ? (items = [row]) : items.push(row); e.target.value = ""; drawItems(); };
  // Tarikh akhir bayaran / sah sehingga: automatik (invois +14 hari, sebut harga +30 hari); dokumen lama kekal jika masih selepas tarikh dokumen
  const autoDue = () => { const dt = f.date.value || today, old = doc && dueOf(type, doc); const v = old && old >= dt ? old : addDays(dt, type === "invoice" ? 14 : 30); return type === "invoice" ? { dueDate: v } : { validUntil: v }; };

  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f); const dn = docNow();
    const valid = items.filter((i) => i.name.trim());
    if (!f.cname.value.trim()) return fail(t("err_cust"), f.cname);
    if (!f.caddress.value.trim()) return fail(t("err_cust_addr"), f.caddress);
    if (!f.cphone.value.trim()) return fail(t("err_cust_phone"), f.cphone);
    if (f.ccompany.value.trim() && !f.cregNo.value.trim()) return fail(t("err_cust_reg"), f.cregNo);
    if (!f.date.value) return fail(t("err_required"), f.date);
    if (!valid.length) return fail(t("err_items"));
    if (valid.some((i) => i.qty <= 0 || i.price < 0 || i.qty > 1e7 || i.price > 1e9 || i.discount < 0 || i.discount > 100)) return fail(t("err_num"));
    if (valid.length > 150) return fail(t("err_num"));
    function fail(m, node) { err.textContent = m; node && node.focus(); return false; }
    setBusy(btn, true);
    try {
      const customer = { name: f.cname.value.trim(), company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: cust.email || "", regNo: f.cregNo.value.trim() };
      let customerId = d.customerId || "";
      if (!customerId && f.saveCust.checked) { // guna semula pelanggan sedia ada (nama + telefon sama), elak pendua
        const same = customers.find((c) => (c.name || "").trim().toLowerCase() === customer.name.toLowerCase() && (c.phone || "").replace(/\D/g, "") === customer.phone.replace(/\D/g, ""));
        customerId = same ? same.id : await create(ctx.uid, "customers", { ...customer, notes: "" });
      }
      const data = { date: f.date.value, status: f.status.value, customerId: customerId || "", customer, items: valid.map((i) => ({ name: i.name.trim(), desc: (i.desc || "").trim(), qty: i.qty, price: i.price, discount: i.discount, ...(i.productId ? { productId: i.productId } : {}), ...(i.pkg ? { pkg: i.pkg } : {}) })),
        pkgSel: sel, pkgNames: pkgs.filter((p) => sel[p.id] && sel[p.id].length).map((p) => p.name),
        docDiscount: dn.docDiscount, docDiscountPct: f.docDiscountPct.value ? Math.min(Math.max(num(f.docDiscountPct.value), 0), 100) : 0, taxRate: dn.taxRate, taxName: d.taxName || "SST", note: f.note.value.trim(), terms: f.terms.value.trim(), template: f.template.value, color: f.color.value, imgScale: d.imgScale || {},
        ...autoDue(), ...(type === "invoice" ? { deposit: 0, receiptsPaid: d.receiptsPaid || 0, receiptCount: d.receiptCount || 0 } : {}) };
      // Status bayaran: invois simpan pilihan hanya jika berbeza daripada status automatik (supaya "Tertunggak"/"Selesai" automatik terus berfungsi)
      data.payStatus = type === "invoice" ? (f.payStatus.value === payAutoInvoice({ ...data, payStatus: "" }) ? "" : f.payStatus.value) : f.payStatus.value;
      let rid = id;
      if (doc) await update(ctx.uid, C.col, id, data);
      else { const r = await createNumbered(ctx.uid, type, await numberFmt(ctx, type), null, () => ({ data })); rid = r.id; logActivity(ctx.user, type, r.number); }
      toast(t("saved")); ctx.nav(`#/app/${C.route}/${rid}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}
export const custSnap = (c) => ({ name: c.name || "", company: c.company || "", address: c.address || "", phone: c.phone || "", email: c.email || "", regNo: c.regNo || "" });

// ------------------------------------------------------------------ PAPARAN (masa nyata)
export async function renderView(el, ctx, type, id) {
  const C = CFG[type]; el.innerHTML = loading();
  const isInv = type === "invoice";
  let d = null, kids = [], got = false, pvOpen = false, pvUrl = "";
  const bySeq = (a) => a.slice().sort((x, y) => ((y.createdAt && y.createdAt.seconds) || 9e12) - ((x.createdAt && x.createdAt.seconds) || 9e12));
  const btn = (a, icon, label, cls = "ghost") => `<button class="btn ${cls}" data-a="${a}">${ico(icon)}<span>${t(label)}</span></button>`;

  const showPreview = async () => { const box = el.querySelector("#pvbox"); if (!box || !d) return; box.hidden = false; try { const pdf = await makePdf(ctx, type, d); if (pvUrl) URL.revokeObjectURL(pvUrl); pvUrl = URL.createObjectURL(pdf.output("blob")); box.querySelector("iframe").src = pvUrl; } catch (e) { console.error(e); } };

  function paint() {
    if (!got) return;
    if (!d) { el.innerHTML = empty("doc", t("not_found")); return; }
    const c = calc(d), st = C.eff(d), cu = d.customer || {};
    const canPay = isInv && !["paid", "cancelled"].includes(d.status);
    const bar = !isInv ? [btn("edit", "edit", "act_edit", "primary"), btn("download", "download", "act_download")] : [btn("edit", "edit", "act_edit", "primary"), btn("download", "download", "act_download"), btn("print", "print", "act_print"), btn("inline", "eye", "preview_inline"), btn("preview", "eye", "act_preview"), btn("share", "share", "act_share"), btn("dup", "copy", "act_duplicate")];
    if (isInv) {
      if (canPay) bar.push(btn("pay", "wallet", "act_receipt", "accent"));
      if (d.status === "draft") bar.push(btn("sent", "mail", "mark_sent"));
      if (canPay) bar.push(btn("paid", "check", "mark_paid"));
      if (!kids.length && ["paid", "partial", "sent", "draft"].includes(d.status)) bar.push(btn("unpaid", "clock", "mark_unpaid"));
      if (d.status !== "cancelled") bar.push(btn("cancel", "x", "mark_cancel"));
    } // Sebut harga: hanya Edit, Muat Turun PDF dan Padam (invois dijana automatik semasa sebut harga disimpan)
    bar.push(btn("del", "trash", "delete", "danger"));
    const kidsHtml = isInv
      ? `<h3>${t("receipts_of_invoice")}</h3>${kids.length ? kids.map((r) => `<div class="mini rrow"><span><b>${esc(r.number)}</b> · ${fmtDate(r.date, getLang())} · ${esc(t("ps_" + payOf("receipt", r)))}</span><span class="rr"><b>${money(r.amount)}</b><button class="icon-btn" data-a="rdl" data-rid="${r.id}" aria-label="${t("act_download")}">${ico("download")}</button><button class="icon-btn" data-a="rpr" data-rid="${r.id}" aria-label="${t("act_print")}">${ico("print")}</button></span></div>`).join("") : `<p class="muted">${t("receipts_empty")}</p>`}${canPay ? `<div class="mt"><button class="btn accent sm" data-a="pay">${ico("plus")}${t("act_receipt")}</button></div>` : ""}`
      : `<h3>${t("quo_invoices")}</h3>${kids.length ? kids.map((r) => `<a class="mini link" href="#/app/invoices/${esc(r.id)}"><span><b>${esc(r.number)}</b> · ${fmtDate(r.date, getLang())} ${badge(invoiceStatus(r))}</span><b>${money(calc(r).total)}</b></a>`).join("") : `<p class="muted">-</p>`}`;
    el.innerHTML = `<div class="page-h"><div><h1>${esc(d.number)} ${!isInv ? "" : !["draft", "cancelled"].includes(d.status) ? `<span class="badge b-${st}">${esc(t("ps_" + st))}</span>` : badge(st)}</h1><p class="sub">${esc(cu.name || "")}${cu.company ? " · " + esc(cu.company) : ""}</p></div><a class="btn ghost" href="#/app/${C.route}">${t("back")}</a></div>
    <div class="actions-bar">${bar.join("")}</div>
    <section class="card" id="pvbox" ${pvOpen ? "" : "hidden"}><h2>${t("preview_title")}</h2><iframe class="pdf-frame" title="PDF" src="about:blank"></iframe></section>
    <div class="grid-view"><section class="card"><div class="kv"><div><span>${t("col_date_gen")}</span><b>${fmtDate(d.date, getLang())}</b></div>
     <div><span>${t("sec_customer")}</span><b>${esc(cu.name || "-")}</b><small>${esc(cu.address || "")}<br>${esc([cu.phone, cu.email].filter(Boolean).join(" · "))}</small></div>
     ${d.fromQuotationNumber ? `<div><span>${t("from_quotation")}</span><a href="#/app/quotations/${esc(d.fromQuotationId)}"><b>${esc(d.fromQuotationNumber)}</b></a></div>` : ""}</div>
     <table class="tbl simple"><thead><tr><th>${t("pdf_desc")}</th><th class="r">${t("pdf_qty")}</th><th class="r">${t("pdf_price")}</th><th class="r">${t("pdf_amount")}</th></tr></thead><tbody>${c.items.map((i) => `<tr><td data-l="${t("pdf_desc")}"><b>${esc(i.name)}</b>${i.desc ? `<br><small>${esc(i.desc)}</small>` : ""}</td><td class="r" data-l="${t("pdf_qty")}">${i.qty}</td><td class="r" data-l="${t("pdf_price")}">${money(i.price)}${num(i.discount) ? `<small> −${i.discount}%</small>` : ""}</td><td class="r" data-l="${t("pdf_amount")}">${money(i.amount)}</td></tr>`).join("")}</tbody></table>
     ${d.note ? `<h3>${t("pdf_note")}</h3><p class="pre">${esc(d.note)}</p>` : ""}${d.terms ? `<h3>${t("pdf_terms")}</h3><p class="pre">${esc(d.terms)}</p>` : ""}</section>
    <aside class="card totals"><div><span>${t("pdf_subtotal")}</span><b>${money(c.subtotal)}</b></div>${c.docDiscount ? `<div><span>${t("pdf_discount")}</span><b>- ${money(c.docDiscount)}</b></div>` : ""}${c.taxRate ? `<div><span>${t("pdf_tax")} (${c.taxRate}%)</span><b>${money(c.tax)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(c.total)}</b></div>
     ${isInv ? `<div><span>${t("pdf_paid")}</span><b>- ${money(c.paidReceipts)}</b></div><div class="grand alt"><span>${t("pdf_balance")}</span><b>${money(c.balance)}</b></div>` : ""}
     ${kidsHtml}</aside></div>`;
    el.onclick = (e) => { const b = e.target.closest("[data-a]"); if (b) act(b.dataset.a, b); };
    if (pvOpen) showPreview();
  }

  const act = async (a, b) => {
    try {
      if (a === "edit") return ctx.nav(`#/app/${C.route}/${id}/edit`);
      if (["download", "print", "preview", "share"].includes(a)) return pdfAction(ctx, type, d, a, b);
      if (a === "rdl" || a === "rpr") { const r = kids.find((x) => x.id === b.dataset.rid); return r && pdfAction(ctx, "receipt", r, a === "rdl" ? "download" : "print", b); }
      if (a === "inline") { pvOpen = !pvOpen; const box = el.querySelector("#pvbox"); box.hidden = !pvOpen; if (pvOpen) { await showPreview(); box.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
      if (a === "pay") return ctx.nav(`#/app/receipts/new?invoice=${id}`);
      setBusy(b, true); const c = calc(d);
      const upd = async (patch) => { await update(ctx.uid, C.col, id, patch); toast(t("saved")); }; // paparan dikemas kini serta-merta oleh pendengar masa nyata
      if (a === "dup") { const nid = await duplicate(ctx, type, d); toast(t("duplicated")); return ctx.nav(`#/app/${C.route}/${nid}`); }
      if (a === "paid") { if (!(await confirmBox(t("mark_paid"), t("confirm_paid", { n: d.number }), t("yes")))) return setBusy(b, false); return upd({ status: "paid", receiptsPaid: round2(c.total), payStatus: "" }); }
      if (a === "unpaid") return upd({ status: "unpaid", receiptsPaid: 0, payStatus: "" });
      if (a === "cancel") { if (!(await confirmBox(t("mark_cancel"), t("confirm_cancel", { n: d.number }), t("yes")))) return setBusy(b, false); return upd({ status: "cancelled" }); }
      if (["accepted", "rejected", "expired", "sent"].includes(a)) return upd({ status: a });
      if (a === "del") { if (!(await confirmBox(t("delete"), t(confirmKey(type), { n: d.number }), t("delete")))) return setBusy(b, false); await deleteProject(ctx, type, d); toast(t("deleted")); return ctx.nav(`#/app/${C.route}`); }
      if (a === "convert") {
        if (!(await confirmBox(t("act_convert"), t("confirm_convert", { n: d.number }), t("yes")))) return setBusy(b, false);
        const today = todayMY(); const { id: _i, number, createdAt, updatedAt, ownerUid, status, validUntil, convertedInvoiceId, convertedInvoiceNumber, ...rest } = d;
        const qref = docRef(ctx.uid, "quotations", id);
        const r = await createNumbered(ctx.uid, "invoice", await numberFmt(ctx, "invoice"), null, (_, n, newId) => ({ data: { ...rest, date: today, dueDate: addDays(today, 14), status: "draft", deposit: 0, receiptsPaid: 0, receiptCount: 0, fromQuotationId: id, fromQuotationNumber: d.number },
          writes: [(tx) => tx.update(qref, { status: "converted", convertedInvoiceId: newId, convertedInvoiceNumber: n, updatedAt: F.serverTimestamp() })] }));
        logActivity(ctx.user, "invoice", r.number); toast(t("converted", { n: r.number })); return ctx.nav(`#/app/invoices/${r.id}`);
      }
    } catch (x) { console.error(x); toast(errMsg(x), "err"); setBusy(b, false); }
  };

  const onErr = (e) => { if (!got) el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; };
  ctx.live(docLive(ctx.uid, C.col, id, (x) => { d = x; got = true; paint(); }, onErr));
  ctx.live(isInv ? queryLive(ctx.uid, "receipts", "invoiceId", id, (r) => { kids = bySeq(r); paint(); }) : queryLive(ctx.uid, "invoices", "fromQuotationId", id, (r) => { kids = bySeq(r); paint(); }));
}

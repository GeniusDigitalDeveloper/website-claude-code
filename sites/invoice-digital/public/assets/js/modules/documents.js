// Modul Invoice & Quotation: senarai, borang (cipta/edit), paparan + tindakan.
import { t, getLang } from "../i18n.js";
import { esc, $, $$, money, num, round2, calc, fmtDate, todayMY, addDays, toast, setBusy, readFileAsDataURL, invoiceStatus, quotationStatus, debounce, modal, confirmBox } from "../util.js";
import { listAll, listSWR, getOne, create, update, remove, createNumbered, logActivity, setMeta } from "../db.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { F } from "../firebase.js";
import { errMsg } from "../auth.js";
import { ico, empty, loading, badge } from "./ui.js";
import { pdfAction, makePdf } from "./actions.js";
import { deleteProject, confirmKey } from "./projects.js";
import { recordPayment, METHODS } from "./receipts.js";
import { TEMPLATES } from "../pdf.js";

const CFG = {
  invoice: { col: "invoices", route: "invoices", fmt: "INV-{YYYY}-{NNNN}", statuses: ["draft", "sent", "unpaid", "partial", "paid", "cancelled"], eff: invoiceStatus, filter: ["draft", "sent", "unpaid", "partial", "paid", "overdue", "cancelled"] },
  quotation: { col: "quotations", route: "quotations", fmt: "QUO-{YYYY}-{NNNN}", statuses: ["draft", "sent", "accepted", "rejected", "expired", "converted"], eff: quotationStatus, filter: ["draft", "sent", "accepted", "rejected", "expired", "converted"] },
};
const dueOf = (type, d) => (type === "invoice" ? d.dueDate : d.validUntil);

// ------------------------------------------------------------------ SENARAI
export async function renderList(el, ctx, type) {
  const C = CFG[type]; el.innerHTML = loading();
  let rows = [], mounted = false, draw = () => {};
  const mount = () => {
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_" + C.route)}</h1><p class="sub">${t(type + "_sub")}</p></div><a class="btn primary" href="#/app/${C.route}/new">${ico("plus")}${t(type + "_new")}</a></div>
  <div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div>
  <select id="sf" aria-label="${esc(t("f_status"))}"><option value="">${t("all_status")}</option>${C.filter.map((s) => `<option value="${s}">${t("st_" + s)}</option>`).join("")}</select></div><div id="tbl"></div></div>`;
  draw = () => {
    const q = $("#q", el).value.toLowerCase(), sf = $("#sf", el).value;
    const list = rows.filter((r) => (!sf || C.eff(r) === sf) && (!q || [r.number, r.customer && r.customer.name, r.customer && r.customer.company].join(" ").toLowerCase().includes(q)));
    $("#tbl", el).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("col_number")}</th><th>${t("col_customer")}</th><th>${t("col_date")}</th><th>${t(type === "invoice" ? "col_due" : "col_valid")}</th><th class="r">${t("col_total")}</th><th>${t("f_status")}</th><th></th></tr></thead><tbody>${list.map((r) => `<tr>
      <td data-l="${t("col_number")}"><a href="#/app/${C.route}/${r.id}"><b>${esc(r.number)}</b></a></td><td data-l="${t("col_customer")}">${esc((r.customer && r.customer.name) || "-")}</td>
      <td data-l="${t("col_date")}">${fmtDate(r.date, getLang())}</td><td data-l="${t(type === "invoice" ? "col_due" : "col_valid")}">${fmtDate(dueOf(type, r), getLang())}</td>
      <td class="r" data-l="${t("col_total")}"><b>${money(calc(r).total)}</b></td><td data-l="${t("f_status")}">${badge(C.eff(r))}</td>
      <td class="acts"><a class="icon-btn" href="#/app/${C.route}/${r.id}" aria-label="${t("act_view")}">${ico("eye")}</a><button class="icon-btn" data-a="download" data-id="${r.id}" aria-label="${t("act_download")}">${ico("download")}</button><button class="icon-btn" data-a="dup" data-id="${r.id}" aria-label="${t("act_duplicate")}">${ico("copy")}</button></td></tr>`).join("")}</tbody></table>` : empty(type === "invoice" ? "doc" : "quote", t(type + "_empty"), `<a class="btn primary" href="#/app/${C.route}/new">${t(type + "_new")}</a>`);
  };
  draw(); $("#q", el).oninput = debounce(draw, 150); $("#sf", el).onchange = draw;
  el.onclick = async (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.a === "download") pdfAction(ctx, type, r, "download");
    if (b.dataset.a === "dup") { setBusy(b, true); try { const id = await duplicate(ctx, type, r); toast(t("duplicated")); ctx.nav(`#/app/${C.route}/${id}`); } catch (x) { toast(errMsg(x), "err"); setBusy(b, false); } }
  };
  };
  try { await listSWR(ctx.uid, C.col, (r) => { rows = r; if (!mounted) { mounted = true; mount(); } else draw(); }); }
  catch (e) { if (!mounted) el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }
}

async function numberFmt(ctx, type) { const s = await ctx.getSettings(); return (s.numberFormat && s.numberFormat[type]) || CFG[type].fmt; }

export async function duplicate(ctx, type, src) {
  const today = todayMY(); const { id, number, createdAt, updatedAt, ownerUid, status, receiptsPaid, convertedInvoiceId, convertedFrom, ...rest } = src;
  const data = { ...rest, date: today, status: "draft", ...(type === "invoice" ? { dueDate: addDays(today, 14), receiptsPaid: 0 } : { validUntil: addDays(today, 30) }) };
  const r = await createNumbered(ctx.uid, type, await numberFmt(ctx, type), null, () => ({ data }));
  logActivity(ctx.user, type, r.number); return r.id;
}

// ------------------------------------------------------------------ BORANG
export async function renderEditor(el, ctx, type, id) {
  const C = CFG[type]; el.innerHTML = loading();
  let doc, customers, products, company;
  try {
    [customers, products, company] = await Promise.all([listAll(ctx.uid, "customers"), listAll(ctx.uid, "products"), ctx.getCompany()]);
    doc = id ? await getOne(ctx.uid, C.col, id) : null; if (id && !doc) { el.innerHTML = empty("doc", t("not_found")); return; }
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const st = await ctx.getSettings(); const today = todayMY();
  const d = doc || { date: today, status: "draft", items: [{ name: "", desc: "", qty: 1, price: 0, discount: 0 }], docDiscount: 0, deposit: 0, receiptsPaid: 0,
    taxRate: num(company.taxRate ?? st.taxRate), taxName: company.taxName || st.taxName || "SST", note: "", terms: company.terms || st.terms || "", template: company.template || "classic", color: company.color || "#2563eb",
    customer: {}, ...(type === "invoice" ? { dueDate: addDays(today, 14) } : { validUntil: addDays(today, 30) }) };
  if (!doc) { const pc = new URLSearchParams(location.hash.split("?")[1] || "").get("customer"); const c = customers.find((x) => x.id === pc); if (c) { d.customerId = c.id; d.customer = custSnap(c); } }
  let items = d.items.map((i) => ({ ...i }));
  const cust = d.customer || {};
  el.innerHTML = `<div class="page-h"><div><h1>${doc ? esc(doc.number) : t(type + "_new")}</h1><p class="sub">${doc ? t("edit") : t("new")}</p></div><a class="btn ghost" href="#/app/${C.route}${doc ? "/" + id : ""}">${t("back")}</a></div>
  <form id="f" class="doc-form" novalidate>
   <section class="card form"><h2>${t("sec_customer")}</h2>
    <label>${t("pick_customer")}<select name="customerId"><option value="">${t("customer_new_inline")}</option>${customers.map((c) => `<option value="${c.id}" ${c.id === d.customerId ? "selected" : ""}>${esc(c.name)}${c.company ? " — " + esc(c.company) : ""}</option>`).join("")}</select></label>
    <div class="grid2"><label>${t("f_name")} *<input name="cname" maxlength="120" value="${esc(cust.name)}" required></label><label>${t("f_company")}<input name="ccompany" maxlength="120" value="${esc(cust.company)}"></label></div>
    <label>${t("f_address")}<textarea name="caddress" rows="2" maxlength="300">${esc(cust.address)}</textarea></label>
    <div class="grid3"><label>${t("f_phone")}<input name="cphone" maxlength="30" value="${esc(cust.phone)}" inputmode="tel"></label><label>${t("f_email")}<input name="cemail" type="email" maxlength="120" value="${esc(cust.email)}"></label><label>${t("f_regno")}<input name="cregNo" maxlength="40" value="${esc(cust.regNo)}"></label></div>
    <label class="chk ${d.customerId ? "hide" : ""}" id="saveCustW"><input type="checkbox" name="saveCust" checked> ${t("save_customer")}</label>
   </section>
   <section class="card form"><h2>${t("sec_details")}</h2>
    <div class="logo-inline"><div class="lp" id="lgp">${company.logo ? `<img alt="Logo" src="${esc(company.logo)}">` : t("no_logo")}</div><div><b>${t("logo_in_doc")}</b><br><label class="btn ghost sm file">${t("upload_logo")}<input type="file" id="lgf" accept="image/png,image/jpeg,image/webp" hidden></label></div></div>
    <div class="grid3"><label>${t("f_date")}<input name="date" type="date" value="${esc(d.date)}" required></label>
    <label>${t(type === "invoice" ? "f_due" : "f_valid")}<input name="due" type="date" value="${esc(dueOf(type, d))}" required></label>
    <label>${t("f_status")}<select name="status">${C.statuses.map((s) => `<option value="${s}" ${s === d.status ? "selected" : ""} ${type === "quotation" && s === "converted" && !d.convertedInvoiceId ? "disabled" : ""}>${t("st_" + s)}</option>`).join("")}</select></label></div>
   </section>
   <section class="card form"><div class="row-between"><h2>${t("sec_items")}</h2><div class="inline-actions"><select id="pickProd" aria-label="${esc(t("pick_product"))}"><option value="">${t("pick_product")}</option>${products.map((p) => `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join("")}</select><button type="button" class="btn ghost" id="addItem">${ico("plus")}${t("add_item")}</button></div></div>
    <div id="items" class="items"></div></section>
   <section class="card form"><div class="grid2">
    <div class="form"><label>${t("pdf_note")}<textarea name="note" rows="3" maxlength="1000">${esc(d.note)}</textarea></label><label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(d.terms)}</textarea></label>
     ${pickerHtml(d.template, d.color)}</div>
    <div class="form sum"><div class="grid2"><label>${t("f_docdisc")} (RM)<input name="docDiscount" type="number" min="0" step="0.01" value="${num(d.docDiscount)}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(d.taxRate)}"></label></div>
     ${type === "invoice" ? `<label>${t("pdf_deposit")} (RM)<input name="deposit" type="number" min="0" step="0.01" value="${num(d.deposit)}"></label>` : ""}
     <div id="sum" class="totals" aria-live="polite"></div></div></div></section>
   <p class="err" id="err" role="alert"></p>
   <div class="form-f sticky"><a class="btn ghost" href="#/app/${C.route}">${t("cancel")}</a><button class="btn ghost" type="button" id="prev">${ico("eye")}${t("preview_draft")}</button><button class="btn primary" type="submit">${ico("check")}${t("save")}</button></div>
  </form>`;
  const f = $("#f", el); const itemsEl = $("#items", el);
  const readItems = () => $$(".item", itemsEl).forEach((row, k) => { items[k] = { ...items[k], name: row.querySelector("[data-k=name]").value, desc: row.querySelector("[data-k=desc]").value, qty: num(row.querySelector("[data-k=qty]").value), price: num(row.querySelector("[data-k=price]").value), discount: num(row.querySelector("[data-k=discount]").value) }; });
  const docNow = () => { readItems(); return { items, docDiscount: num(f.docDiscount.value), taxRate: num(f.taxRate.value), deposit: f.deposit ? num(f.deposit.value) : 0, receiptsPaid: d.receiptsPaid || 0 }; };
  const drawSum = () => {
    const c = calc(docNow()); $$(".item", itemsEl).forEach((row, k) => (row.querySelector(".amt").textContent = money(c.items[k] ? c.items[k].amount : 0)));
    $("#sum", el).innerHTML = `<div><span>${t("pdf_subtotal")}</span><b>${money(c.subtotal)}</b></div>${c.docDiscount ? `<div><span>${t("pdf_discount")}</span><b>- ${money(c.docDiscount)}</b></div>` : ""}${c.taxRate ? `<div><span>${t("pdf_tax")} (${c.taxRate}%)</span><b>${money(c.tax)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(c.total)}</b></div>${type === "invoice" ? `<div><span>${t("pdf_deposit")}</span><b>- ${money(c.deposit)}</b></div>${c.paidReceipts ? `<div><span>${t("pdf_paid")}</span><b>- ${money(c.paidReceipts)}</b></div>` : ""}<div class="grand alt"><span>${t("pdf_balance")}</span><b>${money(c.balance)}</b></div>` : ""}`;
  };
  const drawItems = () => {
    itemsEl.innerHTML = items.map((i, k) => `<div class="item"><div class="item-main"><label>${t("pdf_desc")}<input data-k="name" maxlength="150" value="${esc(i.name)}" placeholder="${esc(t("item_ph"))}"></label><label>${t("item_detail")}<input data-k="desc" maxlength="300" value="${esc(i.desc)}"></label></div>
      <div class="item-nums"><label>${t("pdf_qty")}<input data-k="qty" type="number" min="0" step="any" value="${num(i.qty)}"></label><label>${t("pdf_price")}<input data-k="price" type="number" min="0" step="0.01" value="${num(i.price)}"></label><label>${t("pdf_disc")} %<input data-k="discount" type="number" min="0" max="100" step="0.01" value="${num(i.discount)}"></label><div class="amt-w"><span>${t("pdf_amount")}</span><b class="amt"></b></div><button type="button" class="icon-btn danger" data-del="${k}" aria-label="${t("delete")}">${ico("trash")}</button></div></div>`).join("");
    drawSum();
  };
  drawItems(); bindPicker(el);
  $("#lgf", el).onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { let logo = await readFileAsDataURL(file, 400); if (logo.length > 250000) logo = await readFileAsDataURL(file, 260, 0.75);
      await ctx.saveCompany({ logo }); company = await ctx.getCompany(); $("#lgp", el).innerHTML = `<img alt="Logo" src="${esc(company.logo)}">`; toast(t("saved")); }
    catch (x) { console.error(x); toast(t("err_file"), "err"); }
  };
  $("#prev", el).onclick = async (e) => {
    const btn = e.currentTarget; setBusy(btn, true); const dn = docNow();
    try {
      const docObj = { number: doc ? doc.number : "PRATONTON", date: f.date.value, status: f.status.value, customer: { name: f.cname.value.trim() || "-", company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: f.cemail.value.trim(), regNo: f.cregNo.value.trim() },
        items: items.filter((i) => i.name.trim()), docDiscount: dn.docDiscount, taxRate: dn.taxRate, taxName: d.taxName || "SST", deposit: dn.deposit, receiptsPaid: d.receiptsPaid || 0, note: f.note.value.trim(), terms: f.terms.value.trim(), template: f.template.value, color: f.color.value,
        ...(type === "invoice" ? { dueDate: f.due.value } : { validUntil: f.due.value }) };
      const pdf = await makePdf(ctx, type, docObj); window.open(URL.createObjectURL(pdf.output("blob")), "_blank");
    } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); } setBusy(btn, false);
  };
  f.addEventListener("input", (e) => { if (e.target.closest("#items") || ["docDiscount", "taxRate", "deposit"].includes(e.target.name)) drawSum(); });
  itemsEl.onclick = (e) => { const b = e.target.closest("[data-del]"); if (!b) return; readItems(); items.splice(+b.dataset.del, 1); if (!items.length) items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 }); drawItems(); };
  $("#addItem", el).onclick = () => { readItems(); items.push({ name: "", desc: "", qty: 1, price: 0, discount: 0 }); drawItems(); itemsEl.querySelector(".item:last-child input").focus(); };
  $("#pickProd", el).onchange = (e) => { const p = products.find((x) => x.id === e.target.value); if (!p) return; readItems(); const blank = items.length === 1 && !items[0].name && !num(items[0].price); const row = { name: p.name, desc: p.description || "", qty: 1, price: num(p.price), discount: 0, productId: p.id }; blank ? (items = [row]) : items.push(row); e.target.value = ""; drawItems(); };
  f.customerId.onchange = () => { const c = customers.find((x) => x.id === f.customerId.value); $("#saveCustW", el).classList.toggle("hide", !!c); if (c) { const s = custSnap(c); f.cname.value = s.name; f.ccompany.value = s.company; f.caddress.value = s.address; f.cphone.value = s.phone; f.cemail.value = s.email; f.cregNo.value = s.regNo; } };
  f.date.onchange = () => { if (!doc) f.due.value = addDays(f.date.value, type === "invoice" ? 14 : 30); };

  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f); const dn = docNow();
    const valid = items.filter((i) => i.name.trim());
    if (!f.cname.value.trim()) return fail(t("err_cust"), f.cname);
    if (!f.date.value || !f.due.value) return fail(t("err_required"));
    if (f.due.value < f.date.value) return fail(t("err_dates"));
    if (!valid.length) return fail(t("err_items"));
    if (valid.some((i) => i.qty <= 0 || i.price < 0 || i.qty > 1e7 || i.price > 1e9 || i.discount < 0 || i.discount > 100)) return fail(t("err_num"));
    if (valid.length > 150) return fail(t("err_num"));
    function fail(m, node) { err.textContent = m; node && node.focus(); return false; }
    setBusy(btn, true);
    try {
      let customerId = f.customerId.value; const customer = { name: f.cname.value.trim(), company: f.ccompany.value.trim(), address: f.caddress.value.trim(), phone: f.cphone.value.trim(), email: f.cemail.value.trim(), regNo: f.cregNo.value.trim() };
      if (!customerId && f.saveCust.checked) customerId = await create(ctx.uid, "customers", { ...customer, notes: "" });
      const data = { date: f.date.value, status: f.status.value, customerId: customerId || "", customer, items: valid.map((i) => ({ name: i.name.trim(), desc: (i.desc || "").trim(), qty: i.qty, price: i.price, discount: i.discount, ...(i.productId ? { productId: i.productId } : {}) })),
        docDiscount: dn.docDiscount, taxRate: dn.taxRate, taxName: d.taxName || "SST", note: f.note.value.trim(), terms: f.terms.value.trim(), template: f.template.value, color: f.color.value,
        ...(type === "invoice" ? { dueDate: f.due.value, deposit: dn.deposit, receiptsPaid: d.receiptsPaid || 0 } : { validUntil: f.due.value }) };
      let rid = id;
      if (doc) await update(ctx.uid, C.col, id, data);
      else { const r = await createNumbered(ctx.uid, type, await numberFmt(ctx, type), null, () => ({ data })); rid = r.id; logActivity(ctx.user, type, r.number); }
      toast(t("saved")); ctx.nav(`#/app/${C.route}/${rid}`);
    } catch (x) { console.error(x); err.textContent = errMsg(x); setBusy(btn, false); }
  };
}
export const custSnap = (c) => ({ name: c.name || "", company: c.company || "", address: c.address || "", phone: c.phone || "", email: c.email || "", regNo: c.regNo || "" });

// ------------------------------------------------------------------ PAPARAN
export async function renderView(el, ctx, type, id) {
  const C = CFG[type]; el.innerHTML = loading();
  let d, receipts = [];
  try {
    d = await getOne(ctx.uid, C.col, id); if (!d) { el.innerHTML = empty("doc", t("not_found")); return; }
    if (type === "invoice") { const s = await F.getDocs(F.query(F.collection(F.getFirestore(), "inv_users", ctx.uid, "receipts"), F.where("invoiceId", "==", id))); receipts = s.docs.map((x) => ({ id: x.id, ...x.data() })).sort((a, b) => (a.date < b.date ? 1 : -1)); }
  } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const c = calc(d), st = C.eff(d), cu = d.customer || {};
  const canDelete = true;
  const btn = (a, icon, label, cls = "ghost") => `<button class="btn ${cls}" data-a="${a}">${ico(icon)}<span>${t(label)}</span></button>`;
  el.innerHTML = `<div class="page-h"><div><h1>${esc(d.number)} ${badge(st)}</h1><p class="sub">${esc(cu.name || "")}${cu.company ? " · " + esc(cu.company) : ""}</p></div><a class="btn ghost" href="#/app/${C.route}">${t("back")}</a></div>
  <div class="actions-bar">${btn("edit", "edit", "act_edit", "primary")}${btn("download", "download", "act_download")}${btn("print", "print", "act_print")}${btn("inline", "eye", "preview_inline")}${btn("preview", "eye", "act_preview")}${btn("share", "share", "act_share")}${btn("dup", "copy", "act_duplicate")}
   ${type === "invoice" && !["paid", "cancelled", "draft"].includes(d.status) ? btn("pay", "wallet", "act_receipt", "accent") : ""}
   ${type === "invoice" ? `${d.status !== "paid" && d.status !== "cancelled" ? btn("paid", "check", "mark_paid") : ""}${["paid", "partial", "sent", "draft"].includes(d.status) ? btn("unpaid", "clock", "mark_unpaid") : ""}${d.status !== "cancelled" && d.status !== "draft" && d.status !== "paid" ? btn("partial", "wallet", "mark_partial") : ""}${d.status !== "cancelled" ? btn("cancel", "x", "mark_cancel") : ""}`
   : `${!d.convertedInvoiceId ? btn("convert", "swap", "act_convert", "accent") : ""}${["sent", "draft", "rejected", "expired"].includes(d.status) ? btn("accepted", "check", "mark_accepted") : ""}${["sent", "draft", "accepted"].includes(d.status) ? btn("rejected", "x", "mark_rejected") : ""}${["sent", "draft"].includes(d.status) ? btn("expired", "clock", "mark_expired") : ""}${d.status === "draft" ? btn("sent", "mail", "mark_sent") : ""}`}
   ${type === "invoice" && d.status === "draft" ? btn("sent", "mail", "mark_sent") : ""}${canDelete ? btn("del", "trash", "delete", "danger") : ""}</div>
  <section class="card" id="pvbox" hidden><h2>${t("preview_title")}</h2><iframe class="pdf-frame" title="PDF" src="about:blank"></iframe></section>
  <div class="grid-view"><section class="card"><div class="kv"><div><span>${t("f_date")}</span><b>${fmtDate(d.date, getLang())}</b></div><div><span>${t(type === "invoice" ? "f_due" : "f_valid")}</span><b>${fmtDate(dueOf(type, d), getLang())}</b></div>
   <div><span>${t("sec_customer")}</span><b>${esc(cu.name || "-")}</b><small>${esc(cu.address || "")}<br>${esc([cu.phone, cu.email].filter(Boolean).join(" · "))}</small></div>
   ${d.convertedInvoiceId ? `<div><span>${t("st_converted")}</span><a href="#/app/invoices/${esc(d.convertedInvoiceId)}"><b>${esc(d.convertedInvoiceNumber || "")}</b></a></div>` : ""}${d.fromQuotationNumber ? `<div><span>${t("from_quotation")}</span><a href="#/app/quotations/${esc(d.fromQuotationId)}"><b>${esc(d.fromQuotationNumber)}</b></a></div>` : ""}</div>
   <table class="tbl simple"><thead><tr><th>${t("pdf_desc")}</th><th class="r">${t("pdf_qty")}</th><th class="r">${t("pdf_price")}</th><th class="r">${t("pdf_amount")}</th></tr></thead><tbody>${c.items.map((i) => `<tr><td data-l="${t("pdf_desc")}"><b>${esc(i.name)}</b>${i.desc ? `<br><small>${esc(i.desc)}</small>` : ""}</td><td class="r" data-l="${t("pdf_qty")}">${i.qty}</td><td class="r" data-l="${t("pdf_price")}">${money(i.price)}${num(i.discount) ? `<small> −${i.discount}%</small>` : ""}</td><td class="r" data-l="${t("pdf_amount")}">${money(i.amount)}</td></tr>`).join("")}</tbody></table>
   ${d.note ? `<h3>${t("pdf_note")}</h3><p class="pre">${esc(d.note)}</p>` : ""}${d.terms ? `<h3>${t("pdf_terms")}</h3><p class="pre">${esc(d.terms)}</p>` : ""}</section>
  <aside class="card totals"><div><span>${t("pdf_subtotal")}</span><b>${money(c.subtotal)}</b></div>${c.docDiscount ? `<div><span>${t("pdf_discount")}</span><b>- ${money(c.docDiscount)}</b></div>` : ""}${c.taxRate ? `<div><span>${t("pdf_tax")} (${c.taxRate}%)</span><b>${money(c.tax)}</b></div>` : ""}<div class="grand"><span>${t("pdf_total")}</span><b>${money(c.total)}</b></div>
   ${type === "invoice" ? `<div><span>${t("pdf_deposit")}</span><b>- ${money(c.deposit)}</b></div><div><span>${t("pdf_paid")}</span><b>- ${money(c.paidReceipts)}</b></div><div class="grand alt"><span>${t("pdf_balance")}</span><b>${money(c.balance)}</b></div>` : ""}
   ${receipts.length ? `<h3>${t("nav_receipts")}</h3>${receipts.map((r) => `<div class="mini"><span>${esc(r.number)} · ${fmtDate(r.date, getLang())}</span><b>${money(r.amount)}</b></div>`).join("")}` : ""}</aside></div>`;

  const act = async (a, b) => {
    try {
      if (a === "edit") return ctx.nav(`#/app/${C.route}/${id}/edit`);
      if (["download", "print", "preview", "share"].includes(a)) return pdfAction(ctx, type, d, a);
      setBusy(b, true);
      const upd = async (patch, logType) => { await update(ctx.uid, C.col, id, patch); toast(t("saved")); renderView(el, ctx, type, id); };
      if (a === "dup") { const nid = await duplicate(ctx, type, d); toast(t("duplicated")); return ctx.nav(`#/app/${C.route}/${nid}`); }
      if (a === "pay") return ctx.nav(`#/app/receipts/new?invoice=${id}`);
      if (a === "paid") { if (!(await confirmBox(t("mark_paid"), t("confirm_paid", { n: d.number }), t("yes")))) return setBusy(b, false); return upd({ status: "paid", receiptsPaid: round2(Math.max(c.total - c.deposit, 0)) }); }
      if (a === "unpaid") return upd({ status: "unpaid", receiptsPaid: 0 });
      if (a === "partial") { setBusy(b, false); return askPartial(); }
      if (a === "cancel") { if (!(await confirmBox(t("mark_cancel"), t("confirm_cancel", { n: d.number }), t("yes")))) return setBusy(b, false); return upd({ status: "cancelled" }); }
      if (["accepted", "rejected", "expired", "sent"].includes(a)) return upd({ status: a });
      if (a === "del") { if (!(await confirmBox(t("delete"), t(confirmKey(type), { n: d.number }), t("delete")))) return setBusy(b, false); await deleteProject(ctx, type, d); toast(t("deleted")); return ctx.nav(`#/app/${C.route}`); }
      if (a === "inline") { const box = el.querySelector("#pvbox"); const open = !box.hidden; box.hidden = open; if (!open) { const pdf = await makePdf(ctx, type, d); const fr = box.querySelector("iframe"); if (fr.dataset.u) URL.revokeObjectURL(fr.dataset.u); fr.dataset.u = URL.createObjectURL(pdf.output("blob")); fr.src = fr.dataset.u; box.scrollIntoView({ behavior: "smooth", block: "start" }); } setBusy(b, false); return; }
      if (a === "convert") {
        if (!(await confirmBox(t("act_convert"), t("confirm_convert", { n: d.number }), t("yes")))) return setBusy(b, false);
        const today = todayMY(); const { id: _i, number, createdAt, updatedAt, ownerUid, status, validUntil, convertedInvoiceId, ...rest } = d;
        const qref = F.doc(F.getFirestore(), "inv_users", ctx.uid, "quotations", id);
        const r = await createNumbered(ctx.uid, "invoice", await numberFmt(ctx, "invoice"), null, (_, n) => ({ data: { ...rest, date: today, dueDate: addDays(today, 14), status: "draft", deposit: 0, receiptsPaid: 0, fromQuotationId: id, fromQuotationNumber: d.number },
          writes: [(tx) => tx.update(qref, { status: "converted", convertedInvoiceId: "pending", convertedInvoiceNumber: n, updatedAt: F.serverTimestamp() })] }));
        await update(ctx.uid, "quotations", id, { convertedInvoiceId: r.id, convertedInvoiceNumber: r.number });
        logActivity(ctx.user, "invoice", r.number); toast(t("converted", { n: r.number })); return ctx.nav(`#/app/invoices/${r.id}`);
      }
    } catch (x) { console.error(x); toast(errMsg(x), "err"); setBusy(b, false); }
  };
  async function askPartial() {
    const body = `<form class="form"><label>${t("f_amount")} (RM)<input name="amount" type="number" step="0.01" min="0.01" max="${c.balance}" value="" required></label><label>${t("pdf_method")}<select name="method">${METHODS.map((m) => `<option value="${m}">${t("pm_" + m)}</option>`).join("")}</select></label></form>`;
    const r = await modal({ title: t("mark_partial"), body, actions: [{ label: t("cancel"), value: null }, { label: t("save"), cls: "primary", onClick: async (ov) => {
      const amount = num(ov.querySelector("[name=amount]").value); if (amount <= 0 || amount > c.balance + 0.005) { toast(t("err_amount"), "err"); return false; }
      try { await recordPayment(ctx, d, { amount, method: ov.querySelector("[name=method]").value, date: todayMY(), note: "" }); return true; } catch (x) { toast(errMsg(x), "err"); return false; } } }] });
    if (r) { toast(t("saved")); renderView(el, ctx, type, id); }
  }
  el.onclick = (e) => { const b = e.target.closest("[data-a]"); if (b) act(b.dataset.a, b); };
}

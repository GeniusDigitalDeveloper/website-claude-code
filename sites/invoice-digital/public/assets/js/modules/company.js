// Sub-tetapan Profil: "business" (foto profil, logo, maklumat perniagaan, bank + QR) dan "documents" (lalai dokumen).
// Simpan = optimistik: borang kekal responsif, data masuk cache setempat serta-merta dan ditulis ke Firestore di latar.
import { t } from "../i18n.js";
import { esc, $, num, toast, readFileAsDataURL } from "../util.js";
import { loading } from "./ui.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { avatarHtml, bindAvatar } from "./avatar.js";

export async function render(el, ctx, section = "business") {
  el.innerHTML = loading(); const c = await ctx.getCompany(); const st = await ctx.getSettings(); let logo = c.logo || "", qr = c.bankQr || "";
  const biz = `${avatarHtml(c, ctx.user)}<hr class="sep">
   <p class="muted">${t("company_sub")}</p>
   <div class="logo-row"><div class="logo-prev" id="lp">${logo ? `<img alt="Logo" src="${esc(logo)}">` : `<span>${t("no_logo")}</span>`}</div><div><label class="btn ghost file">${t("upload_logo")}<input type="file" id="lf" accept="image/png,image/jpeg,image/webp" hidden></label> <button type="button" class="btn ghost" id="lrm">${t("remove")}</button><p class="muted">${t("logo_hint")}</p></div></div>
   <div class="grid2"><label>${t("f_bizname")} *<input name="name" maxlength="120" required value="${esc(c.name)}"></label><label>${t("f_regno")}<input name="regNo" maxlength="40" value="${esc(c.regNo)}"></label></div>
   <label>${t("f_address")}<textarea name="address" rows="2" maxlength="300">${esc(c.address)}</textarea></label>
   <div class="grid3"><label>${t("f_phone")}<input name="phone" maxlength="30" inputmode="tel" value="${esc(c.phone)}"></label><label>${t("f_email")}<input name="email" type="email" maxlength="120" value="${esc(c.email)}"></label><label>${t("f_website")}<input name="website" maxlength="120" value="${esc(c.website)}"></label></div>
   <div class="bank-g"><label>${t("pdf_bank")}<textarea name="bank" rows="5" maxlength="500" placeholder="Maybank 1234567890 — Nama Syarikat">${esc(c.bank)}</textarea></label>
    <div class="qr-box"><span class="lbl">${t("f_bank_qr")}</span><div class="qr-prev" id="qp">${qr ? `<img alt="QR" src="${esc(qr)}">` : `<span>${t("no_logo")}</span>`}</div>
     <div class="inline-actions"><label class="btn ghost sm file">${t("upload_qr")}<input type="file" id="qf" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="btn ghost sm" id="qrm">${t("remove")}</button></div><p class="muted">${t("qr_hint")}</p></div></div>`;
  const docs = `<p class="muted">${t("doc_defaults_sub")}</p>
   <div class="grid2"><label>${t("f_taxname")}<input name="taxName" maxlength="20" value="${esc(c.taxName ?? st.taxName ?? "SST")}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(c.taxRate ?? st.taxRate)}"></label></div>
   ${pickerHtml(c.template, c.color)}
   <label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(c.terms ?? st.terms)}</textarea></label>`;
  el.innerHTML = `<form id="f" class="card form" novalidate>${section === "business" ? biz : docs}<p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", el);
  if (section === "documents") bindPicker(el);
  else {
    bindAvatar(el, ctx);
    const pick = (inputId, previewId, max, set) => ($(inputId, el).onchange = async (e) => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; if (file.size > 8e6) return toast(t("err_file"), "err");
      try { let v = await readFileAsDataURL(file, max); if (v.length > 250000) v = await readFileAsDataURL(file, Math.round(max * 0.65), 0.75); set(v); $(previewId, el).innerHTML = `<img alt="" src="${v}">`; } catch { toast(t("err_file"), "err"); } });
    pick("#lf", "#lp", 400, (v) => (logo = v)); pick("#qf", "#qp", 520, (v) => (qr = v));
    $("#lrm", el).onclick = () => { logo = ""; $("#lp", el).innerHTML = `<span>${t("no_logo")}</span>`; };
    $("#qrm", el).onclick = () => { qr = ""; $("#qp", el).innerHTML = `<span>${t("no_logo")}</span>`; };
  }
  f.onsubmit = (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; let data;
    if (section === "business") { if (!f.name.value.trim()) { err.textContent = t("err_required"); return f.name.focus(); } if (logo.length > 280000 || qr.length > 280000) return (err.textContent = t("err_file"));
      data = { logo, bankQr: qr, name: f.name.value.trim(), regNo: f.regNo.value.trim(), address: f.address.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), website: f.website.value.trim(), bank: f.bank.value.trim() }; }
    else data = { taxName: f.taxName.value.trim() || "SST", taxRate: Math.min(Math.max(num(f.taxRate.value), 0), 100), template: f.template.value, color: f.color.value, terms: f.terms.value.trim() };
    // Serta-merta: cache dikemas kini dahulu, toast terus, tulis ke pelayan di latar; ralat dipaparkan jika gagal.
    toast(t("saved")); ctx.saveCompany(data).catch((x) => { console.error(x); toast(t("save_failed"), "err"); });
  };
}

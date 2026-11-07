// Sub-tetapan Profil: "business" (maklumat perniagaan + logo) dan "documents" (lalai dokumen: cukai, templat, warna, terma).
import { t } from "../i18n.js";
import { esc, $, num, toast, setBusy, readFileAsDataURL } from "../util.js";
import { setMeta } from "../db.js";
import { errMsg } from "../auth.js";
import { loading } from "./ui.js";
import { pickerHtml, bindPicker } from "../picker.js";

export async function render(el, ctx, section = "business") {
  el.innerHTML = loading(); const c = await ctx.getCompany(true); const st = await ctx.getSettings(); let logo = c.logo || "";
  const biz = `<p class="muted">${t("company_sub")}</p>
   <div class="logo-row"><div class="logo-prev" id="lp">${logo ? `<img alt="Logo" src="${esc(logo)}">` : `<span>${t("no_logo")}</span>`}</div><div><label class="btn ghost file">${t("upload_logo")}<input type="file" id="lf" accept="image/png,image/jpeg,image/webp" hidden></label> <button type="button" class="btn ghost" id="lrm">${t("remove")}</button><p class="muted">${t("logo_hint")}</p></div></div>
   <div class="grid2"><label>${t("f_bizname")} *<input name="name" maxlength="120" required value="${esc(c.name)}"></label><label>${t("f_regno")}<input name="regNo" maxlength="40" value="${esc(c.regNo)}"></label></div>
   <label>${t("f_address")}<textarea name="address" rows="2" maxlength="300">${esc(c.address)}</textarea></label>
   <div class="grid3"><label>${t("f_phone")}<input name="phone" maxlength="30" inputmode="tel" value="${esc(c.phone)}"></label><label>${t("f_email")}<input name="email" type="email" maxlength="120" value="${esc(c.email)}"></label><label>${t("f_website")}<input name="website" maxlength="120" value="${esc(c.website)}"></label></div>
   <label>${t("pdf_bank")}<textarea name="bank" rows="3" maxlength="500" placeholder="Maybank 1234567890 — Nama Syarikat">${esc(c.bank)}</textarea></label>`;
  const docs = `<p class="muted">${t("doc_defaults_sub")}</p>
   <div class="grid2"><label>${t("f_taxname")}<input name="taxName" maxlength="20" value="${esc(c.taxName ?? st.taxName ?? "SST")}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(c.taxRate ?? st.taxRate)}"></label></div>
   ${pickerHtml(c.template, c.color)}
   <label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(c.terms ?? st.terms)}</textarea></label>`;
  el.innerHTML = `<form id="f" class="card form" novalidate>${section === "business" ? biz : docs}<p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", el);
  if (section === "documents") bindPicker(el);
  else {
    $("#lf", el).onchange = async (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5e6) return toast(t("err_file"), "err"); try { logo = await readFileAsDataURL(file, 400); if (logo.length > 250000) logo = await readFileAsDataURL(file, 260, 0.75); $("#lp", el).innerHTML = `<img alt="Logo" src="${logo}">`; } catch { toast(t("err_file"), "err"); } };
    $("#lrm", el).onclick = () => { logo = ""; $("#lp", el).innerHTML = `<span>${t("no_logo")}</span>`; };
  }
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f); let data;
    if (section === "business") { if (!f.name.value.trim()) return (err.textContent = t("err_required")); if (logo.length > 280000) return (err.textContent = t("err_file"));
      data = { logo, name: f.name.value.trim(), regNo: f.regNo.value.trim(), address: f.address.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), website: f.website.value.trim(), bank: f.bank.value.trim() }; }
    else data = { taxName: f.taxName.value.trim() || "SST", taxRate: Math.min(Math.max(num(f.taxRate.value), 0), 100), template: f.template.value, color: f.color.value, terms: f.terms.value.trim() };
    setBusy(btn, true); try { await setMeta(ctx.uid, "company", { ...c, ...data }); await ctx.getCompany(true); toast(t("saved")); } catch (x) { err.textContent = errMsg(x); } setBusy(btn, false);
  };
}

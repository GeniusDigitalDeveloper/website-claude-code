import { t } from "../i18n.js";
import { esc, $, num, toast, setBusy, readFileAsDataURL, isHttps } from "../util.js";
import { setMeta } from "../db.js";
import { errMsg } from "../auth.js";
import { loading } from "./ui.js";
import { TEMPLATES } from "../pdf.js";

export async function render(el, ctx) {
  el.innerHTML = loading(); const c = await ctx.getCompany(true); const st = await ctx.getSettings(); let logo = c.logo || "";
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_company")}</h1><p class="sub">${t("company_sub")}</p></div></div>
  <form id="f" class="card form" novalidate>
   <div class="logo-row"><div class="logo-prev" id="lp">${logo ? `<img alt="Logo" src="${esc(logo)}">` : `<span>${t("no_logo")}</span>`}</div><div><label class="btn ghost file">${t("upload_logo")}<input type="file" id="lf" accept="image/png,image/jpeg,image/webp" hidden></label> <button type="button" class="btn ghost" id="lrm">${t("remove")}</button><p class="muted">${t("logo_hint")}</p></div></div>
   <div class="grid2"><label>${t("f_bizname")} *<input name="name" maxlength="120" required value="${esc(c.name)}"></label><label>${t("f_regno")}<input name="regNo" maxlength="40" value="${esc(c.regNo)}"></label></div>
   <label>${t("f_address")}<textarea name="address" rows="2" maxlength="300">${esc(c.address)}</textarea></label>
   <div class="grid3"><label>${t("f_phone")}<input name="phone" maxlength="30" inputmode="tel" value="${esc(c.phone)}"></label><label>${t("f_email")}<input name="email" type="email" maxlength="120" value="${esc(c.email)}"></label><label>${t("f_website")}<input name="website" maxlength="120" value="${esc(c.website)}"></label></div>
   <label>${t("pdf_bank")}<textarea name="bank" rows="3" maxlength="500" placeholder="Maybank 1234567890 — Nama Syarikat">${esc(c.bank)}</textarea></label>
   <h2>${t("doc_defaults")}</h2>
   <div class="grid3"><label>${t("f_taxname")}<input name="taxName" maxlength="20" value="${esc(c.taxName ?? st.taxName ?? "SST")}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(c.taxRate ?? st.taxRate)}"></label>
   <label>${t("f_template")}<select name="template">${Object.keys(TEMPLATES).map((k) => `<option value="${k}" ${k === (c.template || "classic") ? "selected" : ""}>${t("tpl_" + k)}</option>`).join("")}</select></label></div>
   <label>${t("f_color")}<input name="color" type="color" value="${esc(c.color || "#2563eb")}"></label>
   <label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(c.terms ?? st.terms)}</textarea></label>
   <p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", el);
  $("#lf", el).onchange = async (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 5e6) return toast(t("err_file"), "err"); try { logo = await readFileAsDataURL(file, 400); if (logo.length > 250000) logo = await readFileAsDataURL(file, 260, 0.75); $("#lp", el).innerHTML = `<img alt="Logo" src="${logo}">`; } catch (x) { toast(t("err_file"), "err"); } };
  $("#lrm", el).onclick = () => { logo = ""; $("#lp", el).innerHTML = `<span>${t("no_logo")}</span>`; };
  f.onsubmit = async (e) => { e.preventDefault(); const err = $("#err", el); err.textContent = ""; const btn = $("button[type=submit]", f);
    if (!f.name.value.trim()) return (err.textContent = t("err_required")); if (logo.length > 280000) return (err.textContent = t("err_file"));
    const data = { logo, name: f.name.value.trim(), regNo: f.regNo.value.trim(), address: f.address.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), website: f.website.value.trim(), bank: f.bank.value.trim(), taxName: f.taxName.value.trim() || "SST", taxRate: num(f.taxRate.value), template: f.template.value, color: f.color.value, terms: f.terms.value.trim() };
    setBusy(btn, true); try { await setMeta(ctx.uid, "company", data); await ctx.getCompany(true); toast(t("saved")); } catch (x) { err.textContent = errMsg(x); } setBusy(btn, false); };
}

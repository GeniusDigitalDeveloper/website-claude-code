// Sub-tetapan Profil: "business" (foto profil, logo, maklumat perniagaan, bank + QR, tandatangan + cop) dan "documents" (lalai dokumen).
// Logo, QR, tandatangan dan cop semuanya PILIHAN (tiada yang wajib). Simpan = optimistik: UI/PDF terus guna data baharu, tulis pelayan di latar.
import { t } from "../i18n.js";
import { esc, $, num, toast, fitImage } from "../util.js";
import { loading } from "./ui.js";
import { pickerHtml, bindPicker } from "../picker.js";
import { avatarHtml, bindAvatar } from "./avatar.js";
import { sizesHtml, bindSizes, readSizes } from "../sizes.js";

// Had saiz (aksara data-URL) setiap imej supaya dokumen syarikat sentiasa jauh di bawah had 1 MB Firestore.
const IMG = { logo: { dim: 360, max: 110000 }, bankQr: { dim: 420, max: 90000 }, signature: { dim: 420, max: 100000 }, stamp: { dim: 340, max: 100000 } };

export async function render(el, ctx, section = "business") {
  el.innerHTML = loading(); const c = await ctx.getCompany(); const st = await ctx.getSettings();
  const img = { logo: c.logo || "", bankQr: c.bankQr || "", signature: c.signature || "", stamp: c.stamp || "" };
  const box = (key, label, hint, cls = "") => `<div class="img-box"><span class="lbl">${label} <em class="opt">(${t("optional_tag")})</em></span>
    <div class="img-prev ${cls}" id="pv-${key}">${img[key] ? `<img alt="" src="${esc(img[key])}">` : `<span>${t("no_logo")}</span>`}</div>
    <div class="inline-actions"><label class="btn ghost sm file">${t("upload_img")}<input type="file" data-up="${key}" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="btn ghost sm" data-rm="${key}">${t("remove")}</button></div>${hint ? `<p class="muted">${hint}</p>` : ""}</div>`;
  const biz = `${avatarHtml(c, ctx.user)}<hr class="sep">
   <p class="muted">${t("company_sub")}</p>
   ${box("logo", t("f_logo"), t("img_optional_hint"), "wide")}
   <div class="grid2"><label>${t("f_bizname")} *<input name="name" maxlength="120" required value="${esc(c.name)}"></label><label>${t("f_regno")}<input name="regNo" maxlength="40" value="${esc(c.regNo)}"></label></div>
   <label>${t("f_address")}<textarea name="address" rows="2" maxlength="300">${esc(c.address)}</textarea></label>
   <div class="grid3"><label>${t("f_phone")}<input name="phone" maxlength="30" inputmode="tel" value="${esc(c.phone)}"></label><label>${t("f_email")}<input name="email" type="email" maxlength="120" value="${esc(c.email)}"></label><label>${t("f_website")}<input name="website" maxlength="120" value="${esc(c.website)}"></label></div>
   <div class="bank-g"><label>${t("pdf_bank")} <em class="opt">(${t("optional_tag")})</em><textarea name="bank" rows="5" maxlength="500" placeholder="Maybank 1234567890 — Nama Syarikat">${esc(c.bank)}</textarea></label>
    ${box("bankQr", t("f_bank_qr"), t("qr_hint"))}</div>
   <h2>${t("f_signature")} &amp; ${t("f_stamp")}</h2><p class="note-red">${t("sig_hint")}</p>
   <div class="sig-g">${box("signature", t("f_signature"), "", "checker")}${box("stamp", t("f_stamp"), "", "checker")}</div>
   ${sizesHtml({ logo: c.logoScale, qr: c.qrScale, sig: c.sigScale, stamp: c.stampScale }, {}, ["logo", "qr", "sig", "stamp"], true)}`;
  const docs = `<p class="muted">${t("doc_defaults_sub")}</p>
   <div class="grid2"><label>${t("f_taxname")}<input name="taxName" maxlength="20" value="${esc(c.taxName ?? st.taxName ?? "SST")}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(c.taxRate ?? st.taxRate)}"></label></div>
   ${pickerHtml(c.template, c.color)}
   <label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(c.terms ?? st.terms)}</textarea></label>`;
  el.innerHTML = `<form id="f" class="card form" novalidate>${section === "business" ? biz : docs}<p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", el);
  if (section === "documents") bindPicker(el);
  else {
    bindAvatar(el, ctx); bindSizes(el);
    el.querySelectorAll("[data-up]").forEach((inp) => (inp.onchange = async (e) => {
      const key = inp.dataset.up, file = e.target.files[0]; e.target.value = ""; if (!file) return; if (file.size > 12e6) return toast(t("err_file"), "err");
      try { img[key] = await fitImage(file, IMG[key].dim, IMG[key].max); $("#pv-" + key, el).innerHTML = `<img alt="" src="${img[key]}">`; } catch { toast(t("err_file"), "err"); }
    }));
    el.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { const key = b.dataset.rm; img[key] = ""; $("#pv-" + key, el).innerHTML = `<span>${t("no_logo")}</span>`; }));
  }
  f.onsubmit = (e) => {
    e.preventDefault(); const err = $("#err", el); err.textContent = ""; let data;
    if (section === "business") {
      if (!f.name.value.trim()) { err.textContent = t("err_required"); return f.name.focus(); }
      if (Object.values(img).reduce((s, v) => s + v.length, 0) > 480000) return (err.textContent = t("err_file"));
      data = { logo: img.logo, bankQr: img.bankQr, signature: img.signature, stamp: img.stamp, ...(() => { const z = readSizes(el); return { logoScale: z.logo, qrScale: z.qr, sigScale: z.sig, stampScale: z.stamp }; })(), name: f.name.value.trim(), regNo: f.regNo.value.trim(), address: f.address.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), website: f.website.value.trim(), bank: f.bank.value.trim() };
    } else data = { taxName: f.taxName.value.trim() || "SST", taxRate: Math.min(Math.max(num(f.taxRate.value), 0), 100), template: f.template.value, color: f.color.value, terms: f.terms.value.trim() };
    // Serta-merta: cache dikemas kini dahulu, toast terus, tulis ke pelayan di latar; ralat dipaparkan jika gagal.
    toast(t("saved")); ctx.saveCompany(data).catch((x) => { console.error(x); toast(t("save_failed"), "err"); });
  };
}

// Sub-tetapan Profil: "account" (nama, emel) dan "settings" (bahasa, kata laluan).
import { t, getLang, setLang } from "../i18n.js";
import { esc, $, toast, setBusy, fmtTs } from "../util.js";
import { ico } from "./ui.js";
import { A, auth, F, db } from "../firebase.js";
import { errMsg, hasPassword, createPassword, changePassword, getDevicePw, setDevicePw } from "../auth.js";
import { pwInput, bindEyes } from "./ui.js";
import { avatarHtml, bindAvatar } from "./avatar.js";

export async function render(el, ctx, section = "account") {
  const u = ctx.user; const isPw = u.providerData.some((p) => p.providerId === "password");
  if (section === "account") {
    const co = await ctx.getCompany();
    el.innerHTML = `<form id="pf" class="card form" novalidate>${avatarHtml(co, u)}<hr class="sep"><label>${t("f_name")}<input name="displayName" maxlength="80" value="${esc(u.displayName || "")}"></label><label>${t("f_email")}<input value="${esc(u.email || "")}" disabled></label>
      <p class="muted">${t("member_since")}: ${fmtTs(u.metadata.creationTime, getLang())}</p><p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
    bindAvatar(el, ctx);
    $("#pf", el).onsubmit = async (e) => { e.preventDefault(); const f = e.target; const btn = $("button[type=submit]", f); setBusy(btn, true);
      try { await A.updateProfile(auth.currentUser, { displayName: f.displayName.value.trim() }); await F.updateDoc(F.doc(db, "inv_users", ctx.uid), { displayName: f.displayName.value.trim(), updatedAt: F.serverTimestamp() }); toast(t("saved")); ctx.refreshUser(); } catch (x) { $("#err", el).textContent = errMsg(x); } setBusy(btn, false); };
    return;
  }
  const has = hasPassword(u); const dev = getDevicePw(ctx.uid);
  el.innerHTML = `<div class="card form"><h2>${t("language")}</h2><label>${t("language")}<select id="lg"><option value="ms" ${getLang() === "ms" ? "selected" : ""}>Bahasa Melayu</option><option value="en" ${getLang() === "en" ? "selected" : ""}>English</option></select></label></div>
    <div class="card form"><h2>${t("pw_title")}</h2>
    ${has ? `<label>${t("pw_your")}${dev ? `<span class="pw"><input id="devpw" type="password" value="${esc(dev)}" readonly><button type="button" class="eye" data-eye aria-label="${esc(t("show_pw"))}" aria-pressed="false">${ico("eye")}</button></span>` : `<span class="muted">${t("pw_not_saved")}</span>`}</label><hr class="sep">` : `<p class="muted">${t("pw_create_text")}</p>`}
    <form id="pwf" class="form" novalidate><h3>${has ? t("pw_change") : t("pw_create_title")}</h3>
      ${has ? `<label>${t("pw_current")}${pwInput("cur", "current-password", "required")}</label>` : ""}
      <label>${t("pw_new")}${pwInput("nw", "new-password", "required minlength=\"8\"")}</label><label>${t("pw_confirm")}${pwInput("cf", "new-password", "required minlength=\"8\"")}</label>
      <label class="chk"><input type="checkbox" name="rem" ${dev ? "checked" : ""}> ${t("pw_remember")}</label><p class="muted">${t("pw_remember_hint")}</p>
      <p class="err" id="pwerr" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form></div>`;
  bindEyes(el);
  $("#lg", el).onchange = (e) => { F.updateDoc(F.doc(db, "inv_users", ctx.uid), { lang: e.target.value, updatedAt: F.serverTimestamp() }).catch(() => {}); setLang(e.target.value); };
  $("#pwf", el).onsubmit = async (e) => {
    e.preventDefault(); const f = e.target, err = $("#pwerr", el), btn = $("button[type=submit]", f); err.textContent = "";
    if (f.nw.value.length < 8) return (err.textContent = t("pw_min")); if (f.nw.value !== f.cf.value) return (err.textContent = t("pw_mismatch")); if (has && !f.cur.value) return (err.textContent = t("err_required"));
    setBusy(btn, true);
    try { has ? await changePassword(auth.currentUser, f.cur.value, f.nw.value) : await createPassword(auth.currentUser, f.nw.value); setDevicePw(ctx.uid, f.rem.checked ? f.nw.value : ""); toast(t("pw_updated")); render(el, ctx, "settings"); }
    catch (x) { err.textContent = errMsg(x); setBusy(btn, false); }
  };
}

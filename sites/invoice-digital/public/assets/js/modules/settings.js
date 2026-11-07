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
  const dev = getDevicePw(ctx.uid);
  el.innerHTML = `<div class="card form"><h2>${t("language")}</h2><label>${t("language")}<select id="lg"><option value="ms" ${getLang() === "ms" ? "selected" : ""}>Bahasa Melayu</option><option value="en" ${getLang() === "en" ? "selected" : ""}>English</option></select></label></div>
    <div class="card form"><h2>${t("pw_title")}</h2>${dev ? `<label>${t("pw_view")}<span class="pw"><input id="devpw" type="password" value="${esc(dev)}" readonly autocomplete="off"><button type="button" class="eye" data-eye aria-label="${esc(t("show_pw"))}" aria-pressed="false">${ico("eye")}</button></span></label>` : `<p class="muted">${t("pw_unavailable")}</p>`}</div>`;
  bindEyes(el);
  $("#lg", el).onchange = (e) => { F.updateDoc(F.doc(db, "inv_users", ctx.uid), { lang: e.target.value, updatedAt: F.serverTimestamp() }).catch(() => {}); setLang(e.target.value); };
}

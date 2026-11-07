import { t, getLang, setLang } from "../i18n.js";
import { esc, $, toast, setBusy, fmtTs } from "../util.js";
import { A, auth } from "../firebase.js";
import { errMsg, resetPw } from "../auth.js";
import { update } from "../db.js";
import { F, db } from "../firebase.js";

export async function render(el, ctx) {
  const u = ctx.user; const isPw = u.providerData.some((p) => p.providerId === "password");
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_settings")}</h1><p class="sub">${t("settings_sub")}</p></div></div>
  <div class="card form"><h2>${t("account")}</h2><form id="pf" class="form" novalidate><label>${t("f_name")}<input name="displayName" maxlength="80" value="${esc(u.displayName || "")}"></label><label>${t("f_email")}<input value="${esc(u.email || "")}" disabled></label>
   <label>${t("language")}<select name="lang"><option value="ms" ${getLang() === "ms" ? "selected" : ""}>Bahasa Melayu</option><option value="en" ${getLang() === "en" ? "selected" : ""}>English</option></select></label>
   <p class="muted">${t("member_since")}: ${fmtTs(u.metadata.creationTime, getLang())}</p><p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form></div>
  ${isPw ? `<div class="card form"><h2>${t("password")}</h2><p class="muted">${t("pw_reset_hint")}</p><div class="form-f"><button class="btn ghost" id="rp">${t("send_reset")}</button></div></div>` : ""}`;
  $("#pf", el).onsubmit = async (e) => { e.preventDefault(); const f = e.target; const btn = $("button[type=submit]", f); setBusy(btn, true);
    try { await A.updateProfile(auth.currentUser, { displayName: f.displayName.value.trim() }); await F.updateDoc(F.doc(db, "inv_users", ctx.uid), { displayName: f.displayName.value.trim(), lang: f.lang.value, updatedAt: F.serverTimestamp() }); if (f.lang.value !== getLang()) setLang(f.lang.value); toast(t("saved")); ctx.refreshUser(); } catch (x) { $("#err", el).textContent = errMsg(x); } setBusy(btn, false); };
  const rp = $("#rp", el); if (rp) rp.onclick = async () => { setBusy(rp, true); try { await resetPw(u.email); toast(t("reset_sent")); } catch (x) { toast(errMsg(x), "err"); } setBusy(rp, false); };
}

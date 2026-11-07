// Foto profil (bulatan di bar atas). Disimpan serta-merta (optimistik) dalam dokumen perniagaan pengguna.
import { t } from "../i18n.js";
import { esc, $, toast, readSquareAvatar } from "../util.js";

export const avatarInner = (c, user) => (c && c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : esc(((user && (user.displayName || user.email)) || "?")[0].toUpperCase()));
export function avatarHtml(c, user) {
  return `<div class="avatar-row"><div class="avatar-big" id="avBig">${avatarInner(c, user)}</div><div><b>${t("photo_profile")}</b><p class="muted">${t("photo_hint")}</p>
    <label class="btn ghost sm file">${t("upload_photo")}<input type="file" id="avf" accept="image/png,image/jpeg,image/webp" hidden></label> <button type="button" class="btn ghost sm" id="avrm">${t("remove")}</button></div></div>`;
}
export function bindAvatar(root, ctx) {
  const big = $("#avBig", root); const show = async () => { big.innerHTML = avatarInner(await ctx.getCompany(), ctx.user); };
  const save = async (avatar) => { try { await ctx.saveCompany({ avatar }); show(); toast(t("saved")); } catch (e) { console.error(e); toast(t("save_failed"), "err"); show(); } };
  $("#avf", root).onchange = async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (f.size > 8e6) return toast(t("err_file"), "err");
    try { const a = await readSquareAvatar(f); big.innerHTML = `<img src="${a}" alt="">`; save(a); } catch { toast(t("err_file"), "err"); } };
  $("#avrm", root).onclick = () => { big.innerHTML = avatarInner({}, ctx.user); save(""); };
}

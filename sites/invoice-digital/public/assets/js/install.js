// Pemasangan PWA: tangkap "beforeinstallprompt" (Chrome/Edge/Android), arahan manual untuk iPhone/iPad/Safari & pelayar lain.
import { t } from "./i18n.js";
import { esc, toast, modal } from "./util.js";

let deferred = null; const subs = new Set();
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); toast(t("install_done")); });
export const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export async function install() {
  if (deferred) { const ev = deferred; deferred = null; ev.prompt(); try { await ev.userChoice; } catch {} subs.forEach((f) => f()); return; }
  const steps = isIOS() ? ["install_ios_1", "install_ios_2", "install_ios_3"] : /Android/.test(navigator.userAgent) ? ["install_and_1", "install_and_2"] : ["install_pc_1", "install_pc_2"];
  modal({ title: t("install_title"), body: `<p class="muted">${t("install_text")}</p><ol class="steps-list">${steps.map((k) => `<li>${esc(t(k))}</li>`).join("")}</ol>`, actions: [{ label: t("close"), cls: "primary", value: null }] });
}
// Butang [data-install]: sembunyi bila app sudah dipasang (mod standalone).
export function bindInstall(root = document) {
  const btns = [...root.querySelectorAll("[data-install]")]; const upd = () => btns.forEach((b) => (b.hidden = isStandalone()));
  upd(); subs.add(upd); btns.forEach((b) => (b.onclick = (e) => { e.preventDefault(); install(); }));
}
export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => navigator.serviceWorker.register("/invoice/sw.js", { scope: "/invoice/" }).catch((e) => console.warn("sw", e)));
}

import { DICT } from "./i18n-data.js";
let lang = "ms";
try { lang = localStorage.getItem("inv_lang") || "ms"; } catch {}
if (!DICT[lang]) lang = "ms";
document.documentElement.lang = lang;
export const getLang = () => lang;
export function setLang(l) {
  if (!DICT[l]) return; lang = l; document.documentElement.lang = l;
  try { localStorage.setItem("inv_lang", l); } catch {}
  window.dispatchEvent(new CustomEvent("langchange", { detail: l }));
}
export const t = (k, vars) => {
  let s = DICT[lang][k] ?? DICT.ms[k] ?? k;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
  return s;
};
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((e) => (e.textContent = t(e.dataset.i18n)));
  root.querySelectorAll("[data-i18n-ph]").forEach((e) => e.setAttribute("placeholder", t(e.dataset.i18nPh)));
  root.querySelectorAll("[data-i18n-aria]").forEach((e) => e.setAttribute("aria-label", t(e.dataset.i18nAria)));
  root.querySelectorAll("[data-i18n-title]").forEach((e) => e.setAttribute("title", t(e.dataset.i18nTitle)));
}
// Teks kandungan dari admin: objek {ms,en} atau string
export const L = (v, fb = "") => (v && typeof v === "object" ? v[lang] || v.ms || fb : v || fb);
export function langSwitcher(el) {
  el.innerHTML = `<button type="button" data-l="ms" aria-label="Bahasa Melayu">BM</button><button type="button" data-l="en" aria-label="English">EN</button>`;
  const mark = () => el.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.l === lang));
  el.onclick = (e) => { const b = e.target.closest("button[data-l]"); if (b) { setLang(b.dataset.l); mark(); } };
  mark(); window.addEventListener("langchange", mark);
}

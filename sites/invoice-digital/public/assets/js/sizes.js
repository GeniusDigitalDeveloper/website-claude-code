// Kawalan saiz imej pada cetakan: logo, kod QR, tandatangan, cop (peratus, 40%-180%). Digunakan dalam Profil (lalai) dan setiap dokumen (ganti lalai).
// Setiap slider ada pratonton imej sebenar yang membesar/mengecil ikut peratus (nisbah sama seperti dalam PDF).
import { t } from "./i18n.js";
import { num, esc } from "./util.js";
import { SCALE_MIN, SCALE_MAX } from "./pdf.js";

const ALL = ["logo", "qr", "sig", "stamp"];
// Saiz asas dalam PDF (mm, pada 100%) dan medan imej dalam profil syarikat
const BASE = { logo: [46, 18], qr: [28, 28], sig: [44, 20], stamp: [30, 30] };
const FIELD = { logo: "logo", qr: "bankQr", sig: "signature", stamp: "stamp" };
export const FIELD_TO_KEY = { logo: "logo", bankQr: "qr", signature: "sig", stamp: "stamp" };
const PX = 1.45; // piksel skrin bagi 1 mm (pratonton)
const isImg = (s) => typeof s === "string" && s.startsWith("data:image");

const dims = (k, v) => { const [w, h] = BASE[k]; return [Math.round(w * (v / 100) * PX), Math.round(h * (v / 100) * PX)]; };
const pvInner = (k, src, v) => { const [w, h] = dims(k, v); return isImg(src) ? `<img data-szimg="${k}" alt="" src="${src}" style="max-width:${w}px;max-height:${h}px">` : `<span class="sz-none">${t("size_noimg")}</span>`; };

export function sizesHtml(values = {}, defaults = {}, keys = ALL, open = false, imgs = defaults) {
  const val = (k) => num(values && values[k]) || num(defaults && defaults[k + "Scale"]) || 100;
  return `<details class="sizes" ${open ? "open" : ""}><summary>${t("size_title")}</summary><p class="muted">${t("size_hint")}</p><div class="size-g">${keys.map((k) => `<label>${t("size_" + k)} <output data-out="${k}">${val(k)}%</output><span class="sz-pv" data-szpv="${k}" aria-hidden="true">${pvInner(k, imgs && imgs[FIELD[k]], val(k))}</span><input type="range" data-sz="${k}" min="${SCALE_MIN}" max="${SCALE_MAX}" step="5" value="${val(k)}" aria-label="${esc(t("size_" + k))}"></label>`).join("")}</div></details>`;
}
export const readSizes = (root) => { const o = {}; root.querySelectorAll("[data-sz]").forEach((i) => (o[i.dataset.sz] = Number(i.value))); return o; };
// Tukar imej pratonton (contohnya selepas muat naik logo/tandatangan baharu dalam Profil)
export function setSizeImg(root, field, src) {
  const k = FIELD_TO_KEY[field]; if (!k) return; const box = root.querySelector(`[data-szpv="${k}"]`); if (!box) return;
  const inp = root.querySelector(`[data-sz="${k}"]`); box.innerHTML = pvInner(k, src, inp ? Number(inp.value) : 100);
}
function sync(i) {
  const k = i.dataset.sz, root = i.closest(".sizes") || document, v = Number(i.value);
  const o = root.querySelector(`[data-out="${k}"]`); if (o) o.textContent = v + "%";
  const im = root.querySelector(`[data-szimg="${k}"]`); if (im) { const [w, h] = dims(k, v); im.style.maxWidth = w + "px"; im.style.maxHeight = h + "px"; }
}
// Satu pendengar global: semua borang (Profil, invois, quotation, resit) terus mengemas kini peratus + pratonton
if (typeof document !== "undefined" && !window.__szBound) { window.__szBound = true; document.addEventListener("input", (e) => { if (e.target && e.target.matches && e.target.matches("[data-sz]")) sync(e.target); }); }
export function bindSizes(root, onChange) {
  if (onChange) root.querySelectorAll("[data-sz]").forEach((i) => i.addEventListener("input", () => onChange(readSizes(root))));
}
// Hanya simpan saiz yang BERBEZA daripada lalai Profil (selebihnya mengikut lalai Profil, termasuk jika Profil diubah kemudian).
export function diffSizes(root, company = {}) {
  const o = {}; const cur = readSizes(root);
  Object.entries(cur).forEach(([k, v]) => { const def = num(company && company[k + "Scale"]) || 100; if (Math.abs(v - def) > 0.001) o[k] = v; });
  return o;
}

// Kawalan saiz imej pada cetakan: logo, kod QR, tandatangan, cop (peratus, 40%-180%). Digunakan dalam Profil (lalai) dan setiap dokumen (ganti lalai).
import { t } from "./i18n.js";
import { num } from "./util.js";
import { SCALE_MIN, SCALE_MAX } from "./pdf.js";

const ALL = ["logo", "qr", "sig", "stamp"];
export function sizesHtml(values = {}, defaults = {}, keys = ALL, open = false) {
  const val = (k) => num(values && values[k]) || num(defaults && defaults[k + "Scale"]) || 100;
  return `<details class="sizes" ${open ? "open" : ""}><summary>${t("size_title")}</summary><p class="muted">${t("size_hint")}</p><div class="size-g">${keys.map((k) => `<label>${t("size_" + k)} <output data-out="${k}">${val(k)}%</output><input type="range" data-sz="${k}" min="${SCALE_MIN}" max="${SCALE_MAX}" step="5" value="${val(k)}"></label>`).join("")}</div></details>`;
}
export const readSizes = (root) => { const o = {}; root.querySelectorAll("[data-sz]").forEach((i) => (o[i.dataset.sz] = Number(i.value))); return o; };
export function bindSizes(root, onChange) {
  root.querySelectorAll("[data-sz]").forEach((i) => i.addEventListener("input", () => { const o = root.querySelector(`[data-out="${i.dataset.sz}"]`); if (o) o.textContent = i.value + "%"; onChange && onChange(readSizes(root)); }));
}
// Hanya simpan saiz yang BERBEZA daripada lalai Profil (selebihnya mengikut lalai Profil, termasuk jika Profil diubah kemudian).
export function diffSizes(root, company = {}) {
  const o = {}; const cur = readSizes(root);
  Object.entries(cur).forEach(([k, v]) => { const def = num(company && company[k + "Scale"]) || 100; if (Math.abs(v - def) > 0.001) o[k] = v; });
  return o;
}

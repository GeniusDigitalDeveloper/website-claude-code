// Pemilih tema warna + templat PDF (kad visual). Mengekalkan input name="template" (hidden) dan name="color" supaya borang sedia ada terus berfungsi.
import { TEMPLATES } from "./pdf.js";
import { t } from "./i18n.js";
import { esc } from "./util.js";

export const PRESETS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#dc2626", "#ea580c", "#0f766e", "#be185d", "#8a6d1d", "#0f172a"];

function thumb(key, color) {
  const T = TEMPLATES[key], g = "#cbd5e1", dk = "#1e293b", ac = color;
  const lines = (x, y, n, w = 22) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 4}" width="${i % 2 ? w - 6 : w}" height="1.6" rx=".8" fill="${g}"/>`).join("");
  let s = `<rect x=".5" y=".5" width="59" height="79" rx="3" fill="#fff" stroke="#e2e8f0"/>`;
  if (T.side) s += `<rect x=".5" y=".5" width="4" height="79" fill="${ac}"/>`;
  if (T.band) { const h = T.bandH ? 22 : 15; s += `<path d="M.5 3.5a3 3 0 0 1 3-3h53a3 3 0 0 1 3 3V${h}H.5z" fill="${ac}"/><rect x="6" y="${h / 2 - 1}" width="18" height="2.2" rx="1" fill="#fff"/><rect x="40" y="${h / 2 - 2}" width="14" height="3.4" rx="1" fill="#fff"/>`; }
  else if (T.center) s += `<circle cx="30" cy="9" r="3.5" fill="${g}"/><rect x="20" y="15" width="20" height="2.4" rx="1" fill="${dk}"/><rect x="14" y="20" width="32" height="2" fill="${ac}"/><rect x="14" y="22.6" width="32" height="1" fill="${ac}"/>`;
  else { s += `<rect x="8" y="7" width="18" height="2.6" rx="1" fill="${dk}"/>`; s += T.pill ? `<rect x="36" y="5" width="19" height="6" rx="3" fill="${ac}"/>` : `<rect x="38" y="6.5" width="16" height="3.4" rx="1" fill="${ac}"/>`; if (T.rule) s += `<rect x="8" y="14" width="46" height="1" fill="${ac}"/>`; }
  const y0 = T.band ? (T.bandH ? 29 : 22) : T.center ? 29 : 19;
  s += lines(8, y0, 2, 16) + lines(34, y0, 2, 20);
  const ty = y0 + 12; const hf = T.head === "accent" ? ac : T.head === "dark" ? dk : null;
  s += hf ? `<rect x="8" y="${ty}" width="46" height="5" rx="1" fill="${hf}"/>` : `<rect x="8" y="${ty + 4}" width="46" height="1" fill="${ac}"/>`;
  for (let i = 0; i < 4; i++) s += `${T.zebra && i % 2 ? `<rect x="8" y="${ty + 7 + i * 5.5}" width="46" height="5" fill="#f1f5f9"/>` : ""}<rect x="10" y="${ty + 8.6 + i * 5.5}" width="20" height="1.6" rx=".8" fill="${g}"/><rect x="42" y="${ty + 8.6 + i * 5.5}" width="10" height="1.6" rx=".8" fill="${g}"/>`;
  s += `<rect x="34" y="${ty + 31}" width="20" height="5.5" rx="1.5" fill="${ac}"/>`;
  return `<svg viewBox="0 0 60 80" aria-hidden="true">${s}</svg>`;
}

export function pickerHtml(tpl, color) {
  tpl = TEMPLATES[tpl] ? tpl : "classic"; color = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#2563eb";
  return `<div class="picker" data-picker>
    <input type="hidden" name="template" value="${esc(tpl)}">
    <div class="pk-h"><span>${t("theme_color")}</span></div>
    <div class="swatches" role="group" aria-label="${esc(t("theme_color"))}">${PRESETS.map((c) => `<button type="button" class="sw" data-c="${c}" style="--c:${c}" aria-label="${c}" aria-pressed="${c.toLowerCase() === color.toLowerCase()}"></button>`).join("")}
      <label class="sw custom" title="${esc(t("custom_color"))}"><input type="color" name="color" value="${esc(color)}" aria-label="${esc(t("custom_color"))}"></label></div>
    <div class="pk-h"><span>${t("choose_template")}</span></div>
    <div class="tpls" role="radiogroup" aria-label="${esc(t("choose_template"))}">${Object.keys(TEMPLATES).map((k) => `<button type="button" class="tpl" role="radio" data-t="${k}" aria-checked="${k === tpl}"><span class="tpl-i" data-th="${k}">${thumb(k, color)}</span><span class="tpl-n">${t("tpl_" + k)}</span></button>`).join("")}</div></div>`;
}
export function bindPicker(root, onChange) {
  const box = root.querySelector("[data-picker]"); if (!box) return;
  const tIn = box.querySelector("[name=template]"), cIn = box.querySelector("[name=color]");
  const refresh = () => {
    box.querySelectorAll(".sw[data-c]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.c.toLowerCase() === cIn.value.toLowerCase()));
    box.querySelectorAll(".tpl").forEach((b) => { b.setAttribute("aria-checked", b.dataset.t === tIn.value); b.querySelector(".tpl-i").innerHTML = thumb(b.dataset.t, cIn.value); });
    box.querySelector(".custom").classList.toggle("on", !PRESETS.some((c) => c.toLowerCase() === cIn.value.toLowerCase()));
    onChange && onChange({ template: tIn.value, color: cIn.value });
  };
  box.addEventListener("click", (e) => {
    const sw = e.target.closest(".sw[data-c]"); if (sw) { cIn.value = sw.dataset.c; refresh(); }
    const tp = e.target.closest(".tpl"); if (tp) { tIn.value = tp.dataset.t; refresh(); }
  });
  cIn.addEventListener("input", refresh); refresh();
}

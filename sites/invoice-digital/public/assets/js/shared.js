// Komponen dikongsi panel awam & admin: branding, footer statistik.
import { t, L } from "./i18n.js";
import { esc } from "./util.js";
import { loadStats } from "./stats.js";

export const brand = (s) => ({ name: (s && s.appName) || "Invoice Digital & Quotation", logo: (s && s.logo) || "/assets/img/logo.png" });
export function footerHtml(s = {}) {
  const c = s.contactEmail || s.contactPhone ? `<p class="ft-contact">${s.contactEmail ? `<a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>` : ""}${s.contactPhone ? ` · <a href="tel:${esc(s.contactPhone.replace(/\s/g, ""))}">${esc(s.contactPhone)}</a>` : ""}</p>` : "";
  return `<footer class="site-footer"><div class="wrap"><div class="ft-stats" id="ftStats" aria-label="${esc(t("ft_stats"))}">
    ${["users", "today", "month", "total"].map((k) => `<div><b data-s="${k}">…</b><span>${t("ft_" + k)}</span></div>`).join("")}</div>
    <p class="ft-slogan">${esc(t("slogan"))}</p>${c}<p class="ft-copy">${esc(t("copyright"))}</p></div></footer>`;
}
// Paparkan statistik footer dan segarkan setiap 60 saat (angka "hari ini" bertukar sendiri selepas 12 tengah malam waktu Malaysia).
let timer;
async function refreshStats() {
  const s = await loadStats(); const f = (v) => (v == null ? "-" : Number(v).toLocaleString("en-MY"));
  document.querySelectorAll("#ftStats [data-s]").forEach((e) => (e.textContent = f(s[e.dataset.s])));
}
export function fillFooterStats() { refreshStats(); if (!timer) timer = setInterval(() => { if (!document.hidden) refreshStats(); }, 60000); }

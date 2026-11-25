// Senarai: kotak pilih (pilih semua / satu-satu), bar tindakan pukal (cetak digabung / ZIP), dan had 6 baris kelihatan (selebihnya scroll).
import { t } from "../i18n.js";
import { esc, toast, setBusy, debounce } from "../util.js";
import { ico } from "./ui.js";
import { bulkPrint, bulkZip } from "./actions.js";

export const bulkBarHtml = () => `<div class="bulkbar" data-bulkbar hidden><span class="bulk-n" data-count></span><div class="inline-actions"><button type="button" class="btn ghost sm" data-b="print">${ico("print")}${t("bulk_print")}</button><button type="button" class="btn primary sm" data-b="zip">${ico("download")}${t("bulk_zip")}</button><button type="button" class="btn ghost sm" data-b="clear">${t("bulk_clear")}</button></div></div>`;
export const chkTh = () => `<th class="chk"><input type="checkbox" data-selall aria-label="${esc(t("select_all"))}"></th>`;
export const chkTd = (key, label) => `<td class="chk"><input type="checkbox" data-sel="${esc(key)}" aria-label="${esc(t("select_row"))} ${esc(label)}"></td>`;

// getVisible/getAll => [{ k, id, doc }]; pilihan kekal walaupun senarai dilukis semula / ditapis / dikemas kini masa nyata.
export function bulkController(ctx, el, getVisible, getAll) {
  const sel = new Set(); const keyOf = (r) => r.k + ":" + r.id;
  function sync() {
    const vis = getVisible(); el.querySelectorAll("[data-sel]").forEach((cb) => (cb.checked = sel.has(cb.dataset.sel)));
    const all = el.querySelector("[data-selall]"); if (all) { const n = vis.filter((r) => sel.has(keyOf(r))).length; all.checked = vis.length > 0 && n === vis.length; all.indeterminate = n > 0 && n < vis.length; }
    const bar = el.querySelector("[data-bulkbar]"); if (bar) { const n = getAll().filter((r) => sel.has(keyOf(r))).length; bar.hidden = n === 0; const c = bar.querySelector("[data-count]"); if (c) c.textContent = t("bulk_selected", { n }); }
  }
  el.addEventListener("change", (e) => {
    const cb = e.target.closest && e.target.closest("[data-sel]"); if (cb) { cb.checked ? sel.add(cb.dataset.sel) : sel.delete(cb.dataset.sel); return sync(); }
    if (e.target.matches && e.target.matches("[data-selall]")) { getVisible().forEach((r) => (e.target.checked ? sel.add(keyOf(r)) : sel.delete(keyOf(r)))); sync(); }
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-b]"); if (!b) return; if (b.dataset.b === "clear") { sel.clear(); return sync(); }
    const items = getAll().filter((r) => sel.has(keyOf(r))); if (!items.length) return; setBusy(b, true); toast(t("bulk_working"));
    try { b.dataset.b === "print" ? await bulkPrint(ctx, items) : await bulkZip(ctx, items); } catch (x) { console.error(x); toast(t("pdf_fail"), "err"); }
    setBusy(b, false);
  });
  return { sync };
}

// Had n baris kelihatan; baris selebihnya dilihat dengan scroll dalam kotak (pengepala jadual melekat).
export function limitRows(box, n = 6) {
  if (!box) return;
  const apply = () => {
    box.style.maxHeight = ""; box.style.overflowY = "";
    const rows = box.querySelectorAll("tbody tr"); if (rows.length <= n) return;
    const h = rows[n].getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    if (h > 60) { box.style.maxHeight = Math.ceil(h) + "px"; box.style.overflowY = "auto"; }
  };
  box._apply = apply; apply(); requestAnimationFrame(apply); if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
}
if (!window.__lrResize) { window.__lrResize = true; window.addEventListener("resize", debounce(() => document.querySelectorAll(".scrollbox").forEach((b) => b._apply && b._apply()), 150)); }

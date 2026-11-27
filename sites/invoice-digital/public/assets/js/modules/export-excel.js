// Eksport Dashboard ke Excel (.xlsx sebenar, dijana dengan ExcelJS): Ringkasan + Sebut Harga + Invois + Resit + Pelanggan.
// Setiap bahagian ada warna sendiri, nombor dalam format RM, tarikh sebagai tarikh Excel sebenar, baris jumlah guna formula SUM.
import { t, getLang } from "../i18n.js";
import { esc, calc, num, round2, toast, modal, todayMY, yearMY, payOf } from "../util.js";
import { METHODS } from "./receipts.js";

const MONTHS_MS = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const months = () => (getLang() === "en" ? MONTHS_EN : MONTHS_MS);

let xlP;
const loadExcel = () => (xlP ||= new Promise((res, rej) => {
  if (window.ExcelJS) return res(window.ExcelJS);
  const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
  s.onload = () => res(window.ExcelJS); s.onerror = () => { xlP = null; rej(new Error("ExcelJS")); }; document.head.append(s);
}));

// Tetingkap pilihan tempoh: Tahun + Bulan (atau semua bulan)
export function openExport(ctx, data) {
  const years = new Set([+yearMY()]); [...data.quotations, ...data.invoices, ...data.receipts].forEach((d) => { const y = +(d.date || "").slice(0, 4); if (y > 2000) years.add(y); });
  const ys = [...years].sort((a, b) => b - a), curM = +todayMY().slice(5, 7);
  const body = document.createElement("div"); body.className = "form xl-form";
  body.innerHTML = `<p class="muted">${t("xl_desc")}</p><div class="grid2">
    <label>${t("xl_year")}<select name="y">${ys.map((y) => `<option value="${y}">${y}</option>`).join("")}</select></label>
    <label>${t("xl_month")}<select name="m"><option value="0">${t("xl_all_months")}</option>${months().map((m, i) => `<option value="${i + 1}" ${i + 1 === curM ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label></div>`;
  return modal({ title: t("xl_title"), body, actions: [{ label: t("cancel"), cls: "ghost" }, { label: t("xl_btn"), cls: "primary", onClick: async (ov) => {
    const btn = ov.querySelector(".modal-f .primary"); btn.disabled = true; btn.classList.add("busy");
    try { await exportExcel(ctx, data, +body.querySelector("[name=y]").value, +body.querySelector("[name=m]").value); toast(t("xl_done")); }
    catch (e) { console.error(e); toast(t("xl_fail"), "err"); btn.disabled = false; btn.classList.remove("busy"); return false; }
  } }] });
}

// Palet setiap bahagian (ARGB)
const C = {
  navy: "FF1E293B", white: "FFFFFFFF", line: "FFE2E8F0", zebra: "FFF8FAFC", grey: "FF64748B",
  sum: { head: "FF2563EB", soft: "FFEFF6FF" }, quo: { head: "FF2563EB", soft: "FFEFF6FF" }, inv: { head: "FF7C3AED", soft: "FFF5F3FF" },
  rec: { head: "FF059669", soft: "FFECFDF5" }, cus: { head: "FF0891B2", soft: "FFECFEFF" }, warn: { head: "FFEA580C", soft: "FFFFF7ED" },
};
const RM = '"RM" #,##0.00';
const toDate = (s) => { const [y, m, d] = (s || "").split("-").map(Number); return y ? new Date(Date.UTC(y, m - 1, d)) : null; };

// Imej (data URL apa jua format) -> PNG base64 + saiz asal, untuk dimasukkan ke Excel
function toPng(src) {
  return new Promise((res) => {
    if (!src || !/^data:image\//.test(src)) return res(null);
    const im = new Image(); im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); res({ base64: c.toDataURL("image/png"), w: im.naturalWidth, h: im.naturalHeight }); } catch { res(null); } };
    im.onerror = () => res(null); im.src = src;
  });
}

export async function exportExcel(ctx, data, year, month) {
  const ExcelJS = await loadExcel(); const company = await ctx.getCompany().catch(() => ({})) || {};
  const inP = (d) => { const s = d.date || ""; return s.startsWith(String(year)) && (!month || +s.slice(5, 7) === month); };
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const quo = data.quotations.filter(inP).sort(byDate), inv = data.invoices.filter(inP).sort(byDate), rec = data.receipts.filter(inP).sort(byDate);
  const liveInv = inv.filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const ic = liveInv.map((i) => calc(i));
  const totalValue = round2(ic.reduce((s, c) => s + c.total, 0)), outstanding = round2(ic.reduce((s, c) => s + c.balance, 0));
  const received = round2(rec.reduce((s, r) => s + num(r.amount), 0));
  const custKey = (c) => ((c && c.name) || "").trim().toLowerCase() + "|" + ((c && c.phone) || "").replace(/\D/g, "");
  const custMap = new Map();
  [...quo, ...inv].forEach((d) => { const k = custKey(d.customer); if (!k || k === "|") return; const e = custMap.get(k) || { c: d.customer, docs: 0, value: 0 }; e.docs++; if (inv.includes(d) && d.status !== "cancelled" && d.status !== "draft") e.value += calc(d).total; custMap.set(k, e); });
  const period = month ? `${months()[month - 1]} ${year}` : `${t("xl_year")} ${year}`;
  const logo = await toPng(company.avatar || company.logo);

  const wb = new ExcelJS.Workbook(); wb.creator = "Invoice Digital & Quotation - Genius Digital"; wb.created = new Date();
  const logoId = logo ? wb.addImage({ base64: logo.base64, extension: "png" }) : null;
  const font = (o = {}) => ({ name: "Calibri", size: 11, color: { argb: C.navy }, ...o });
  const thin = { style: "thin", color: { argb: C.line } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
  const gap = (ws, r, h = 12) => { ws.getRow(r).height = h; }; // baris kosong pemisah antara bahagian
  const merged = (ws, r, c1, c2, value, f, extra = {}) => { ws.mergeCells(r, c1, r, c2); const cell = ws.getCell(r, c1); cell.value = value; cell.font = f; cell.alignment = { vertical: "middle", ...extra }; return cell; };
  const colWidthPx = (ws, c) => Math.round((ws.getColumn(c).width || 10) * 6.6); // anggaran konservatif (Excel & LibreOffice)

  // KEPALA SYARIKAT: maklumat di kiri, logo/foto profil di KANAN ATAS. Kemudian jalur warna, ruang, tajuk laporan, ruang.
  const header = (ws, title, cols, color, widths) => {
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    const textTo = Math.max(cols - 2, 2); // lajur teks; 2 lajur terakhir untuk logo
    const bankTxt = (company.bank || "").split(/\n+/).map((x) => x.trim()).filter(Boolean).join("  ·  ");
    const lines = [
      [(company.name || "Genius Digital").toUpperCase(), font({ size: 16, bold: true })],
      company.regNo ? [`${t("pdf_regno")}: ${company.regNo}`, font({ size: 10, bold: true })] : null,
      company.address ? [company.address.replace(/\s*\n\s*/g, ", "), font({ size: 10, color: { argb: C.grey } })] : null,
      (company.phone || company.email) ? [[company.phone ? `${t("pdf_tel")} ${company.phone}` : "", company.email ? `${t("f_email")}: ${company.email}` : ""].filter(Boolean).join("    |    "), font({ size: 10 })] : null,
      company.website ? [`${t("f_website")}: ${company.website}`, font({ size: 10 })] : null,
      bankTxt ? [`${t("pdf_bank")}: ${bankTxt}`, font({ size: 10, bold: true, color: { argb: color } })] : null,
    ].filter(Boolean);
    let chars = 0; for (let c = 1; c <= textTo; c++) chars += ws.getColumn(c).width || 10; // anggaran aksara muat sebaris
    let r = 1; lines.forEach(([v, f], i) => { merged(ws, r, 1, textTo, v, f, { indent: 1, wrapText: true, vertical: "top" }); const n = Math.max(1, Math.ceil(String(v).length / Math.max(chars * (i === 0 ? 0.6 : 1.05), 10))); ws.getRow(r).height = (i === 0 ? 26 : 15) * n + 2; r++; });
    while (r < 6) { ws.getRow(r).height = 17; r++; } // ruang minimum untuk logo
    if (logoId != null) {
      const boxW = Math.round((colWidthPx(ws, cols - 1) + colWidthPx(ws, cols)) * 0.82), boxH = 80; const k = Math.min(boxW / logo.w, boxH / logo.h, 1.5);
      const w = Math.round(logo.w * k), h = Math.round(logo.h * k);
      const wa = colWidthPx(ws, cols - 1), wb2 = colWidthPx(ws, cols), off = Math.max(wa + wb2 - w - 8, 0); // dirapatkan ke KANAN dalam dua lajur terakhir
      const col = off < wa ? cols - 2 + off / wa : cols - 1 + Math.min((off - wa) / wb2, 0.9);
      ws.addImage(logoId, { tl: { col, row: 0.2 }, ext: { width: w, height: h }, editAs: "oneCell" });
    }
    for (let c = 1; c <= cols; c++) ws.getCell(r, c).fill = fill(color); ws.getRow(r).height = 5; r++; // jalur warna pemisah
    gap(ws, r++);
    merged(ws, r, 1, cols, `${title}`, font({ size: 13, bold: true, color: { argb: C.white } }), { indent: 1 }); for (let c = 1; c <= cols; c++) ws.getCell(r, c).fill = fill(color); ws.getRow(r).height = 24; r++;
    merged(ws, r, 1, cols, `${t("xl_period")}: ${period}      ${t("xl_generated")}: ${new Date().toLocaleString(getLang() === "en" ? "en-MY" : "ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}`, font({ size: 9, italic: true, color: { argb: C.grey } }), { indent: 1 }); r++;
    gap(ws, r++, 14);
    return r;
  };
  // Jadual: pengepala berwarna sendiri, zebra, sempadan, format RM/tarikh, penapis auto & baris JUMLAH (formula SUM)
  const table = (ws, startRow, cols, rows, color, sumCols = [], freeze = true) => {
    const hr = ws.getRow(startRow); cols.forEach((c, i) => { const cell = hr.getCell(i + 1); cell.value = c.h; cell.font = font({ bold: true, color: { argb: C.white } }); cell.fill = fill(color.head); cell.alignment = { vertical: "middle", horizontal: c.money || c.num ? "right" : c.center ? "center" : "left", wrapText: true }; cell.border = border; });
    hr.height = 24;
    if (!rows.length) { ws.mergeCells(startRow + 1, 1, startRow + 1, cols.length); const e = ws.getCell(startRow + 1, 1); e.value = t("xl_none"); e.font = font({ italic: true, color: { argb: C.grey } }); e.alignment = { horizontal: "center" }; e.border = border; return startRow + 2; }
    rows.forEach((r, ri) => { const row = ws.getRow(startRow + 1 + ri); row.height = 19; cols.forEach((c, i) => { const cell = row.getCell(i + 1); cell.value = r[i] ?? ""; cell.border = border; cell.font = font(); cell.fill = fill(ri % 2 ? C.zebra : C.white); if (c.money) cell.numFmt = RM; if (c.date) cell.numFmt = "dd/mm/yyyy"; cell.alignment = { vertical: "middle", horizontal: c.money || c.num ? "right" : c.center ? "center" : "left", wrapText: !!c.wrap }; }); });
    const last = startRow + rows.length;
    ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: last, column: cols.length } };
    const tr = ws.getRow(last + 1); tr.height = 22;
    cols.forEach((c, i) => { const cell = tr.getCell(i + 1); cell.fill = fill(color.soft); cell.border = { top: { style: "medium", color: { argb: color.head } }, bottom: thin, left: thin, right: thin }; cell.font = font({ bold: true });
      if (i === 0) cell.value = t("xl_total");
      if (sumCols.includes(i)) { const L = ws.getColumn(i + 1).letter; cell.value = { formula: `SUM(${L}${startRow + 1}:${L}${last})`, result: round2(rows.reduce((s, r) => s + num(r[i]), 0)) }; if (c.money) cell.numFmt = RM; cell.alignment = { horizontal: "right" }; } });
    if (freeze) ws.views = [{ state: "frozen", ySplit: startRow, showGridLines: false }];
    return last + 2;
  };
  const pageSetup = (ws, orientation = "landscape") => { ws.pageSetup = { paperSize: 9, orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.25 } }; ws.headerFooter.oddFooter = "&L&8Dijana oleh https://geniusdigital.space&R&8&P / &N"; };
  const sheet = (name, color) => wb.addWorksheet(name, { properties: { tabColor: { argb: color } }, views: [{ showGridLines: false }] });

  // ---------------- 1) Ringkasan
  const s1 = sheet(t("xl_s_summary"), C.sum.head);
  let r = header(s1, t("xl_report"), 6, C.sum.head, [20, 16, 18, 16, 18, 20]);
  // Ringkasan Utama: setiap metrik baris & warna sendiri, dipisahkan garisan
  merged(s1, r, 1, 6, t("xl_metrics"), font({ bold: true, size: 12, color: { argb: C.white } }), { indent: 1 }); for (let c = 1; c <= 6; c++) s1.getCell(r, c).fill = fill(C.navy); s1.getRow(r).height = 24; r++;
  [[t("stat_quotations"), quo.length, C.quo, false], [t("stat_invoices"), inv.length, C.inv, false], [t("stat_receipts"), rec.length, C.rec, false], [t("stat_customers"), custMap.size, C.cus, false],
    [t("stat_value"), totalValue, C.inv, true], [t("stat_received"), received, C.rec, true], [t("stat_outstanding"), outstanding, C.warn, true]].forEach(([label, val, col, money]) => {
    s1.mergeCells(r, 1, r, 4); s1.mergeCells(r, 5, r, 6);
    const a = s1.getCell(r, 1), b = s1.getCell(r, 5);
    a.value = label; a.font = font({ bold: true, color: { argb: col.head } }); a.alignment = { indent: 1, vertical: "middle" };
    b.value = val; b.font = font({ bold: true, size: 13 }); b.alignment = { horizontal: "right", vertical: "middle", indent: 1 }; if (money) b.numFmt = RM;
    for (let c = 1; c <= 6; c++) { const cell = s1.getCell(r, c); cell.fill = fill(col.soft); cell.border = { bottom: { style: "thin", color: { argb: C.white } }, ...(c === 1 ? { left: { style: "thick", color: { argb: col.head } } } : {}) }; }
    s1.getRow(r).height = 26; r++;
  });
  gap(s1, r++, 18); // pemisah antara Ringkasan Utama dan Pecahan Bulanan
  merged(s1, r, 1, 6, t("xl_by_month"), font({ bold: true, size: 12, color: { argb: C.white } }), { indent: 1 }); for (let c = 1; c <= 6; c++) s1.getCell(r, c).fill = fill(C.navy); s1.getRow(r).height = 24; r++;
  gap(s1, r++, 6);
  const mList = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
  const monthRows = mList.map((mm) => {
    const inM = (d) => +(d.date || "").slice(5, 7) === mm; const q = quo.filter(inM), iv = liveInv.filter(inM), rc = rec.filter(inM);
    return [months()[mm - 1], q.length, round2(q.reduce((s, x) => s + calc(x).total, 0)), iv.length, round2(iv.reduce((s, x) => s + calc(x).total, 0)), round2(rc.reduce((s, x) => s + num(x.amount), 0))];
  });
  table(s1, r, [{ h: t("xl_month") }, { h: t("xl_n_quo"), num: true }, { h: t("xl_v_quo"), money: true }, { h: t("xl_n_inv"), num: true }, { h: t("xl_v_inv"), money: true }, { h: t("stat_received"), money: true }], monthRows, C.sum, [1, 2, 3, 4, 5], false);
  s1.views = [{ showGridLines: false }]; pageSetup(s1, "portrait");

  // ---------------- 2) Sebut Harga
  const s2 = sheet(t("nav_quotations"), C.quo.head);
  table(s2, header(s2, t("nav_quotations"), 7, C.quo.head, [7, 18, 14, 26, 16, 22, 18]), [{ h: t("col_index"), num: true }, { h: t("col_docno") }, { h: t("col_date_gen"), date: true, center: true }, { h: t("col_customer") }, { h: t("f_phone") }, { h: t("qe_package") }, { h: t("pdf_total"), money: true }],
    quo.map((q, i) => [i + 1, q.number, toDate(q.date), (q.customer && q.customer.name) || "", (q.customer && q.customer.phone) || "", (q.pkgNames && q.pkgNames[0]) || "", calc(q).total]), C.quo, [6]);
  pageSetup(s2);

  // ---------------- 3) Invois
  const s3 = sheet(t("nav_invoices"), C.inv.head);
  table(s3, header(s3, t("nav_invoices"), 11, C.inv.head, [7, 17, 13, 22, 15, 17, 16, 16, 16, 16, 16]), [{ h: t("col_index"), num: true }, { h: t("col_docno") }, { h: t("col_date_gen"), date: true, center: true }, { h: t("col_customer") }, { h: t("f_phone") }, { h: t("from_quotation") }, { h: t("pdf_total"), money: true }, { h: t("pdf_deposit_paid"), money: true }, { h: t("pdf_paid"), money: true }, { h: t("pdf_balance"), money: true }, { h: t("f_paystatus"), center: true }],
    inv.map((i, k) => { const c = calc(i); return [k + 1, i.number, toDate(i.date), (i.customer && i.customer.name) || "", (i.customer && i.customer.phone) || "", i.fromQuotationNumber || "", c.total, c.depositPaid, c.paidReceipts, c.balance, i.status === "cancelled" ? t("st_cancelled") : t("ps_" + payOf("invoice", i))]; }), C.inv, [6, 7, 8, 9]);
  pageSetup(s3);

  // ---------------- 4) Resit
  const s4 = sheet(t("nav_receipts"), C.rec.head);
  table(s4, header(s4, t("nav_receipts"), 8, C.rec.head, [7, 18, 13, 18, 24, 16, 17, 16]), [{ h: t("col_index"), num: true }, { h: t("col_docno") }, { h: t("col_date_gen"), date: true, center: true }, { h: t("col_invref") }, { h: t("col_customer") }, { h: t("col_method") }, { h: t("col_amount"), money: true }, { h: t("f_paystatus"), center: true }],
    rec.map((x, k) => [k + 1, x.number, toDate(x.date), x.invoiceNumber || "", x.customerName || (x.customer && x.customer.name) || "", METHODS.includes(x.method) ? t("pm_" + x.method) : x.method || "", num(x.amount), t("ps_" + payOf("receipt", x))]), C.rec, [6]);
  pageSetup(s4);

  // ---------------- 5) Pelanggan
  const s5 = sheet(t("nav_customers"), C.cus.head);
  table(s5, header(s5, t("nav_customers"), 8, C.cus.head, [7, 22, 22, 17, 15, 34, 13, 18]), [{ h: t("col_index"), num: true }, { h: t("f_name") }, { h: t("f_company") }, { h: t("f_regno") }, { h: t("f_phone") }, { h: t("f_address"), wrap: true }, { h: t("xl_n_docs"), num: true }, { h: t("stat_value"), money: true }],
    [...custMap.values()].map((e, k) => [k + 1, e.c.name || "", e.c.company || "", e.c.regNo || "", e.c.phone || "", e.c.address || "", e.docs, round2(e.value)]), C.cus, [6, 7]);
  pageSetup(s5);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Laporan-Dashboard-${year}${month ? "-" + String(month).padStart(2, "0") : ""}.xlsx`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

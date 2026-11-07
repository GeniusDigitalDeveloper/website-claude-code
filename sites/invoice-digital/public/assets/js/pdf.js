// Penjana PDF sebenar (vektor, A4) dengan jsPDF + AutoTable: jadual boleh bersambung ke halaman seterusnya,
// pengepala jadual diulang, tiada teks terpotong. 5 templat: classic, modern, minimal, corporate, elegant.
import { t, getLang } from "./i18n.js";
import { calc, money, fmtDate, num, invoiceStatus, quotationStatus } from "./util.js";

const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Gagal muat " + src)); document.head.append(s); });
let libsP;
export function loadPdfLibs() {
  if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
  return (libsP ||= (async () => {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  })());
}

export const TEMPLATES = {
  classic: { font: "helvetica", band: false, center: false, head: "accent", zebra: false, rule: true },
  modern: { font: "helvetica", band: true, center: false, head: "accent", zebra: true, rule: false },
  minimal: { font: "helvetica", band: false, center: false, head: "none", zebra: false, rule: true },
  corporate: { font: "helvetica", band: false, center: false, head: "dark", zebra: true, rule: true, side: true },
  elegant: { font: "times", band: false, center: true, head: "none", zebra: false, rule: true, double: true },
  bold: { font: "helvetica", band: true, bandH: 46, center: false, head: "dark", zebra: true, rule: false },
  ribbon: { font: "helvetica", band: false, center: false, head: "accent", zebra: false, rule: false, pill: true },
  compact: { font: "helvetica", band: false, center: false, head: "none", zebra: false, rule: true, small: true },
};
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); const n = parseInt(m ? m[1] : "2563eb", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const clean = (s) => String(s ?? "").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\u0009\u000A -ÿ€]/g, "?");
const TITLE = { invoice: "pdf_invoice", quotation: "pdf_quotation", receipt: "pdf_receipt" };

export async function buildPdf(type, doc, company = {}, opts = {}) {
  await loadPdfLibs();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const T = TEMPLATES[opts.template] || TEMPLATES[company.template] || TEMPLATES.classic;
  const accent = hex(opts.color || company.color || "#2563eb");
  const dark = [30, 41, 59], grey = [100, 116, 139];
  const W = 210, H = 297, M = 14, side = T.side ? 6 : 0, L = M + side, R = W - M;
  const F = T.font;
  const txt = (s, x, y, o = {}) => pdf.text(clean(s), x, y, o);
  const setC = (c) => pdf.setTextColor(c[0], c[1], c[2]);
  let y = 14;

  if (T.side) { pdf.setFillColor(...accent); pdf.rect(0, 0, 6, H, "F"); }
  const bandH = T.bandH || 34;
  if (T.band) { pdf.setFillColor(...accent); pdf.rect(0, 0, W, bandH, "F"); }

  // --- Pengepala: logo + maklumat syarikat
  let logoW = 0;
  if (company.logo && /^data:image\/(png|jpeg|webp)/.test(company.logo)) {
    try {
      const p = pdf.getImageProperties(company.logo); const h = 18, w = Math.min(46, (p.width / p.height) * h);
      const lx = T.center ? (W - w) / 2 : L; pdf.addImage(company.logo, p.fileType || "PNG", lx, y - 2, w, w / (p.width / p.height) > h ? h : w / (p.width / p.height)); logoW = w;
      if (T.center) y += 20;
    } catch (e) { console.warn("logo", e); }
  }
  const nameX = T.center ? W / 2 : L + (logoW ? logoW + 4 : 0);
  const al = T.center ? { align: "center" } : {};
  pdf.setFont(F, "bold"); pdf.setFontSize(14); setC(T.band ? [255, 255, 255] : dark);
  txt(company.name || "", nameX, y + 4, al);
  pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(T.band ? [235, 245, 255] : grey);
  let cy = y + 9;
  [company.address, [company.phone, company.email].filter(Boolean).join("  |  "), [company.regNo && t("pdf_regno") + ": " + company.regNo, company.website].filter(Boolean).join("  |  ")].forEach((ln) => {
    if (!ln) return; pdf.splitTextToSize(clean(ln), T.center ? 150 : 95).forEach((p) => { txt(p, nameX, cy, al); cy += 4; });
  });
  // Tajuk dokumen
  const title = t(TITLE[type]).toUpperCase();
  pdf.setFont(F, "bold"); pdf.setFontSize(T.center ? 20 : 22); setC(T.band ? [255, 255, 255] : accent);
  if (T.center) { y = Math.max(cy, y + 14) + 4; txt(title, W / 2, y, { align: "center" }); y += 3; }
  else if (T.pill) { pdf.setFillColor(...accent); pdf.roundedRect(R - 52, y - 2, 52, 12, 6, 6, "F"); pdf.setFontSize(13); setC([255, 255, 255]); txt(title, R - 26, y + 6.2, { align: "center" }); y = Math.max(cy, y + 16) + 2; }
  else { txt(title, R, T.band ? bandH / 2 + 4 : y + 6, { align: "right" }); y = Math.max(cy, T.band ? bandH + 4 : y + 14) + 2; }
  if (T.rule) { pdf.setDrawColor(...accent); pdf.setLineWidth(T.double ? 0.2 : 0.5); pdf.line(L, y, R, y); if (T.double) pdf.line(L, y + 1.2, R, y + 1.2); }
  y += 7;

  // --- Meta dokumen + pelanggan
  const status = type === "invoice" ? invoiceStatus(doc) : type === "quotation" ? quotationStatus(doc) : "";
  const meta = type === "receipt"
    ? [[t("pdf_receipt_no"), doc.number], [t("pdf_date"), fmtDate(doc.date, getLang())], [t("pdf_invref"), doc.invoiceNumber || "-"]]
    : [[t(type === "invoice" ? "pdf_invoice_no" : "pdf_quotation_no"), doc.number], [t("pdf_date"), fmtDate(doc.date, getLang())],
       [t(type === "invoice" ? "pdf_due" : "pdf_valid"), fmtDate(type === "invoice" ? doc.dueDate : doc.validUntil, getLang())], [t("pdf_status"), t("st_" + status)]];
  const cust = doc.customer || {};
  pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t(type === "receipt" ? "pdf_received_from" : "pdf_billto").toUpperCase(), L, y);
  pdf.setFont(F, "bold"); pdf.setFontSize(10.5); setC(dark); txt(cust.name || doc.customerName || "-", L, y + 5);
  pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(grey); let by = y + 9.5;
  [cust.company, cust.address, [cust.phone, cust.email].filter(Boolean).join("  |  "), cust.regNo && t("pdf_regno") + ": " + cust.regNo].filter(Boolean)
    .forEach((ln) => pdf.splitTextToSize(clean(ln), 90).forEach((p) => { txt(p, L, by); by += 4; }));
  let my = y;
  meta.forEach(([k, v]) => { pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(grey); txt(k, 124, my); pdf.setFont(F, "bold"); pdf.setFontSize(9); setC(dark); txt(String(v ?? "-"), R, my, { align: "right" }); my += 5.5; });
  y = Math.max(by, my) + 6;

  // --- Resit: kotak jumlah
  if (type === "receipt") {
    pdf.setFillColor(...accent.map((c) => 255 - (255 - c) * 0.1)); pdf.setDrawColor(...accent); pdf.roundedRect(L, y, R - L, 26, 2, 2, "FD");
    pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(grey); txt(t("pdf_amount_paid"), L + 6, y + 8);
    pdf.setFont(F, "bold"); pdf.setFontSize(22); setC(accent); txt(money(doc.amount), L + 6, y + 19);
    pdf.setFontSize(9); setC(dark); pdf.setFont(F, "normal"); txt(t("pdf_method") + ": " + t("pm_" + doc.method), R - 6, y + 9, { align: "right" });
    txt(t("pdf_balance_after") + ": " + money(doc.balanceAfter), R - 6, y + 18, { align: "right" });
    y += 34;
    if (doc.note) { pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t("pdf_note").toUpperCase(), L, y); pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(dark); y += 5; pdf.splitTextToSize(clean(doc.note), R - L).forEach((p) => { txt(p, L, y); y += 4.5; }); }
    footer(); return pdf;
  }

  // --- Jadual item
  const c = calc(doc);
  const head = [["#", t("pdf_desc"), t("pdf_qty"), t("pdf_price"), t("pdf_disc"), t("pdf_amount")]];
  const body = c.items.map((i, k) => [k + 1, clean(i.name + (i.desc ? "\n" + i.desc : "")), num(i.qty), money(i.price).replace("RM ", ""), num(i.discount) ? num(i.discount) + "%" : "-", money(i.amount).replace("RM ", "")]);
  const headFill = T.head === "accent" ? accent : T.head === "dark" ? dark : [255, 255, 255];
  const headText = T.head === "none" ? dark : [255, 255, 255];
  pdf.autoTable({
    startY: y, head, body, theme: "plain", margin: { left: L, right: M, top: 16, bottom: 22 },
    styles: { font: F, fontSize: T.small ? 8 : 9, cellPadding: T.small ? { top: 1.6, bottom: 1.6, left: 2, right: 2 } : { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }, textColor: dark, overflow: "linebreak", lineColor: [226, 232, 240], lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: headFill, textColor: headText, fontStyle: "bold", fontSize: 8.5, lineWidth: T.head === "none" ? { bottom: 0.6 } : 0, lineColor: accent },
    alternateRowStyles: T.zebra ? { fillColor: [247, 249, 252] } : {},
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: "auto" }, 2: { cellWidth: 16, halign: "right" }, 3: { cellWidth: 26, halign: "right" }, 4: { cellWidth: 16, halign: "right" }, 5: { cellWidth: 28, halign: "right" } },
    didParseCell: (d) => { if (d.section === "head" && [2, 3, 4, 5].includes(d.column.index)) d.cell.styles.halign = "right"; if (d.section === "head" && d.column.index === 0) d.cell.styles.halign = "center"; },
    didDrawPage: () => {},
  });
  y = pdf.lastAutoTable.finalY + 6;

  // --- Jumlah
  const rows = [[t("pdf_subtotal"), money(c.subtotal)]];
  if (c.docDiscount) rows.push([t("pdf_discount"), "- " + money(c.docDiscount)]);
  if (c.taxRate) rows.push([`${doc.taxName || t("pdf_tax")} (${c.taxRate}%)`, money(c.tax)]);
  rows.push([t("pdf_total"), money(c.total), true]);
  if (type === "invoice") { if (c.deposit) rows.push([t("pdf_deposit"), "- " + money(c.deposit)]); if (c.paidReceipts) rows.push([t("pdf_paid"), "- " + money(c.paidReceipts)]); if (c.deposit || c.paidReceipts) rows.push([t("pdf_balance"), money(c.balance), true]); }
  const need = rows.length * 6.5 + 8; if (y + need > H - 24) { pdf.addPage(); y = 18; }
  rows.forEach(([k, v, strong]) => {
    if (strong) { pdf.setFillColor(...accent); pdf.roundedRect(118, y - 4.6, R - 118, 7.4, 1.2, 1.2, "F"); pdf.setFont(F, "bold"); pdf.setFontSize(10); setC([255, 255, 255]); }
    else { pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(dark); }
    txt(k, 121, y); txt(v, R - 3, y, { align: "right" }); y += 6.8;
  });
  y += 3;

  // --- Nota, bank, terma
  const block = (label, text) => {
    if (!text) return;
    const lines = pdf.splitTextToSize(clean(text), R - L); const h = 6 + lines.length * 4.2;
    if (y + h > H - 22) { pdf.addPage(); y = 18; }
    pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(label.toUpperCase(), L, y); y += 4.6;
    pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(dark);
    lines.forEach((p) => { if (y > H - 22) { pdf.addPage(); y = 18; } txt(p, L, y); y += 4.2; }); y += 3;
  };
  block(t("pdf_note"), doc.note);
  if (type === "invoice") {
    if (company.bankQr && /^data:image\/(png|jpeg|webp)/.test(company.bankQr) && company.bank !== undefined) {
      // Maklumat bank di kiri, kod QR di kanan (sebelah). Jika ruang tak cukup, pindah ke halaman seterusnya.
      const q = 30, lines = pdf.splitTextToSize(clean(company.bank || ""), R - L - q - 8); const h = Math.max(6 + lines.length * 4.2, q + 12);
      if (y + h > H - 22) { pdf.addPage(); y = 18; }
      pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t("pdf_bank").toUpperCase(), L, y); pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(dark);
      lines.forEach((ln, i) => txt(ln, L, y + 4.6 + i * 4.2));
      try { pdf.addImage(company.bankQr, pdf.getImageProperties(company.bankQr).fileType || "PNG", R - q, y - 1, q, q); } catch (e) { console.warn("qr", e); }
      pdf.setFontSize(7); setC(grey); txt(t("pdf_scan"), R - q / 2, y + q + 3.4, { align: "center" }); y += h + 1;
    } else block(t("pdf_bank"), company.bank);
  }
  block(t("pdf_terms"), doc.terms);
  if (opts.signature !== false) {
    if (y + 26 > H - 20) { pdf.addPage(); y = 18; }
    y += 10; pdf.setDrawColor(...grey); pdf.setLineWidth(0.3); pdf.line(R - 55, y, R, y);
    pdf.setFont(F, "normal"); pdf.setFontSize(8); setC(grey); txt(t("pdf_signature"), R - 27.5, y + 4.5, { align: "center" });
  }
  footer(); return pdf;

  function footer() {
    const n = pdf.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      pdf.setPage(i); pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.2); pdf.line(L, H - 14, R, H - 14);
      pdf.setFont(F, "normal"); pdf.setFontSize(7.5); setC(grey);
      txt(clean(company.name || ""), L, H - 9.5); txt(`${t("pdf_page")} ${i}/${n}`, R, H - 9.5, { align: "right" });
      txt(t("pdf_generated"), W / 2, H - 9.5, { align: "center" });
    }
  }
}

export const pdfBlob = (pdf) => pdf.output("blob");
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export function printPdf(pdf) {
  const url = URL.createObjectURL(pdf.output("blob"));
  if (isIOS()) { window.open(url, "_blank"); return; } // iOS tidak membenarkan print() daripada iframe; pengguna cetak dari pemapar PDF
  const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; f.src = url;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { window.open(url, "_blank"); } setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000); };
  document.body.append(f);
}
export async function sharePdf(pdf, filename, text) {
  const blob = pdf.output("blob"); const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: filename, text }); return "shared"; } catch (e) { if (e.name === "AbortError") return "cancel"; } }
  return "unsupported";
}

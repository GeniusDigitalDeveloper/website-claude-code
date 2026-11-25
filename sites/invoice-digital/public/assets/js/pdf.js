// Penjana PDF sebenar (vektor, A4) dengan jsPDF + AutoTable: jadual boleh bersambung ke halaman seterusnya,
// pengepala jadual diulang, tiada teks terpotong. 8 templat. Untuk invois, sebut harga dan resit.
//
// Susun atur (semua jenis dokumen):
//  - Kanan atas: tajuk dokumen + NOMBOR SIRI (satu baris dengan pengepala).
//  - Kiri atas: logo (pilihan), nama syarikat, NO. PENDAFTARAN (penuh, tepat di bawah nama), alamat, telefon/e-mel.
//  - Di atas garisan footer: KIRI = kod QR (atas) + maklumat bank; KANAN = tandatangan + cop (boleh bertindih).
//    QR/bank/tandatangan/cop semuanya pilihan; jika tiada, kawasan itu dibiarkan kosong.
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
const isImg = (s) => typeof s === "string" && /^data:image\/(png|jpeg|webp)/.test(s);

export async function buildPdf(type, doc, company = {}, opts = {}) {
  await loadPdfLibs();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const T = TEMPLATES[opts.template] || TEMPLATES[company.template] || TEMPLATES.classic;
  const accent = hex(opts.color || company.color || "#2563eb");
  const dark = [30, 41, 59], grey = [100, 116, 139], white = [255, 255, 255];
  const W = 210, H = 297, M = 14, side = T.side ? 6 : 0, L = M + side, R = W - M;
  const F = T.font;
  const txt = (s, x, y, o = {}) => pdf.text(clean(s), x, y, o);
  const setC = (c) => pdf.setTextColor(c[0], c[1], c[2]);
  // Letak imej mengikut nisbah asal dalam kotak maxW x maxH; ax/ay = jangkar (left|center|right / top|middle|bottom)
  const fit = (src, x, y, maxW, maxH, ax = "left", ay = "top") => {
    try {
      const p = pdf.getImageProperties(src); const r = Math.min(maxW / p.width, maxH / p.height); const w = p.width * r, h = p.height * r;
      pdf.addImage(src, p.fileType || "PNG", ax === "center" ? x - w / 2 : ax === "right" ? x - w : x, ay === "bottom" ? y - h : ay === "middle" ? y - h / 2 : y, w, h); return { w, h };
    } catch (e) { console.warn("imej", e); return null; }
  };

  // ---------------- Kawasan bawah (di atas garisan footer): dikira DAHULU supaya kandungan tidak memasukinya
  const bank = (company.bank || "").trim(), hasQr = isImg(company.bankQr), hasSig = isImg(company.signature), hasChop = isImg(company.stamp);
  pdf.setFont(F, "normal"); pdf.setFontSize(8.5);
  const bankLines = bank ? pdf.splitTextToSize(clean(bank), R - L - 78) : [];
  const QR = 28, leftH = (hasQr ? QR + 6 : 0) + (bank ? 6 + bankLines.length * 4.2 : 0), rightH = 38;
  const BOTTOM = H - 19, TOP = BOTTOM - Math.max(leftH, rightH), LIMIT = TOP - 4; // kandungan mesti berhenti sebelum LIMIT
  const bottomBlock = () => {
    let yy = TOP;
    if (hasQr) { fit(company.bankQr, L, yy, QR, QR); pdf.setFont(F, "normal"); pdf.setFontSize(7); setC(grey); txt(t("pdf_scan"), L + QR / 2, yy + QR + 3.2, { align: "center" }); yy += QR + 6; }
    if (bank) { pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t("pdf_bank").toUpperCase(), L, yy + 3); pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(dark); bankLines.forEach((ln, i) => txt(ln, L, yy + 8 + i * 4.2)); }
    // Kanan: tandatangan + cop (cop di bawah, tandatangan di atasnya; bertindih sedikit supaya nampak sah)
    const lineY = BOTTOM - 7, x0 = R - 64;
    const both = hasChop && hasSig;
    if (hasChop) fit(company.stamp, both ? R - 42 : R - 32, lineY + 1, 30, 30, "center", "bottom");
    if (hasSig) fit(company.signature, both ? R - 24 : R - 32, lineY - 1, 44, 20, "center", "bottom");
    pdf.setDrawColor(...grey); pdf.setLineWidth(0.3); pdf.line(x0, lineY, R, lineY);
    pdf.setFont(F, "normal"); pdf.setFontSize(8); setC(grey); txt(t(hasChop ? "pdf_sig_company" : "pdf_signature"), x0 + 32, lineY + 4.4, { align: "center" });
  };

  let y = 14;
  if (T.side) { pdf.setFillColor(...accent); pdf.rect(0, 0, 6, H, "F"); }

  // ---------------- Pengepala kiri: logo + nama syarikat + NO. PENDAFTARAN + alamat + telefon/e-mel
  // Ukur dahulu (supaya jalur berwarna cukup tinggi), kemudian lukis.
  let logoW = 0; const logoSrc = isImg(company.logo) ? company.logo : "";
  if (logoSrc) { try { const p = pdf.getImageProperties(logoSrc); const r = Math.min(46 / p.width, 18 / p.height); logoW = p.width * r; } catch { /* abaikan */ } }
  const nameX = T.center ? W / 2 : L + (logoW ? logoW + 4 : 0);
  const al = T.center ? { align: "center" } : {};
  const maxTxtW = T.center ? 150 : R - nameX - 62; // ruang kiri; kanan dikhaskan untuk tajuk + nombor siri
  const yTop = T.center && logoW ? y + 20 : y;
  pdf.setFont(F, "bold"); pdf.setFontSize(14);
  const nameLines = pdf.splitTextToSize(clean(company.name || ""), maxTxtW);
  const rawLines = [];
  if (company.regNo) rawLines.push({ s: `${t("pdf_regno")}: ${company.regNo}`, bold: true }); // tepat di bawah nama syarikat, ditulis penuh
  if (company.address) rawLines.push({ s: company.address });
  const contact = [company.phone && (t("pdf_tel") + " " + company.phone), company.email].filter(Boolean).join("   |   "); if (contact) rawLines.push({ s: contact });
  if (company.website) rawLines.push({ s: company.website });
  const detail = []; pdf.setFontSize(8.5);
  rawLines.forEach((l) => { pdf.setFont(F, l.bold ? "bold" : "normal"); pdf.splitTextToSize(clean(l.s), maxTxtW).forEach((p) => detail.push({ s: p, bold: l.bold })); });
  const textBottom = yTop + 4 + (nameLines.length - 1) * 6 + 5 + detail.length * 4;
  const bandH = T.band ? Math.max(T.bandH || 34, textBottom + 5, 14 + 20) : 0;
  if (T.band) { pdf.setFillColor(...accent); pdf.rect(0, 0, W, bandH, "F"); }
  if (logoSrc) fit(logoSrc, T.center ? W / 2 : L, y - 2, 46, 18, T.center ? "center" : "left");
  if (T.center && logoW) y += 20;
  pdf.setFont(F, "bold"); pdf.setFontSize(14); setC(T.band ? white : dark);
  nameLines.forEach((ln, i) => txt(ln, nameX, y + 4 + i * 6, al));
  let cy = y + 4 + (nameLines.length - 1) * 6 + 5;
  pdf.setFontSize(8.5); setC(T.band ? [235, 245, 255] : grey);
  detail.forEach((l) => { pdf.setFont(F, l.bold ? "bold" : "normal"); txt(l.s, nameX, cy, al); cy += 4; });

  // ---------------- Pengepala kanan: TAJUK + NOMBOR SIRI (satu baris dengan pengepala)
  const title = t(TITLE[type]).toUpperCase(), serial = String(doc.number || "");
  const y0 = 14;
  if (T.center) {
    y = Math.max(cy, y + 14) + 4; pdf.setFont(F, "bold"); pdf.setFontSize(20); setC(accent); txt(title, W / 2, y, { align: "center" });
    pdf.setFontSize(11); setC(dark); txt(serial, W / 2, y + 7, { align: "center" }); y += 8;
  } else if (T.pill) {
    pdf.setFillColor(...accent); pdf.roundedRect(R - 52, y0 - 2, 52, 12, 6, 6, "F"); pdf.setFont(F, "bold"); pdf.setFontSize(13); setC(white); txt(title, R - 26, y0 + 6.2, { align: "center" });
    pdf.setFontSize(11); setC(dark); txt(serial, R, y0 + 16, { align: "right" }); y = Math.max(cy, y0 + 20) + 2;
  } else {
    const ty = T.band ? bandH / 2 - 2 : y0 + 6; pdf.setFont(F, "bold"); pdf.setFontSize(22); setC(T.band ? white : accent); txt(title, R, ty, { align: "right" });
    pdf.setFontSize(11); setC(T.band ? white : dark); txt(serial, R, ty + 8, { align: "right" });
    y = Math.max(cy, T.band ? bandH + 4 : y0 + 22) + 2;
  }
  if (T.rule) { pdf.setDrawColor(...accent); pdf.setLineWidth(T.double ? 0.2 : 0.5); pdf.line(L, y, R, y); if (T.double) pdf.line(L, y + 1.2, R, y + 1.2); }
  y += 7;

  // ---------------- Pelanggan (kiri) + meta (kanan)
  const status = type === "invoice" ? invoiceStatus(doc) : type === "quotation" ? quotationStatus(doc) : "";
  const meta = type === "receipt"
    ? [[t("pdf_date"), fmtDate(doc.date, getLang())], [t("pdf_invref"), doc.invoiceNumber || "-"], ...(doc.seq ? [[t("pdf_payment_no"), t("pdf_seq", { n: doc.seq })]] : [])]
    : [[t("pdf_date"), fmtDate(doc.date, getLang())], [t(type === "invoice" ? "pdf_due" : "pdf_valid"), fmtDate(type === "invoice" ? doc.dueDate : doc.validUntil, getLang())], [t("pdf_status"), t("st_" + status)]];
  const cust = doc.customer || {};
  pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t(type === "receipt" ? "pdf_received_from" : "pdf_billto").toUpperCase(), L, y);
  pdf.setFont(F, "bold"); pdf.setFontSize(10.5); setC(dark); txt(cust.name || doc.customerName || "-", L, y + 5);
  pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(grey); let by = y + 9.5;
  [cust.company, cust.regNo && `${t("pdf_regno")}: ${cust.regNo}`, cust.address, [cust.phone, cust.email].filter(Boolean).join("   |   ")].filter(Boolean)
    .forEach((ln) => pdf.splitTextToSize(clean(ln), 90).forEach((p) => { txt(p, L, by); by += 4; }));
  let my = y;
  meta.forEach(([k, v]) => { pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(grey); txt(k, 124, my); pdf.setFont(F, "bold"); pdf.setFontSize(9); setC(dark); txt(String(v ?? "-"), R, my, { align: "right" }); my += 5.5; });
  y = Math.max(by, my) + 6;

  // ---------------- Resit
  if (type === "receipt") {
    pdf.setFillColor(...accent.map((c) => 255 - (255 - c) * 0.1)); pdf.setDrawColor(...accent); pdf.roundedRect(L, y, R - L, 26, 2, 2, "FD");
    pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(grey); txt(t("pdf_amount_paid"), L + 6, y + 8);
    pdf.setFont(F, "bold"); pdf.setFontSize(22); setC(accent); txt(money(doc.amount), L + 6, y + 19);
    pdf.setFontSize(9); setC(dark); pdf.setFont(F, "normal"); txt(t("pdf_method") + ": " + t("pm_" + doc.method), R - 6, y + 15, { align: "right" });
    y += 34;
    const rows = [];
    if (doc.invoiceTotal != null) rows.push([t("pdf_invoice_total"), money(doc.invoiceTotal)], [t("pdf_paid_to_date"), money(doc.paidToDate)]);
    rows.push([t("pdf_balance_after"), money(doc.balanceAfter), true]);
    rows.forEach(([k, v, strong]) => {
      if (strong) { pdf.setFillColor(...accent); pdf.roundedRect(104, y - 4.6, R - 104, 7.4, 1.2, 1.2, "F"); pdf.setFont(F, "bold"); pdf.setFontSize(10); setC(white); }
      else { pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(dark); }
      txt(k, 107, y); txt(v, R - 3, y, { align: "right" }); y += 6.8;
    });
    y += 3;
    if (doc.note) { pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(t("pdf_note").toUpperCase(), L, y); pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(dark); y += 5; pdf.splitTextToSize(clean(doc.note), R - L).forEach((p) => { if (y > LIMIT) { pdf.addPage(); y = 18; } txt(p, L, y); y += 4.5; }); }
    if (y > LIMIT) { pdf.addPage(); y = 18; }
    bottomBlock(); footer(); return pdf;
  }

  // ---------------- Jadual item (tidak memasuki kawasan bawah)
  const c = calc(doc);
  const head = [["#", t("pdf_desc"), t("pdf_qty"), t("pdf_price"), t("pdf_disc"), t("pdf_amount")]];
  const body = c.items.map((i, k) => [k + 1, clean(i.name + (i.desc ? "\n" + i.desc : "")), num(i.qty), money(i.price).replace("RM ", ""), num(i.discount) ? num(i.discount) + "%" : "-", money(i.amount).replace("RM ", "")]);
  const headFill = T.head === "accent" ? accent : T.head === "dark" ? dark : white;
  const headText = T.head === "none" ? dark : white;
  pdf.autoTable({
    startY: y, head, body, theme: "plain", margin: { left: L, right: M, top: 16, bottom: H - LIMIT },
    styles: { font: F, fontSize: T.small ? 8 : 9, cellPadding: T.small ? { top: 1.6, bottom: 1.6, left: 2, right: 2 } : { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }, textColor: dark, overflow: "linebreak", lineColor: [226, 232, 240], lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: headFill, textColor: headText, fontStyle: "bold", fontSize: 8.5, lineWidth: T.head === "none" ? { bottom: 0.6 } : 0, lineColor: accent },
    alternateRowStyles: T.zebra ? { fillColor: [247, 249, 252] } : {},
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: "auto" }, 2: { cellWidth: 16, halign: "right" }, 3: { cellWidth: 26, halign: "right" }, 4: { cellWidth: 16, halign: "right" }, 5: { cellWidth: 28, halign: "right" } },
    didParseCell: (d) => { if (d.section === "head" && [2, 3, 4, 5].includes(d.column.index)) d.cell.styles.halign = "right"; if (d.section === "head" && d.column.index === 0) d.cell.styles.halign = "center"; },
  });
  y = pdf.lastAutoTable.finalY + 6;

  // ---------------- Jumlah. Deposit = jumlah diminta (maklumat); Baki = jumlah - semua resit.
  const rows = [[t("pdf_subtotal"), money(c.subtotal)]];
  if (c.docDiscount) rows.push([t("pdf_discount"), "- " + money(c.docDiscount)]);
  if (c.taxRate) rows.push([`${doc.taxName || t("pdf_tax")} (${c.taxRate}%)`, money(c.tax)]);
  rows.push([t("pdf_total"), money(c.total), true]);
  if (type === "invoice") {
    if (c.deposit) rows.push([t("pdf_deposit_due"), money(c.deposit)]);
    if (c.paidReceipts) rows.push([t("pdf_paid"), "- " + money(c.paidReceipts)]);
    if (c.paidReceipts || c.deposit) rows.push([t("pdf_balance"), money(c.balance), true]);
  }
  if (y + rows.length * 6.8 + 4 > LIMIT) { pdf.addPage(); y = 18; }
  rows.forEach(([k, v, strong]) => {
    if (strong) { pdf.setFillColor(...accent); pdf.roundedRect(118, y - 4.6, R - 118, 7.4, 1.2, 1.2, "F"); pdf.setFont(F, "bold"); pdf.setFontSize(10); setC(white); }
    else { pdf.setFont(F, "normal"); pdf.setFontSize(9); setC(dark); }
    txt(k, 121, y); txt(v, R - 3, y, { align: "right" }); y += 6.8;
  });
  y += 3;

  // ---------------- Nota & terma (mengalir; berhenti sebelum kawasan bawah)
  const block = (label, text) => {
    if (!text) return;
    const ls = pdf.splitTextToSize(clean(text), R - L);
    if (y + 11 > LIMIT) { pdf.addPage(); y = 18; }
    pdf.setFont(F, "bold"); pdf.setFontSize(8); setC(accent); txt(label.toUpperCase(), L, y); y += 4.6;
    pdf.setFont(F, "normal"); pdf.setFontSize(8.5); setC(dark);
    ls.forEach((p) => { if (y > LIMIT) { pdf.addPage(); y = 18; } txt(p, L, y); y += 4.2; }); y += 3;
  };
  block(t("pdf_note"), doc.note);
  block(t("pdf_terms"), doc.terms);
  if (y > LIMIT) { pdf.addPage(); y = 18; }
  bottomBlock(); footer(); return pdf;

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

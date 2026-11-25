// Penjana PDF sebenar (vektor, A4) dengan jsPDF + AutoTable: jadual boleh bersambung ke halaman seterusnya,
// pengepala jadual diulang, tiada teks terpotong. 8 templat. Untuk invois, sebut harga dan resit.
//
// Fon: tajuk & teks tebal = Poppins Bold; teks biasa/sub (kelabu) = Montserrat. Dibenamkan dalam PDF (jatuh ke Helvetica jika fail fon gagal dimuat).
// Susun atur (semua jenis dokumen):
//  - Kanan atas: tajuk dokumen + NOMBOR SIRI (hitam, tebal) + TARIKH dokumen.
//  - Kiri atas: logo (pilihan), nama syarikat, NO. PENDAFTARAN (penuh, hitam tebal, tepat di bawah nama), alamat, telefon/e-mel.
//  - Di atas garisan footer: KIRI = kod QR (atas) + maklumat bank; KANAN = tandatangan + cop (boleh bertindih).
//    QR/bank/tandatangan/cop semuanya pilihan; saiz logo/QR/tandatangan/cop boleh dilaraskan (company.*Scale atau doc.imgScale.*).
// Beberapa dokumen boleh digabung dalam satu PDF (opts.pdf) untuk cetak pukal.
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
// Fon TTF (disajikan dari hosting sendiri, dicache oleh service worker) -> base64 untuk jsPDF
let fontsP;
function loadFonts() {
  return (fontsP ||= (async () => {
    try {
      const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u); const b = new Uint8Array(await r.arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
      const [poppins, montserrat] = await Promise.all([get("/assets/fonts/Poppins-Bold.ttf"), get("/assets/fonts/Montserrat-Regular.ttf")]);
      return { poppins, montserrat };
    } catch (e) { console.warn("fon PDF tidak dapat dimuat, guna Helvetica", e); fontsP = null; return null; }
  })());
}
function registerFonts(pdf, f) {
  if (!f) return { head: "helvetica", body: "helvetica" };
  if (!pdf.__fontsReg) { pdf.addFileToVFS("Poppins-Bold.ttf", f.poppins); pdf.addFont("Poppins-Bold.ttf", "Poppins", "bold"); pdf.addFileToVFS("Montserrat-Regular.ttf", f.montserrat); pdf.addFont("Montserrat-Regular.ttf", "Montserrat", "normal"); pdf.__fontsReg = true; }
  return { head: "Poppins", body: "Montserrat" };
}

export const TEMPLATES = {
  classic: { band: false, center: false, head: "accent", zebra: false, rule: true },
  modern: { band: true, center: false, head: "accent", zebra: true, rule: false },
  minimal: { band: false, center: false, head: "none", zebra: false, rule: true },
  corporate: { band: false, center: false, head: "dark", zebra: true, rule: true, side: true },
  elegant: { band: false, center: true, head: "none", zebra: false, rule: true, double: true },
  bold: { band: true, bandH: 46, center: false, head: "dark", zebra: true, rule: false },
  ribbon: { band: false, center: false, head: "accent", zebra: false, rule: false, pill: true },
  compact: { band: false, center: false, head: "none", zebra: false, rule: true, small: true },
};
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); const n = parseInt(m ? m[1] : "2563eb", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const clean = (s) => String(s ?? "").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\u0009\u000A -ÿ€]/g, "?");
const TITLE = { invoice: "pdf_invoice", quotation: "pdf_quotation", receipt: "pdf_receipt" };
const isImg = (s) => typeof s === "string" && /^data:image\/(png|jpeg|webp)/.test(s);
export const SCALE_MIN = 40, SCALE_MAX = 180;

export async function buildPdf(type, doc, company = {}, opts = {}) {
  await loadPdfLibs(); const fonts = await loadFonts();
  const { jsPDF } = window.jspdf;
  const pdf = opts.pdf || new jsPDF({ unit: "mm", format: "a4", compress: true });
  if (opts.pdf) pdf.addPage(); // dokumen seterusnya dalam PDF gabungan bermula pada halaman baharu
  const startPage = pdf.getNumberOfPages();
  const FN = registerFonts(pdf, fonts);
  const T = TEMPLATES[opts.template] || TEMPLATES[company.template] || TEMPLATES.classic;
  const accent = hex(opts.color || company.color || "#2563eb");
  const dark = [30, 41, 59], grey = [100, 116, 139], white = [255, 255, 255], black = [0, 0, 0];
  const W = 210, H = 297, M = 14, side = T.side ? 6 : 0, L = M + side, R = W - M;
  const setB = () => pdf.setFont(FN.head, "bold");   // tajuk & teks tebal: Poppins Bold
  const setN = () => pdf.setFont(FN.body, "normal"); // teks biasa / sub kelabu: Montserrat
  const txt = (s, x, y, o = {}) => pdf.text(clean(s), x, y, o);
  const setC = (c) => pdf.setTextColor(c[0], c[1], c[2]);
  const scale = (k) => { const v = num(doc.imgScale && doc.imgScale[k]) || num(company[k + "Scale"]) || 100; return Math.min(Math.max(v, SCALE_MIN), SCALE_MAX) / 100; };
  // Letak imej mengikut nisbah asal dalam kotak maxW x maxH; ax/ay = jangkar (left|center|right / top|middle|bottom)
  const fit = (src, x, y, maxW, maxH, ax = "left", ay = "top") => {
    try {
      const p = pdf.getImageProperties(src); const r = Math.min(maxW / p.width, maxH / p.height); const w = p.width * r, h = p.height * r;
      pdf.addImage(src, p.fileType || "PNG", ax === "center" ? x - w / 2 : ax === "right" ? x - w : x, ay === "bottom" ? y - h : ay === "middle" ? y - h / 2 : y, w, h); return { w, h };
    } catch (e) { console.warn("imej", e); return null; }
  };

  // ---------------- Kawasan bawah (di atas garisan footer): dikira DAHULU supaya kandungan tidak memasukinya
  // Disusun dari BAWAH ke atas. Perkataan "Tandatangan" (kanan) dan baris TERAKHIR maklumat bank (kiri) berada pada baris (baseline) yang SAMA.
  const bank = (company.bank || "").trim(), hasQr = isImg(company.bankQr), hasSig = isImg(company.signature), hasChop = isImg(company.stamp);
  const sQr = scale("qr"), sSig = scale("sig"), sStamp = scale("stamp"), sLogo = scale("logo");
  const QR = 28 * sQr, sigW = 44 * sSig, sigH = 20 * sSig, stW = 30 * sStamp, stH = 30 * sStamp;
  const lineW = Math.min(Math.max(64, (hasSig ? sigW : 0) + 14, (hasChop ? stW : 0) + 14), 110);
  const BANK_FS = 10.5, BANK_LH = 5.4, LBL_FS = 9.5; // maklumat bank dibesarkan
  setN(); pdf.setFontSize(BANK_FS);
  const bankLines = bank ? pdf.splitTextToSize(clean(bank), Math.max(R - L - lineW - 12, 60)) : [];
  const BOTTOM = H - 19, BASE = BOTTOM - 2.6; // BASE = baseline bersama: "Tandatangan" & baris terakhir bank
  const firstBase = BASE - (bankLines.length - 1) * BANK_LH, labelBase = firstBase - 7;
  const qrTop = (bank ? labelBase - 4 : BASE - 2) - 3.6 - QR; // kod QR di ATAS maklumat bank (kapsyen di bawah QR)
  const leftTop = Math.min(bank ? labelBase - 4 : BASE, hasQr ? qrTop : 1e9);
  const rightH = Math.max(38, Math.max(hasSig ? sigH : 0, hasChop ? stH : 0) + 12);
  const TOP = Math.min(leftTop, BOTTOM - rightH), LIMIT = TOP - 4; // kandungan mesti berhenti sebelum LIMIT
  const bottomBlock = () => {
    if (hasQr) { fit(company.bankQr, L, qrTop, QR, QR); setN(); pdf.setFontSize(7); setC(grey); txt(t("pdf_scan"), L + QR / 2, qrTop + QR + 3.2, { align: "center" }); }
    if (bank) {
      setB(); pdf.setFontSize(LBL_FS); setC(accent); txt(t("pdf_bank"), L, labelBase); // "Maklumat Bank" (penulisan biasa: jarak antara perkataan jelas)
      setN(); pdf.setFontSize(BANK_FS); setC(dark); bankLines.forEach((ln, i) => txt(ln, L, firstBase + i * BANK_LH));
    }
    // Kanan: garisan di atas, perkataan "Tandatangan" pada baseline yang sama dengan baris terakhir bank; tandatangan + cop bertindih di atas garisan
    const lineY = BASE - 4.6, x0 = R - lineW, both = hasChop && hasSig;
    if (hasChop) fit(company.stamp, both ? R - 2 - sigW + stW * 0.35 : R - lineW / 2, lineY + 1, stW, stH, "center", "bottom");
    if (hasSig) fit(company.signature, both ? R - 2 - sigW / 2 : R - lineW / 2, lineY - 1, sigW, sigH, "center", "bottom");
    pdf.setDrawColor(...grey); pdf.setLineWidth(0.3); pdf.line(x0, lineY, R, lineY);
    setN(); pdf.setFontSize(9); setC(grey); txt(t(hasChop ? "pdf_sig_company" : "pdf_signature"), x0 + lineW / 2, BASE, { align: "center" });
  };

  let y = 14;
  if (T.side) { pdf.setFillColor(...accent); pdf.rect(0, 0, 6, H, "F"); }

  // ---------------- Pengepala kiri: logo + nama syarikat + NO. PENDAFTARAN + alamat + telefon/e-mel
  // Ukur dahulu (supaya jalur berwarna cukup tinggi), kemudian lukis.
  let logoW = 0, logoH = 0; const logoSrc = isImg(company.logo) ? company.logo : "";
  if (logoSrc) { try { const p = pdf.getImageProperties(logoSrc); const r = Math.min((46 * sLogo) / p.width, (18 * sLogo) / p.height); logoW = p.width * r; logoH = p.height * r; } catch { /* abaikan */ } }
  const nameX = T.center ? W / 2 : L + (logoW ? logoW + 4 : 0);
  const al = T.center ? { align: "center" } : {};
  const maxTxtW = T.center ? 150 : Math.max(R - nameX - 62, 50); // ruang kiri; kanan dikhaskan untuk tajuk + nombor siri + tarikh
  const yTop = T.center && logoW ? y + logoH + 2 : y;
  setB(); pdf.setFontSize(14);
  const nameLines = pdf.splitTextToSize(clean(company.name || ""), maxTxtW);
  const rawLines = [];
  if (company.regNo) rawLines.push({ s: `${t("pdf_regno")}: ${company.regNo}`, bold: true }); // tepat di bawah nama syarikat, ditulis penuh, hitam tebal
  if (company.address) rawLines.push({ s: company.address });
  // Hubungan: "Tel: nombor" dan garis "|" TEBAL hitam (sama seperti No. Pendaftaran); e-mel teks biasa. Jika tak muat sebaris, e-mel turun baris baharu.
  const contactSegs = []; if (company.phone) contactSegs.push({ s: `${t("pdf_tel")} ${company.phone}`, bold: true }); if (company.phone && company.email) contactSegs.push({ s: "   |   ", bold: true }); if (company.email) contactSegs.push({ s: company.email, bold: false });
  if (contactSegs.length) rawLines.push({ segs: contactSegs });
  if (company.website) rawLines.push({ s: company.website });
  const detail = []; pdf.setFontSize(8.5);
  const segW = (segs) => segs.reduce((w, g) => { g.bold ? setB() : setN(); pdf.setFontSize(8.5); return w + pdf.getTextWidth(clean(g.s)); }, 0);
  // Baris yang jatuh di bawah kawasan tajuk/nombor siri/tarikh (kanan atas) boleh guna lebar penuh; baris di sebelah kawasan itu dihadkan.
  let yy = yTop + 4 + (nameLines.length - 1) * 6 + 5; const widthAt = () => (T.center || yy >= 38 ? Math.max(R - nameX, 50) : maxTxtW); const pushed = (n) => { yy += 4 * n; };
  rawLines.forEach((l) => {
    if (l.segs) { // baris hubungan bersegmen
      if (segW(l.segs) <= widthAt() || l.segs.length === 1) { detail.push({ segs: l.segs }); pushed(1); }
      else { const tel = l.segs.filter((g) => g.bold && g.s.trim() !== "|"), mail = l.segs.filter((g) => !g.bold); if (tel.length) { detail.push({ segs: tel }); pushed(1); } if (mail.length) { detail.push({ segs: mail }); pushed(1); } }
      return;
    }
    l.bold ? setB() : setN(); pdf.splitTextToSize(clean(l.s), widthAt()).forEach((p) => { detail.push({ s: p, bold: l.bold }); pushed(1); });
  });
  const textBottom = yTop + 4 + (nameLines.length - 1) * 6 + 5 + detail.length * 4;
  const bandH = T.band ? Math.max(T.bandH || 34, textBottom + 5, y + logoH + 4) : 0;
  if (T.band) { pdf.setFillColor(...accent); pdf.rect(0, 0, W, bandH, "F"); }
  if (logoSrc) fit(logoSrc, T.center ? W / 2 : L, y - 2, 46 * sLogo, 18 * sLogo, T.center ? "center" : "left");
  if (T.center && logoW) y += logoH + 2;
  setB(); pdf.setFontSize(14); setC(T.band ? white : dark);
  nameLines.forEach((ln, i) => txt(ln, nameX, y + 4 + i * 6, al));
  let cy = y + 4 + (nameLines.length - 1) * 6 + 5;
  pdf.setFontSize(8.5);
  detail.forEach((l) => {
    if (l.segs) { let x = T.center ? nameX - segW(l.segs) / 2 : nameX; l.segs.forEach((g) => { g.bold ? (setB(), setC(T.band ? white : black)) : (setN(), setC(T.band ? [235, 245, 255] : grey)); pdf.setFontSize(8.5); txt(g.s, x, cy); x += pdf.getTextWidth(clean(g.s)); }); cy += 4; return; }
    if (l.bold) { setB(); setC(T.band ? white : black); } else { setN(); setC(T.band ? [235, 245, 255] : grey); } pdf.setFontSize(8.5); txt(l.s, nameX, cy, al); cy += 4;
  });

  // ---------------- Pengepala kanan: TAJUK + NOMBOR SIRI (hitam tebal) + TARIKH (satu baris dengan pengepala)
  const title = t(TITLE[type]).toUpperCase(), serial = String(doc.number || ""), dateTxt = `${t("pdf_date")}: ${fmtDate(doc.date, getLang())}`;
  const y0 = 14;
  const serialAt = (x, yy, align, onBand) => {
    setB(); pdf.setFontSize(11);
    if (onBand) { const w = pdf.getTextWidth(clean(serial)) + 7; pdf.setFillColor(...white); pdf.roundedRect(x - w, yy - 5.2, w, 7.4, 1.6, 1.6, "F"); }
    setC(black); txt(serial, onBand ? x - 3.5 : x, yy, { align: onBand ? "right" : align });
  };
  if (T.center) {
    y = Math.max(cy, y + 14) + 4; setB(); pdf.setFontSize(20); setC(accent); txt(title, W / 2, y, { align: "center" });
    serialAt(W / 2, y + 7.5, "center", false); setN(); pdf.setFontSize(8.5); setC(grey); txt(dateTxt, W / 2, y + 13, { align: "center" }); y += 14;
  } else if (T.pill) {
    pdf.setFillColor(...accent); pdf.roundedRect(R - 52, y0 - 2, 52, 12, 6, 6, "F"); setB(); pdf.setFontSize(13); setC(white); txt(title, R - 26, y0 + 6.2, { align: "center" });
    serialAt(R, y0 + 16, "right", false); setN(); pdf.setFontSize(8.5); setC(grey); txt(dateTxt, R, y0 + 21.5, { align: "right" }); y = Math.max(cy, y0 + 25) + 2;
  } else if (T.band) {
    const ty = bandH / 2 - 5; setB(); pdf.setFontSize(20); setC(white); txt(title, R, ty, { align: "right" });
    serialAt(R, ty + 8.5, "right", true); setN(); pdf.setFontSize(8.5); setC(white); txt(dateTxt, R, ty + 15, { align: "right" }); y = bandH + 4;
  } else {
    const ty = y0 + 6; setB(); pdf.setFontSize(20); setC(accent); txt(title, R, ty, { align: "right" });
    serialAt(R, ty + 8, "right", false); setN(); pdf.setFontSize(8.5); setC(grey); txt(dateTxt, R, ty + 13.5, { align: "right" }); y = Math.max(cy, y0 + 24) + 2;
  }
  if (T.rule) { pdf.setDrawColor(...accent); pdf.setLineWidth(T.double ? 0.2 : 0.5); pdf.line(L, y, R, y); if (T.double) pdf.line(L, y + 1.2, R, y + 1.2); }
  y += 7;

  // ---------------- Pelanggan (kiri) + meta (kanan)
  const status = type === "invoice" ? invoiceStatus(doc) : type === "quotation" ? quotationStatus(doc) : "";
  const meta = type === "receipt"
    ? [[t("pdf_invref"), doc.invoiceNumber || "-"], ...(doc.seq ? [[t("pdf_payment_no"), t("pdf_seq", { n: doc.seq })]] : [])]
    : [[t(type === "invoice" ? "pdf_due" : "pdf_valid"), fmtDate(type === "invoice" ? doc.dueDate : doc.validUntil, getLang())], [t("pdf_status"), t("st_" + status)]];
  const cust = doc.customer || {};
  setB(); pdf.setFontSize(9); setC(accent); txt(t("pdf_billto"), L, y);
  setB(); pdf.setFontSize(10.5); setC(dark); txt(cust.name || doc.customerName || "-", L, y + 5);
  setN(); pdf.setFontSize(8.5); setC(grey); let by = y + 9.5;
  [cust.company, cust.regNo && `${t("pdf_regno")}: ${cust.regNo}`, cust.address, [cust.phone, cust.email].filter(Boolean).join("   |   ")].filter(Boolean)
    .forEach((ln) => pdf.splitTextToSize(clean(ln), 90).forEach((p) => { txt(p, L, by); by += 4; }));
  let my = y;
  meta.forEach(([k, v]) => { setN(); pdf.setFontSize(8.5); setC(grey); txt(k, 124, my); setB(); pdf.setFontSize(9); setC(dark); txt(String(v ?? "-"), R, my, { align: "right" }); my += 5.5; });
  y = Math.max(by, my) + 6;

  // ---------------- Resit
  if (type === "receipt") {
    pdf.setFillColor(...accent.map((c) => 255 - (255 - c) * 0.1)); pdf.setDrawColor(...accent); pdf.roundedRect(L, y, R - L, 26, 2, 2, "FD");
    setN(); pdf.setFontSize(9); setC(grey); txt(t("pdf_amount_paid"), L + 6, y + 8);
    setB(); pdf.setFontSize(22); setC(accent); txt(money(doc.amount), L + 6, y + 19);
    pdf.setFontSize(9); setC(dark); setN(); txt(t("pdf_method") + ": " + t("pm_" + doc.method), R - 6, y + 15, { align: "right" });
    y += 34;
    const rows = [];
    if (doc.invoiceTotal != null) rows.push([t("pdf_invoice_total"), money(doc.invoiceTotal)], [t("pdf_paid_to_date"), money(doc.paidToDate)]);
    rows.push([t("pdf_balance_after"), money(doc.balanceAfter), true]);
    rows.forEach(([k, v, strong]) => {
      if (strong) { pdf.setFillColor(...accent); pdf.roundedRect(104, y - 4.6, R - 104, 7.4, 1.2, 1.2, "F"); setB(); pdf.setFontSize(10); setC(white); }
      else { setN(); pdf.setFontSize(9); setC(dark); }
      txt(k, 107, y); txt(v, R - 3, y, { align: "right" }); y += 6.8;
    });
    y += 3;
    if (doc.note) { setB(); pdf.setFontSize(9); setC(accent); txt(t("pdf_note"), L, y); setN(); pdf.setFontSize(9); setC(dark); y += 5; pdf.splitTextToSize(clean(doc.note), R - L).forEach((p) => { if (y > LIMIT) { pdf.addPage(); y = 18; } txt(p, L, y); y += 4.5; }); }
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
    styles: { font: FN.body, fontStyle: "normal", fontSize: T.small ? 8 : 9, cellPadding: T.small ? { top: 1.6, bottom: 1.6, left: 2, right: 2 } : { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }, textColor: dark, overflow: "linebreak", lineColor: [226, 232, 240], lineWidth: { bottom: 0.2 } },
    headStyles: { font: FN.head, fillColor: headFill, textColor: headText, fontStyle: "bold", fontSize: 8, lineWidth: T.head === "none" ? { bottom: 0.6 } : 0, lineColor: accent },
    alternateRowStyles: T.zebra ? { fillColor: [247, 249, 252] } : {},
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: "auto" }, 2: { cellWidth: 20, halign: "right" }, 3: { cellWidth: 27, halign: "right" }, 4: { cellWidth: 15, halign: "right" }, 5: { cellWidth: 28, halign: "right" } },
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
    if (strong) { pdf.setFillColor(...accent); pdf.roundedRect(118, y - 4.6, R - 118, 7.4, 1.2, 1.2, "F"); setB(); pdf.setFontSize(10); setC(white); }
    else { setN(); pdf.setFontSize(9); setC(dark); }
    txt(k, 121, y); txt(v, R - 3, y, { align: "right" }); y += 6.8;
  });
  y += 3;

  // ---------------- Nota & terma (mengalir; berhenti sebelum kawasan bawah)
  const block = (label, text) => {
    if (!text) return;
    setN(); pdf.setFontSize(8.5); const ls = pdf.splitTextToSize(clean(text), R - L);
    if (y + 11 > LIMIT) { pdf.addPage(); y = 18; }
    setB(); pdf.setFontSize(9); setC(accent); txt(label, L, y); y += 5;
    setN(); pdf.setFontSize(8.5); setC(dark);
    ls.forEach((p) => { if (y > LIMIT) { pdf.addPage(); y = 18; } txt(p, L, y); y += 4.2; }); y += 3;
  };
  block(t("pdf_note"), doc.note);
  block(t("pdf_terms"), doc.terms);
  if (y > LIMIT) { pdf.addPage(); y = 18; }
  bottomBlock(); footer(); return pdf;

  function footer() {
    const n = pdf.getNumberOfPages(), total = n - startPage + 1;
    for (let i = startPage; i <= n; i++) {
      pdf.setPage(i); pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.2); pdf.line(L, H - 14, R, H - 14);
      setN(); pdf.setFontSize(7.5); setC(grey);
      txt(clean(company.name || ""), L, H - 9.5); txt(`${t("pdf_page")} ${i - startPage + 1}/${total}`, R, H - 9.5, { align: "right" });
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
export async function newPdf() { await loadPdfLibs(); const { jsPDF } = window.jspdf; return new jsPDF({ unit: "mm", format: "a4", compress: true }); }

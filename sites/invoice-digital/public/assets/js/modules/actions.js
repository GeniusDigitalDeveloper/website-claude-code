import { buildPdf, printPdf, sharePdf } from "../pdf.js";
import { toast, download } from "../util.js";
import { t, getLang } from "../i18n.js";

export async function makePdf(ctx, type, doc) {
  const company = await ctx.getCompany();
  return buildPdf(type, doc, company, { template: doc.template, color: doc.color });
}
export async function pdfAction(ctx, type, doc, what) {
  try {
    const pdf = await makePdf(ctx, type, doc); const name = `${doc.number}.pdf`;
    if (what === "download") { pdf.save(name); toast(t("pdf_done")); }
    else if (what === "print") printPdf(pdf);
    else if (what === "preview") window.open(URL.createObjectURL(pdf.output("blob")), "_blank");
    else if (what === "share") {
      const r = await sharePdf(pdf, name, `${doc.number}`);
      if (r === "unsupported") { download(pdf.output("blob"), name); const msg = encodeURIComponent(`${doc.number} - ${(doc.customer && doc.customer.name) || ""}`); toast(t("share_fallback")); window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener"); }
    }
  } catch (e) { console.error(e); toast(t("pdf_fail"), "err"); }
}

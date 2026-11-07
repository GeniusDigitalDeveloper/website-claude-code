import { t, getLang } from "../i18n.js";
import { esc, money, calc, invoiceStatus, yearMY, round2 } from "../util.js";
import { listAll } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, loading } from "./ui.js";

const MONTHS = { ms: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const COLORS = { draft: "#94a3b8", sent: "#3b82f6", unpaid: "#f59e0b", partial: "#8b5cf6", paid: "#10b981", overdue: "#ef4444", cancelled: "#cbd5e1" };

function bars(values, labels, color, fmt) {
  const max = Math.max(...values, 1), W = 520, H = 190, bw = W / values.length;
  return `<svg viewBox="0 0 ${W} ${H + 26}" class="chart" role="img">${[0, 0.5, 1].map((p) => `<line x1="0" x2="${W}" y1="${H - H * p}" y2="${H - H * p}" stroke="#e2e8f0" stroke-width="1"/>`).join("")}
  ${values.map((v, i) => { const h = Math.round((v / max) * (H - 14)); return `<g><rect x="${i * bw + bw * 0.2}" y="${H - h}" width="${bw * 0.6}" height="${h}" rx="4" fill="${color}"><title>${labels[i]}: ${fmt(v)}</title></rect><text x="${i * bw + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="11" fill="#475569">${labels[i]}</text>${v ? `<text x="${i * bw + bw / 2}" y="${H - h - 4}" text-anchor="middle" font-size="10" fill="#334155">${fmt(v, true)}</text>` : ""}</g>`; }).join("")}</svg>`;
}
function donut(counts) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0), total = entries.reduce((s, [, n]) => s + n, 0);
  if (!total) return `<p class="muted center">${t("no_data")}</p>`;
  let a = -90; const R = 62, C = 80;
  const arcs = entries.map(([k, n]) => { const ang = (n / total) * 360, s = a; a += ang; const p = (x) => [C + R * Math.cos((x * Math.PI) / 180), C + R * Math.sin((x * Math.PI) / 180)];
    if (ang >= 359.99) return `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${COLORS[k]}" stroke-width="22"/>`; const [x1, y1] = p(s), [x2, y2] = p(a);
    return `<path d="M${x1} ${y1} A${R} ${R} 0 ${ang > 180 ? 1 : 0} 1 ${x2} ${y2}" fill="none" stroke="${COLORS[k]}" stroke-width="22"><title>${t("st_" + k)}: ${n}</title></path>`; }).join("");
  return `<div class="donut"><svg viewBox="0 0 160 160" role="img" aria-label="${esc(t("chart_status"))}">${arcs}<text x="80" y="76" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a">${total}</text><text x="80" y="95" text-anchor="middle" font-size="11" fill="#64748b">${esc(t("nav_invoices"))}</text></svg>
  <ul class="legend">${entries.map(([k, n]) => `<li><i style="background:${COLORS[k]}"></i>${t("st_" + k)} <b>${n}</b></li>`).join("")}</ul></div>`;
}
export async function render(el, ctx) {
  el.innerHTML = loading(); let inv, quo, rec, cus;
  try { [inv, quo, rec, cus] = await Promise.all(["invoices", "quotations", "receipts", "customers"].map((n) => listAll(ctx.uid, n))); } catch (e) { el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; return; }
  const live = inv.filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const calcs = live.map((i) => ({ i, c: calc(i) }));
  const totalValue = round2(calcs.reduce((s, x) => s + x.c.total, 0)), received = round2(calcs.reduce((s, x) => s + x.c.deposit + x.c.paidReceipts, 0)), outstanding = round2(calcs.reduce((s, x) => s + x.c.balance, 0));
  const year = yearMY(), m = MONTHS[getLang()];
  const byMonthCount = Array(12).fill(0), byMonthVal = Array(12).fill(0), payMonth = Array(12).fill(0);
  live.forEach((i) => { if ((i.date || "").startsWith(year)) { const k = +i.date.slice(5, 7) - 1; byMonthCount[k]++; byMonthVal[k] += calc(i).total; } });
  rec.forEach((r) => { if ((r.date || "").startsWith(year)) payMonth[+r.date.slice(5, 7) - 1] += r.amount; });
  const status = {}; inv.forEach((i) => { const s = invoiceStatus(i); status[s] = (status[s] || 0) + 1; });
  const card = (icon, label, val, cls = "") => `<div class="stat ${cls}"><div class="stat-i">${ico(icon)}</div><div><span>${esc(label)}</span><b>${val}</b></div></div>`;
  const short = (v, compact) => (compact ? (v >= 1000 ? Math.round(v / 100) / 10 + "k" : Math.round(v)) : money(v));
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_dashboard")}</h1><p class="sub">${t("dash_hello", { n: esc(ctx.user.displayName || ctx.user.email || "") })}</p></div><div class="inline-actions"><a class="btn primary" href="#/app/invoices/new">${ico("plus")}${t("invoice_new")}</a><a class="btn ghost" href="#/app/quotations/new">${ico("plus")}${t("quotation_new")}</a></div></div>
  <div class="stats">${card("doc", t("stat_invoices"), inv.length, "c1")}${card("quote", t("stat_quotations"), quo.length, "c2")}${card("receipt", t("stat_receipts"), rec.length, "c3")}${card("users", t("stat_customers"), cus.length, "c4")}
  ${card("chart", t("stat_value"), money(totalValue), "c1")}${card("wallet", t("stat_received"), money(received), "c3")}${card("alert", t("stat_outstanding"), money(outstanding), "c5")}</div>
  <div class="charts"><section class="card"><h2>${t("chart_month")} ${year}</h2>${bars(byMonthCount, m, "#2563eb", (v) => v)}<p class="muted">${t("chart_value")}: ${money(byMonthVal.reduce((a, b) => a + b, 0))}</p></section>
  <section class="card"><h2>${t("chart_payments")} ${year}</h2>${bars(payMonth.map(round2), m, "#06b6d4", short)}</section>
  <section class="card"><h2>${t("chart_status")}</h2>${donut(status)}</section></div>`;
}

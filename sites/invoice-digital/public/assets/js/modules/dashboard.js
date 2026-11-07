import { t, getLang } from "../i18n.js";
import { esc, money, calc, invoiceStatus, quotationStatus, yearMY, round2, fmtDate, toast, confirmBox, debounce, $ } from "../util.js";
import { listSWR } from "../db.js";
import { errMsg } from "../auth.js";
import { ico, loading, badge, empty } from "./ui.js";
import { pdfAction } from "./actions.js";
import { deleteProject, confirmKey } from "./projects.js";

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
  // Rangka serta-merta (tidak menunggu data)
  const ph = ["doc", "quote", "receipt", "users", "chart", "wallet", "alert"].map((i, k) => `<div class="stat c${(k % 5) + 1}"><div class="stat-i">${ico(i)}</div><div><span>&nbsp;</span><b class="skel">…</b></div></div>`).join("");
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_dashboard")}</h1><p class="sub">${t("dash_hello", { n: esc(ctx.user.displayName || ctx.user.email || "") })}</p></div><div class="inline-actions"><a class="btn primary" href="#/app/invoices/new">${ico("plus")}${t("invoice_new")}</a><a class="btn ghost" href="#/app/quotations/new">${ico("plus")}${t("quotation_new")}</a></div></div><div class="stats">${ph}</div>`;
  const names = ["invoices", "quotations", "receipts", "customers"]; const data = {}; const ui = { q: "", tf: "", limit: 12 };
  const rowsAll = () => [...(data.invoices || []).map((x) => ({ ...x, k: "invoice", route: "invoices", st: invoiceStatus(x), amt: calc(x).total })), ...(data.quotations || []).map((x) => ({ ...x, k: "quotation", route: "quotations", st: quotationStatus(x), amt: calc(x).total })), ...(data.receipts || []).map((x) => ({ ...x, k: "receipt", route: "receipts", st: "", amt: x.amount }))]
    .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 9e12) - ((a.createdAt && a.createdAt.seconds) || 9e12));
  function drawProjects() {
    const box = $("#plist", el); if (!box) return; const all = rowsAll(); const q = ui.q.toLowerCase();
    const list = all.filter((r) => (!ui.tf || r.k === ui.tf) && (!q || [r.number, r.invoiceNumber, r.customer && r.customer.name, r.customerName].join(" ").toLowerCase().includes(q)));
    $("#pcount", el).textContent = t("proj_count", { n: list.length });
    const shown = list.slice(0, ui.limit);
    box.innerHTML = shown.length ? `<table class="tbl"><thead><tr><th>${t("f_type")}</th><th>${t("col_number")}</th><th>${t("col_customer")}</th><th>${t("col_date")}</th><th class="r">${t("col_total")}</th><th>${t("f_status")}</th><th></th></tr></thead><tbody>${shown.map((r) => `<tr>
      <td data-l="${t("f_type")}"><span class="badge b-k-${r.k}">${t("nav_" + r.route)}</span></td>
      <td data-l="${t("col_number")}">${r.k === "receipt" ? `<b>${esc(r.number)}</b>` : `<a href="#/app/${r.route}/${r.id}"><b>${esc(r.number)}</b></a>`}</td>
      <td data-l="${t("col_customer")}">${esc((r.customer && r.customer.name) || r.customerName || "-")}</td><td data-l="${t("col_date")}">${fmtDate(r.date, getLang())}</td>
      <td class="r" data-l="${t("col_total")}"><b>${money(r.amt)}</b></td><td data-l="${t("f_status")}">${r.st ? badge(r.st) : ""}</td>
      <td class="acts">${r.k !== "receipt" ? `<button class="icon-btn" data-a="edit" data-k="${r.k}" data-id="${r.id}" aria-label="${t("act_continue")}" title="${t("act_continue")}">${ico("edit")}</button>` : ""}<button class="icon-btn" data-a="download" data-k="${r.k}" data-id="${r.id}" aria-label="${t("act_download")}" title="${t("act_download")}">${ico("download")}</button><button class="icon-btn" data-a="print" data-k="${r.k}" data-id="${r.id}" aria-label="${t("act_print")}" title="${t("act_print")}">${ico("print")}</button><button class="icon-btn danger" data-a="del" data-k="${r.k}" data-id="${r.id}" aria-label="${t("delete")}" title="${t("delete")}">${ico("trash")}</button></td></tr>`).join("")}</tbody></table>${list.length > ui.limit ? `<div class="center"><button class="btn ghost" id="pmore">${t("proj_more")} (${list.length - ui.limit})</button></div>` : ""}` : empty("doc", t("proj_empty"), `<a class="btn primary" href="#/app/invoices/new">${t("invoice_new")}</a>`);
    const more = $("#pmore", el); if (more) more.onclick = () => { ui.limit += 12; drawProjects(); };
  }
  async function onProjAction(e) {
    const b = e.target.closest("[data-a]"); if (!b) return; const r = rowsAll().find((x) => x.id === b.dataset.id && x.k === b.dataset.k); if (!r) return;
    if (b.dataset.a === "edit") return (location.hash = `#/app/${r.route}/${r.id}/edit`);
    if (b.dataset.a === "download" || b.dataset.a === "print") return pdfAction(ctx, r.k, r, b.dataset.a);
    if (b.dataset.a === "del") {
      if (!(await confirmBox(t("delete"), t(confirmKey(r.k), { n: r.number }), t("delete")))) return;
      try { await deleteProject(ctx, r.k, r); toast(t("deleted")); load(true); } catch (x) { console.error(x); toast(errMsg(x), "err"); }
    }
  }
  const load = (fresh) => Promise.all(names.map((n) => listSWR(ctx.uid, n, onData(n)))).catch((e) => { if (!data.invoices) el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; });
  const onData = (n) => (rows) => { data[n] = rows; if (names.every((k) => data[k])) paint(data.invoices, data.quotations, data.receipts, data.customers); };
  await load();
  function paint(inv, quo, rec, cus) {
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
  <section class="card" id="proj"><div class="row-between"><div><h2>${t("proj_title")}</h2><p class="muted">${t("proj_sub")}</p></div><span class="muted" id="pcount"></span></div>
   <div class="toolbar"><div class="search">${ico("search")}<input id="pq" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}" value="${esc(ui.q)}"></div>
   <select id="pt" aria-label="${esc(t("f_type"))}"><option value="">${t("all_types")}</option><option value="invoice">${t("nav_invoices")}</option><option value="quotation">${t("nav_quotations")}</option><option value="receipt">${t("nav_receipts")}</option></select></div><div id="plist"></div></section>
  <div class="charts"><section class="card"><h2>${t("chart_month")} ${year}</h2>${bars(byMonthCount, m, "#2563eb", (v) => v)}<p class="muted">${t("chart_value")}: ${money(byMonthVal.reduce((a, b) => a + b, 0))}</p></section>
  <section class="card"><h2>${t("chart_payments")} ${year}</h2>${bars(payMonth.map(round2), m, "#06b6d4", short)}</section>
  <section class="card"><h2>${t("chart_status")}</h2>${donut(status)}</section></div>`;
  $("#pt", el).value = ui.tf; $("#pq", el).oninput = debounce((e) => { ui.q = e.target.value; ui.limit = 12; drawProjects(); }, 150); $("#pt", el).onchange = (e) => { ui.tf = e.target.value; ui.limit = 12; drawProjects(); };
  $("#proj", el).onclick = onProjAction; drawProjects();
  }
}

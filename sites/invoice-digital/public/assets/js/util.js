// Utiliti: DOM, format, masa Malaysia, kiraan dokumen.
export const TZ = "Asia/Kuala_Lumpur";
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n) => "RM " + round2(num(n)).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Tarikh/masa Malaysia (UTC+8) — tidak bergantung pada zon masa peranti.
function partsMY(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const o = {}; p.forEach((x) => (o[x.type] = x.value)); return o;
}
export const todayMY = (d) => { const p = partsMY(d); return `${p.year}-${p.month}-${p.day}`; };
export const monthMY = (d) => todayMY(d).slice(0, 7);
export const yearMY = (d) => todayMY(d).slice(0, 4);
export const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const fmtDate = (iso, lang = "ms") => {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat(lang === "ms" ? "ms-MY" : "en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(d);
};
export const fmtTs = (ts, lang = "ms") => {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat(lang === "ms" ? "ms-MY" : "en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(d);
};

// Kiraan jumlah dokumen
export function calc(doc) {
  const items = (doc.items || []).map((i) => {
    const gross = num(i.qty) * num(i.price);
    const disc = gross * (Math.min(Math.max(num(i.discount), 0), 100) / 100);
    return { ...i, amount: round2(gross - disc) };
  });
  const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
  const docDiscount = round2(Math.min(Math.max(num(doc.docDiscount), 0), subtotal));
  const taxable = round2(subtotal - docDiscount);
  const taxRate = Math.max(num(doc.taxRate), 0);
  const tax = round2(taxable * taxRate / 100);
  const total = round2(taxable + tax);
  const deposit = round2(Math.max(num(doc.deposit), 0));
  const paidReceipts = round2(num(doc.receiptsPaid));
  const balance = round2(Math.max(total - deposit - paidReceipts, 0));
  return { items, subtotal, docDiscount, taxable, tax, taxRate, total, deposit, paidReceipts, balance };
}

// Status invoice berkesan: Overdue ditentukan dari tarikh akhir + baki
export function invoiceStatus(inv) {
  const st = inv.status || "draft";
  if (["draft", "paid", "cancelled"].includes(st)) return st;
  const c = calc(inv);
  if (c.balance > 0.004 && inv.dueDate && inv.dueDate < todayMY()) return "overdue";
  return st;
}
export function quotationStatus(q) {
  const st = q.status || "draft";
  if (["sent", "draft"].includes(st) && q.validUntil && q.validUntil < todayMY() && st !== "draft") return "expired";
  return st;
}

export function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// Toast & modal
export function toast(msg, type = "ok") {
  let box = $("#toasts"); if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  const t = document.createElement("div"); t.className = "toast " + type; t.textContent = msg; box.append(t);
  setTimeout(() => t.classList.add("out"), 3600); setTimeout(() => t.remove(), 4000);
}
export function modal({ title, body, actions = [], wide = false }) {
  return new Promise((resolve) => {
    const ov = document.createElement("div"); ov.className = "overlay";
    ov.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="Tutup">&times;</button></div><div class="modal-b"></div><div class="modal-f"></div></div>`;
    const b = $(".modal-b", ov); typeof body === "string" ? (b.innerHTML = body) : b.append(body);
    const f = $(".modal-f", ov);
    const close = (v) => { ov.remove(); document.removeEventListener("keydown", esck); resolve(v); };
    const esck = (e) => e.key === "Escape" && close(null);
    document.addEventListener("keydown", esck);
    actions.forEach((a) => { const bt = document.createElement("button"); bt.className = "btn " + (a.cls || "ghost"); bt.textContent = a.label; bt.onclick = async () => { if (a.onClick) { const r = await a.onClick(ov); if (r === false) return; close(r ?? a.value); } else close(a.value); }; f.append(bt); });
    $("[data-x]", ov).onclick = () => close(null);
    ov.addEventListener("mousedown", (e) => e.target === ov && close(null));
    document.body.append(ov); const first = $("input,select,textarea,button.btn", ov); first && first.focus();
  });
}
export const confirmBox = (title, msg, ok = "OK", cancel = "Batal") => modal({ title, body: `<p>${esc(msg)}</p>`, actions: [{ label: cancel, value: false }, { label: ok, cls: "primary", value: true }] }).then(Boolean);

export function setBusy(btn, busy) { if (!btn) return; btn.disabled = busy; btn.classList.toggle("busy", busy); }
export function readFileAsDataURL(file, maxW = 400, q = 0.85) {
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = () => rej(new Error("Gagal baca fail"));
    fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error("Imej tidak sah")); im.onload = () => {
      const s = Math.min(1, maxW / im.width); const c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      const x = c.getContext("2d"); x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", q)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
export const isHttps = (u) => !u || /^https:\/\//i.test(u);
export const download = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

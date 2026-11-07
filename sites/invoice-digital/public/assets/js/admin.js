// Panel admin: kebenaran admin disahkan oleh custom claim `admin: true` (Firebase Auth) dan dikuatkuasakan oleh Firestore Security Rules.
// Menyembunyikan UI TIDAK mencukupi; semua bacaan/tulisan admin ditolak oleh pelayan jika claim tiada.
import { t, L, getLang, applyI18n, langSwitcher } from "./i18n.js";
import { $, $$, esc, toast, setBusy, modal, confirmBox, fmtTs, fmtDate, money, calc, todayMY, addDays, readFileAsDataURL, debounce, num, invoiceStatus, quotationStatus } from "./util.js";
import { auth, db, F } from "./firebase.js";
import { onUser, signIn, signOut, errMsg, isAdminUser } from "./auth.js";
import { getAppSettings } from "./db.js";
import { brand } from "./shared.js";
import { ico, empty, loading, badge } from "./modules/ui.js";

const root = $("#root"); const S = { user: null, settings: {}, ready: false };
const NAV = [["dashboard", "chart"], ["users", "users"], ["documents", "doc"], ["content", "globe"], ["system", "gear"], ["logs", "list"]];
const adminLog = async (type, detail = "") => { try { await F.addDoc(F.collection(db, "inv_adminLogs"), { type, detail: String(detail).slice(0, 300), actor: auth.currentUser.uid, actorEmail: auth.currentUser.email || "", at: F.serverTimestamp() }); } catch (e) { console.warn("log", e.code); } };
const count = async (q) => (await F.getCountFromServer(q)).data().count;

function loginView(msg = "") {
  const b = brand(S.settings);
  root.innerHTML = `<div class="auth-page admin-login"><div class="auth-main"><div class="auth-top"><a href="/invoice/" class="back">← ${t("back_site")}</a><div class="lang" id="lang"></div></div>
  <div class="card auth-card"><img src="${esc(b.logo)}" alt="Genius Digital" width="170" height="28" class="al-logo"><h1>${t("admin_login")}</h1><p class="sub">${t("admin_login_sub")}</p>
  <form id="af" class="form" novalidate><label>${t("f_email")}<input name="email" type="email" autocomplete="username" required></label><label>${t("password")}<input name="pw" type="password" autocomplete="current-password" required></label>
  <p class="err" id="err" role="alert">${esc(msg)}</p><button class="btn primary block" type="submit">${ico("shield")}${t("login")}</button></form></div></div></div>`;
  langSwitcher($("#lang")); applyI18n(root);
  $("#af").onsubmit = async (e) => { e.preventDefault(); const f = e.target, btn = $("button[type=submit]", f), err = $("#err"); err.textContent = ""; setBusy(btn, true);
    try { await signIn(f.email.value.trim(), f.pw.value); } catch (x) { err.textContent = errMsg(x); setBusy(btn, false); } };
}

onUser(async (u) => {
  S.settings = await getAppSettings(); document.title = "Admin — " + brand(S.settings).name;
  if (!u) { S.user = null; S.ready = true; return loginView(); }
  let ok = false; try { ok = await isAdminUser(u, true); } catch {}
  if (!ok) { await signOut(); return loginView(t("err_not_admin")); }
  const first = !S.user; S.user = u; S.ready = true;
  if (first && !sessionStorage.getItem("adm_logged")) { sessionStorage.setItem("adm_logged", "1"); adminLog("admin_login", u.email); }
  shell(); go();
});
window.addEventListener("hashchange", () => S.user && go());
window.addEventListener("langchange", () => { if (S.user) { shell(); go(); } else loginView(); });

function shell() {
  const b = brand(S.settings);
  root.innerHTML = `<div class="shell"><aside class="side" id="side"><a href="#/dashboard" class="brand side-brand"><img src="${esc(b.logo)}" alt="Genius Digital" width="150" height="25"></a><div class="side-app">${t("admin_panel")}</div>
  <nav>${NAV.map(([k, i]) => `<a href="#/${k}" data-nav="${k}">${ico(i)}<span>${t("adm_" + k)}</span></a>`).join("")}<a href="/invoice/">${ico("globe")}<span>${t("view_site")}</span></a></nav>
  <div class="side-f"><button class="btn ghost block" id="out">${ico("logout")}${t("logout")}</button></div></aside><div class="scrim" id="scrim"></div>
  <div class="main"><header class="app-top"><button class="icon-btn" id="menuBtn" aria-label="Menu">${ico("menu")}</button><span class="app-top-t">${t("admin_panel")}</span><div class="top-r"><div class="lang" id="lang"></div><div class="who"><span class="avatar">A</span><span class="who-n">${esc(S.user.email)}</span></div></div></header><div class="view" id="view"></div>
  <footer class="site-footer"><div class="wrap"><p class="ft-slogan">${esc(t("slogan"))}</p><p class="ft-copy">${esc(t("copyright"))}</p></div></footer></div></div>`;
  langSwitcher($("#lang")); const side = $("#side"), scrim = $("#scrim"); const tog = (o) => { side.classList.toggle("open", o); scrim.classList.toggle("on", o); };
  $("#menuBtn").onclick = () => tog(!side.classList.contains("open")); scrim.onclick = () => tog(false); side.addEventListener("click", (e) => e.target.closest("a") && tog(false));
  $("#out").onclick = async () => { await adminLog("admin_logout", S.user.email); sessionStorage.removeItem("adm_logged"); await signOut(); };
}
async function go() {
  const page = (location.hash.slice(2).split("/")[0]) || "dashboard"; const v = $("#view"); if (!v) return;
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page)); window.scrollTo(0, 0); v.onclick = null; v.innerHTML = loading();
  try { await ({ dashboard, users, documents, content: () => settingsForm("content"), system: () => settingsForm("system"), logs }[page] || dashboard)(v); } catch (e) { console.error(e); v.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }
}

// ---------------------------------------------------------------- DASHBOARD
async function dashboard(v) {
  const since = F.Timestamp.fromDate(new Date(Date.now() - 30 * 864e5));
  const cg = (n) => F.collectionGroup(db, n);
  const [users, active, inv, quo, rec, cus] = await Promise.all([count(F.collection(db, "inv_users")), count(F.query(F.collection(db, "inv_users"), F.where("lastLoginAt", ">=", since))), count(cg("invoices")), count(cg("quotations")), count(cg("receipts")), count(cg("customers"))]);
  const g = async (c, id) => { const s = await F.getDoc(F.doc(db, c, id)); return s.exists() ? s.data().visits || 0 : 0; };
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayMY(), i - 13));
  const [vt, vm, vtot, ...series] = await Promise.all([g("inv_stats_daily", todayMY()), g("inv_stats_monthly", todayMY().slice(0, 7)), g("inv_stats", "total"), ...days.map((d) => g("inv_stats_daily", d))]);
  const act = await F.getDocs(F.query(F.collection(db, "inv_activity"), F.orderBy("at", "desc"), F.limit(12)));
  const card = (i, l, val, c) => `<div class="stat ${c}"><div class="stat-i">${ico(i)}</div><div><span>${t(l)}</span><b>${Number(val).toLocaleString("en-MY")}</b></div></div>`;
  const max = Math.max(...series, 1);
  v.innerHTML = `<div class="page-h"><div><h1>${t("adm_dashboard")}</h1><p class="sub">${t("adm_dash_sub")}</p></div></div>
  <div class="stats">${card("users", "a_users", users, "c1")}${card("zap", "a_active", active, "c3")}${card("doc", "stat_invoices", inv, "c1")}${card("quote", "stat_quotations", quo, "c2")}${card("receipt", "stat_receipts", rec, "c3")}${card("list", "a_docs", inv + quo + rec, "c4")}${card("users", "stat_customers", cus, "c5")}</div>
  <div class="charts"><section class="card"><h2>${t("a_usage")}</h2><div class="kv"><div><span>${t("ft_today")}</span><b>${vt}</b></div><div><span>${t("ft_month")}</span><b>${vm}</b></div><div><span>${t("ft_total")}</span><b>${vtot}</b></div></div>
   <svg viewBox="0 0 420 120" class="chart" role="img" aria-label="${esc(t("a_usage"))}">${series.map((s, i) => { const h = Math.round((s / max) * 90); return `<rect x="${i * 30 + 5}" y="${100 - h}" width="20" height="${h}" rx="3" fill="#2563eb"><title>${days[i]}: ${s}</title></rect><text x="${i * 30 + 15}" y="115" font-size="8" text-anchor="middle" fill="#64748b">${days[i].slice(8)}</text>`; }).join("")}</svg></section>
  <section class="card"><h2>${t("a_recent")}</h2>${act.empty ? `<p class="muted">${t("no_data")}</p>` : act.docs.map((d) => { const a = d.data(); return `<div class="mini"><span>${esc(t("nav_" + a.kind + "s"))} · <b>${esc(a.number)}</b><br><small>${esc(a.email)} · ${fmtTs(a.at, getLang())}</small></span></div>`; }).join("")}</section></div>`;
}

// ---------------------------------------------------------------- PENGGUNA
async function users(v) {
  const snap = await F.getDocs(F.query(F.collection(db, "inv_users"), F.orderBy("createdAt", "desc"), F.limit(500))); const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  v.innerHTML = `<div class="page-h"><div><h1>${t("adm_users")}</h1><p class="sub">${t("adm_users_sub")}</p></div></div><div class="card"><div class="toolbar"><div class="search">${ico("search")}<input id="q" type="search" placeholder="${esc(t("search_ph"))}" aria-label="${esc(t("search_ph"))}"></div></div><div id="tbl"></div></div>`;
  const draw = () => { const q = $("#q", v).value.toLowerCase(); const list = rows.filter((r) => !q || [r.email, r.displayName].join(" ").toLowerCase().includes(q));
    $("#tbl", v).innerHTML = list.length ? `<table class="tbl"><thead><tr><th>${t("f_name")}</th><th>${t("f_email")}</th><th>${t("a_joined")}</th><th>${t("a_lastlogin")}</th><th>${t("f_status")}</th><th></th></tr></thead><tbody>${list.map((r) => `<tr><td data-l="${t("f_name")}"><b>${esc(r.displayName || "-")}</b></td><td data-l="${t("f_email")}">${esc(r.email)}</td><td data-l="${t("a_joined")}">${fmtTs(r.createdAt, getLang())}</td><td data-l="${t("a_lastlogin")}">${fmtTs(r.lastLoginAt, getLang())}</td><td data-l="${t("f_status")}">${r.disabled ? `<span class="badge b-cancelled">${t("a_disabled")}</span>` : `<span class="badge b-paid">${t("a_enabled")}</span>`}</td>
    <td class="acts"><button class="icon-btn" data-a="view" data-id="${r.id}" aria-label="${t("act_view")}">${ico("eye")}</button><button class="icon-btn ${r.disabled ? "" : "danger"}" data-a="toggle" data-id="${r.id}" aria-label="${t(r.disabled ? "a_enable" : "a_disable")}" title="${t(r.disabled ? "a_enable" : "a_disable")}">${ico(r.disabled ? "check" : "x")}</button></td></tr>`).join("")}</tbody></table>` : empty("users", t("no_data")); };
  draw(); $("#q", v).oninput = debounce(draw, 150);
  v.onclick = async (e) => { const b = e.target.closest("[data-a]"); if (!b) return; const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.a === "view") { const c = (n) => count(F.collection(db, "inv_users", r.id, n)); const [i, q, rc, cu, pr] = await Promise.all(["invoices", "quotations", "receipts", "customers", "products"].map(c));
      modal({ title: r.displayName || r.email, body: `<div class="kv"><div><span>${t("f_email")}</span><b>${esc(r.email)}</b></div><div><span>UID</span><b class="mono">${esc(r.id)}</b></div><div><span>${t("a_joined")}</span><b>${fmtTs(r.createdAt, getLang())}</b></div><div><span>${t("a_lastlogin")}</span><b>${fmtTs(r.lastLoginAt, getLang())}</b></div></div>
      <div class="kv"><div><span>${t("nav_invoices")}</span><b>${i}</b></div><div><span>${t("nav_quotations")}</span><b>${q}</b></div><div><span>${t("nav_receipts")}</span><b>${rc}</b></div><div><span>${t("nav_customers")}</span><b>${cu}</b></div><div><span>${t("nav_products")}</span><b>${pr}</b></div></div>`, actions: [{ label: t("close"), value: null }] }); }
    if (b.dataset.a === "toggle") { const dis = !r.disabled; if (!(await confirmBox(t(dis ? "a_disable" : "a_enable"), t(dis ? "a_confirm_disable" : "a_confirm_enable", { n: r.email }), t("yes")))) return;
      try { await F.updateDoc(F.doc(db, "inv_users", r.id), { disabled: dis, updatedAt: F.serverTimestamp() }); await adminLog(dis ? "user_disabled" : "user_enabled", r.email); r.disabled = dis; toast(t("saved")); draw(); } catch (x) { toast(errMsg(x), "err"); } } };
}

// ---------------------------------------------------------------- DOKUMEN
async function documents(v) {
  const snap = await F.getDocs(F.query(F.collection(db, "inv_users"), F.orderBy("createdAt", "desc"), F.limit(500))); const us = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  v.innerHTML = `<div class="page-h"><div><h1>${t("adm_documents")}</h1><p class="sub">${t("adm_docs_sub")}</p></div></div><div class="card form"><label>${t("a_pick_user")}<select id="u"><option value="">—</option>${us.map((u) => `<option value="${u.id}">${esc(u.email)}${u.displayName ? " — " + esc(u.displayName) : ""}</option>`).join("")}</select></label></div><div id="out"></div>`;
  $("#u", v).onchange = async (e) => { const out = $("#out", v); if (!e.target.value) return (out.innerHTML = ""); out.innerHTML = loading(); const uid = e.target.value;
    try { const get = async (n) => (await F.getDocs(F.query(F.collection(db, "inv_users", uid, n), F.orderBy("createdAt", "desc"), F.limit(100)))).docs.map((d) => ({ id: d.id, ...d.data() }));
      const [inv, quo, rec] = await Promise.all([get("invoices"), get("quotations"), get("receipts")]);
      const all = [...inv.map((x) => ({ ...x, k: "invoice", st: invoiceStatus(x), amt: calc(x).total })), ...quo.map((x) => ({ ...x, k: "quotation", st: quotationStatus(x), amt: calc(x).total })), ...rec.map((x) => ({ ...x, k: "receipt", st: "", amt: x.amount }))];
      out.innerHTML = `<div class="card">${all.length ? `<table class="tbl"><thead><tr><th>${t("f_type")}</th><th>${t("col_number")}</th><th>${t("col_customer")}</th><th>${t("col_date")}</th><th class="r">${t("col_total")}</th><th>${t("f_status")}</th></tr></thead><tbody>${all.map((x) => `<tr><td data-l="${t("f_type")}">${t("nav_" + x.k + "s")}</td><td data-l="${t("col_number")}"><b>${esc(x.number)}</b></td><td data-l="${t("col_customer")}">${esc((x.customer && x.customer.name) || x.customerName || "-")}</td><td data-l="${t("col_date")}">${fmtDate(x.date, getLang())}</td><td class="r" data-l="${t("col_total")}">${money(x.amt)}</td><td data-l="${t("f_status")}">${x.st ? badge(x.st) : ""}</td></tr>`).join("")}</tbody></table>` : empty("doc", t("no_data"))}</div>`;
    } catch (x) { out.innerHTML = `<p class="err">${esc(errMsg(x))}</p>`; } };
}

// ---------------------------------------------------------------- KANDUNGAN & SISTEM
async function settingsForm(kind) {
  const v = $("#view"); const s = await getAppSettings(); let logo = s.logo || ""; const bi = (k) => (s[k] && typeof s[k] === "object" ? s[k] : { ms: s[k] || "", en: "" });
  const pair = (k, label, rows = 0) => { const o = bi(k); const fld = (l) => rows ? `<textarea name="${k}_${l}" rows="${rows}" maxlength="500">${esc(o[l])}</textarea>` : `<input name="${k}_${l}" maxlength="200" value="${esc(o[l])}">`; return `<div class="grid2"><label>${t(label)} (BM)${fld("ms")}</label><label>${t(label)} (EN)${fld("en")}</label></div>`; };
  const nf = s.numberFormat || {};
  v.innerHTML = `<div class="page-h"><div><h1>${t("adm_" + kind)}</h1><p class="sub">${t("adm_" + kind + "_sub")}</p></div></div><form id="f" class="card form" novalidate>${kind === "content" ? `
    ${pair("heroTitle", "a_hero_title")}${pair("heroText", "a_hero_text", 3)}${pair("intro", "a_intro", 3)}${pair("announcement", "a_announce", 2)}
    <div class="grid2"><label>${t("a_contact_email")}<input name="contactEmail" type="email" maxlength="120" value="${esc(s.contactEmail)}"></label><label>${t("a_contact_phone")}<input name="contactPhone" maxlength="30" value="${esc(s.contactPhone)}"></label></div>` : `
    <label>${t("a_appname")}<input name="appName" maxlength="80" value="${esc(s.appName || "Invoice Digital & Quotation")}"></label>
    <div class="logo-row"><div class="logo-prev wide" id="lp">${logo ? `<img alt="Logo" src="${esc(logo)}">` : `<img alt="Logo" src="/assets/img/logo.png">`}</div><div><label class="btn ghost file">${t("upload_logo")}<input type="file" id="lf" accept="image/png,image/jpeg,image/webp" hidden></label> <button type="button" class="btn ghost" id="lrm">${t("a_default_logo")}</button></div></div>
    <h2>${t("a_numbers")}</h2><p class="muted">${t("a_numbers_hint")}</p><div class="grid3"><label>${t("nav_invoices")}<input name="nf_invoice" maxlength="40" value="${esc(nf.invoice || "INV-{YYYY}-{NNNN}")}"></label><label>${t("nav_quotations")}<input name="nf_quotation" maxlength="40" value="${esc(nf.quotation || "QUO-{YYYY}-{NNNN}")}"></label><label>${t("nav_receipts")}<input name="nf_receipt" maxlength="40" value="${esc(nf.receipt || "REC-{YYYY}-{NNNN}")}"></label></div>
    <h2>${t("a_doc_settings")}</h2><div class="grid2"><label>${t("f_taxname")}<input name="taxName" maxlength="20" value="${esc(s.taxName || "SST")}"></label><label>${t("f_tax")} (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value="${num(s.taxRate)}"></label></div>
    <label>${t("pdf_terms")}<textarea name="terms" rows="4" maxlength="2000">${esc(s.terms)}</textarea></label>`}
    <p class="err" id="err" role="alert"></p><div class="form-f"><button class="btn primary" type="submit">${t("save")}</button></div></form>`;
  const f = $("#f", v);
  if (kind === "system") { $("#lf", v).onchange = async (e) => { const file = e.target.files[0]; if (!file) return; try { logo = await readFileAsDataURL(file, 500, 0.85); if (logo.length > 140000) logo = await readFileAsDataURL(file, 320, 0.7); $("#lp", v).innerHTML = `<img alt="Logo" src="${logo}">`; } catch { toast(t("err_file"), "err"); } };
    $("#lrm", v).onclick = () => { logo = ""; $("#lp", v).innerHTML = `<img alt="Logo" src="/assets/img/logo.png">`; }; }
  f.onsubmit = async (e) => { e.preventDefault(); const err = $("#err", v); err.textContent = ""; const btn = $("button[type=submit]", f); const data = {};
    if (kind === "content") { ["heroTitle", "heroText", "intro", "announcement"].forEach((k) => (data[k] = { ms: f[k + "_ms"].value.trim(), en: f[k + "_en"].value.trim() })); data.contactEmail = f.contactEmail.value.trim(); data.contactPhone = f.contactPhone.value.trim(); }
    else { for (const k of ["invoice", "quotation", "receipt"]) { const val = f["nf_" + k].value.trim(); if (!/\{N{2,8}\}/.test(val)) return (err.textContent = t("a_err_format")); } if (logo.length > 150000) return (err.textContent = t("err_file"));
      Object.assign(data, { appName: f.appName.value.trim() || "Invoice Digital & Quotation", logo, numberFormat: { invoice: f.nf_invoice.value.trim(), quotation: f.nf_quotation.value.trim(), receipt: f.nf_receipt.value.trim() }, taxName: f.taxName.value.trim() || "SST", taxRate: num(f.taxRate.value), terms: f.terms.value.trim() }); }
    setBusy(btn, true); try { await F.setDoc(F.doc(db, "inv_settings", "app"), { ...data, updatedAt: F.serverTimestamp() }, { merge: true }); await adminLog("settings_" + kind, Object.keys(data).join(",")); toast(t("saved")); } catch (x) { err.textContent = errMsg(x); } setBusy(btn, false); };
}

// ---------------------------------------------------------------- LOG
async function logs(v) {
  const s = await F.getDocs(F.query(F.collection(db, "inv_adminLogs"), F.orderBy("at", "desc"), F.limit(100)));
  v.innerHTML = `<div class="page-h"><div><h1>${t("adm_logs")}</h1><p class="sub">${t("adm_logs_sub")}</p></div></div><div class="card">${s.empty ? empty("list", t("no_data")) : `<table class="tbl"><thead><tr><th>${t("a_time")}</th><th>${t("a_action")}</th><th>${t("a_detail")}</th><th>${t("a_actor")}</th></tr></thead><tbody>${s.docs.map((d) => { const a = d.data(); return `<tr><td data-l="${t("a_time")}">${fmtTs(a.at, getLang())}</td><td data-l="${t("a_action")}"><b>${esc(a.type)}</b></td><td data-l="${t("a_detail")}">${esc(a.detail)}</td><td data-l="${t("a_actor")}">${esc(a.actorEmail)}</td></tr>`; }).join("")}</tbody></table>`}</div>`;
}

// Panel awam: landing, auth, dan aplikasi (dashboard + modul). Routing berasaskan hash: #/ , #/login , #/app/...
import { t, L, getLang, applyI18n, langSwitcher } from "./i18n.js";
import { $, $$, esc, toast, setBusy } from "./util.js";
import { onUser, signIn, signOut, register, resetPw, googleSignIn, ensureUserDoc, errMsg } from "./auth.js";
import { getAppSettings, getMeta } from "./db.js";
import { trackVisit } from "./stats.js";
import { brand, footerHtml, fillFooterStats } from "./shared.js";
import { ico } from "./modules/ui.js";

const root = $("#root");
const S = { user: null, ready: false, settings: {}, company: null, shell: false };

const ctx = {
  get uid() { return S.user.uid; }, get user() { return S.user; },
  nav: (h) => { location.hash = h; },
  getSettings: async () => S.settings,
  getCompany: async (force) => { if (!S.company || force) S.company = await getMeta(S.user.uid, "company"); return S.company; },
  refreshUser: () => renderShellHeader(),
};

// ---------------------------------------------------------------- ROUTER
const parse = () => { const [p, qs] = (location.hash || "#/").slice(1).split("?"); return { segs: p.split("/").filter(Boolean), q: new URLSearchParams(qs || ""), raw: location.hash || "#/" }; };
async function route() {
  if (!S.ready) return;
  const { segs, q, raw } = parse();
  if (segs[0] === "app") {
    if (!S.user) return ctx.nav("#/login?next=" + encodeURIComponent(raw));
    return renderApp(segs.slice(1), q);
  }
  S.shell = false;
  if (segs[0] === "login" || segs[0] === "register") { if (S.user) return ctx.nav(q.get("next") || "#/app/dashboard"); return renderAuth(segs[0], q); }
  renderLanding();
}
window.addEventListener("hashchange", () => { route(); });
window.addEventListener("langchange", () => { document.title = brand(S.settings).name; S.shell = false; route(); });

// ---------------------------------------------------------------- LANDING
const FEATURES = [["doc", "feat_invoice"], ["quote", "feat_quotation"], ["receipt", "feat_receipt"], ["users", "feat_customer"], ["box", "feat_product"], ["print", "feat_print"], ["download", "feat_pdf"], ["clock", "feat_history"], ["building", "feat_business"]];
function renderLanding() {
  const b = brand(S.settings), st = S.settings;
  const ann = L(st.announcement);
  root.innerHTML = `${ann ? `<div class="announce" role="status">${esc(ann)}</div>` : ""}
  <header class="topbar"><div class="wrap bar"><a href="#/" class="brand" aria-label="${esc(b.name)}"><img src="${esc(b.logo)}" alt="Genius Digital" width="150" height="25"><span class="app-name">${esc(b.name)}</span></a>
   <nav class="menu" id="menu" aria-label="Menu"><a href="#features" data-sc>${t("menu_features")}</a><a href="#guide" data-sc>${t("menu_guide")}</a><a href="#contact" data-sc>${t("menu_contact")}</a></nav>
   <div class="bar-r"><div class="lang" id="lang"></div>${S.user ? `<a class="btn primary sm" href="#/app/dashboard">${t("nav_dashboard")}</a>` : `<a class="btn ghost sm hide-s" href="#/login">${t("login")}</a><a class="btn primary sm" href="#/register">${t("start_now")}</a>`}
   <button class="icon-btn burger" id="burger" aria-label="Menu" aria-expanded="false">${ico("menu")}</button></div></div></header>
  <main>
   <section class="hero"><div class="wrap hero-g"><div class="hero-t"><span class="pill">${ico("zap")}${t("hero_pill")}</span><h1>${esc(L(st.heroTitle, t("hero_title")))}</h1><p>${esc(L(st.heroText, t("hero_text")))}</p>
     <div class="cta"><a class="btn primary lg" href="#/app/invoices/new">${ico("doc")}${t("create_invoice")}</a><a class="btn ghost lg" href="#/app/quotations/new">${ico("quote")}${t("create_quotation")}</a></div>
     <ul class="trust"><li>${ico("check")}${t("trust_1")}</li><li>${ico("check")}${t("trust_2")}</li><li>${ico("check")}${t("trust_3")}</li></ul></div>
    <div class="hero-v"><div class="shot"><img src="/assets/img/banner.jpg" alt="${esc(b.name)}" width="1200" height="675" fetchpriority="high"></div><img class="floaty" src="/assets/img/icon.png" alt="" width="120" height="120"></div></div></section>
   <section id="features" class="sec"><div class="wrap"><div class="sec-h"><h2>${t("features_title")}</h2><p>${esc(L(st.intro, t("features_sub")))}</p></div>
    <div class="feat-g">${FEATURES.map(([i, k]) => `<article class="feat"><div class="feat-i">${ico(i)}</div><h3>${t(k)}</h3><p>${t(k + "_d")}</p></article>`).join("")}</div></div></section>
   <section id="guide" class="sec alt"><div class="wrap"><div class="sec-h"><h2>${t("guide_title")}</h2></div><ol class="steps">${[1, 2, 3, 4].map((n) => `<li><span class="n">${n}</span><h3>${t("guide_" + n)}</h3><p>${t("guide_" + n + "_d")}</p></li>`).join("")}</ol></div></section>
   <section id="contact" class="sec"><div class="wrap cta-box"><div><h2>${t("contact_title")}</h2><p>${t("contact_text")}</p>${st.contactEmail ? `<p><a href="mailto:${esc(st.contactEmail)}">${esc(st.contactEmail)}</a></p>` : ""}${st.contactPhone ? `<p><a href="tel:${esc(st.contactPhone.replace(/\s/g, ""))}">${esc(st.contactPhone)}</a></p>` : ""}</div><a class="btn light lg" href="#/register">${t("start_now")}</a></div></section>
  </main>${footerHtml(st)}`;
  langSwitcher($("#lang")); applyI18n(root); fillFooterStats(root);
  $("#burger").onclick = (e) => { const m = $("#menu"); const o = m.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); };
  $$("[data-sc]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); $("#menu").classList.remove("open"); const el = document.getElementById(a.getAttribute("href").slice(1)); el && el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }));
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- AUTH
function renderAuth(mode, q) {
  const b = brand(S.settings); const isReg = mode === "register";
  root.innerHTML = `<div class="auth-page"><div class="auth-side"><a href="#/" class="brand"><img src="${esc(b.logo)}" alt="Genius Digital" width="170" height="28"></a><h2>${t("auth_side_title")}</h2><p>${t("auth_side_text")}</p><img class="auth-art" src="/assets/img/icon.png" alt="" width="220" height="220"></div>
  <div class="auth-main"><div class="auth-top"><a href="#/" class="back">← ${t("back_home")}</a><div class="lang" id="lang"></div></div>
  <div class="card auth-card"><h1>${isReg ? t("register") : t("login")}</h1><p class="sub">${isReg ? t("register_sub") : t("login_sub")}</p>
   <button class="btn ghost block" id="gbtn" type="button"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>${t("google")}</button>
   <div class="or"><span>${t("or")}</span></div>
   <form id="af" class="form" novalidate>${isReg ? `<label>${t("f_name")}<input name="name" autocomplete="name" maxlength="80" required></label>` : ""}<label>${t("f_email")}<input name="email" type="email" autocomplete="email" required></label>
    <label>${t("password")}<input name="pw" type="password" autocomplete="${isReg ? "new-password" : "current-password"}" minlength="6" required></label>
    <p class="err" id="err" role="alert"></p><button class="btn primary block" type="submit">${isReg ? t("register") : t("login")}</button>
    ${isReg ? "" : `<button class="linkbtn" type="button" id="forgot">${t("forgot")}</button>`}</form>
   <p class="switch">${isReg ? `${t("have_account")} <a href="#/login${q.get("next") ? "?next=" + encodeURIComponent(q.get("next")) : ""}">${t("login")}</a>` : `${t("no_account")} <a href="#/register${q.get("next") ? "?next=" + encodeURIComponent(q.get("next")) : ""}">${t("register")}</a>`}</p></div></div></div>`;
  langSwitcher($("#lang")); applyI18n(root);
  const err = $("#err"); const f = $("#af");
  f.onsubmit = async (e) => {
    e.preventDefault(); err.textContent = ""; const btn = $("button[type=submit]", f);
    const email = f.email.value.trim(), pw = f.pw.value; if (!email || !pw) return (err.textContent = t("err_required")); if (isReg && pw.length < 6) return (err.textContent = t("err_weak"));
    setBusy(btn, true);
    try { if (isReg) await register(f.name.value.trim(), email, pw); else await signIn(email, pw); } catch (x) { err.textContent = errMsg(x); setBusy(btn, false); }
  };
  $("#gbtn").onclick = async (e) => { setBusy(e.currentTarget, true); try { await googleSignIn(); } catch (x) { err.textContent = errMsg(x); setBusy(e.currentTarget, false); } };
  const fg = $("#forgot"); if (fg) fg.onclick = async () => { const email = f.email.value.trim(); if (!email) return (err.textContent = t("err_email")); try { await resetPw(email); toast(t("reset_sent")); } catch (x) { err.textContent = errMsg(x); } };
}

// ---------------------------------------------------------------- APP SHELL
const NAV = [["dashboard", "home"], ["invoices", "doc"], ["quotations", "quote"], ["receipts", "receipt"], ["customers", "users"], ["products", "box"], ["company", "building"], ["history", "clock"], ["settings", "gear"]];
const MOBILE = ["dashboard", "invoices", "quotations", "receipts"];
function renderShell() {
  const b = brand(S.settings);
  root.innerHTML = `<div class="shell"><aside class="side" id="side"><a href="#/" class="brand side-brand"><img src="${esc(b.logo)}" alt="Genius Digital" width="150" height="25"></a><div class="side-app">${esc(b.name)}</div>
   <nav aria-label="Menu utama">${NAV.map(([k, i]) => `<a href="#/app/${k}" data-nav="${k}">${ico(i)}<span>${t("nav_" + k)}</span></a>`).join("")}</nav>
   <div class="side-f"><div class="lang" id="lang"></div><button class="btn ghost block" id="out">${ico("logout")}${t("logout")}</button></div></aside><div class="scrim" id="scrim"></div>
   <div class="main"><header class="app-top"><button class="icon-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">${ico("menu")}</button><span class="app-top-t" id="topT"></span><div class="who" id="who"></div></header>
   <div class="view" id="view"></div>${footerHtml(S.settings)}</div>
   <nav class="bottom" aria-label="Navigasi bawah">${MOBILE.map((k) => `<a href="#/app/${k}" data-nav="${k}">${ico(NAV.find((n) => n[0] === k)[1])}<span>${t("nav_" + k)}</span></a>`).join("")}<button type="button" id="moreBtn">${ico("menu")}<span>${t("more")}</span></button></nav></div>`;
  langSwitcher($("#lang")); fillFooterStats(root); renderShellHeader();
  const side = $("#side"), scrim = $("#scrim");
  const tog = (o) => { side.classList.toggle("open", o); scrim.classList.toggle("on", o); $("#menuBtn").setAttribute("aria-expanded", o); };
  $("#menuBtn").onclick = () => tog(!side.classList.contains("open")); $("#moreBtn").onclick = () => tog(true); scrim.onclick = () => tog(false);
  side.addEventListener("click", (e) => e.target.closest("a") && tog(false));
  $("#out").onclick = async () => { await signOut(); ctx.nav("#/"); };
  S.shell = true;
}
function renderShellHeader() { const w = $("#who"); if (w && S.user) w.innerHTML = `<span class="avatar">${esc((S.user.displayName || S.user.email || "?")[0].toUpperCase())}</span><span class="who-n">${esc(S.user.displayName || S.user.email)}</span>`; }

async function renderApp(segs, q) {
  if (!S.shell || !$("#view")) renderShell();
  const page = segs[0] || "dashboard", sub = segs[1], sub2 = segs[2];
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === page));
  $("#topT").textContent = t("nav_" + page) || ""; const view = $("#view"); view.onclick = null; window.scrollTo(0, 0);
  try {
    if (page === "dashboard") return (await import("./modules/dashboard.js")).render(view, ctx);
    if (page === "invoices" || page === "quotations") {
      const type = page === "invoices" ? "invoice" : "quotation"; const M = await import("./modules/documents.js");
      if (!sub) return M.renderList(view, ctx, type); if (sub === "new") return M.renderEditor(view, ctx, type, null);
      return sub2 === "edit" ? M.renderEditor(view, ctx, type, sub) : M.renderView(view, ctx, type, sub);
    }
    if (page === "receipts") { const M = await import("./modules/receipts.js"); return sub === "new" ? M.renderForm(view, ctx, q) : M.renderList(view, ctx); }
    if (page === "customers") return (await import("./modules/customers.js")).renderList(view, ctx);
    if (page === "products") return (await import("./modules/products.js")).renderList(view, ctx);
    if (page === "company") return (await import("./modules/company.js")).render(view, ctx);
    if (page === "history") return (await import("./modules/history.js")).render(view, ctx);
    if (page === "settings") return (await import("./modules/settings.js")).render(view, ctx);
    ctx.nav("#/app/dashboard");
  } catch (e) { console.error(e); view.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }
}

// ---------------------------------------------------------------- INIT
(async function init() {
  S.settings = await getAppSettings(); document.title = brand(S.settings).name + " — Genius Digital";
  trackVisit();
  onUser(async (u) => {
    if (u) {
      try {
        const r = await ensureUserDoc(u, getLang());
        if (r.disabled) { await signOut(); S.user = null; S.ready = true; toast(t("err_disabled"), "err"); ctx.nav("#/login"); return route(); }
      } catch (e) { console.error(e); toast(errMsg(e), "err"); }
    }
    S.user = u; S.company = null; S.ready = true; route();
  });
})();

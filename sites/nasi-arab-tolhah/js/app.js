/* =========================================================
   Nasi Arab Tolhah — logik laman (vanilla JS)
   Bahasa, menu, troli, checkout, invois, WhatsApp, 3D & animasi
   ========================================================= */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ALL = [...RICE, ...DRINKS];
  const byId = Object.fromEntries(ALL.map((m) => [m.id, m]));
  const imgSrc = (m) => `assets/img/${m.img}.jpg`;

  /* ---------- Storan selamat ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };

  /* ---------- Bahasa ---------- */
  let lang = store.get("nat-lang", "ms");
  if (!I18N[lang]) lang = "ms";
  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.ms[k] ?? k;
  const money = (n) => `${CONFIG.currency}${n.toFixed(2)}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

  function applyConfig() {
    $$("[data-wa]").forEach((a) => (a.href = waLink(t("wa.quick"))));
    $$("[data-phone]").forEach((el) => (el.textContent = CONFIG.phoneDisplay));
    $$("[data-address]").forEach((el) => (el.textContent = CONFIG.address));
    $$("[data-maps]").forEach((a) => (a.href = CONFIG.mapsUrl));
    $$("[data-social]").forEach((a) => (a.href = CONFIG.socials[a.dataset.social].url));
    $$("[data-handle]").forEach((el) => (el.textContent = CONFIG.socials[el.dataset.handle].handle));
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  function applyLang(next, animate) {
    lang = next;
    store.set("nat-lang", lang);
    document.documentElement.lang = lang === "ms" ? "ms" : "en";
    document.title = t("meta.title");
    $$("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
      if (animate && !reduceMotion && el.closest("main, .site-header, .site-footer") && !el.hasAttribute("data-split")) {
        el.animate([{ opacity: 0, transform: "translateX(14px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
    $$("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        el.setAttribute(attr, t(key));
      });
    });
    splitTitle(animate);
    $$(".lang-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    $(".lang").dataset.active = lang;
    applyConfig();
    renderMenus();
    renderCart();
    carousel && carousel.refresh();
    updateTimeLabel();
    if (currentOrder) renderReceipt(currentOrder);
  }

  /* Pecah tajuk hero kepada perkataan untuk animasi 3D */
  function splitTitle(animate) {
    const h = $("[data-split]");
    if (!h) return;
    const words = h.textContent.trim().split(/\s+/);
    let accent = false;
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words.map((w, i) => {
      const html = `<span class="w${accent ? " accent" : ""}" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`;
      if (/,$/.test(w)) accent = true;
      return html;
    }).join(" ");
    if (animate) { h.classList.remove("is-in"); void h.offsetWidth; }
    requestAnimationFrame(() => h.classList.add("is-in"));
  }

  /* ---------- Render menu ---------- */
  const tagIcon = { best: "i-flame", chef: "i-chef", share: "i-users" };

  function cardHTML(m, kind, i) {
    const extra = kind === "rice" ? (m.id === "r10" ? " wide" : m.id === "r01" ? " feature-2" : "") : " drink";
    const tag = m.tag ? `<span class="tag"><svg class="ic"><use href="#${tagIcon[m.tag]}"/></svg>${esc(t("tag." + m.tag))}</span>` : "";
    const [w, h] = kind === "rice" ? [800, 600] : [600, 600];
    return `
      <article class="dish tilt${extra}" data-id="${m.id}" data-cat="${m.cat}" data-reveal style="--d:${(i % 4) * 0.08}s">
        <div class="dish-media">
          <img src="${imgSrc(m)}" alt="${esc(m.name[lang])}" width="${w}" height="${h}" loading="lazy">
          ${tag}
          <span class="qty-badge" data-qty-badge></span>
        </div>
        <div class="dish-body">
          <h3>${esc(m.name[lang])}</h3>
          <p>${esc(m.desc[lang])}</p>
          <div class="dish-foot">
            <span class="price"><small>${CONFIG.currency}</small>${m.price.toFixed(2)}</span>
            <button type="button" class="btn btn-gold add-btn" data-add="${m.id}" aria-label="${esc(t("add.aria") + ": " + m.name[lang])}">
              <svg class="ic"><use href="#i-plus"/></svg><span>${esc(t("add"))}</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  let menusRendered = false;
  function renderMenus() {
    const rg = $("[data-rice-grid]"), dg = $("[data-drink-grid]");
    rg.innerHTML = RICE.map((m, i) => cardHTML(m, "rice", i)).join("");
    dg.innerHTML = DRINKS.map((m, i) => cardHTML(m, "drink", i)).join("");
    $$("[data-filter]").forEach((g) => applyFilter(g, $(".chip.is-active", g).dataset.cat, false));
    $$(".dish", rg).concat($$(".dish", dg)).forEach((el) => {
      if (menusRendered) el.classList.add("is-in");
      else revealObserver && revealObserver.observe(el);
    });
    menusRendered = true;
    if (!revealObserver) $$(".dish").forEach((el) => el.classList.add("is-in"));
    initTilt($$(".dish"));
    syncBadges();
  }

  function applyFilter(group, cat, anim) {
    const grid = group.dataset.filter === "rice" ? $("[data-rice-grid]") : $("[data-drink-grid]");
    $$(".chip", group).forEach((c) => c.classList.toggle("is-active", c.dataset.cat === cat));
    $$(".dish", grid).forEach((d, i) => {
      const show = cat === "all" || d.dataset.cat === cat;
      d.classList.toggle("is-hidden", !show);
      if (show && anim) {
        d.classList.remove("is-filtering"); void d.offsetWidth;
        d.style.animationDelay = `${(i % 8) * 45}ms`;
        d.classList.add("is-filtering", "is-in");
      }
    });
  }
  $$("[data-filter]").forEach((g) => g.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) applyFilter(g, chip.dataset.cat, true);
  }));

  /* ---------- Troli ---------- */
  let cart = store.get("nat-cart", {});
  Object.keys(cart).forEach((id) => { if (!byId[id] || !(cart[id] > 0)) delete cart[id]; });

  const cartLines = () => Object.entries(cart).map(([id, qty]) => ({ m: byId[id], qty, total: byId[id].price * qty }));
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => cartLines().reduce((a, l) => a + l.total, 0);
  const saveCart = () => store.set("nat-cart", cart);

  function addToCart(id, srcEl) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
    const m = byId[id];
    if (srcEl) flyToCart(srcEl, m);
    toast(`<img src="${imgSrc(m)}" alt=""><span><b>${esc(m.name[lang])}</b> ${esc(t("toast.added"))}</span>`);
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, 99);
    saveCart();
    renderCart();
  }

  function renderCart(flipId, animate) {
    const lines = cartLines();
    const count = cartCount();
    const total = cartTotal();
    $$("[data-cart-count]").forEach((el) => (el.textContent = count));
    $$(".cart-btn").forEach((b) => b.classList.toggle("has-items", count > 0));
    $("[data-cart-empty]").hidden = lines.length > 0;
    $("[data-cart-foot]").hidden = lines.length === 0;
    $("[data-cart-subtotal]").textContent = money(total);
    $("[data-cart-total]").textContent = money(total);
    $("[data-cart-list]").innerHTML = lines.map((l, i) => `
      <li class="cart-item" data-line="${l.m.id}" style="--i:${i}">
        <img src="${imgSrc(l.m)}" alt="" width="68" height="68" loading="lazy">
        <div>
          <p class="ci-name">${esc(l.m.name[lang])}</p>
          <p class="ci-unit">${money(l.m.price)} ${esc(t("cart.each"))}</p>
          <div class="stepper">
            <button type="button" data-dec="${l.m.id}" aria-label="${esc(t("cart.dec") + ": " + l.m.name[lang])}"><svg class="ic"><use href="#i-minus"/></svg></button>
            <output aria-live="polite"${flipId === l.m.id ? ' class="flip"' : ""}>${l.qty}</output>
            <button type="button" data-inc="${l.m.id}" aria-label="${esc(t("cart.inc") + ": " + l.m.name[lang])}"><svg class="ic"><use href="#i-plus"/></svg></button>
          </div>
        </div>
        <div class="ci-right">
          <span class="ci-total">${money(l.total)}</span>
          <button type="button" class="ci-remove" data-remove="${l.m.id}" aria-label="${esc(t("cart.remove") + ": " + l.m.name[lang])}"><svg class="ic"><use href="#i-trash"/></svg></button>
        </div>
      </li>`).join("");
    if (!animate) $$(".cart-item").forEach((li) => (li.style.animation = "none"));
    $("[data-co-count]").textContent = count;
    $("[data-co-total]").textContent = money(total);
    syncBadges();
  }

  function syncBadges() {
    $$(".dish").forEach((d) => {
      const q = cart[d.dataset.id] || 0;
      d.classList.toggle("in-cart", q > 0);
      const b = $("[data-qty-badge]", d);
      if (b) b.textContent = q ? `×${q}` : "";
    });
  }

  function removeLine(id) {
    const li = $(`[data-line="${id}"]`);
    const name = byId[id].name[lang];
    const done = () => { setQty(id, 0); toast(`<span class="t-ic"><svg class="ic"><use href="#i-trash"/></svg></span><span><b>${esc(name)}</b> ${esc(t("toast.removed"))}</span>`); };
    if (li && !reduceMotion) { li.classList.add("is-removing"); setTimeout(done, 380); } else done();
  }

  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const id = add.dataset.add;
      const card = add.closest(".dish, .c-card");
      addToCart(id, card ? $("img", card) : null);
      const label = $("span", add);
      add.classList.add("is-done");
      $("use", add).setAttribute("href", "#i-check");
      label.textContent = t("added");
      clearTimeout(add._t);
      add._t = setTimeout(() => { add.classList.remove("is-done"); $("use", add).setAttribute("href", "#i-plus"); label.textContent = t("add"); }, 1300);
      return;
    }
    const inc = e.target.closest("[data-inc]");
    if (inc) { setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1); flipQty(inc.dataset.inc); return; }
    const dec = e.target.closest("[data-dec]");
    if (dec) {
      const id = dec.dataset.dec;
      if ((cart[id] || 0) <= 1) removeLine(id); else { setQty(id, cart[id] - 1); flipQty(id); }
      return;
    }
    const rm = e.target.closest("[data-remove]");
    if (rm) { removeLine(rm.dataset.remove); return; }
    if (e.target.closest("[data-cart-clear]")) {
      $$(".cart-item").forEach((li, i) => { li.style.animationDelay = `${i * 40}ms`; li.classList.add("is-removing"); });
      setTimeout(() => { cart = {}; saveCart(); renderCart(); toast(`<span class="t-ic"><svg class="ic"><use href="#i-trash"/></svg></span><span>${esc(t("toast.cleared"))}</span>`); }, reduceMotion ? 0 : 420);
    }
  });

  function flipQty(id) {
    renderCart(id);
  }

  /* ---------- Lapisan: drawer, menu mudah alih, modal ---------- */
  const overlay = $("[data-overlay]");
  const drawer = $("#cart");
  const mnav = $("#mobile-nav");
  const coModal = $("#checkout");
  const invModal = $("#invoice");
  let lastFocus = null;

  const anyOpen = () => drawer.classList.contains("is-open") || mnav.classList.contains("is-open") || coModal.classList.contains("is-open") || invModal.classList.contains("is-open");
  function lock() { document.body.classList.toggle("lock", anyOpen()); }

  function openDrawer() {
    closeNav(true);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-on"));
    drawer.classList.add("is-open");
    document.body.classList.add("drawer-open");
    drawer.setAttribute("aria-hidden", "false");
    renderCart(null, true);
    lock();
    setTimeout(() => $(".drawer-head .icon-btn").focus({ preventScroll: true }), 80);
  }
  function closeDrawer(keepOverlay) {
    if (!drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    drawer.setAttribute("aria-hidden", "true");
    if (!keepOverlay) hideOverlay();
    lock();
    if (!keepOverlay && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function hideOverlay() {
    overlay.classList.remove("is-on");
    setTimeout(() => { if (!overlay.classList.contains("is-on")) overlay.hidden = true; }, 400);
  }
  function openNav() {
    lastFocus = document.activeElement;
    mnav.classList.add("is-open");
    mnav.setAttribute("aria-hidden", "false");
    $("[data-open-nav]").setAttribute("aria-expanded", "true");
    lock();
    setTimeout(() => $(".mobile-nav-head .icon-btn").focus({ preventScroll: true }), 80);
  }
  function closeNav(silent) {
    if (!mnav.classList.contains("is-open")) return;
    mnav.classList.remove("is-open");
    mnav.setAttribute("aria-hidden", "true");
    $("[data-open-nav]").setAttribute("aria-expanded", "false");
    lock();
    if (!silent && lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function openModal(m) {
    m.classList.remove("is-leaving-left");
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    lock();
    setTimeout(() => $(".modal-x", m).focus({ preventScroll: true }), 120);
  }
  function closeModal(m, toLeft) {
    if (!m.classList.contains("is-open")) return;
    if (toLeft) m.classList.add("is-leaving-left");
    m.classList.remove("is-open");
    m.setAttribute("aria-hidden", "true");
    lock();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openDrawer(); return; }
    if (e.target.closest("[data-close-cart]")) { closeDrawer(); return; }
    if (e.target.closest("[data-open-nav]")) { openNav(); return; }
    if (e.target.closest("[data-close-nav]") || e.target === mnav) { closeNav(true); return; }
    if (e.target === overlay) { closeDrawer(); return; }
    if (e.target.closest("[data-close-modal]")) { closeModal(e.target.closest(".modal")); return; }
    if (e.target.classList && e.target.classList.contains("modal")) { closeModal(e.target); return; }
  });
  mnav.addEventListener("click", (e) => { if (e.target === mnav) closeNav(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (invModal.classList.contains("is-open")) closeModal(invModal);
      else if (coModal.classList.contains("is-open")) closeModal(coModal);
      else if (drawer.classList.contains("is-open")) closeDrawer();
      else if (mnav.classList.contains("is-open")) closeNav();
    }
    if (e.key === "Tab") trapFocus(e);
  });
  function trapFocus(e) {
    const layer = [invModal, coModal].find((m) => m.classList.contains("is-open")) || (drawer.classList.contains("is-open") && drawer) || (mnav.classList.contains("is-open") && $(".mobile-nav-panel"));
    if (!layer) return;
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', layer).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Checkout ---------- */
  const form = $("[data-co-form]");
  const fe = form.elements;
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const OPEN = toMin(CONFIG.openHour), LAST = toMin(CONFIG.closeHour) - 30;

  fe.pax.innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  fe.pax.value = "2";

  function setDefaultSchedule() {
    const now = new Date();
    fe.date.min = ymd(now);
    if (fe.date.value && fe.time.value) return;
    let mins = Math.ceil((now.getHours() * 60 + now.getMinutes() + 30) / 15) * 15;
    let day = new Date(now);
    if (mins > LAST) { day.setDate(day.getDate() + 1); mins = OPEN + 60; }
    if (mins < OPEN) mins = OPEN + 60;
    fe.date.value = ymd(day);
    fe.time.value = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  function mode() { return fe.mode.value; }
  function updateTimeLabel() {
    const lbl = $("[data-time-label]");
    if (!lbl) return;
    lbl.textContent = t(mode() === "dine" ? "co.time" : "co.time.take");
    $("[data-pax-field]").hidden = mode() !== "dine";
  }
  form.addEventListener("change", (e) => { if (e.target.name === "mode") updateTimeLabel(); });

  function fieldErr(name, msg) {
    const f = fe[name].closest(".field");
    f.classList.toggle("has-err", !!msg);
    $(`[data-err="${name}"]`).textContent = msg || "";
    if (msg) { f.style.animation = "none"; void f.offsetWidth; f.style.animation = ""; }
    return !msg;
  }

  function validate() {
    const v = Object.fromEntries(new FormData(form));
    let ok = true;
    ok = fieldErr("name", v.name.trim().length >= 2 ? "" : t("co.err.name")) && ok;
    const digits = v.phone.replace(/\D/g, "");
    ok = fieldErr("phone", /^(0|60)1\d{7,9}$|^0\d{8,10}$/.test(digits) ? "" : t("co.err.phone")) && ok;
    const today = ymd(new Date());
    ok = fieldErr("date", v.date && v.date >= today ? "" : t("co.err.date")) && ok;
    let timeMsg = "";
    if (!v.time) timeMsg = t("co.err.time");
    else {
      const m = toMin(v.time);
      if (m < OPEN || m > LAST) timeMsg = t("co.err.time");
      else if (v.date === today) { const n = new Date(); if (m < n.getHours() * 60 + n.getMinutes()) timeMsg = t("co.err.past"); }
    }
    ok = fieldErr("time", timeMsg) && ok;
    if (v.mode === "dine") ok = fieldErr("pax", Number(v.pax) >= 1 ? "" : t("co.err.pax")) && ok;
    if (!ok) $(".field.has-err input, .field.has-err select", form)?.focus();
    return ok ? v : null;
  }
  ["name", "phone", "date", "time"].forEach((n) => fe[n].addEventListener("input", () => fieldErr(n, "")));

  function openCheckout() {
    if (!cartCount()) return;
    closeDrawer(true);
    setDefaultSchedule();
    updateTimeLabel();
    renderCart();
    overlay.hidden = true;
    overlay.classList.remove("is-on");
    openModal(coModal);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-checkout]")) openCheckout();
    if (e.target.closest("[data-back-cart]")) { closeModal(coModal, true); setTimeout(openDrawer, 150); }
    if (e.target.closest("[data-edit-order]")) { closeModal(invModal, true); setTimeout(openDrawer, 150); }
    if (e.target.closest("[data-print]")) window.print();
  });

  /* ---------- Invois & WhatsApp ---------- */
  let currentOrder = null;

  function invoiceNo() {
    const d = new Date();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `NAT-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rnd}`;
  }
  const locale = () => (lang === "ms" ? "ms-MY" : "en-MY");
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function fmtTime(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
  }
  const modeLabel = (md) => (md === "dine" ? `${t("co.dine")} (${t("co.dine.d")})` : `${t("co.take")} (${t("co.take.d")})`);

  function renderReceipt(o) {
    const lines = o.lines;
    const total = o.total;
    $("[data-receipt]").innerHTML = `
      <div class="r-head">
        <svg viewBox="0 0 64 64" aria-hidden="true"><use href="#logo-mark"/></svg>
        <h3>${esc(CONFIG.name)}</h3>
        <p>${esc(CONFIG.address)}</p>
        <p>WhatsApp ${esc(CONFIG.phoneDisplay)}</p>
        <h2 class="r-title" id="inv-title">${esc(t("inv.title"))}</h2>
      </div>
      <span class="r-stamp" aria-hidden="true">${esc(t("inv.stamp"))}</span>
      <hr class="r-sep">
      <dl class="r-meta">
        <dt>${esc(t("inv.no"))}</dt><dd>${esc(o.no)}</dd>
        <dt>${esc(t("inv.issued"))}</dt><dd>${esc(o.issued.toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" }))}</dd>
        <dt>${esc(t("inv.type"))}</dt><dd>${esc(modeLabel(o.mode))}</dd>
        <dt>${esc(t("inv.when"))}</dt><dd>${esc(fmtDate(o.date))}, ${esc(fmtTime(o.time))}</dd>
        ${o.mode === "dine" ? `<dt>${esc(t("inv.pax"))}</dt><dd>${o.pax} ${esc(t("inv.people"))}</dd>` : ""}
        <dt>${esc(t("inv.customer"))}</dt><dd>${esc(o.name)}<br>${esc(o.phone)}</dd>
      </dl>
      <hr class="r-sep">
      <table class="r-table">
        <thead><tr><th>${esc(t("inv.item"))}</th><th class="num">${esc(t("inv.qty"))}</th><th class="num">${esc(t("inv.amount"))}</th></tr></thead>
        <tbody>
          ${lines.map((l) => `<tr><td>${esc(l.m.name[lang])}<small>${money(l.m.price)} ${esc(t("inv.unit"))}</small></td><td class="num">${l.qty}</td><td class="num">${money(l.total)}</td></tr>`).join("")}
        </tbody>
      </table>
      <hr class="r-sep">
      <dl class="r-totals">
        <div><dt>${esc(t("cart.subtotal"))}</dt><dd>${money(total)}</dd></div>
        <div class="zero"><dt>${esc(t("inv.service"))}</dt><dd>${money(0)}</dd></div>
        <div class="zero"><dt>${esc(t("inv.booking"))}</dt><dd>${money(0)}</dd></div>
        <div class="zero"><dt>${esc(t("inv.tax"))}</dt><dd>${money(0)}</dd></div>
        <div class="grand"><dt>${esc(t("cart.total"))}</dt><dd>${money(total)}</dd></div>
      </dl>
      ${o.notes ? `<p class="r-foot" style="background:var(--bg-2);color:var(--ink)"><svg class="ic"><use href="#i-pencil"/></svg><span><b>${esc(t("wa.notes"))}:</b> ${esc(o.notes)}</span></p>` : ""}
      <p class="r-foot"><svg class="ic"><use href="#i-badge"/></svg><span>${esc(t("inv.foot"))}</span></p>`;
    $("[data-send-wa]").href = waLink(waMessage(o));
  }

  function waMessage(o) {
    const L = [];
    L.push(`*${t("wa.header")}*`, t("wa.hello"), "");
    L.push(`${t("inv.no")}: ${o.no}`);
    L.push(`${t("inv.type")}: ${modeLabel(o.mode)}`);
    L.push(`${t("inv.when")}: ${fmtDate(o.date)}, ${fmtTime(o.time)}`);
    if (o.mode === "dine") L.push(`${t("inv.pax")}: ${o.pax} ${t("inv.people")}`);
    L.push(`${t("inv.customer")}: ${o.name} (${o.phone})`, "");
    L.push(`*${t("wa.items")}:*`);
    o.lines.forEach((l, i) => L.push(`${i + 1}. ${l.m.name[lang]} x${l.qty} = ${money(l.total)}`));
    L.push("------------------------------");
    L.push(`${t("wa.food")}: ${money(o.total)}`);
    L.push(`${t("wa.fees")}: ${money(0)}`);
    L.push(`*${t("wa.total")}: ${money(o.total)}*`);
    if (o.notes) L.push("", `${t("wa.notes")}: ${o.notes}`);
    L.push("", t("wa.end"));
    return L.join("\n");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    currentOrder = {
      no: invoiceNo(), issued: new Date(), mode: v.mode, name: v.name.trim(), phone: v.phone.trim(),
      date: v.date, time: v.time, pax: Number(v.pax), notes: v.notes.trim(),
      lines: cartLines(), total: cartTotal()
    };
    renderReceipt(currentOrder);
    closeModal(coModal, true);
    setTimeout(() => {
      openModal(invModal);
      const r = $(".invoice-card").getBoundingClientRect();
      setTimeout(() => starShower(r.left + r.width / 2, r.top + 80), 250);
    }, 160);
  });

  $("[data-send-wa]").addEventListener("click", () => {
    setTimeout(() => {
      closeModal(invModal);
      cart = {}; saveCart(); renderCart();
      currentOrder = null;
      form.reset(); fe.pax.value = "2"; updateTimeLabel();
      toast(`<span class="t-ic"><svg class="ic"><use href="#i-check"/></svg></span><span>${esc(t("toast.sent"))}</span>`, 4200);
    }, 300);
  });

  /* ---------- Toast ---------- */
  function toast(html, ms = 2600) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = html;
    el.style.setProperty("--ms", ms + "ms");
    $("[data-toasts]").appendChild(el);
    const r = el.getBoundingClientRect();
    setTimeout(() => sparkBurst(r.left + 30, r.top + r.height / 2, 7), 200);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 500); }, ms);
    const all = $$(".toast");
    if (all.length > 3) all[0].remove();
  }

  /* ---------- Kesan klik: riak + bintang berkelip ---------- */
  function sparkBurst(x, y, n = 10) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "spark" + (i % 3 === 0 ? " dot" : "");
      document.body.appendChild(s);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const d = 34 + Math.random() * 46;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      const sc = 0.6 + Math.random() * 0.8;
      s.animate([
        { transform: `translate(${x - 6}px, ${y - 6}px) scale(0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x - 6 + dx * 0.7}px, ${y - 6 + dy * 0.7}px) scale(${sc}) rotate(120deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x - 6 + dx}px, ${y - 6 + dy + 10}px) scale(0) rotate(200deg)`, opacity: 0 }
      ], { duration: 650 + Math.random() * 300, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = () => s.remove();
    }
  }
  function starShower(x, y) {
    if (reduceMotion) return;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("span");
      s.className = "spark" + (i % 4 === 0 ? " dot" : "");
      document.body.appendChild(s);
      const dx = (Math.random() - 0.5) * 520;
      const up = -80 - Math.random() * 140;
      const sc = 0.8 + Math.random() * 1.2;
      s.animate([
        { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.6}px, ${y + up}px) scale(${sc}) rotate(180deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x + dx}px, ${y + up + 260}px) scale(.2) rotate(420deg)`, opacity: 0 }
      ], { duration: 1500 + Math.random() * 700, easing: "cubic-bezier(.22,1,.36,1)", delay: Math.random() * 200 }).onfinish = () => s.remove();
    }
  }
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn, .chip, .icon-btn, .lang-btn, .stepper button, .ci-remove, .mode-card");
    if (!b) return;
    sparkBurst(e.clientX, e.clientY, b.matches(".btn-gold, .btn-wa, .btn-dark") ? 12 : 7);
    if (b.matches(".btn, .chip") && !reduceMotion) {
      const r = b.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const rp = document.createElement("span");
      rp.className = "ripple";
      rp.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      b.appendChild(rp);
      setTimeout(() => rp.remove(), 700);
    }
  });

  /* Imej terbang ke ikon troli */
  function flyToCart(img, m) {
    const target = $(".cart-btn");
    const bump = () => { target.classList.remove("bump"); void target.offsetWidth; target.classList.add("bump"); };
    if (reduceMotion || !img) { bump(); return; }
    const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    const f = document.createElement("img");
    f.src = imgSrc(m); f.alt = ""; f.className = "fly";
    document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - 35, y0 = a.top + a.height / 2 - 35;
    const x1 = b.left + b.width / 2 - 35, y1 = b.top + b.height / 2 - 35;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 140;
    f.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1.1) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${mx}px, ${my}px) scale(.8) rotate(200deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) scale(.18) rotate(360deg)`, opacity: 0.5 }
    ], { duration: 850, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => {
      f.remove(); bump();
      sparkBurst(b.left + b.width / 2, b.top + b.height / 2, 10);
    };
  }

  /* ---------- Reveal semasa skrol ---------- */
  const revealObserver = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); revealObserver.unobserve(en.target); }
      }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;
  function observeReveals() {
    $$("[data-reveal]").forEach((el, i) => {
      if (revealObserver) revealObserver.observe(el); else el.classList.add("is-in");
    });
  }

  /* ---------- Kad tilt 3D ---------- */
  function initTilt(els) {
    if (!finePointer || reduceMotion) return;
    els.forEach((el) => {
      if (el._tilt) return;
      el._tilt = true;
      const glare = document.createElement("span");
      glare.className = "glare";
      el.appendChild(glare);
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateZ(6px)`;
        el.style.setProperty("--gx", `${px * 100}%`);
        el.style.setProperty("--gy", `${py * 100}%`);
      });
      el.addEventListener("pointerleave", () => { el.classList.remove("is-tilting"); el.style.transform = ""; });
    });
  }

  /* ---------- Pentas 3D hero ---------- */
  function initStage() {
    const stage = $("[data-stage]");
    const inner = $("[data-stage-inner]");
    const plate = $("[data-plate]");
    const body = $("[data-plate-body]");
    const orbs = $$("[data-orbit] .orb");
    const hero = $(".hero");
    for (let k = 1; k <= 14; k++) {
      const i = document.createElement("i");
      i.style.transform = `translateZ(${-k * 1.3}px)`;
      i.style.inset = `${k * 0.22}%`;
      i.style.filter = `brightness(${1 - k * 0.025})`;
      body.appendChild(i);
    }
    let mx = 0, my = 0, cx = 0, cy = 0, theta = 0, last = performance.now(), visible = true;
    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", (e) => {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
      }, { passive: true });
    }
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(hero);

    function frame(now) {
      const dt = Math.min(64, now - last); last = now;
      if (visible) {
        cx += (mx - cx) * 0.06; cy += (my - cy) * 0.06;
        const S = stage.clientWidth;
        const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9)));
        const tilt = 56 - p * 30;
        const tr = (tilt * Math.PI) / 180;
        inner.style.setProperty("--ry", `${cx * 18}deg`);
        inner.style.setProperty("--rx", `${-cy * 10}deg`);
        plate.style.setProperty("--tilt", `${tilt}deg`);
        plate.style.setProperty("--spin", `${p * 90}deg`);
        plate.style.setProperty("--ps", `${1 - p * 0.08}`);
        stage.style.transform = `translate3d(0, ${p * 60}px, 0)`;
        if (!reduceMotion) theta += dt * 0.00022;
        const R = S * 0.47, H = S * 0.06;
        orbs.forEach((o, i) => {
          const a = theta + (i * Math.PI * 2) / orbs.length;
          const bob = Math.sin(now * 0.0012 + i * 1.7) * S * 0.015;
          const x = Math.cos(a) * R;
          const y0 = Math.sin(a) * R * 0.92;
          const y = y0 * Math.cos(tr) - (H + bob) * Math.sin(tr);
          const z = y0 * Math.sin(tr) + (H + bob) * Math.cos(tr);
          o.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotate(${(a * 40) % 360}deg)`;
        });
      }
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Karusel 3D ---------- */
  let carousel = null;
  function initCarousel() {
    const ids = ["r06", "r02", "r03", "r08", "r09", "r01", "d05"];
    const scene = $("[data-carousel-scene]");
    const ring = $("[data-carousel-ring]");
    const info = $("[data-carousel-info]");
    const N = ids.length, step = 360 / N;
    let angle = 0, target = 0, R = 320, dragging = false, startX = 0, startT = 0, idle = 0, inView = false, front = -1;

    function build() {
      ring.innerHTML = ids.map((id, i) => {
        const m = byId[id];
        return `<article class="c-card" data-i="${i}">
          <div class="c-plate"><img src="${imgSrc(m)}" alt="${esc(m.name[lang])}" width="800" height="600" loading="lazy"></div>
          <h3>${esc(m.name[lang])}</h3>
          <p class="c-price">${money(m.price)}</p>
          <button type="button" class="btn btn-gold add-btn" data-add="${m.id}" aria-label="${esc(t("add.aria") + ": " + m.name[lang])}"><svg class="ic"><use href="#i-plus"/></svg><span>${esc(t("add"))}</span></button>
        </article>`;
      }).join("");
      layout();
      front = -1;
    }
    function layout() {
      const w = $(".c-card", ring)?.offsetWidth || 270;
      R = Math.round((w / 2) / Math.tan(Math.PI / N) + (w > 240 ? 46 : 24));
      $$(".c-card", ring).forEach((c, i) => (c.style.transform = `rotateY(${i * step}deg) translateZ(${R}px)`));
    }
    function render() {
      ring.style.transform = `translateZ(${-R}px) rotateY(${angle}deg)`;
      let best = 0, bestCos = -2;
      $$(".c-card", ring).forEach((c, i) => {
        const rel = ((i * step + angle) % 360 + 540) % 360 - 180;
        const cos = Math.cos((rel * Math.PI) / 180);
        c.style.opacity = (0.35 + 0.65 * Math.max(0, cos)).toFixed(3);
        if (cos > bestCos) { bestCos = cos; best = i; }
      });
      if (best !== front) {
        front = best;
        $$(".c-card", ring).forEach((c, i) => {
          c.classList.toggle("is-front", i === best);
          c.setAttribute("aria-hidden", String(i !== best));
          $$("button", c).forEach((b) => (b.tabIndex = i === best ? 0 : -1));
        });
        const m = byId[ids[best]];
        info.innerHTML = `<b>${esc(m.name[lang])}</b>${money(m.price)}`;
      }
    }
    function loop() {
      if (!dragging) angle += (target - angle) * 0.08;
      render();
      if (inView && !dragging && !reduceMotion && (idle += 1) > 240) { target -= step; idle = 0; }
      requestAnimationFrame(loop);
    }
    const snap = () => (target = Math.round(target / step) * step);
    $("[data-carousel-prev]").addEventListener("click", () => { target += step; snap(); idle = 0; });
    $("[data-carousel-next]").addEventListener("click", () => { target -= step; snap(); idle = 0; });
    scene.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true; startX = e.clientX; startT = angle; idle = 0;
      scene.classList.add("is-drag");
      scene.setPointerCapture(e.pointerId);
    });
    scene.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      angle = startT + (e.clientX - startX) * 0.35;
      target = angle;
    });
    const end = () => { if (!dragging) return; dragging = false; scene.classList.remove("is-drag"); snap(); idle = 0; };
    scene.addEventListener("pointerup", end);
    scene.addEventListener("pointercancel", end);
    scene.addEventListener("pointerenter", () => (idle = -99999));
    scene.addEventListener("pointerleave", () => (idle = 0));
    new IntersectionObserver(([en]) => (inView = en.isIntersecting), { threshold: 0.3 }).observe(scene);
    window.addEventListener("resize", () => { layout(); render(); });
    build();
    loop();
    return { refresh() { build(); render(); } };
  }

  /* ---------- Parallax bahagian Tentang ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const group = $("[data-parallax-group]");
    const items = $$("[data-depth]", group);
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = group.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const c = r.top + r.height / 2 - innerHeight / 2;
      items.forEach((el) => (el.style.transform = `translate3d(0, ${(-c * Number(el.dataset.depth)).toFixed(1)}px, 0)`));
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Kaunter nombor ---------- */
  function initCounters() {
    const els = $$("[data-count]");
    const run = (el) => {
      const n = Number(el.dataset.count);
      if (reduceMotion) { el.textContent = n; return; }
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1400);
        el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Header & nav aktif ---------- */
  function initHeader() {
    const header = $(".site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = $$(".nav-list a");
    const pill = $(".nav-pill");
    const movePill = (a) => {
      if (!a) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.width = `${a.offsetWidth}px`;
      pill.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    let active = null;
    const setActive = (id) => {
      active = links.find((a) => a.getAttribute("href") === `#${id}`) || null;
      links.forEach((a) => a.classList.toggle("is-active", a === active));
      movePill(active);
    };
    const ids = links.map((a) => a.getAttribute("href").slice(1));
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: "-45% 0px -50% 0px" });
    ids.forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    window.addEventListener("resize", () => movePill(active));
    document.fonts && document.fonts.ready.then(() => movePill(active));
  }

  /* ---------- Butang bahasa ---------- */
  $$(".lang-btn").forEach((b) => b.addEventListener("click", () => { if (b.dataset.lang !== lang) applyLang(b.dataset.lang, true); }));

  /* ---------- Mula ---------- */
  applyConfig();
  carousel = initCarousel();
  applyLang(lang, false);
  observeReveals();
  initTilt($$(".tilt"));
  initStage();
  initParallax();
  initCounters();
  initHeader();
  requestAnimationFrame(() => $(".hero").classList.add("is-ready"));
})();

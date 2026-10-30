// Laman awam Ibnu Yazid: semua kandungan dilukis daripada konfigurasi (admin boleh ubah secara langsung).
(() => {
  "use strict";
  const C = window.IYCore;
  const { esc, md, icon } = C;
  const DEFS = window.IY_DEFAULTS;

  let cfg = C.clone(DEFS);
  let lang = "ms";
  let first = true;
  let activeAlbum = null;
  let openSvc = null;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const html = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inPreview = window.parent !== window; // dalam pratonton admin: jangan kira pelawat

  // ===================== PANGKALAN DATA (Firebase, pilihan) =====================
  const DB = window.IYDB;
  let remoteMode = false, dbOk = false, albumsNear = false;
  const imgMap = {}, imgSubs = {};
  // Dalam mod pangkalan data, config menyimpan senarai id gambar; data gambar disimpan dalam koleksi "images".
  const ingestImages = (c) => c.albums.forEach((a) => { if (Array.isArray(a.imageIds)) a.imageIds.forEach((id, i) => { if (a.images && a.images[i]) imgMap[id] = a.images[i]; }); });
  const resolveImages = (c) => { c.albums.forEach((a) => { if (Array.isArray(a.imageIds)) a.images = a.imageIds.map((id) => imgMap[id]).filter(Boolean); }); return c; };
  const fromRemote = (data) => resolveImages(C.merge(data, DEFS));
  const ensureAlbumImages = (id) => {
    if (!remoteMode || !id || imgSubs[id]) return;
    imgSubs[id] = DB.watchImages(id, (list) => { list.forEach((x) => { imgMap[x.id] = x.data; }); resolveImages(cfg); schedule("albums"); }, () => { delete imgSubs[id]; });
  };

  const L = (o) => (o ? o[lang] || o.ms || "" : "");
  const T = (k) => L(cfg.t[k]);
  const svcById = (id) => cfg.services.find((s) => s.id === id);
  const visibleSvcs = () => cfg.services.filter((s) => s.visible !== false);
  const waUrl = (text) => `https://wa.me/${cfg.brand.waNumber}` + (text ? `?text=${encodeURIComponent(text)}` : "");
  const arrowUR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  const arrowR = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const svcGlyph = (s) => (s.icon === "jawi" ? esc(s.jawi) : icon(s.icon));
  const priceShort = (s) => (Number(s.priceMin) > 0 ? "RM" + s.priceMin : s.priceText);

  // ===================== PENDEKATAN LUKISAN =====================
  const renderBrand = () => {
    const b = cfg.brand;
    $$("[data-logo]").forEach((el) => {
      el.innerHTML =
        (b.logo ? `<img class="logo__img" src="${esc(b.logo)}" alt="">` : `<span class="logo__mark" aria-hidden="true">${esc(b.mark)}</span>`) +
        `<span class="logo__text">${esc(b.name)}<small>${esc(L(b.subtitle))}</small></span>`;
    });
    $("#mFootName").textContent = b.name;
    $("#year").textContent = new Date().getFullYear();
    const wa = $("#mFootWa");
    wa.href = waUrl();
    wa.textContent = "WhatsApp " + b.phoneDisplay;
    $("#mBannerPhone").textContent = b.phoneDisplay;
    $("#mOptWa").href = waUrl(L(b.waMessage));
    $("#mCopyNum").textContent = b.phoneDisplay;
    $("#mAboutArt").textContent = cfg.deco.aboutArt;
    $("#mChipA").textContent = cfg.deco.chipA;
    $("#mChipB").textContent = cfg.deco.chipB;
    $("#mBannerDeco").textContent = cfg.deco.banner;
  };

  const renderStatic = () => {
    $$("[data-t]").forEach((el) => { el.innerHTML = md(T(el.dataset.t)); });
    $$("[data-t-aria]").forEach((el) => el.setAttribute("aria-label", T(el.dataset.tAria)));
    $("#langBtn").setAttribute("aria-label", T("msg_langBtn"));
    $("#menuBtn").setAttribute("aria-label", $("#menu").classList.contains("is-open") ? T("msg_menuClose") : T("msg_menuOpen"));
  };

  const renderHero = () => {
    $("#mChips").innerHTML = cfg.chips
      .map((c) => `<li>${icon("check")}<span>${md(L(c))}</span></li>`).join("");
    $("#mHero").innerHTML =
      `<span class="stack__jawi" aria-hidden="true">${esc(cfg.deco.hero)}</span>` +
      visibleSvcs().slice(0, 4).map((s, i) => `
        <button class="tile tile--${"abc"[i % 3]}" type="button" data-open="svc:${esc(s.id)}">
          <span class="tile__icon ${s.icon === "jawi" ? "tile__icon--jawi" : ""}" aria-hidden="true">${svcGlyph(s)}</span>
          <span class="tile__body"><span class="tile__name">${md(L(s.short))}</span><span class="tile__price"><span>${esc(L(s.priceLead))}</span> <b>${esc(priceShort(s))}</b></span></span>
          ${arrowUR.replace('class="ico"', 'class="ico tile__go"')}
        </button>`).join("");
  };

  const renderTicker = () => {
    const w = cfg.ticker.filter(Boolean);
    $("#mTicker").innerHTML = w.concat(w).map((x) => `<span>${esc(x)}</span>`).join("");
  };

  const renderStats = () => {
    $("#mStats").innerHTML = cfg.stats.map((s) => `
      <div class="stat reveal"><p class="stat__num">${esc(s.prefix)}<span data-count="${Number(s.value) || 0}">${Number(s.value) || 0}</span></p><p class="stat__lbl">${md(L(s.label))}</p></div>`).join("");
  };

  const renderProblems = () => {
    $("#mProblems").innerHTML = cfg.problems.map((p, i) => `
      <article class="ps__card reveal">
        <span class="ps__no">${String(i + 1).padStart(2, "0")}</span>
        <p class="ps__prob">${md(L(p.prob))}</p>
        <div class="ps__sol"><span class="ps__tick" aria-hidden="true">${icon("check")}</span><p>${md(L(p.sol))}</p></div>
      </article>`).join("");
  };

  const artTop = (s) => {
    if (s.art === "khat") return `<span class="svc__mark" aria-hidden="true">${esc(s.artText)}</span>`;
    if (s.art === "web") return '<span class="mock-browser" aria-hidden="true"><i></i><i></i><i></i><b></b><b></b><b></b></span>';
    if (s.art === "video") return `<span class="mock-video" aria-hidden="true">${icon("play")}</span>`;
    return "";
  };

  const renderServices = () => {
    $("#mServices").innerHTML = visibleSvcs().map((s) => `
      <article class="svc reveal ${s.featured ? "svc--featured" : ""}">
        ${s.featured ? `<span class="ribbon">${md(T("h_popular"))}</span>` : ""}
        <div class="svc__top svc__top--${esc(s.art || "plain")}">
          <span class="svc__icon ${s.icon === "jawi" ? "svc__icon--jawi" : ""}" aria-hidden="true">${svcGlyph(s)}</span>
          ${artTop(s)}
        </div>
        <div class="svc__body">
          <h3>${md(L(s.title))}</h3>
          <p class="price-tag"><span>${esc(L(s.priceLead))}</span> <b>${esc(s.priceText)}</b></p>
          <ul class="ticks">${s.features.slice(0, 3).map((f) => `<li>${md(L(f))}</li>`).join("")}</ul>
          <div class="svc__actions"><button class="btn btn--primary btn--block" type="button" data-open="svc:${esc(s.id)}">${md(T("cta_details"))}</button></div>
        </div>
      </article>`).join("");
  };

  const renderSteps = () => {
    $("#mSteps").innerHTML = cfg.steps.map((s, i) => `
      <li class="step reveal"><span class="step__no">${i + 1}</span><span class="step__icon" aria-hidden="true">${icon(s.icon)}</span>
        <h3>${md(L(s.title))}</h3><p>${md(L(s.desc))}</p></li>`).join("");
  };

  const workArt = (w) => {
    if (w.art === "khat") return `<span class="work__art work__art--khat" aria-hidden="true"><span>${esc(w.artText)}</span></span>`;
    if (w.art === "web") return '<span class="work__art work__art--web" aria-hidden="true"><span class="mock-site"><i></i><i></i><i></i><b></b><em></em><em></em><em></em></span></span>';
    if (w.art === "video") return `<span class="work__art work__art--video" aria-hidden="true"><span class="play">${icon("play")}</span><span class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span>`;
    return `<span class="work__art work__art--plain" aria-hidden="true">${icon("image")}</span>`;
  };
  const renderWorks = () => {
    $("#mWorks").innerHTML = cfg.works.map((w) => {
      const inner = `${workArt(w)}<span class="work__meta"><span class="work__tag">${md(L(w.tag))}</span><span class="work__title">${esc(w.title)}</span></span><span class="work__go" aria-hidden="true">${arrowUR}</span>`;
      return w.url
        ? `<a class="work reveal" href="${esc(w.url)}" target="_blank" rel="noopener">${inner}</a>`
        : `<button class="work reveal" type="button" data-open="svc:${esc(w.serviceId)}">${inner}</button>`;
    }).join("");
  };

  const renderAlbums = () => {
    const al = cfg.albums;
    if (!al.find((a) => a.id === activeAlbum)) activeAlbum = al[0] && al[0].id;
    $("#mTabs").innerHTML = '<span class="seg__pill" aria-hidden="true"></span>' + al.map((a) => `
      <button class="seg__tab" type="button" role="tab" id="tab-${esc(a.id)}" aria-controls="album-${esc(a.id)}" aria-selected="${a.id === activeAlbum}" tabindex="${a.id === activeAlbum ? 0 : -1}" data-album="${esc(a.id)}">${md(L(a.name))}</button>`).join("");
    $("#mAlbums").innerHTML = al.map((a, ai) => {
      const frames = a.images.length
        ? a.images.map((src, ii) => `<button type="button" class="frame" data-lb="${ai}:${ii}"><img src="${esc(src)}" alt="${esc(T("msg_photo"))} ${ii + 1}" loading="lazy" decoding="async"></button>`).join("")
        : Array.from({ length: 12 }, () => `<div class="frame frame--empty">${icon("image")}<span>${esc(T("msg_empty"))}</span></div>`).join("");
      return `<div class="album" id="album-${esc(a.id)}" role="tabpanel" aria-labelledby="tab-${esc(a.id)}" tabindex="0" ${a.id === activeAlbum ? "" : "hidden"}>${frames}</div>`;
    }).join("");
    requestAnimationFrame(movePill);
  };
  const movePill = () => {
    const on = $('#mTabs [aria-selected="true"]'), pill = $("#mTabs .seg__pill");
    if (!on || !pill) return;
    pill.style.width = on.offsetWidth + "px";
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  const selectAlbum = (id) => {
    activeAlbum = id; ensureAlbumImages(id);
    $$("#mTabs .seg__tab").forEach((t) => { const on = t.dataset.album === id; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    $$("#mAlbums .album").forEach((a) => { a.hidden = a.id !== "album-" + id; });
    movePill();
  };

  const renderPlans = () => {
    $("#mPlans").innerHTML = cfg.plans.map((p) => {
      const cls = p.featured ? "btn btn--primary btn--block" : "btn btn--outline btn--block";
      let btn;
      if (p.action === "url" && p.url) btn = `<a class="${cls}" href="${esc(p.url)}" target="_blank" rel="noopener">${md(L(p.btnLabel) || T("cta_quote"))}</a>`;
      else if (p.action === "service") btn = `<button class="${cls}" type="button" data-open="svc:${esc(p.serviceId)}">${md(L(p.btnLabel) || T("cta_details"))}</button>`;
      else btn = `<button class="${cls}" type="button" data-open="m-quote" data-plan="${esc(p.serviceId)}">${md(L(p.btnLabel) || T("cta_quote"))}</button>`;
      return `
      <article class="plan reveal ${p.featured ? "plan--featured" : ""}">
        ${p.featured ? `<span class="ribbon">${md(T("h_popular"))}</span>` : ""}
        <p class="plan__kicker">${md(L(p.kicker))}</p>
        <p class="plan__price">${p.cur ? `<span class="plan__cur">${esc(p.cur)}</span>` : ""}${esc(p.price)}${p.priceTo ? `<span class="plan__to">${esc(p.priceTo)}</span>` : ""}${L(p.unit) ? `<span class="plan__to">${esc(L(p.unit))}</span>` : ""}</p>
        <ul class="ticks">${p.features.map((f) => `<li>${md(L(f))}</li>`).join("")}</ul>
        ${btn}
      </article>`;
    }).join("");
  };

  const renderAbout = () => {
    $("#mValues").innerHTML = cfg.values.map((v) => `<li><span class="values__icon" aria-hidden="true">${icon(v.icon)}</span><span>${md(L(v.text))}</span></li>`).join("");
  };

  const renderFaq = () => {
    const open = new Set($$("#mFaq details").map((d, i) => (d.open ? i : -1)));
    $("#mFaq").innerHTML = cfg.faq.map((f, i) => `<details ${open.has(i) ? "open" : ""}><summary>${md(L(f.q))}</summary><p>${md(L(f.a))}</p></details>`).join("");
  };

  const renderFooter = () => {
    const q = cfg.brand.qalamUrl
      ? `<li><a href="${esc(cfg.brand.qalamUrl)}" target="_blank" rel="noopener">${esc(cfg.brand.qalamLabel)}</a></li>` : "";
    $("#mFootSvc").innerHTML = visibleSvcs().map((s) => `<li><button type="button" data-open="svc:${esc(s.id)}">${md(L(s.short))}</button></li>`).join("") + q;
  };

  const renderPick = () => {
    const cur = ($('input[name="pakej"]:checked') || {}).value || (visibleSvcs()[0] || {}).id || "lain";
    const opts = visibleSvcs().map((s) => `
      <label class="pick__opt"><input type="radio" name="pakej" value="${esc(s.id)}" ${s.id === cur ? "checked" : ""}><span><b>${md(L(s.short))}</b><small>${esc(s.priceText)}</small></span></label>`).join("");
    $("#mPick").innerHTML = opts + `<label class="pick__opt"><input type="radio" name="pakej" value="lain" ${cur === "lain" ? "checked" : ""}><span><b>${md(T("op_other"))}</b><small>${md(T("op_otherSub"))}</small></span></label>`;
  };

  const renderSvcModal = (id) => {
    const s = svcById(id);
    if (!s) return false;
    openSvc = id;
    const hero = s.art === "khat" ? `<div class="modal__hero modal__hero--khat" aria-hidden="true"><span>${esc(s.artText || s.jawi)}</span></div>`
      : s.art === "web" ? '<div class="modal__hero modal__hero--web" aria-hidden="true"><span class="mock-site"><i></i><i></i><i></i><b></b><em></em><em></em><em></em></span></div>'
      : s.art === "video" ? `<div class="modal__hero modal__hero--video" aria-hidden="true"><span class="play">${icon("play")}</span></div>`
      : `<div class="modal__hero modal__hero--plain" aria-hidden="true"><span class="svc__icon ${s.icon === "jawi" ? "svc__icon--jawi" : ""}">${svcGlyph(s)}</span></div>`;
    const cta = s.ctaUrl
      ? `<a class="btn btn--primary" href="${esc(s.ctaUrl)}" target="_blank" rel="noopener"><span>${md(L(s.ctaLabel))}</span>${arrowUR}</a>` : "";
    $("#mSvc").innerHTML = `
      <button class="modal__x" type="button" data-close aria-label="${esc(T("aria_close"))}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      ${hero}
      <div class="modal__body">
        <p class="eyebrow">${md(T("m_service"))}</p>
        <h2 id="m-svc-t">${md(L(s.title))}</h2>
        <p class="price-tag price-tag--lg"><span>${esc(L(s.priceLead))}</span> <b>${esc(s.priceText)}</b></p>
        <p>${md(L(s.desc))}</p>
        <ul class="ticks ticks--grid">${s.features.map((f) => `<li>${md(L(f))}</li>`).join("")}</ul>
        ${L(s.note) ? `<p class="note">${md(L(s.note))}</p>` : ""}
        <div class="modal__actions">${cta}<button class="btn btn--outline" type="button" data-open="m-quote" data-plan="${esc(s.id)}">${md(T("cta_quote"))}</button></div>
      </div>`;
    return true;
  };

  const renderSeo = () => {
    document.title = cfg.seo.title;
    const m = $('meta[name="description"]');
    if (m) m.setAttribute("content", cfg.seo.description);
    const svcs = visibleSvcs();
    const mins = svcs.map((s) => Number(s.priceMin)).filter((n) => n > 0), maxs = svcs.map((s) => Number(s.priceMax)).filter((n) => n > 0);
    $("#ld-biz").textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "ProfessionalService", name: cfg.brand.name + " " + L(cfg.brand.subtitle),
      description: cfg.seo.description, telephone: "+" + cfg.brand.waNumber,
      priceRange: mins.length ? `RM${Math.min(...mins)} - RM${Math.max(...maxs, ...mins)}` : undefined,
      address: cfg.seo.address.map((a) => ({ "@type": "PostalAddress", addressLocality: a.locality, addressRegion: a.region, addressCountry: "MY" })),
      areaServed: "MY",
      hasOfferCatalog: { "@type": "OfferCatalog", name: "Perkhidmatan", itemListElement: svcs.map((s) => ({
        "@type": "Offer", itemOffered: { "@type": "Service", name: s.title.ms },
        priceSpecification: { "@type": "PriceSpecification", minPrice: Number(s.priceMin) || undefined, maxPrice: Number(s.priceMax) || undefined, priceCurrency: "MYR" } })) },
    });
    $("#ld-faq").textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: cfg.faq.map((f) => ({ "@type": "Question", name: f.q.ms, acceptedAnswer: { "@type": "Answer", text: f.a.ms } })),
    });
  };

  const renderSections = () => {
    $$("[data-section]").forEach((el) => { el.hidden = cfg.sections[el.dataset.section] === false; });
    $$('.nav__links a[href^="#"], .footer__col a[href^="#"]').forEach((a) => {
      const sec = document.getElementById(a.getAttribute("href").slice(1));
      const hide = Boolean(sec && sec.dataset.section && sec.hidden);
      const host = a.closest("li") || a;
      host.hidden = hide;
    });
  };

  // ===================== REVEAL & COUNTER =====================
  const revealIO = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); o.unobserve(e.target); } }), { threshold: 0.12 })
    : null;
  const counterIO = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); o.unobserve(e.target); } }), { threshold: 0.6 })
    : null;
  const runCounter = (el) => {
    const target = Number(el.dataset.count), t0 = performance.now();
    const tick = (now) => { const p = Math.min((now - t0) / 1400, 1); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const bindMotion = () => {
    $$(".reveal:not(.is-in)").forEach((el) => {
      if (!revealIO || !first) { el.classList.add("is-in"); return; }
      const sibs = $$(":scope > .reveal", el.parentElement);
      el.style.setProperty("--d", Math.min(Math.max(sibs.indexOf(el), 0), 4) * 0.09 + "s");
      revealIO.observe(el);
    });
    if (first && counterIO) $$("[data-count]").forEach((c) => { c.textContent = "0"; counterIO.observe(c); });
  };

  // ===================== APPLY =====================
  const apply = (scope = "all") => {
    C.applyTheme(cfg.theme);
    if (scope === "theme") return;
    if (scope !== "albums") {
      renderBrand(); renderStatic(); renderHero(); renderTicker(); renderStats(); renderProblems(); renderServices();
      renderSteps(); renderWorks(); renderPlans(); renderAbout(); renderFaq(); renderFooter(); renderPick();
      renderSeo(); renderSections();
      if ($("#m-svc").open && openSvc) renderSvcModal(openSvc);
    }
    if (scope === "all" || scope === "albums") renderAlbums();
    if (albumsNear) ensureAlbumImages(activeAlbum);
    bindMotion();
    first = false;
  };

  // Jadual penjadualan: gabungkan perubahan dalam satu bingkai (tanpa kelewatan yang ketara)
  let pending = null, raf = 0;
  const mergeScope = (a, b) => (!a ? b : a === b ? a : a === "all" || b === "all" ? "all" : a === "theme" ? b : b === "theme" ? a : "all");
  const schedule = (scope) => {
    pending = mergeScope(pending, scope);
    if (raf) return;
    raf = requestAnimationFrame(() => { const s = pending; pending = null; raf = 0; apply(s); });
  };
  const scopeOf = (path) => (path.startsWith("theme") ? "theme" : path.startsWith("albums") ? "albums" : "rest");

  const onMsg = (m) => {
    if (!m || m.iy !== 1) return;
    if (m.type === "full") { cfg = C.merge(m.cfg, DEFS); ingestImages(cfg); schedule("all"); }
    else if (m.type === "set") { C.setPath(cfg, m.path, m.value); schedule(scopeOf(m.path)); }
  };
  const ch = C.channel();
  if (ch) ch.onmessage = (e) => onMsg(e.data);
  window.addEventListener("message", (e) => { if (e.source === window.parent && e.data) onMsg(e.data); });

  // ===================== NAVBAR, MENU, SCROLL =====================
  const nav = $("#nav"), menu = $("#menu"), menuBtn = $("#menuBtn"), mbar = $("#mbar"), hero = $(".hero"), contact = $("#hubungi");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
    const pastHero = window.scrollY > hero.offsetHeight * 0.6;
    const atContact = !contact.hidden && contact.getBoundingClientRect().top < window.innerHeight * 0.85;
    mbar.classList.toggle("is-visible", pastHero && !atContact);
    if (window.scrollY < hero.offsetHeight * 0.5) $$(".nav__links a").forEach((a) => a.classList.remove("is-active"));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? T("msg_menuClose") : T("msg_menuOpen"));
  };
  menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) $$(".nav__links a[href^='#']").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => spy.observe(s));
  }

  // ===================== POP-UP =====================
  const openModal = (id, plan) => {
    let dlg;
    if (id.startsWith("svc:")) { if (!renderSvcModal(id.slice(4))) return; dlg = $("#m-svc"); } else dlg = document.getElementById(id);
    if (!dlg) return;
    $$("dialog[open]").forEach((d) => { if (d !== dlg) d.close(); });
    if (plan) { const r = $(`input[name="pakej"][value="${CSS.escape(plan)}"]`); if (r) r.checked = true; }
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    const card = $(".modal__card", dlg);
    if (card) { card.scrollTop = 0; card.focus({ preventScroll: true }); }
  };
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) { e.preventDefault(); setMenu(false); openModal(opener.dataset.open, opener.dataset.plan); return; }
    const closer = e.target.closest("[data-close]");
    if (closer) { closer.closest("dialog").close(); return; }
    const tab = e.target.closest("#mTabs .seg__tab");
    if (tab) { selectAlbum(tab.dataset.album); return; }
    const fr = e.target.closest("[data-lb]");
    if (fr) {
      const [a, i] = fr.dataset.lb.split(":").map(Number);
      const src = cfg.albums[a] && cfg.albums[a].images[i];
      if (!src) return;
      $("#lbImg").src = src; $("#lbImg").alt = T("msg_photo");
      const lb = $("#lightbox"); if (lb.showModal) lb.showModal();
      return;
    }
    if (e.target.tagName === "DIALOG") e.target.close();
    if (menu.classList.contains("is-open") && !nav.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest && e.target.closest("#mTabs .seg__tab");
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const tabs = $$("#mTabs .seg__tab"), i = tabs.indexOf(tab), n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    selectAlbum(n.dataset.album); n.focus();
  });
  window.addEventListener("resize", movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

  $("#copyNum").addEventListener("click", () => {
    const msg = $("#copyMsg"), num = cfg.brand.phoneDisplay.replace(/\D/g, "");
    const done = (ok) => { msg.textContent = ok ? T("msg_copied") : T("msg_copyFail"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(() => done(true), () => done(false)); else done(false);
  });

  // ===================== BAHASA =====================
  const setLang = (next) => {
    lang = next; html.lang = next; apply("all");
    try { localStorage.setItem("iy-lang", next); } catch (_) { /* storan disekat */ }
  };
  $("#langBtn").addEventListener("click", () => setLang(lang === "ms" ? "en" : "ms"));

  // ===================== BORANG -> WHATSAPP =====================
  const form = $("#form"), status = $("#formStatus");
  const setErr = (name, msg) => { const b = $(`[data-err="${name}"]`, form); b.textContent = msg; b.closest(".field").classList.toggle("is-invalid", Boolean(msg)); };
  const validPhone = (v) => /^(\+?6?0)1\d{8,9}$/.test(v.replace(/[\s-]/g, ""));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = form.nama.value.trim(), tel = form.telefon.value.trim();
    const badName = nama.length < 2, badTel = !validPhone(tel);
    setErr("nama", badName ? T("msg_errName") : "");
    setErr("telefon", badTel ? T("msg_errPhone") : "");
    if (badName || badTel) { (badName ? form.nama : form.telefon).focus(); return; }
    const picked = $('input[name="pakej"]:checked', form);
    const planText = picked ? picked.nextElementSibling.querySelector("b").textContent : "";
    const text = [L(cfg.t["msg_waIntro"]) || T("msg_waIntro"), `${T("msg_name")}: ${nama}`, `${T("msg_phone")}: ${tel}`, `${T("msg_plan")}: ${planText}`,
      form.mesej.value.trim() ? `${T("msg_msg")}: ${form.mesej.value.trim()}` : ""].filter(Boolean).join("\n");
    const url = waUrl(text);
    if (dbOk && !inPreview) DB.addLead({ name: nama, phone: tel, plan: planText, message: form.mesej.value.trim(), lang }).catch(() => { /* mesej tetap ke WhatsApp */ });
    status.textContent = T("msg_ok") + " ";
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = T("msg_openWa");
    status.appendChild(a);
    window.open(url, "_blank", "noopener");
    form.nama.value = ""; form.telefon.value = ""; form.mesej.value = "";
  });

  // ===================== STATISTIK PELAWAT =====================
  // Kunci harian ikut tarikh Malaysia (UTC+8): bertukar pukul 12 tengah malam. Setiap lawatan menambah kunci harian
  // DAN kunci keseluruhan, jadi jumlah harian sentiasa masuk dalam keseluruhan. Seorang dikira sekali sehari bagi setiap pelayar.
  const fmt = (n) => Number(n).toLocaleString("ms-MY");
  const myDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
  const visCall = (op, key) => fetch(`${cfg.visits.api}/${op}/${cfg.visits.ns}/${key}`)
    .then((r) => (r.status === 404 ? { value: 0 } : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => Number(j.value) || 0);
  const visitsAbacus = (op, day) => Promise.all([visCall(op, "d-" + day), visCall(op, "total")]);
  const visitsDb = async (op, day) => {
    if (op === "hit") await DB.hit("d-" + day);
    return Promise.all([DB.getStat("d-" + day), DB.getStat("total")]);
  };
  const loadVisits = () => {
    if (cfg.sections.visits === false) return;
    const day = myDay();
    let counted = false, canStore = true;
    try { counted = localStorage.getItem("iy-counted") === day; } catch (_) { canStore = false; }
    const op = counted || !canStore || navigator.webdriver || inPreview ? "get" : "hit";
    (dbOk ? visitsDb(op, day) : visitsAbacus(op, day)).then(([d, tot]) => {
      $("#visToday").textContent = fmt(d); $("#visTotal").textContent = fmt(Math.max(tot, d));
      if (op === "hit") { try { localStorage.setItem("iy-counted", day); } catch (_) { /* storan disekat */ } }
    }).catch(() => { /* kekal paparan "—" */ });
  };

  // ===================== KESAN KLIK: letusan kecil + bunyi lembut =====================
  let actx = null;
  const tone = (freq, t0, dur, vol) => {
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = "sine"; o.frequency.value = freq; f.type = "lowpass"; f.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f); f.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const clickSound = (strong) => {
    if (cfg.effects && cfg.effects.sound === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime;
      if (strong) { tone(659.25, t, 0.16, 0.035); tone(987.77, t + 0.07, 0.22, 0.03); } // butang/pautan: dua nota lembut (E5, B5)
      else tone(783.99, t, 0.09, 0.02); // klik biasa: satu ketukan halus (G5)
    } catch (_) { /* audio tidak disokong */ }
  };
  const burst = (x, y) => {
    const b = document.createElement("span");
    b.className = "pop-burst"; b.style.left = x + "px"; b.style.top = y + "px";
    b.innerHTML = '<i class="pop-ring"></i>' + [0, 60, 120, 180, 240, 300].map((a) => `<i style="--a:${a}deg"></i>`).join("");
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 650);
  };
  document.addEventListener("click", (e) => {
    if (inPreview || !e.isTrusted) return;
    clickSound(Boolean(e.target.closest("a, button, summary, label, select, [role=tab]")));
    if (reduceMotion) return;
    let x = e.clientX, y = e.clientY;
    if (!x && !y) { const r = e.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; } // klik dari papan kekunci
    burst(x, y);
  }, true);

  // ===================== MULA =====================
  let saved = null;
  try { saved = localStorage.getItem("iy-lang"); } catch (_) { /* storan disekat */ }
  if (saved === "en") lang = "en";
  html.lang = lang;
  apply("all"); // lukis serta-merta dengan data lalai supaya tiada skrin kosong

  const startRemote = async () => {
    if (!DB || !DB.configured()) return false;
    try { await DB.init(); } catch (_) { return false; }
    if (inPreview) return true; // pratonton admin: baca statistik sahaja
    remoteMode = true;
    const cached = await C.kv.get("remote-cfg"); // paparan pertama pantas sebelum pangkalan data menjawab
    if (cached) { cfg = fromRemote(cached); apply("all"); }
    DB.watchConfig((data) => { if (!data) return; cfg = fromRemote(data); C.kv.set("remote-cfg", data); apply("all"); }, () => { /* kekal dengan paparan sedia ada */ });
    return true;
  };

  C.loadConfig().then(async (loaded) => {
    if ((loaded.rev || 0) !== (cfg.rev || 0)) { cfg = loaded; apply("all"); }
    dbOk = await startRemote();
    loadVisits();
  });
  // Muat gambar galeri hanya bila bahagian testimoni hampir kelihatan (jimat bacaan pangkalan data)
  if ("IntersectionObserver" in window) {
    const near = new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { albumsNear = true; ensureAlbumImages(activeAlbum); o.disconnect(); } }), { rootMargin: "800px 0px" });
    near.observe($("#testimoni"));
  } else albumsNear = true;
  if (inPreview) window.parent.postMessage({ iy: 1, type: "ready" }, "*");
})();

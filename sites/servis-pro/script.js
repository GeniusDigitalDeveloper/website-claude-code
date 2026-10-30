// Servis Pro — interaksi: navbar, menu mobile, reveal, counter, borang -> WhatsApp
(() => {
  "use strict";

  const WA_NUMBER = "60123456789"; // GANTI dengan nombor WhatsApp sebenar (format 60...)
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  document.documentElement.classList.add("js");
  $("#year").textContent = new Date().getFullYear();

  // ----- Navbar: latar bila scroll + bar CTA mobile -----
  const nav = $("#nav");
  const mbar = $("#mbar");
  const hero = $(".hero");
  const contact = $("#hubungi");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
    const pastHero = window.scrollY > hero.offsetHeight * 0.6;
    const atContact = contact.getBoundingClientRect().top < window.innerHeight * 0.8;
    mbar.classList.toggle("is-visible", pastHero && !atContact);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ----- Menu mobile -----
  const menu = $("#menu");
  const menuBtn = $("#menuBtn");
  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    nav.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  };
  menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
  });

  // ----- Pautan aktif mengikut seksyen -----
  const links = $$('.nav__links a[href^="#"]:not(.btn)');
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  // ----- Reveal bila scroll (stagger ringan dalam kumpulan) -----
  const reveals = $$(".reveal");
  reveals.forEach((el) => {
    const sibs = $$(".reveal", el.parentElement);
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 4) * 0.08 + "s");
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach((el) => io.observe(el));
  }

  // ----- Counter angka -----
  const counters = $$("[data-count]");
  const runCounter = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const dur = 1400;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCounter(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((c) => { c.textContent = "0"; co.observe(c); });
  }

  // ----- CTA kad/pakej: pilih servis pada borang -----
  const select = $("#servis");
  $$("[data-service]").forEach((a) => {
    a.addEventListener("click", () => {
      const v = a.dataset.service;
      const opt = [...select.options].find((o) => o.text === v);
      if (opt) select.value = opt.value;
    });
  });

  // ----- Borang: pengesahan + hantar ke WhatsApp -----
  const form = $("#form");
  const status = $("#formStatus");
  const setErr = (name, msg) => {
    const box = $(`[data-err="${name}"]`, form);
    box.textContent = msg;
    box.closest(".field").classList.toggle("is-invalid", Boolean(msg));
  };
  const validPhone = (v) => /^(\+?6?0)1\d{8,9}$/.test(v.replace(/[\s-]/g, ""));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = form.nama.value.trim();
    const telefon = form.telefon.value.trim();
    let ok = true;

    setErr("nama", nama.length < 2 ? "Sila isi nama anda." : "");
    setErr("telefon", validPhone(telefon) ? "" : "Sila isi no. telefon Malaysia yang sah, cth 012-3456789.");
    if (nama.length < 2 || !validPhone(telefon)) ok = false;
    if (!ok) { (form.querySelector(".is-invalid input") || form.nama).focus(); return; }

    const text = [
      "Hai Servis Pro, saya nak sebut harga.",
      `Nama: ${nama}`,
      `Telefon: ${telefon}`,
      `Minat: ${form.servis.value}`,
      form.mesej.value.trim() ? `Mesej: ${form.mesej.value.trim()}` : "",
    ].filter(Boolean).join("\n");

    status.className = "form__status is-ok";
    status.textContent = "Terima kasih! Kami buka WhatsApp untuk sambung, dan akan balas dalam 24 jam.";
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    form.reset();
  });
})();

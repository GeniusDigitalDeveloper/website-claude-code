// KLINIK GIGI SUMAYYAH — paparan awam (data realtime dari Firestore + Realtime Database)
import { db, rtdb } from "./firebase.js";
import { DEFAULTS } from "./defaults.js";
import { doc, collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icons = () => window.lucide && window.lucide.createIcons();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const bySusunan = (a, b) => (a.susunan ?? 999) - (b.susunan ?? 999);

const state = {
  umum: { ...DEFAULTS.umum },
  hero: { ...DEFAULTS.hero },
  statistik: DEFAULTS.statistik,
  kelebihan: DEFAULTS.kelebihan,
  banner: DEFAULTS.banner,
  perkhidmatan: DEFAULTS.perkhidmatan,
  pakej: DEFAULTS.pakej,
  galeri: DEFAULTS.galeri,
  doktor: DEFAULTS.doktor,
  testimoni: DEFAULTS.testimoni,
  soalan: DEFAULTS.soalan,
  status: { ...DEFAULTS.status },
  seeded: false,
};

/* ---------------- Render ---------------- */
function renderUmum() {
  const u = state.umum;
  $$("[data-f]").forEach((el) => { const v = u[el.dataset.f]; if (v !== undefined) el.textContent = v; });
  const waNum = String(u.whatsapp || "").replace(/\D/g, "");
  const waText = encodeURIComponent(`Assalamualaikum ${u.namaKlinik}, saya ingin bertanya tentang rawatan gigi.`);
  $$("[data-wa]").forEach((a) => (a.href = `https://wa.me/${waNum}?text=${waText}`));
  $$("[data-f-wa]").forEach((el) => (el.textContent = waNum ? "+" + waNum : ""));
  $$("[data-tel]").forEach((a) => (a.href = "tel:" + String(u.telefon || "").replace(/[^\d+]/g, "")));
  $$("[data-mail]").forEach((a) => (a.href = "mailto:" + (u.emel || "")));
  $$("[data-social]").forEach((a) => { const v = u[a.dataset.social]; a.href = v || "#"; a.hidden = !v; });
  $$("[data-logo]").forEach((img) => {
    if (u.logo) { img.src = u.logo; img.classList.remove("default"); }
    else { img.src = "img/logo.svg"; img.classList.add("default"); }
  });
  if (u.logo) $("#favicon").href = u.logo;
  const map = $("[data-map]");
  if (map && u.petaEmbed && map.getAttribute("src") !== u.petaEmbed) map.src = u.petaEmbed;
  const hrs = (u.waktuOperasi || []).map((w) => `<li><strong>${esc(w.hari)}</strong><span>${esc(w.masa)}</span></li>`).join("");
  $$("[data-hours]").forEach((ul) => (ul.innerHTML = hrs));
  document.title = `${u.namaKlinik} — Klinik Pergigian Keluarga`;
  renderOpen();
}

function renderHero() {
  const h = state.hero;
  $$("[data-h]").forEach((el) => (el.textContent = h[el.dataset.h] || ""));
  const img = $("[data-h-img]");
  if (h.imej && img.getAttribute("src") !== h.imej) img.src = h.imej;
}

function renderStats() {
  $("#stats").innerHTML = state.statistik
    .map((s) => `<div class="stat"><div class="stat-num grad-text" data-count="${Number(s.nilai) || 0}" data-suffix="${esc(s.akhiran)}">${esc(s.nilai)}${esc(s.akhiran)}</div><div class="stat-label">${esc(s.label)}</div></div>`)
    .join("");
  countObserver();
}

function renderWhy() {
  $("#why").innerHTML = state.kelebihan
    .map((k, i) => `<div class="why-item reveal" style="--d:${(i % 3) * 0.08}s"><div class="ic"><i data-lucide="${esc(k.ikon || "check")}"></i></div><div><h3>${esc(k.tajuk)}</h3><p>${esc(k.teks)}</p></div></div>`)
    .join("");
}

let slideIdx = 0, slideTimer;
function renderBanner() {
  const list = state.banner.filter((b) => b.aktif !== false).sort(bySusunan);
  $("#promosi").hidden = list.length === 0;
  $("#slides").innerHTML = list
    .map((b, i) => `<div class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} daripada ${list.length}">
      ${b.imej ? `<img src="${esc(b.imej)}" alt="" loading="${i ? "lazy" : "eager"}" />` : ""}
      <div class="slide-body"><span class="slide-tag">Promosi</span><h3>${esc(b.tajuk)}</h3><p>${esc(b.teks)}</p>
      <button class="btn btn-primary" data-book>${esc(b.labelCta || "Tempah Sekarang")}<i data-lucide="arrow-up-right"></i></button></div></div>`)
    .join("");
  $("#sliderDots").innerHTML = list.map((_, i) => `<button role="tab" aria-label="Banner ${i + 1}"></button>`).join("");
  $$("#sliderDots button").forEach((b, i) => b.addEventListener("click", () => goSlide(i, true)));
  $(".slider-nav").hidden = list.length < 2;
  goSlide(Math.min(slideIdx, Math.max(list.length - 1, 0)));
  autoSlide();
}
function goSlide(i, user) {
  const n = $$("#slides .slide").length;
  if (!n) return;
  slideIdx = (i + n) % n;
  $("#slides").style.transform = `translateX(-${slideIdx * 100}%)`;
  $$("#sliderDots button").forEach((b, j) => { b.classList.toggle("active", j === slideIdx); b.setAttribute("aria-selected", j === slideIdx); });
  if (user) autoSlide();
}
function autoSlide() {
  clearInterval(slideTimer);
  if (!reduceMotion) slideTimer = setInterval(() => goSlide(slideIdx + 1), 6000);
}

let svcFilter = "Semua";
function renderServices() {
  const list = state.perkhidmatan.filter((s) => s.aktif !== false);
  const cats = ["Semua", ...new Set(list.map((s) => s.kategori).filter(Boolean))];
  if (!cats.includes(svcFilter)) svcFilter = "Semua";
  $("#svcChips").innerHTML = cats.map((c) => `<button class="chip ${c === svcFilter ? "active" : ""}" role="tab" aria-selected="${c === svcFilter}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $("#svcGrid").innerHTML = list
    .map((s, i) => `<button class="svc-card reveal ${svcFilter !== "Semua" && s.kategori !== svcFilter ? "hide" : ""}" style="--d:${(i % 4) * 0.06}s" data-svc="${i}" data-cat="${esc(s.kategori)}">
      <span class="svc-tag">${esc(s.kategori)}</span>
      <span class="ic"><i data-lucide="${esc(s.ikon || "smile")}"></i></span>
      <h3>${esc(s.nama)}</h3><p>${esc(s.ringkasan)}</p>
      <span class="svc-meta"><span class="price">${s.hargaDari ? "Dari " + esc(s.hargaDari) : ""}</span><span class="more">Butiran <i data-lucide="arrow-up-right"></i></span></span>
    </button>`)
    .join("");
  $$("#svcGrid [data-svc]").forEach((b) => b.addEventListener("click", () => openService(list[+b.dataset.svc])));
  $$("#svcChips .chip").forEach((c) =>
    c.addEventListener("click", () => {
      svcFilter = c.dataset.cat;
      $$("#svcChips .chip").forEach((x) => { x.classList.toggle("active", x === c); x.setAttribute("aria-selected", x === c); });
      $$("#svcGrid .svc-card").forEach((card) => card.classList.toggle("hide", svcFilter !== "Semua" && card.dataset.cat !== svcFilter));
    })
  );
  $("#bSvc").innerHTML = `<option value="">— Pilih rawatan —</option>` + list.map((s) => `<option>${esc(s.nama)}</option>`).join("") + `<option>Lain-lain / Tidak pasti</option>`;
  $("#footSvc").innerHTML = list.slice(0, 6).map((s) => `<li><a href="#perkhidmatan">${esc(s.nama)}</a></li>`).join("");
}

function renderPakej() {
  $("#pakej").hidden = state.pakej.length === 0;
  $("#priceGrid").innerHTML = [...state.pakej].sort(bySusunan)
    .map((p, i) => `<div class="price-card reveal ${p.popular ? "popular" : ""}" style="--d:${i * 0.1}s">
      ${p.popular ? `<span class="price-badge">Paling popular</span>` : ""}
      <h3>${esc(p.nama)}</h3><div class="price-amt">${esc(p.harga)}</div><p class="price-note">${esc(p.nota)}</p>
      <ul>${(p.ciri || []).map((c) => `<li><i data-lucide="circle-check"></i>${esc(c)}</li>`).join("")}</ul>
      <button class="btn ${p.popular ? "btn-primary" : "btn-ghost"} btn-block" data-book data-svc-name="${esc(p.nama)}">Pilih pakej</button>
    </div>`)
    .join("");
}

function renderDoktor() {
  $("#doktor").hidden = state.doktor.length === 0;
  $("#docGrid").innerHTML = [...state.doktor].sort(bySusunan)
    .map((d, i) => {
      const initial = esc((d.nama || "?").replace(/^Dr\.?\s*/i, "").charAt(0));
      return `<article class="doc-card reveal" style="--d:${i * 0.08}s">
        <div class="doc-photo">${d.imej ? `<img src="${esc(d.imej)}" alt="${esc(d.nama)}" loading="lazy" />` : `<span class="doc-initial" aria-hidden="true">${initial}</span>`}</div>
        <div class="doc-body"><h3>${esc(d.nama)}</h3><div class="doc-role">${esc(d.jawatan)}</div><p class="doc-qual">${esc(d.kelayakan)}</p></div>
      </article>`;
    })
    .join("");
}

let galList = [], lbIdx = 0;
function renderGaleri() {
  galList = [...state.galeri].sort(bySusunan);
  $("#galeri").hidden = galList.length === 0;
  $("#gallery").innerHTML = galList
    .map((g, i) => `<button class="g-item reveal" data-g="${i}" aria-label="Buka gambar: ${esc(g.kapsyen)}"><img src="${esc(g.imej)}" alt="${esc(g.kapsyen)}" loading="lazy" /><span class="g-cap">${esc(g.kapsyen)}<i data-lucide="eye"></i></span></button>`)
    .join("");
  $$("#gallery [data-g]").forEach((b) => b.addEventListener("click", () => openLightbox(+b.dataset.g)));
}

function renderTestimoni() {
  $("#testimoni").hidden = state.testimoni.length === 0;
  $("#testiGrid").innerHTML = [...state.testimoni].sort(bySusunan)
    .map((t, i) => {
      const r = Math.max(1, Math.min(5, Number(t.rating) || 5));
      return `<figure class="testi reveal" style="--d:${(i % 4) * 0.08}s"><i class="q" data-lucide="quote"></i>
        <span class="stars" aria-label="${r} bintang">${'<i data-lucide="star"></i>'.repeat(r)}</span>
        <p>${esc(t.teks)}</p>
        <figcaption class="testi-who"><span class="avatar">${esc((t.nama || "?").replace(/^(Puan|Encik|Cik|Tuan)\s+/i, "").charAt(0))}</span><strong>${esc(t.nama)}</strong></figcaption></figure>`;
    })
    .join("");
}

function renderFaq() {
  $("#faqList").innerHTML = [...state.soalan].sort(bySusunan)
    .map((f, i) => `<div class="faq reveal ${i === 0 ? "open" : ""}" style="--d:${i * 0.04}s">
      <button class="faq-q" aria-expanded="${i === 0}" aria-controls="faq${i}">${esc(f.soalan)}<span class="ic"><i data-lucide="chevron-down"></i></span></button>
      <div class="faq-a" id="faq${i}" role="region"><div><p>${esc(f.jawapan)}</p></div></div></div>`)
    .join("");
  $$("#faqList .faq-q").forEach((q) =>
    q.addEventListener("click", () => {
      const item = q.parentElement, open = !item.classList.contains("open");
      $$("#faqList .faq").forEach((f) => { f.classList.remove("open"); $(".faq-q", f).setAttribute("aria-expanded", "false"); });
      if (open) { item.classList.add("open"); q.setAttribute("aria-expanded", "true"); }
    })
  );
}

/* Status buka/tutup + pengumuman (Realtime Database) */
function fmt12(hhmm) {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  const tag = h < 12 ? "pagi" : h < 14 ? "tengah hari" : h < 19 ? "petang" : "malam";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${tag}`;
}
function renderOpen() {
  const j = state.umum.jadual || DEFAULTS.umum.jadual;
  const mode = state.status.modOperasi || "auto";
  let open;
  if (mode === "buka") open = true;
  else if (mode === "tutup") open = false;
  else {
    // Waktu Malaysia, tidak kira zon masa peranti pelawat
    const [hh, mm] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
    const mins = hh * 60 + mm;
    const toM = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
    open = mins >= toM(j.buka) && mins < toM(j.tutup);
  }
  $$("[data-open-text]").forEach((el) => (el.textContent = open ? "Buka sekarang" : "Tutup sekarang"));
  $$("[data-open-badge]").forEach((el) => el.classList.toggle("closed", !open));
  $$("[data-today-hours]").forEach((el) => (el.textContent = `${fmt12(j.buka)} - ${fmt12(j.tutup)}`));
  const masa = $("#bMasa");
  if (masa && !masa.options.length) {
    const opts = [];
    for (let t = toMin(j.buka); t < toMin(j.tutup); t += 30) opts.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    masa.innerHTML = `<option value="">Mana-mana masa</option>` + opts.map((o) => `<option value="${o}">${fmt12(o)}</option>`).join("");
  }
}
const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };

let announceDismissed = sessionStorage.getItem("announceClosed") || "";
function renderAnnounce() {
  const s = state.status;
  const show = s.pengumumanAktif && s.pengumuman && announceDismissed !== s.pengumuman;
  $("#announceText").textContent = s.pengumuman || "";
  $("#announce").classList.toggle("show", !!show);
}

/* ---------------- Render semua ---------------- */
const renderers = { umum: renderUmum, hero: renderHero, statistik: renderStats, kelebihan: renderWhy, banner: renderBanner, perkhidmatan: renderServices, pakej: renderPakej, galeri: renderGaleri, doktor: renderDoktor, testimoni: renderTestimoni, soalan: renderFaq };
function render(key) {
  (key ? [renderers[key]] : Object.values(renderers)).forEach((fn) => fn());
  icons();
  observeReveal();
}

/* ---------------- Firestore realtime ---------------- */
function listen() {
  onSnapshot(doc(db, "tetapan", "umum"), (snap) => {
    state.seeded = snap.exists();
    if (snap.exists()) state.umum = { ...DEFAULTS.umum, ...snap.data() };
    render("umum");
  }, (e) => console.warn("umum:", e.code));
  for (const [key, docId] of [["hero", "hero"], ["statistik", "statistik"], ["kelebihan", "kelebihan"]]) {
    onSnapshot(doc(db, "tetapan", docId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      state[key] = key === "hero" ? { ...DEFAULTS.hero, ...d } : d.senarai || [];
      render(key);
    }, (e) => console.warn(key, e.code));
  }
  for (const col of ["banner", "perkhidmatan", "pakej", "galeri", "doktor", "testimoni", "soalan"]) {
    onSnapshot(collection(db, col), (snap) => {
      // Selagi admin belum "Isi Data Contoh", koleksi kosong guna kandungan contoh.
      if (snap.empty && !state.seeded) return;
      state[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(bySusunan);
      render(col);
    }, (e) => console.warn(col, e.code));
  }
  onValue(ref(rtdb, "status"), (snap) => {
    if (snap.exists()) state.status = { ...DEFAULTS.status, ...snap.val() };
    renderAnnounce();
    renderOpen();
  }, (e) => console.warn("status:", e.code));
}

/* ---------------- Interaksi ---------------- */
let revealIO;
function observeReveal() {
  if (reduceMotion || !("IntersectionObserver" in window)) { $$(".reveal").forEach((el) => el.classList.add("in")); return; }
  revealIO ||= new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal:not(.in)").forEach((el) => revealIO.observe(el));
}

function countObserver() {
  const els = $$("[data-count]");
  const run = (el) => {
    const target = parseFloat(el.dataset.count), suf = el.dataset.suffix, dec = String(target).includes(".") ? 1 : 0;
    if (reduceMotion) return;
    const t0 = performance.now(), dur = 1800;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - p, 4));
      el.textContent = (dec ? v.toFixed(1) : Math.round(v).toLocaleString("en-MY")) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

// Modal
let lastFocus;
function openModal(id) {
  lastFocus = document.activeElement;
  const m = $("#" + id);
  m.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => $(".modal-close", m)?.focus(), 50);
}
function closeModal(m) {
  m.classList.remove("open");
  if (!$(".modal.open")) document.body.style.overflow = "";
  lastFocus?.focus?.();
}
document.addEventListener("click", (e) => {
  const closer = e.target.closest("[data-close-modal]");
  if (closer) closeModal(closer.closest(".modal"));
  const book = e.target.closest("[data-book]");
  if (book) openBooking(book.dataset.svcName);
  if (e.target.closest("[data-close-drawer]")) toggleDrawer(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { $$(".modal.open").forEach(closeModal); toggleDrawer(false); }
  if ($("#lightbox").classList.contains("open")) {
    if (e.key === "ArrowRight") lbGo(1);
    if (e.key === "ArrowLeft") lbGo(-1);
  }
});

function openService(s) {
  $("#svcIc").innerHTML = `<i data-lucide="${esc(s.ikon || "smile")}"></i>`;
  $("#svcTitle").textContent = s.nama;
  $("#svcDesc").textContent = s.butiran || s.ringkasan;
  $("#svcPrice").textContent = s.hargaDari || "Hubungi kami";
  $("#svcTime").textContent = s.tempoh || "—";
  $("#svcBook").onclick = () => { closeModal($("#svcModal")); openBooking(s.nama); };
  icons();
  openModal("svcModal");
}

function openBooking(svcName) {
  $("#bookOk").hidden = true;
  $("#bookFormWrap").hidden = false;
  if (svcName) {
    const sel = $("#bSvc");
    if (![...sel.options].some((o) => o.value === svcName)) sel.add(new Option(svcName, svcName));
    sel.value = svcName;
  }
  $$(".modal.open").forEach((m) => m.classList.remove("open"));
  openModal("bookModal");
}

function openLightbox(i) { lbIdx = i; lbShow(); openModal("lightbox"); }
function lbShow() { const g = galList[lbIdx]; if (!g) return; $("#lbImg").src = g.imej; $("#lbImg").alt = g.kapsyen || ""; $("#lbCap").textContent = g.kapsyen || ""; }
function lbGo(d) { lbIdx = (lbIdx + d + galList.length) % galList.length; lbShow(); }
$("#lbPrev").addEventListener("click", () => lbGo(-1));
$("#lbNext").addEventListener("click", () => lbGo(1));

// Tempahan -> Firestore
const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
$("#bTarikh").min = today.toISOString().slice(0, 10);
$("#bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, data = Object.fromEntries(new FormData(f));
  for (const k of Object.keys(data)) data[k] = String(data[k]).trim();
  const missing = ["nama", "telefon", "perkhidmatan", "tarikh"].find((k) => !data[k]);
  if (missing) { toast("Sila lengkapkan semua maklumat wajib."); f.elements[missing].focus(); return; }
  if (!/^[0-9+\-\s]{8,20}$/.test(data.telefon)) { toast("No. telefon tidak sah."); f.elements.telefon.focus(); return; }
  for (const k of ["emel", "masa", "catatan"]) if (!data[k]) delete data[k];
  const btn = $("#bookSubmit");
  btn.disabled = true; btn.innerHTML = `<i data-lucide="loader-2"></i>Menghantar...`; icons();
  try {
    await addDoc(collection(db, "tempahan"), { ...data, status: "baru", dicipta: serverTimestamp() });
    f.reset();
    $("#bookFormWrap").hidden = true;
    $("#bookOk").hidden = false;
  } catch (err) {
    console.error(err);
    toast("Maaf, tempahan gagal dihantar. Sila cuba lagi atau WhatsApp kami.");
  } finally {
    btn.disabled = false; btn.innerHTML = `<i data-lucide="send"></i>Hantar Tempahan`; icons();
  }
});

let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3500); }

// Drawer
function toggleDrawer(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", !open);
  $("#menuBtn").setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : $(".modal.open") ? "hidden" : "";
}
$("#menuBtn").addEventListener("click", () => toggleDrawer(true));

// Slider
$("#slidePrev").addEventListener("click", () => goSlide(slideIdx - 1, true));
$("#slideNext").addEventListener("click", () => goSlide(slideIdx + 1, true));
$("#slider").addEventListener("mouseenter", () => clearInterval(slideTimer));
$("#slider").addEventListener("mouseleave", autoSlide);
let tx = 0;
$("#slider").addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
$("#slider").addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) goSlide(slideIdx + (dx < 0 ? 1 : -1), true); });

// Pengumuman
$("#announceClose").addEventListener("click", () => {
  announceDismissed = state.status.pengumuman;
  sessionStorage.setItem("announceClosed", announceDismissed);
  renderAnnounce();
});

// Header & butang ke atas
const onScroll = () => {
  const y = scrollY;
  $("#header").classList.toggle("scrolled", y > 20);
  $("#toTop").classList.toggle("show", y > 700);
};
addEventListener("scroll", onScroll, { passive: true });
$("#toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

// Nav aktif
const navIO = new IntersectionObserver((en) => en.forEach((e) => {
  if (e.isIntersecting) $$(".nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
$$("main section[id]").forEach((s) => navIO.observe(s));

// Gambar rosak -> sembunyi dengan kemas
document.addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.style.opacity = 0; }, true);
document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") e.target.style.opacity = ""; }, true);

$("#year").textContent = new Date().getFullYear();
setInterval(renderOpen, 60000);
render();
renderAnnounce();
onScroll();
listen();

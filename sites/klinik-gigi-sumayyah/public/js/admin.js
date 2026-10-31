// KLINIK GIGI SUMAYYAH — Panel Admin
import { db, rtdb, auth, ADMIN_UID } from "./firebase.js";
import { DEFAULTS } from "./defaults.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, collection, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icons = () => window.lucide?.createIcons();
const bySusunan = (a, b) => (a.susunan ?? 999) - (b.susunan ?? 999);

let toastT;
function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("bad", !!bad);
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 3200);
}
const fail = (e) => { console.error(e); toast("Ralat: " + (e.code || e.message), true); };

/* =========================================================
   Skema kandungan
   ========================================================= */
const ICON_HINT = "Nama ikon dari lucide.dev/icons, cth: smile, sparkles, shield-check, syringe, crown, anchor, sun, gem, baby, scan-line, heart-pulse, siren";
const COLS = {
  banner: {
    title: "Banner Promosi", icon: "megaphone", desc: "Slaid promosi di bawah hero. Boleh aktif/nyahaktif.",
    fields: [
      { k: "tajuk", l: "Tajuk", req: 1 },
      { k: "teks", l: "Teks", t: "textarea" },
      { k: "imej", l: "Gambar banner", t: "image", max: 1800 },
      { k: "labelCta", l: "Label butang", ph: "Tempah Sekarang" },
      { k: "aktif", l: "Aktif (dipapar)", t: "bool", def: true },
      { k: "susunan", l: "Susunan", t: "number" },
    ],
    card: (d) => ({ img: d.imej, title: d.tajuk, sub: d.teks, pill: d.aktif === false ? ["Tidak aktif", 1] : ["Aktif"] }),
  },
  perkhidmatan: {
    title: "Perkhidmatan", icon: "stethoscope", desc: "Senarai rawatan, harga dan butiran popup.",
    fields: [
      { k: "nama", l: "Nama rawatan", req: 1 },
      { k: "kategori", l: "Kategori", ph: "Am / Kosmetik / Ortodontik ...", list: "katList" },
      { k: "ikon", l: "Ikon", help: ICON_HINT, ph: "smile" },
      { k: "ringkasan", l: "Ringkasan (kad)", t: "textarea" },
      { k: "butiran", l: "Butiran penuh (popup)", t: "textarea" },
      { k: "hargaDari", l: "Harga dari", ph: "RM80", half: 1 },
      { k: "tempoh", l: "Anggaran tempoh", ph: "30 minit", half: 1 },
      { k: "aktif", l: "Aktif (dipapar)", t: "bool", def: true },
      { k: "susunan", l: "Susunan", t: "number" },
    ],
    card: (d) => ({ icon: d.ikon, title: d.nama, sub: `${d.kategori || ""} · ${d.hargaDari || ""}`, pill: d.aktif === false ? ["Tidak aktif", 1] : null }),
  },
  pakej: {
    title: "Pakej & Harga", icon: "tag", desc: "Kad pakej harga.",
    fields: [
      { k: "nama", l: "Nama pakej", req: 1 },
      { k: "harga", l: "Harga", ph: "RM99", req: 1, half: 1 },
      { k: "nota", l: "Nota kecil", half: 1 },
      { k: "ciri", l: "Senarai ciri", t: "list" },
      { k: "popular", l: "Tanda sebagai 'Paling popular'", t: "bool" },
      { k: "susunan", l: "Susunan", t: "number" },
    ],
    card: (d) => ({ icon: "tag", title: `${d.nama} — ${d.harga}`, sub: (d.ciri || []).join(", "), pill: d.popular ? ["Popular"] : null }),
  },
  doktor: {
    title: "Doktor", icon: "user-round", desc: "Profil doktor dan pasukan.",
    fields: [
      { k: "nama", l: "Nama", req: 1 },
      { k: "jawatan", l: "Jawatan" },
      { k: "kelayakan", l: "Kelayakan" },
      { k: "peringkat", l: "Kedudukan dalam carta", t: "select", opts: [["ketua", "Ketua (paling atas, cth: CEO)"], ["pembantu", "Pembantu ketua"], ["staf", "Staf"]], def: "staf" },
      { k: "imej", l: "Foto (kosongkan untuk guna huruf awal)", t: "image", max: 700 },
    ],
    card: (d) => ({ img: d.imej, icon: "user-round", title: d.nama, sub: d.jawatan }),
  },
  galeri: {
    title: "Galeri", icon: "images", desc: "Gambar galeri. Boleh muat naik banyak sekali gus.",
    fields: [
      { k: "imej", l: "Gambar", t: "image", max: 1600, req: 1 },
      { k: "kapsyen", l: "Kapsyen" },
      { k: "kategori", l: "Album", ph: "cth: Klinik / Rawatan / Sebelum & Selepas", list: "albumList", req: 1 },
      { k: "susunan", l: "Susunan", t: "number" },
    ],
    card: (d) => ({ img: d.imej, title: d.kapsyen || "(tiada kapsyen)", pill: [d.kategori || "Lain-lain"] }),
    bulk: true,
  },
  testimoni: {
    title: "Testimoni", icon: "quote", desc: "Ulasan pesakit.",
    fields: [
      { k: "nama", l: "Nama", req: 1 },
      { k: "teks", l: "Testimoni", t: "textarea", req: 1 },
      { k: "rating", l: "Rating (1-5)", t: "number", def: 5, min: 1, max: 5 },
      { k: "susunan", l: "Susunan", t: "number" },
    ],
    card: (d) => ({ icon: "quote", title: d.nama, sub: d.teks, pill: [`${d.rating || 5} bintang`] }),
  },
  soalan: {
    title: "Soalan Lazim", icon: "circle-help", desc: "FAQ di website.",
    fields: [
      { k: "soalan", l: "Soalan", req: 1 },
      { k: "jawapan", l: "Jawapan", t: "textarea", req: 1 },
      { k: "tarikh", l: "Tarikh (dipapar sebagai 'Dikemaskini')", t: "date", half: 1 },
      { k: "susunan", l: "Susunan", t: "number", half: 1 },
    ],
    card: (d) => ({ icon: "circle-help", title: d.soalan, sub: d.jawapan, pill: d.tarikh ? [d.tarikh] : null }),
  },
};

const UMUM_FIELDS = [
  { k: "namaKlinik", l: "Nama klinik", req: 1 },
  { k: "tagline", l: "Tagline" },
  { k: "logo", l: "Logo (PNG/SVG lutsinar disyorkan)", t: "image", max: 400, alpha: 1 },
  { k: "telefon", l: "No. telefon", ph: "03-8888 1234", half: 1 },
  { k: "whatsapp", l: "No. WhatsApp (format antarabangsa)", ph: "60123456789", half: 1 },
  { k: "emel", l: "E-mel", t: "email", half: 1 },
  { k: "noPendaftaran", l: "No. pendaftaran / lesen", half: 1 },
  { k: "alamat", l: "Alamat", t: "textarea" },
  { k: "petaEmbed", l: "Pautan peta (Google Maps embed)", help: "Google Maps → Kongsi → Benamkan peta → salin URL dalam src=\"...\". Atau guna: https://www.google.com/maps?q=NAMA+TEMPAT&output=embed" },
  { k: "facebook", l: "Facebook URL", half: 1 },
  { k: "instagram", l: "Instagram URL", half: 1 },
  { k: "tiktok", l: "TikTok URL" },
  { k: "waktuOperasi", l: "Waktu operasi (dipapar)", t: "pairs", sub: [{ k: "hari", ph: "Isnin - Jumaat" }, { k: "masa", ph: "9:00 pagi - 9:00 malam" }] },
  { k: "jadual.buka", l: "Jam buka (untuk status 'Buka sekarang')", t: "time", half: 1 },
  { k: "jadual.tutup", l: "Jam tutup", t: "time", half: 1 },
];
const HERO_FIELDS = [
  { k: "label", l: "Label kecil" },
  { k: "tajuk", l: "Tajuk utama", req: 1 },
  { k: "subtajuk", l: "Subtajuk", t: "textarea" },
  { k: "imej", l: "Gambar banner utama (hero)", t: "image", max: 1600 },
];
const STAT_FIELDS = [{ k: "senarai", l: "Statistik (nombor beranimasi)", t: "pairs", sub: [{ k: "nilai", ph: "25000", type: "number" }, { k: "akhiran", ph: "+" }, { k: "label", ph: "Pesakit dirawat" }] }];
const WHY_FIELDS = [{ k: "senarai", l: "Kelebihan (Kenapa pilih kami)", t: "pairs", sub: [{ k: "ikon", ph: "badge-check" }, { k: "tajuk", ph: "Tajuk" }, { k: "teks", ph: "Penerangan" }] }];

/* =========================================================
   Pembina borang
   ========================================================= */
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); let c = o; ks.slice(0, -1).forEach((k) => (c = c[k] ||= {})); c[ks.at(-1)] = v; };
let uid = 0;

function fieldHTML(f, data) {
  const v = getPath(data, f.k) ?? f.def ?? "";
  const id = "f" + uid++;
  const help = f.help ? `<small>${esc(f.help)}</small>` : "";
  const wrap = (inner) => `<div class="field" data-k="${f.k}" data-t="${f.t || "text"}" ${f.half ? 'data-half' : ""}>${inner}${help}</div>`;
  switch (f.t) {
    case "select":
      return wrap(`<label for="${id}">${esc(f.l)}</label><select id="${id}">${f.opts.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`);
    case "textarea":
      return wrap(`<label for="${id}">${esc(f.l)}</label><textarea id="${id}" ${f.req ? "required" : ""}>${esc(v)}</textarea>`);
    case "bool":
      return wrap(`<label class="check"><input type="checkbox" ${v ? "checked" : ""} /> ${esc(f.l)}</label>`);
    case "number":
      return wrap(`<label for="${id}">${esc(f.l)}</label><input id="${id}" type="number" step="any" ${f.min ? `min="${f.min}"` : ""} ${f.max ? `max="${f.max}"` : ""} value="${esc(v)}" ${f.req ? "required" : ""} />`);
    case "image":
      return wrap(`<span class="lbl">${esc(f.l)}</span>
        <div class="img-pick" data-max="${f.max || 1400}" ${f.alpha ? "data-alpha" : ""}>
          <div class="img-prev ${f.alpha ? "contain" : ""}" style="${v ? `background-image:url('${esc(v)}')` : ""}">${v ? "" : "Tiada gambar"}</div>
          <div class="img-actions">
            <input type="hidden" value="${esc(v)}" ${f.req ? "data-req" : ""} />
            <input type="file" accept="image/*" />
            <button type="button" class="btn" data-up><i data-lucide="upload"></i>Muat naik gambar</button>
            <div style="display:flex;gap:.4rem"><button type="button" class="btn" data-url style="flex:1"><i data-lucide="link"></i>Guna URL</button><button type="button" class="btn btn-danger" data-clear aria-label="Buang gambar"><i data-lucide="trash-2"></i></button></div>
          </div>
        </div>`);
    case "list":
      return wrap(`<span class="lbl">${esc(f.l)}</span><div class="rows">${(v || []).map((x) => rowHTML([{ ph: "" }], [x])).join("")}</div><button type="button" class="btn" data-add-row style="margin-top:.5rem;align-self:flex-start"><i data-lucide="plus"></i>Tambah</button>`);
    case "pairs":
      return wrap(`<span class="lbl">${esc(f.l)}</span><div class="rows" data-sub='${esc(JSON.stringify(f.sub))}'>${(v || []).map((x) => rowHTML(f.sub, f.sub.map((s) => x[s.k]))).join("")}</div><button type="button" class="btn" data-add-row style="margin-top:.5rem;align-self:flex-start"><i data-lucide="plus"></i>Tambah baris</button>`);
    default:
      return wrap(`<label for="${id}">${esc(f.l)}</label><input id="${id}" type="${f.t || "text"}" value="${esc(v)}" placeholder="${esc(f.ph || "")}" ${f.list ? `list="${f.list}"` : ""} ${f.req ? "required" : ""} />`);
  }
}
function rowHTML(sub, vals) {
  return `<div class="row">${sub.map((s, i) => `<input type="${s.type || "text"}" step="any" placeholder="${esc(s.ph || "")}" value="${esc(vals[i] ?? "")}" aria-label="${esc(s.ph || s.k || "nilai")}" />`).join("")}<button type="button" class="btn btn-icon btn-danger" data-del-row aria-label="Buang baris"><i data-lucide="x"></i></button></div>`;
}
function formHTML(fields, data) {
  let out = "", half = [];
  const flush = () => { if (half.length) { out += `<div class="grid2">${half.join("")}</div>`; half = []; } };
  for (const f of fields) {
    const h = fieldHTML(f, data);
    if (f.half) half.push(h); else { flush(); out += h; }
  }
  flush();
  return out;
}
function readForm(fields, root) {
  const out = {};
  for (const f of fields) {
    const el = $(`.field[data-k="${f.k}"]`, root);
    let v;
    switch (f.t) {
      case "bool": v = $("input", el).checked; break;
      case "number": v = $("input", el).value === "" ? (f.k === "susunan" ? 0 : null) : Number($("input", el).value); break;
      case "image": v = $("input[type=hidden]", el).value; break;
      case "list": v = $$(".row input", el).map((i) => i.value.trim()).filter(Boolean); break;
      case "pairs":
        v = $$(".row", el).map((r) => {
          const ins = $$("input", r), o = {};
          f.sub.forEach((s, i) => (o[s.k] = s.type === "number" ? Number(ins[i].value || 0) : ins[i].value.trim()));
          return o;
        }).filter((o) => Object.values(o).some((x) => x !== "" && x !== 0));
        break;
      default: v = ($("input,textarea,select", el).value || "").trim();
    }
    setPath(out, f.k, v);
  }
  return out;
}
function validate(fields, root) {
  for (const f of fields.filter((x) => x.req)) {
    const el = $(`.field[data-k="${f.k}"]`, root);
    const val = f.t === "image" ? $("input[type=hidden]", el).value : $("input,textarea", el).value.trim();
    if (!val) { toast(`"${f.l}" wajib diisi.`, true); $("input:not([type=hidden]),textarea,button", el)?.focus(); return false; }
  }
  return true;
}

// Interaksi medan (delegasi)
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-add-row")) {
    const rows = $(".rows", b.parentElement);
    const sub = rows.dataset.sub ? JSON.parse(rows.dataset.sub) : [{ ph: "" }];
    rows.insertAdjacentHTML("beforeend", rowHTML(sub, []));
    icons();
    $$(".row", rows).at(-1).querySelector("input").focus();
  }
  if (b.hasAttribute("data-del-row")) b.closest(".row").remove();
  const pick = b.closest(".img-pick");
  if (pick) {
    if (b.hasAttribute("data-up")) $("input[type=file]", pick).click();
    if (b.hasAttribute("data-url")) {
      const u = prompt("Tampal URL gambar (https://...)");
      if (u && /^https?:\/\//.test(u.trim())) setImg(pick, u.trim());
      else if (u) toast("URL mesti bermula dengan https://", true);
    }
    if (b.hasAttribute("data-clear")) setImg(pick, "");
  }
});
document.addEventListener("change", async (e) => {
  const inp = e.target;
  if (inp.type !== "file" || !inp.closest(".img-pick")) return;
  const pick = inp.closest(".img-pick"), file = inp.files[0];
  if (!file) return;
  try {
    $(".img-prev", pick).textContent = "Memproses...";
    setImg(pick, await compress(file, +pick.dataset.max, pick.hasAttribute("data-alpha")));
  } catch (err) { fail(err); }
  inp.value = "";
});
function setImg(pick, v) {
  $("input[type=hidden]", pick).value = v;
  const p = $(".img-prev", pick);
  p.style.backgroundImage = v ? `url('${v}')` : "";
  p.textContent = v ? "" : "Tiada gambar";
}

// Mampat gambar dalam pelayar -> data URL (disimpan terus dalam Firestore, had dokumen 1MB)
async function compress(file, maxDim = 1400, alpha = false) {
  if (file.type === "image/svg+xml") {
    if (file.size > 300000) throw new Error("Fail SVG terlalu besar (maks 300KB).");
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
  }
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Fail bukan gambar yang sah.")); i.src = url; });
  URL.revokeObjectURL(url);
  const LIMIT = 700000;
  let dim = maxDim;
  for (let attempt = 0; attempt < 6; attempt++) {
    const s = Math.min(1, dim / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext("2d");
    if (!alpha) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      let out = c.toDataURL("image/webp", q);
      if (!out.startsWith("data:image/webp")) out = alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", q);
      if (out.length < LIMIT) return out;
    }
    dim = Math.round(dim * 0.75);
  }
  throw new Error("Gambar terlalu besar walaupun selepas dimampatkan.");
}

/* =========================================================
   Dialog tambah/edit item koleksi
   ========================================================= */
function openEditor(col, item, preset) {
  const cfg = COLS[col];
  $("#dlgTitle").textContent = (item ? "Edit " : "Tambah ") + cfg.title;
  const data = item || { susunan: (cache[col]?.length || 0) + 1, ...(preset || {}) };
  $("#dlgBody").innerHTML = formHTML(cfg.fields, data) + (col === "galeri" ? `<datalist id="albumList">${[...new Set((cache.galeri || []).map((g) => g.kategori).filter(Boolean))].map((k) => `<option>${esc(k)}</option>`).join("")}</datalist>` : "") + (col === "perkhidmatan" ? `<datalist id="katList">${[...new Set((cache.perkhidmatan || []).map((s) => s.kategori).filter(Boolean))].map((k) => `<option>${esc(k)}</option>`).join("")}</datalist>` : "");
  icons();
  const dlg = $("#dlg");
  dlg.showModal();
  $("#dlgSave").onclick = async (e) => {
    e.preventDefault();
    const body = $("#dlgBody");
    if (!validate(cfg.fields, body)) return;
    const val = readForm(cfg.fields, body);
    const btn = $("#dlgSave");
    btn.disabled = true;
    try {
      if (item) await updateDoc(doc(db, col, item.id), val);
      else await addDoc(collection(db, col), { ...(preset || {}), ...val });
      dlg.close();
      toast("Disimpan — website dikemas kini serta-merta.");
    } catch (err) { fail(err); }
    btn.disabled = false;
  };
}

async function removeItem(col, item) {
  if (!confirm(`Padam "${COLS[col].card(item).title}"?`)) return;
  try { await deleteDoc(doc(db, col, item.id)); toast("Dipadam."); } catch (e) { fail(e); }
}

/* =========================================================
   Halaman
   ========================================================= */
const cache = {};
const PAGES = {
  dashboard: { title: "Papan Pemuka", icon: "layout-dashboard", desc: "Ringkasan klinik & tempahan terkini." },
  tempahan: { title: "Tempahan", icon: "inbox", desc: "Tempahan janji temu dari website (realtime)." },
  umum: { title: "Tetapan & Logo", icon: "settings", desc: "Nama, logo, no. telefon, WhatsApp, alamat, peta, media sosial, waktu operasi." },
  hero: { title: "Banner Utama", icon: "image", desc: "Tajuk dan gambar besar di bahagian atas website." },
  status: { title: "Status & Pengumuman", icon: "megaphone", desc: "Jalur pengumuman dan status buka/tutup (Realtime Database)." },
  ...Object.fromEntries(Object.entries(COLS).map(([k, c]) => [k, { title: c.title, icon: c.icon, desc: c.desc, col: k }])),
  seksyen: { title: "Tajuk Seksyen", icon: "heading", desc: "Label, tajuk dan teks pengenalan setiap seksyen website (Perkhidmatan, Pakej, Doktor, Galeri, Testimoni, Soalan Lazim)." },
  lain: { title: "Statistik & Kelebihan", icon: "award", desc: "Nombor statistik dan senarai kelebihan klinik." },
};
let current = "dashboard";

function renderTabs() {
  const baru = (cache.tempahan || []).filter((t) => t.status === "baru").length;
  $("#tabs").innerHTML = Object.entries(PAGES)
    .map(([k, p]) => `<button class="tab ${k === current ? "active" : ""}" data-page="${k}" ${k === current ? 'aria-current="page"' : ""}><i data-lucide="${p.icon}"></i>${p.title}${k === "tempahan" && baru ? `<span class="badge">${baru}</span>` : ""}</button>`)
    .join("");
  $$("#tabs .tab").forEach((t) => t.addEventListener("click", () => go(t.dataset.page)));
  icons();
}

function go(page) {
  current = page;
  location.hash = page;
  const p = PAGES[page];
  $("#pageTitle").textContent = p.title;
  $("#pageDesc").textContent = p.desc;
  renderTabs();
  renderPage();
  scrollTo({ top: 0 });
}

function renderPage() {
  const page = current, el = $("#page");
  if (page === "doktor") return renderOrgAdmin();
  if (page === "seksyen") return renderSeksyenForm();
  if (PAGES[page].col) return renderCollection(page);
  if (page === "dashboard") return renderDashboard();
  if (page === "tempahan") return renderBookings();
  if (page === "umum") return renderDocForm("umum", UMUM_FIELDS, { ...DEFAULTS.umum, ...(cache.umum || {}) });
  if (page === "hero") return renderDocForm("hero", HERO_FIELDS, { ...DEFAULTS.hero, ...(cache.hero || {}) });
  if (page === "lain") {
    el.innerHTML = `<div class="card"><h2><i data-lucide="activity"></i>Statistik</h2><form id="fStat">${formHTML(STAT_FIELDS, { senarai: cache.statistik?.senarai || DEFAULTS.statistik })}<div class="card-actions"><button class="btn btn-primary"><i data-lucide="save"></i>Simpan statistik</button></div></form></div>
      <div class="card"><h2><i data-lucide="award"></i>Kelebihan</h2><p class="icon-help">${esc(ICON_HINT)}</p><form id="fWhy">${formHTML(WHY_FIELDS, { senarai: cache.kelebihan?.senarai || DEFAULTS.kelebihan })}<div class="card-actions"><button class="btn btn-primary"><i data-lucide="save"></i>Simpan kelebihan</button></div></form></div>`;
    bindDocForm($("#fStat"), "statistik", STAT_FIELDS);
    bindDocForm($("#fWhy"), "kelebihan", WHY_FIELDS);
    return icons();
  }
  if (page === "status") return renderStatus();
}

function renderDocForm(docId, fields, data) {
  $("#page").innerHTML = `<div class="card"><form id="fDoc">${formHTML(fields, data)}<div class="card-actions"><button class="btn btn-primary"><i data-lucide="save"></i>Simpan perubahan</button></div></form></div>`;
  bindDocForm($("#fDoc"), docId, fields);
  icons();
}
function bindDocForm(form, docId, fields) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate(fields, form)) return;
    const btn = $("button.btn-primary", form);
    btn.disabled = true;
    try {
      await setDoc(doc(db, "tetapan", docId), { ...readForm(fields, form), dikemaskini: serverTimestamp() }, { merge: true });
      toast("Disimpan — website dikemas kini serta-merta.");
    } catch (err) { fail(err); }
    btn.disabled = false;
  });
}

function renderCollection(col) {
  const cfg = COLS[col], list = [...(cache[col] || [])].sort(bySusunan);
  $("#page").innerHTML = `
    <div class="card-actions" style="justify-content:flex-start;margin:0 0 1rem">
      <button class="btn btn-primary" id="addItem"><i data-lucide="plus"></i>Tambah ${esc(cfg.title)}</button>
      ${cfg.bulk ? `<button class="btn" id="bulkBtn"><i data-lucide="upload"></i>Muat naik banyak gambar</button><input type="file" id="bulkFile" accept="image/*" multiple hidden />` : ""}
    </div>
    ${list.length ? `<div class="items">${list.map((d, i) => {
      const c = cfg.card(d);
      return `<div class="item">
        ${c.img ? `<div class="item-img" style="background-image:url('${esc(c.img)}')"></div>` : c.icon ? `<div class="item-img" style="display:grid;place-items:center;aspect-ratio:auto;height:72px;color:var(--primary)"><i data-lucide="${esc(c.icon)}"></i></div>` : ""}
        <div class="item-body"><strong>${esc(c.title)}</strong><p>${esc(c.sub)}</p>${c.pill ? `<span class="pill ${c.pill[1] ? "off" : ""}">${esc(c.pill[0])}</span>` : ""}</div>
        <div class="item-foot"><span class="ord">#${esc(d.susunan ?? "-")}</span>
          <button class="btn btn-icon" data-edit="${i}" aria-label="Edit"><i data-lucide="pencil"></i></button>
          <button class="btn btn-icon btn-danger" data-del="${i}" aria-label="Padam"><i data-lucide="trash-2"></i></button></div>
      </div>`;
    }).join("")}</div>` : `<div class="empty">Belum ada item. ${cache.umum ? "" : "Website sedang memaparkan kandungan contoh — pergi ke Papan Pemuka dan tekan <b>Isi Data Contoh</b> untuk mula mengedit."}</div>`}`;
  $("#addItem").onclick = () => openEditor(col);
  $$("[data-edit]").forEach((b) => (b.onclick = () => openEditor(col, list[+b.dataset.edit])));
  $$("[data-del]").forEach((b) => (b.onclick = () => removeItem(col, list[+b.dataset.del])));
  if (cfg.bulk) {
    $("#bulkBtn").onclick = () => $("#bulkFile").click();
    $("#bulkFile").onchange = async (e) => {
      const files = [...e.target.files];
      let n = list.length;
      toast(`Memuat naik ${files.length} gambar...`);
      for (const f of files) {
        try { await addDoc(collection(db, col), { imej: await compress(f, 1600), kapsyen: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), kategori: "", susunan: ++n }); }
        catch (err) { fail(err); }
      }
      toast("Selesai dimuat naik.");
    };
  }
  icons();
}

let bookFilter = "semua";
const STATUS = { baru: "Baru", disahkan: "Disahkan", selesai: "Selesai", batal: "Batal" };
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" }) : "—");
function bookingRows(list) {
  if (!list.length) return `<div class="empty">Tiada tempahan.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Tarikh / Masa</th><th>Pesakit</th><th>Rawatan</th><th>Catatan</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map((t) => {
      const wa = String(t.telefon || "").replace(/\D/g, "").replace(/^0/, "60");
      return `<tr class="st-${esc(t.status)}">
        <td><strong>${esc(t.tarikh)}</strong><br>${esc(t.masa || "Mana-mana")}<br><small>Dihantar: ${fmtDate(t.dicipta)}</small></td>
        <td><strong>${esc(t.nama)}</strong><br><a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(t.telefon)}</a>${t.emel ? `<br><a href="mailto:${esc(t.emel)}">${esc(t.emel)}</a>` : ""}</td>
        <td>${esc(t.perkhidmatan)}</td>
        <td style="max-width:260px">${esc(t.catatan || "—")}</td>
        <td><select data-st="${t.id}" aria-label="Status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === t.status ? "selected" : ""}>${v}</option>`).join("")}</select></td>
        <td><button class="btn btn-icon btn-danger" data-delb="${t.id}" aria-label="Padam tempahan"><i data-lucide="trash-2"></i></button></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}
function bindBookingRows(root) {
  $$("[data-st]", root).forEach((s) => (s.onchange = () => updateDoc(doc(db, "tempahan", s.dataset.st), { status: s.value }).then(() => toast("Status dikemas kini.")).catch(fail)));
  $$("[data-delb]", root).forEach((b) => (b.onclick = () => confirm("Padam tempahan ini?") && deleteDoc(doc(db, "tempahan", b.dataset.delb)).then(() => toast("Dipadam.")).catch(fail)));
}
function renderBookings() {
  const all = cache.tempahan || [];
  const list = bookFilter === "semua" ? all : all.filter((t) => t.status === bookFilter);
  $("#page").innerHTML = `<div class="filters">${["semua", ...Object.keys(STATUS)].map((k) => `<button data-f="${k}" class="${k === bookFilter ? "active" : ""}">${k === "semua" ? "Semua" : STATUS[k]} (${k === "semua" ? all.length : all.filter((t) => t.status === k).length})</button>`).join("")}</div><div class="card" style="padding:.5rem">${bookingRows(list)}</div>`;
  $$(".filters button").forEach((b) => (b.onclick = () => { bookFilter = b.dataset.f; renderBookings(); }));
  bindBookingRows($("#page"));
  icons();
}

function renderDashboard() {
  const t = cache.tempahan || [];
  const seeded = !!cache.umum;
  $("#page").innerHTML = `
    ${seeded ? "" : `<div class="notice"><strong>Firestore masih kosong.</strong> Website awam sedang memaparkan kandungan contoh. Tekan <b>Isi Data Contoh</b> di bawah untuk menyalin semua kandungan ke database supaya boleh diedit di panel ini.</div>`}
    <div class="kpis">
      <div class="kpi"><span>Tempahan baru</span><strong>${t.filter((x) => x.status === "baru").length}</strong></div>
      <div class="kpi"><span>Jumlah tempahan</span><strong>${t.length}</strong></div>
      <div class="kpi"><span>Perkhidmatan</span><strong>${(cache.perkhidmatan || []).length}</strong></div>
      <div class="kpi"><span>Gambar galeri</span><strong>${(cache.galeri || []).length}</strong></div>
    </div>
    <div class="card"><h2><i data-lucide="inbox"></i>Tempahan terkini</h2><div id="recent">${bookingRows(t.slice(0, 6))}</div></div>
    <div class="card"><h2><i data-lucide="database"></i>Data contoh</h2>
      <p>${seeded ? "Set semula akan <b>memadam</b> semua kandungan (kecuali tempahan) dan menggantikannya dengan kandungan contoh asal." : "Salin semua kandungan contoh (perkhidmatan, pakej, doktor, galeri, testimoni, FAQ, banner, tetapan) ke Firestore."}</p>
      <div class="card-actions" style="justify-content:flex-start"><button class="btn ${seeded ? "btn-danger" : "btn-primary"}" id="seedBtn"><i data-lucide="${seeded ? "rotate-ccw" : "database"}"></i>${seeded ? "Set Semula ke Data Contoh" : "Isi Data Contoh"}</button></div>
    </div>`;
  bindBookingRows($("#recent"));
  $("#seedBtn").onclick = () => seed(seeded);
  icons();
}

let rtStatus = { ...DEFAULTS.status };
function renderStatus() {
  const s = rtStatus;
  $("#page").innerHTML = `<div class="card"><form id="fStatus">
    <div class="field"><label for="sMode">Status operasi</label><select id="sMode">
      <option value="auto" ${s.modOperasi === "auto" ? "selected" : ""}>Automatik (ikut jam buka/tutup di Tetapan)</option>
      <option value="buka" ${s.modOperasi === "buka" ? "selected" : ""}>Paksa: BUKA sekarang</option>
      <option value="tutup" ${s.modOperasi === "tutup" ? "selected" : ""}>Paksa: TUTUP sekarang (cth: cuti mengejut)</option></select></div>
    <div class="field"><label for="sText">Teks pengumuman (jalur atas website)</label><input id="sText" maxlength="300" value="${esc(s.pengumuman)}" /></div>
    <label class="check"><input type="checkbox" id="sOn" ${s.pengumumanAktif ? "checked" : ""} /> Papar pengumuman</label>
    <div class="card-actions"><button class="btn btn-primary"><i data-lucide="save"></i>Simpan</button></div></form></div>`;
  $("#fStatus").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await set(ref(rtdb, "status"), { modOperasi: $("#sMode").value, pengumuman: $("#sText").value.trim(), pengumumanAktif: $("#sOn").checked, dikemaskini: Date.now() });
      toast("Disimpan — dipapar serta-merta di website.");
    } catch (err) { fail(err); }
  };
  icons();
}

/* ---------- Tajuk seksyen ---------- */
const SEK_NAMA = { perkhidmatan: "Perkhidmatan", pakej: "Pakej & Harga", doktor: "Doktor & Pasukan", galeri: "Galeri", testimoni: "Testimoni", soalan: "Soalan Lazim" };
function renderSeksyenForm() {
  const data = {};
  for (const k of Object.keys(SEK_NAMA)) data[k] = { ...DEFAULTS.seksyen[k], ...(cache.seksyen?.[k] || {}) };
  $("#page").innerHTML = `<form id="fSek">${Object.entries(SEK_NAMA).map(([k, n]) => `<div class="card"><h2>${esc(n)}</h2>${formHTML([
      { k: `${k}.label`, l: "Label kecil", half: 1 },
      { k: `${k}.tajuk`, l: "Tajuk", half: 1 },
      { k: `${k}.teks`, l: "Teks pengenalan (kosongkan untuk sembunyi)", t: "textarea" },
    ], data)}</div>`).join("")}
    <div class="card-actions" style="position:sticky;bottom:1rem"><button class="btn btn-primary"><i data-lucide="save"></i>Simpan semua tajuk</button></div></form>`;
  const fields = Object.keys(SEK_NAMA).flatMap((k) => ["label", "tajuk", "teks"].map((f) => ({ k: `${k}.${f}` })));
  bindDocForm($("#fSek"), "seksyen", fields);
  icons();
}

/* ---------- Carta organisasi doktor & staf ---------- */
const TIERS = [["ketua", "Ketua"], ["pembantu", "Pembantu Ketua"], ["staf", "Staf"]];
const tierOf = (d) => d.peringkat || (/\b(ceo|pengasas|ketua pegawai|pengarah)\b/i.test(d.jawatan || "") ? "ketua" : "staf");
let orgSel = null;
function orgData() {
  const org = { ...DEFAULTS.organisasi, ...(cache.organisasi || {}) };
  org.label = { ...DEFAULTS.organisasi.label, ...(org.label || {}) };
  return org;
}
const tierList = (t) => (cache.doktor || []).filter((d) => tierOf(d) === t).sort(bySusunan);

function renderOrgAdmin() {
  const org = orgData();
  const hasPembantu = org.template !== "dua";
  const card = (d) => `<button type="button" class="oc ${orgSel === d.id ? "sel" : ""} ${tierOf(d) === "ketua" ? "ketua" : ""}" data-id="${d.id}" aria-pressed="${orgSel === d.id}">
      <span class="oc-ph">${d.imej ? `<img src="${esc(d.imej)}" alt="" />` : esc((d.nama || "?").replace(/^(Dr\.?|Puan|Encik|Cik|Tuan)\s*/i, "").charAt(0))}</span>
      <strong>${esc(d.nama)}</strong><small>${esc(d.jawatan)}</small></button>`;
  const tierHTML = ([t, nama]) => {
    const list = tierList(t);
    const dim = t === "pembantu" && !hasPembantu;
    return `<div class="ot ${dim ? "dim" : ""}"><div class="ot-head"><span class="ot-label">${esc(org.label[t])}</span>${dim ? `<small>(templat 2 peringkat: dipapar bersama staf)</small>` : ""}</div>
      <div class="ot-row">${list.map(card).join("")}<button type="button" class="oc add" data-add="${t}"><i data-lucide="plus"></i><span>Tambah ${esc(nama.toLowerCase())}</span></button></div></div>`;
  };
  const sel = (cache.doktor || []).find((d) => d.id === orgSel);
  $("#page").innerHTML = `
    <div class="card"><h2><i data-lucide="layout-template"></i>Templat susunan</h2>
      <div class="tpl">
        <button type="button" class="tpl-opt ${hasPembantu ? "on" : ""}" data-tpl="tiga"><span class="tpl-pic"><i></i><b><i></i><i></i></b><b><i></i><i></i><i></i></b></span>3 peringkat<small>Ketua → Pembantu → Staf</small></button>
        <button type="button" class="tpl-opt ${!hasPembantu ? "on" : ""}" data-tpl="dua"><span class="tpl-pic"><i></i><b><i></i><i></i><i></i><i></i></b></span>2 peringkat<small>Ketua → Staf terus</small></button>
      </div>
      <form id="fOrgLbl" class="grid3">${TIERS.map(([t, n]) => `<div class="field"><label for="lbl_${t}">Label baris ${esc(n.toLowerCase())}</label><input id="lbl_${t}" data-t="${t}" value="${esc(org.label[t])}" /></div>`).join("")}</form>
      <div class="card-actions"><button class="btn" id="saveLbl"><i data-lucide="save"></i>Simpan label</button></div>
    </div>
    <div class="card org-board">
      <p class="icon-help" style="margin:0 0 1rem;text-align:center">Klik kad untuk pilih, kemudian guna butang anak panah untuk alih kedudukan. Setiap baris sentiasa di tengah.</p>
      <div class="otb ${sel ? "" : "off"}" id="orgTools">
        ${sel ? `<strong>${esc(sel.nama)}</strong>` : `<span>Tiada kad dipilih</span>`}
        <button class="btn btn-icon" data-mv="up" aria-label="Naik satu peringkat" ${sel ? "" : "disabled"}><i data-lucide="arrow-up"></i></button>
        <button class="btn btn-icon" data-mv="left" aria-label="Alih ke kiri" ${sel ? "" : "disabled"}><i data-lucide="arrow-left"></i></button>
        <button class="btn btn-icon" data-mv="right" aria-label="Alih ke kanan" ${sel ? "" : "disabled"}><i data-lucide="arrow-right"></i></button>
        <button class="btn btn-icon" data-mv="down" aria-label="Turun satu peringkat" ${sel ? "" : "disabled"}><i data-lucide="arrow-down"></i></button>
        <button class="btn" data-mv="edit" ${sel ? "" : "disabled"}><i data-lucide="pencil"></i>Edit</button>
        <button class="btn btn-danger" data-mv="del" ${sel ? "" : "disabled"}><i data-lucide="trash-2"></i>Padam</button>
      </div>
      <div class="ochart">${TIERS.map(tierHTML).join("")}</div>
    </div>`;
  $$(".oc[data-id]").forEach((b) => (b.onclick = () => { orgSel = orgSel === b.dataset.id ? null : b.dataset.id; renderOrgAdmin(); }));
  $$(".oc[data-add]").forEach((b) => (b.onclick = () => openEditor("doktor", null, { peringkat: b.dataset.add, susunan: tierList(b.dataset.add).length + 1 })));
  $$("[data-tpl]").forEach((b) => (b.onclick = () => setDoc(doc(db, "tetapan", "organisasi"), { template: b.dataset.tpl }, { merge: true }).then(() => toast("Templat disimpan.")).catch(fail)));
  $("#saveLbl").onclick = () => {
    const label = Object.fromEntries($$("#fOrgLbl input").map((i) => [i.dataset.t, i.value.trim()]));
    setDoc(doc(db, "tetapan", "organisasi"), { label }, { merge: true }).then(() => toast("Label disimpan.")).catch(fail);
  };
  $$("[data-mv]").forEach((b) => (b.onclick = () => moveOrg(b.dataset.mv)));
  icons();
}

async function moveOrg(act) {
  const d = (cache.doktor || []).find((x) => x.id === orgSel);
  if (!d) return;
  if (act === "edit") return openEditor("doktor", d);
  if (act === "del") { await removeItem("doktor", d); orgSel = null; return renderOrgAdmin(); }
  const t = tierOf(d), ti = TIERS.findIndex(([k]) => k === t);
  const batch = writeBatch(db);
  const renumber = (list) => list.forEach((x, i) => batch.update(doc(db, "doktor", x.id), { peringkat: tierOf(x), susunan: i + 1 }));
  if (act === "left" || act === "right") {
    const list = tierList(t), i = list.findIndex((x) => x.id === d.id), j = i + (act === "left" ? -1 : 1);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    renumber(list);
  } else {
    const nt = TIERS[ti + (act === "up" ? -1 : 1)];
    if (!nt) return;
    const from = tierList(t).filter((x) => x.id !== d.id);
    renumber(from);
    batch.update(doc(db, "doktor", d.id), { peringkat: nt[0], susunan: tierList(nt[0]).length + 1 });
  }
  try { await batch.commit(); } catch (e) { fail(e); }
}

async function seed(reset, auto) {
  if (!auto && !confirm(reset ? "Padam semua kandungan sedia ada dan isi semula dengan data contoh?" : "Isi Firestore dengan data contoh?")) return;
  const btn = $("#seedBtn");
  if (btn) btn.disabled = true;
  try {
    const batch = writeBatch(db);
    if (reset) for (const col of Object.keys(COLS)) (await getDocs(collection(db, col))).forEach((d) => batch.delete(d.ref));
    batch.set(doc(db, "tetapan", "umum"), { ...DEFAULTS.umum, dikemaskini: serverTimestamp() });
    batch.set(doc(db, "tetapan", "hero"), DEFAULTS.hero);
    batch.set(doc(db, "tetapan", "statistik"), { senarai: DEFAULTS.statistik });
    batch.set(doc(db, "tetapan", "kelebihan"), { senarai: DEFAULTS.kelebihan });
    batch.set(doc(db, "tetapan", "organisasi"), DEFAULTS.organisasi);
    batch.set(doc(db, "tetapan", "seksyen"), DEFAULTS.seksyen);
    for (const col of Object.keys(COLS)) {
      // Jangan sentuh data yang admin sudah masukkan (kecuali set semula)
      const existing = reset ? [] : (await getDocs(collection(db, col))).docs.map((d) => ({ id: d.id, ...d.data() }));
      let items = DEFAULTS[col];
      if (existing.length && col !== "doktor") continue;
      if (col === "doktor" && existing.length) {
        existing.forEach((d) => !d.peringkat && batch.update(doc(db, "doktor", d.id), { peringkat: tierOf(d) }));
        if (existing.some((d) => tierOf(d) === "ketua")) items = items.filter((d) => d.peringkat !== "ketua");
      }
      items.forEach((item, i) => batch.set(doc(collection(db, col)), { aktif: true, ...item, susunan: item.susunan ?? i + 1 }));
    }
    await batch.commit();
    await set(ref(rtdb, "status"), { ...DEFAULTS.status, dikemaskini: Date.now() });
    toast(auto ? "Kandungan website dimasukkan ke database — kini semua boleh diedit." : "Data contoh berjaya diisi. Semua kini boleh diedit.");
  } catch (e) { fail(e); }
  if (btn) btn.disabled = false;
}

/* =========================================================
   Realtime listeners
   ========================================================= */
let unsubs = [], autoSeeded = false;
function startListeners() {
  const rerender = (keys) => { if (keys.includes(current) && !$("#dlg").open) renderPage(); };
  for (const col of Object.keys(COLS))
    unsubs.push(onSnapshot(collection(db, col), (s) => { cache[col] = s.docs.map((d) => ({ id: d.id, ...d.data() })); rerender([col, "dashboard"]); }, fail));
  unsubs.push(onSnapshot(query(collection(db, "tempahan"), orderBy("dicipta", "desc")), (s) => {
    const prev = (cache.tempahan || []).length;
    cache.tempahan = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (prev && cache.tempahan.length > prev) toast("Tempahan baru diterima!");
    renderTabs();
    rerender(["tempahan", "dashboard"]);
  }, fail));
  // Borang tetapan tidak dirender semula semasa disunting supaya input tidak hilang.
  unsubs.push(onSnapshot(doc(db, "tetapan", "umum"), (s) => {
    const first = !("umum" in cache) || (!cache.umum && s.exists());
    cache.umum = s.exists() ? s.data() : null;
    // Kali pertama admin log masuk: isi kandungan website ke database secara automatik
    if (!s.exists() && !s.metadata.fromCache && !autoSeeded) { autoSeeded = true; seed(false, true); }
    if (cache.umum?.logo) $("#sideLogo").src = cache.umum.logo;
    if (current === "dashboard" || (first && current === "umum")) renderPage();
  }, fail));
  for (const id of ["hero", "statistik", "kelebihan", "organisasi", "seksyen"])
    unsubs.push(onSnapshot(doc(db, "tetapan", id), (s) => {
      const first = !(id in cache);
      cache[id] = s.exists() ? s.data() : null;
      if (id === "organisasi" && current === "doktor") return renderPage();
      if (first && (current === id || (current === "lain" && id !== "hero"))) renderPage();
    }, fail));
  unsubs.push(onValue(ref(rtdb, "status"), (s) => { rtStatus = { ...DEFAULTS.status, ...(s.val() || {}) }; }, fail));
}

/* =========================================================
   Auth
   ========================================================= */
const loginErr = (m) => { $("#loginErr").textContent = m; $("#loginErr").hidden = !m; };
const AUTH_MSG = {
  "auth/invalid-credential": "E-mel atau kata laluan salah.",
  "auth/wrong-password": "E-mel atau kata laluan salah.",
  "auth/user-not-found": "Akaun tidak dijumpai.",
  "auth/too-many-requests": "Terlalu banyak cubaan. Cuba lagi sebentar.",
  "auth/network-request-failed": "Tiada sambungan internet.",
  "auth/operation-not-allowed": "Log masuk e-mel/kata laluan belum diaktifkan di Firebase Console.",
};

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  loginErr("");
  const btn = $("#loginBtn");
  btn.disabled = true;
  try { await signInWithEmailAndPassword(auth, $("#lEmail").value.trim(), $("#lPass").value); }
  catch (err) { loginErr(AUTH_MSG[err.code] || "Log masuk gagal: " + err.code); }
  btn.disabled = false;
});
$("#forgot").addEventListener("click", async (e) => {
  e.preventDefault();
  const em = $("#lEmail").value.trim();
  if (!em) return loginErr("Masukkan e-mel dahulu, kemudian tekan 'Lupa kata laluan'.");
  try { await sendPasswordResetEmail(auth, em); loginErr(""); toast("E-mel set semula kata laluan telah dihantar."); }
  catch (err) { loginErr(AUTH_MSG[err.code] || err.code); }
});
$("#logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (user && user.uid !== ADMIN_UID) {
    await signOut(auth);
    loginErr("Akaun ini tiada akses admin.");
    return;
  }
  $("#loginView").hidden = !!user;
  $("#appView").hidden = !user;
  if (!user) { icons(); return; }
  $("#who").textContent = user.email;
  startListeners();
  const h = location.hash.slice(1);
  go(PAGES[h] ? h : "dashboard");
});

addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  if (auth.currentUser && PAGES[h] && h !== current) go(h);
});

// Selepas dialog ditutup, papar semula halaman semasa (perubahan semasa dialog terbuka tidak dirender)
$("#dlg").addEventListener("close", () => renderPage());

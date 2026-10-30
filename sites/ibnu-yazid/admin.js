// Panel admin Ibnu Yazid. Setiap suntingan terus disiarkan ke laman awam (BroadcastChannel + postMessage) tanpa kelewatan.
(() => {
  "use strict";
  const C = window.IYCore;
  const DEFS = window.IY_DEFAULTS;
  const { esc, icon } = C;

  let cfg = C.clone(DEFS);
  let panel = "dashboard";
  const openKeys = new Set();
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const val = (p) => { const v = C.getPath(cfg, p); return v == null ? "" : v; };
  const chan = C.channel();
  let toastT = 0;
  const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); };
  const uid = (p) => p + "-" + Math.random().toString(36).slice(2, 7);
  const LT = (o) => (o && (o.ms || o.en)) || "";

  // ===================== SIMPAN & SIAR =====================
  let saveT = 0;
  const DB = window.IYDB;
  let fbOn = false; // true bila disambung ke Firebase dan log masuk berjaya
  const setStatus = (s) => {
    const el = $("#status"); el.dataset.s = s === "dberr" ? "nostore" : s;
    $("span", el).textContent = s === "saving" ? "Menyimpan…" : s === "nostore" ? "Storan pelayar disekat" : s === "dberr" ? "Ralat pangkalan data" : fbOn ? "Disimpan ke pangkalan data" : "Disimpan & disiarkan";
  };
  const dbError = (e) => {
    setStatus("dberr");
    const c = (e && (e.code || e.message)) || "";
    toast(/permission/.test(c) ? "Kebenaran ditolak. Pastikan Rules dipasang dan emel anda disenaraikan sebagai admin dalam Rules."
      : /unavailable|network/.test(c) ? "Tiada sambungan ke pangkalan data."
      : /too-big/.test(c) ? e.message : "Ralat pangkalan data: " + c);
  };
  // Bentuk yang disimpan dalam Firestore: tanpa data gambar (gambar ada dalam koleksi "images")
  const remoteShape = () => { const x = JSON.parse(JSON.stringify(cfg)); x.albums.forEach((a) => { a.images = []; if (!Array.isArray(a.imageIds)) a.imageIds = []; }); return x; };
  const persist = () => {
    setStatus("saving"); clearTimeout(saveT);
    saveT = setTimeout(async () => {
      const okLocal = await C.kv.set("config", cfg);
      if (!fbOn) return setStatus(okLocal ? "saved" : "nostore");
      try {
        const shape = remoteShape();
        if (JSON.stringify(shape).length > 900000) throw Object.assign(new Error("Dokumen terlalu besar (>900KB). Kecilkan logo."), { code: "too-big" });
        await DB.saveConfig(shape); setStatus("saved");
      } catch (e) { dbError(e); }
    }, 400);
  };
  const post = (msg) => {
    if (chan) chan.postMessage(msg);
    const w = $("#pvFrame").contentWindow;
    if (w) w.postMessage(msg, "*");
  };
  const commit = (path, value) => {
    C.setPath(cfg, path, value); cfg.rev = Date.now();
    post({ iy: 1, type: "set", path, value }); persist();
    $$(`[data-head="${CSS.escape(path)}"]`).forEach((el) => { el.textContent = value || "(kosong)"; });
    if (path === "brand.name") $("#sideName").textContent = value;
  };
  const structural = () => { cfg.rev = Date.now(); post({ iy: 1, type: "full", cfg }); persist(); };
  const rerender = () => { const y = window.scrollY; showPanel(panel, true); window.scrollTo(0, y); };

  // ===================== GAMBAR & PANGKALAN DATA =====================
  // Dalam mod pangkalan data: albums[i].images (data URL) dan albums[i].imageIds (id dokumen) sentiasa selari.
  const imgIds = (ai) => { const a = cfg.albums[ai]; if (!Array.isArray(a.imageIds)) a.imageIds = []; return a.imageIds; };
  async function imgAdd(ai, data) {
    const a = cfg.albums[ai];
    if (fbOn) { const id = uid("img"); await DB.putImage(id, a.id, data); imgIds(ai).push(id); }
    a.images.push(data);
  }
  async function imgRemove(ai, i) {
    const a = cfg.albums[ai];
    if (fbOn) { const id = imgIds(ai).splice(i, 1)[0]; try { await DB.delImage(id); } catch (e) { dbError(e); } }
    a.images.splice(i, 1);
  }
  const imgMove = (ai, i, d) => {
    const a = cfg.albums[ai], j = i + d;
    [a.images[i], a.images[j]] = [a.images[j], a.images[i]];
    if (fbOn) { const ids = imgIds(ai); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  };
  async function migrateImages() { // gambar sebaris (mod tempatan / import) -> dokumen "images"
    for (const a of cfg.albums) {
      if (!Array.isArray(a.imageIds)) a.imageIds = [];
      if (a.images.length === a.imageIds.length) continue;
      a.imageIds = [];
      for (const d of a.images) { const id = uid("img"); await DB.putImage(id, a.id, d); a.imageIds.push(id); }
    }
  }
  async function loadRemoteCfg() {
    let remote = null, imgs = [], imgFail = false;
    try { remote = await DB.getConfig(); } catch (_) { toast("Tidak dapat menyambung ke pangkalan data. Mod tempatan digunakan sementara."); return false; }
    try { imgs = await DB.getImages(); } catch (_) { imgFail = true; }
    if (imgFail && remote && remote.albums && remote.albums.some((a) => (a.imageIds || []).length)) { toast("Gambar galeri tidak dapat dimuatkan. Mod tempatan digunakan sementara."); return false; }
    const map = Object.fromEntries(imgs.map((x) => [x.id, x.data]));
    if (remote) {
      cfg = C.merge(remote, DEFS);
      cfg.albums.forEach((a) => { if (Array.isArray(a.imageIds)) { a.imageIds = a.imageIds.filter((id) => map[id]); a.images = a.imageIds.map((id) => map[id]); } });
    } else { // kali pertama: hantar data tempatan/asal ke pangkalan data
      cfg = await C.loadConfig();
      try { await migrateImages(); await DB.saveConfig(remoteShape()); toast("Data awal dihantar ke pangkalan data."); } catch (e) { dbError(e); }
    }
    return true;
  }
  // ----- pertanyaan pelanggan (leads) -----
  let leads = [], leadsSub = null;
  const fmtDt = (d) => d.toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
  const waLink = (ph) => { const d = String(ph).replace(/\D/g, ""); return "https://wa.me/" + (d.startsWith("60") ? d : d.startsWith("0") ? "6" + d : d); };
  const paintLeads = () => {
    const k = $("#kLeads"); if (k) k.textContent = leads.filter((l) => l.status === "baru").length;
    const box = $("#leadsBox"); if (!box) return;
    box.innerHTML = leads.length
      ? `<div class="tbl"><table><thead><tr><th>Tarikh</th><th>Nama</th><th>Telefon</th><th>Pakej</th><th>Mesej</th><th>Status</th><th></th></tr></thead><tbody>${leads.map((l) => `<tr><td>${esc(fmtDt(l.createdAt))}</td><td>${esc(l.name)}</td><td><a href="${esc(waLink(l.phone))}" target="_blank" rel="noopener">${esc(l.phone)}</a></td><td>${esc(l.plan)}</td><td>${esc(l.message)}</td>
        <td><select data-lead-status="${esc(l.id)}" aria-label="Status">${[["baru", "Baru"], ["dihubungi", "Dihubungi"], ["selesai", "Selesai"]].map(([v, t]) => `<option value="${v}" ${l.status === v ? "selected" : ""}>${t}</option>`).join("")}</select></td>
        <td><button class="iconbtn" type="button" data-act="leadDel" data-id="${esc(l.id)}" aria-label="Padam"><svg class="ico" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></td></tr>`).join("")}</tbody></table></div>`
      : '<div class="hint">Belum ada pertanyaan. Setiap borang sebut harga yang dihantar pelawat akan muncul di sini serta-merta.</div>';
  };
  const startLeads = () => { if (!fbOn || leadsSub) return; leadsSub = DB.watchLeads((list) => { leads = list; paintLeads(); }, dbError); };

  // ===================== PENJANA MEDAN =====================
  const F = {
    text: (p, label, o = {}) => `<label class="f"><span>${label}</span><input type="${o.type || "text"}" data-bind="${p}" value="${esc(val(p))}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.inputmode ? `inputmode="${o.inputmode}"` : ""}>${o.hint ? `<small>${o.hint}</small>` : ""}</label>`,
    area: (p, label, o = {}) => `<label class="f"><span>${label}</span><textarea data-bind="${p}" rows="${o.rows || 3}">${esc(val(p))}</textarea>${o.hint ? `<small>${o.hint}</small>` : ""}</label>`,
    num: (p, label) => `<label class="f"><span>${label}</span><input type="number" min="0" step="1" data-type="number" data-bind="${p}" value="${esc(val(p))}"></label>`,
    sel: (p, label, opts) => `<label class="f"><span>${label}</span><select data-bind="${p}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(val(p)) === String(v) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`,
    bool: (p, label) => `<label class="sw"><input type="checkbox" data-bind="${p}" ${val(p) ? "checked" : ""}><i></i><span>${label}</span></label>`,
    L: (p, label, o = {}) => {
      const one = (lg, tag) => `<div><em>${tag}</em>${o.area
        ? `<textarea data-bind="${p}.${lg}" rows="${o.rows || 2}" aria-label="${label} ${tag}">${esc(val(p + "." + lg))}</textarea>`
        : `<input type="text" data-bind="${p}.${lg}" value="${esc(val(p + "." + lg))}" aria-label="${label} ${tag}">`}</div>`;
      return `<div class="f lang2"><span>${label}</span>${one("ms", "BM")}${one("en", "BI")}${o.hint ? `<small>${o.hint}</small>` : ""}</div>`;
    },
    icon: (p, label, withJawi) => {
      const cur = val(p);
      const btns = (withJawi ? `<button type="button" class="jawi" data-act="icon" data-path="${p}" data-v="jawi" aria-pressed="${cur === "jawi"}" aria-label="Huruf Jawi">خط</button>` : "") +
        Object.keys(C.ICONS).map((k) => `<button type="button" data-act="icon" data-path="${p}" data-v="${k}" aria-pressed="${cur === k}" aria-label="${k}">${icon(k)}</button>`).join("");
      return `<div class="f"><span>${label}</span><div class="icons">${btns}</div></div>`;
    },
  };

  // Penyunting senarai generik: tambah, padam (dua klik), naik, turun, gandakan
  const listUI = (path, o) => {
    const arr = C.getPath(cfg, path) || [];
    const items = arr.map((it, i) => {
      const ip = `${path}.${i}`;
      return `<details class="item" data-key="${ip}" ${openKeys.has(ip) ? "open" : ""}>
        <summary><span class="item__no">${i + 1}</span><span class="item__head" ${o.headPath ? `data-head="${ip}.${o.headPath}"` : ""}>${esc(o.head(it, i) || "(kosong)")}</span>
          <span class="item__acts">
            <button type="button" class="iconbtn" data-act="up" data-path="${path}" data-i="${i}" aria-label="Naik" ${i === 0 ? "disabled" : ""}>${icon("check").replace(/<path[^>]*\/>/, '<path d="M12 19V5M5 12l7-7 7 7"/>')}</button>
            <button type="button" class="iconbtn" data-act="down" data-path="${path}" data-i="${i}" aria-label="Turun" ${i === arr.length - 1 ? "disabled" : ""}>${icon("check").replace(/<path[^>]*\/>/, '<path d="M12 5v14M5 12l7 7 7-7"/>')}</button>
            ${o.noDup ? "" : `<button type="button" class="iconbtn" data-act="dup" data-path="${path}" data-i="${i}" aria-label="Gandakan">${icon("doc")}</button>`}
            <button type="button" class="iconbtn" data-act="del" data-path="${path}" data-i="${i}" aria-label="Padam"><svg class="ico" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button>
          </span></summary>
        <div class="item__body">${o.fields(ip, it, i)}</div></details>`;
    }).join("");
    return `<div class="list" data-list="${path}">${items}<button type="button" class="btn-add" data-act="add" data-path="${path}">+ ${o.add}</button></div>`;
  };
  const blankL = () => ({ ms: "", en: "" });
  const svcOptions = () => [["", "— tiada —"], ...cfg.services.map((s) => [s.id, LT(s.title) || s.id])];

  const SCHEMAS = {
    services: {
      add: "Tambah perkhidmatan", head: (s) => LT(s.title), headPath: "title.ms",
      blank: () => ({ id: uid("svc"), visible: true, featured: false, icon: "star", jawi: "", art: "plain", artText: "", short: blankL(), title: blankL(), priceLead: { ms: "Dari", en: "From" }, priceMin: 0, priceMax: 0, priceText: "RM0", desc: blankL(), features: [blankL()], note: blankL(), ctaLabel: blankL(), ctaUrl: "", ctaIcon: true }),
      fields: (p, s) => `
        <div class="row">${F.bool(p + ".visible", "Papar di laman")}${F.bool(p + ".featured", "Tanda sebagai &quot;Paling diminta&quot;")}</div>
        ${F.L(p + ".title", "Tajuk perkhidmatan")}
        ${F.L(p + ".short", "Nama ringkas (kad hero, footer, borang)")}
        ${F.icon(p + ".icon", "Ikon", true)}
        <div class="grid2">${F.text(p + ".jawi", "Huruf Jawi (jika ikon Jawi dipilih)")}
          ${F.sel(p + ".art", "Gaya hiasan kad", [["khat", "Khat (tulisan Jawi besar)"], ["web", "Tetingkap website"], ["video", "Video (butang main)"], ["plain", "Ikon sahaja"]])}</div>
        ${F.text(p + ".artText", "Teks hiasan Khat (cth: بسم الله)")}
        <div class="grid3">${F.L(p + ".priceLead", "Awalan harga (Dari / Setup)")}${F.text(p + ".priceText", "Harga dipaparkan (cth: RM50 – RM100)")}
          <div class="grid2">${F.num(p + ".priceMin", "Harga min (RM)")}${F.num(p + ".priceMax", "Harga maks (RM)")}</div></div>
        ${F.L(p + ".desc", "Penerangan (pop-up)", { area: true, rows: 3 })}
        <div class="f"><span>Ciri-ciri</span>${listUI(p + ".features", { add: "Tambah ciri", head: (f) => LT(f), headPath: "ms", noDup: true, blank: blankL, fields: (fp) => F.L(fp, "Teks ciri") })}</div>
        ${F.L(p + ".note", "Nota (pilihan)", { area: true, hint: "Pautan: [teks](https://pautan). Sorotan: *kata*." })}
        <div class="grid2">${F.L(p + ".ctaLabel", "Label butang CTA")}${F.text(p + ".ctaUrl", "Pautan butang CTA", { type: "url", ph: "https://…", hint: "Kosongkan jika tiada butang pautan." })}</div>`,
    },
    plans: {
      add: "Tambah pakej", head: (p) => LT(p.kicker), headPath: "kicker.ms",
      blank: () => ({ id: uid("plan"), serviceId: cfg.services[0] ? cfg.services[0].id : "", featured: false, kicker: blankL(), cur: "RM", price: "0", priceTo: "", unit: blankL(), features: [blankL()], action: "quote", url: "", btnLabel: blankL() }),
      fields: (p) => `
        <div class="row">${F.bool(p + ".featured", "Pakej menonjol (Paling diminta)")}</div>
        ${F.L(p + ".kicker", "Nama pakej")}
        <div class="grid3">${F.text(p + ".cur", "Mata wang")}${F.text(p + ".price", "Harga", { inputmode: "numeric" })}${F.text(p + ".priceTo", "Sehingga (cth: – RM100)")}</div>
        ${F.L(p + ".unit", "Unit (cth: setup, sebulan)")}
        <div class="f"><span>Ciri-ciri</span>${listUI(p + ".features", { add: "Tambah ciri", head: (f) => LT(f), headPath: "ms", noDup: true, blank: blankL, fields: (fp) => F.L(fp, "Teks ciri") })}</div>
        <div class="grid3">${F.sel(p + ".action", "Butang pakej", [["quote", "Buka borang sebut harga"], ["service", "Buka butiran perkhidmatan"], ["url", "Pergi ke pautan"]])}
          ${F.sel(p + ".serviceId", "Perkhidmatan berkaitan", svcOptions())}${F.text(p + ".url", "Pautan (jika dipilih)", { type: "url", ph: "https://…" })}</div>
        ${F.L(p + ".btnLabel", "Label butang (kosong = lalai)")}`,
    },
    chips: { add: "Tambah jaminan", head: (c) => LT(c), headPath: "ms", noDup: true, blank: blankL, fields: (p) => F.L(p, "Teks") },
    ticker: { add: "Tambah perkataan", head: (t) => t, headPath: "", noDup: true, blank: () => "", fields: (p) => F.text(p, "Perkataan") },
    stats: { add: "Tambah angka", head: (s) => `${s.prefix}${s.value} ${LT(s.label)}`, blank: () => ({ prefix: "RM", value: 0, label: blankL() }),
      fields: (p) => `<div class="grid2">${F.text(p + ".prefix", "Awalan")}${F.num(p + ".value", "Nilai")}</div>${F.L(p + ".label", "Label")}` },
    problems: { add: "Tambah masalah", head: (x) => LT(x.prob), headPath: "prob.ms", blank: () => ({ prob: blankL(), sol: blankL() }),
      fields: (p) => `${F.L(p + ".prob", "Masalah", { area: true })}${F.L(p + ".sol", "Penyelesaian", { area: true })}` },
    steps: { add: "Tambah langkah", head: (x) => LT(x.title), headPath: "title.ms", blank: () => ({ icon: "star", title: blankL(), desc: blankL() }),
      fields: (p) => `${F.icon(p + ".icon", "Ikon")}${F.L(p + ".title", "Tajuk")}${F.L(p + ".desc", "Keterangan", { area: true })}` },
    works: { add: "Tambah portfolio", head: (x) => x.title, headPath: "title", blank: () => ({ art: "plain", artText: "", tag: blankL(), title: "", serviceId: "", url: "" }),
      fields: (p) => `<div class="grid2">${F.text(p + ".title", "Tajuk")}${F.sel(p + ".art", "Gaya gambar", [["khat", "Khat"], ["web", "Website"], ["video", "Video"], ["plain", "Ikon sahaja"]])}</div>
        ${F.L(p + ".tag", "Label")}${F.text(p + ".artText", "Teks hiasan (Khat)")}
        <div class="grid2">${F.sel(p + ".serviceId", "Buka butiran perkhidmatan", svcOptions())}${F.text(p + ".url", "ATAU pautan terus", { type: "url", ph: "https://…" })}</div>` },
    values: { add: "Tambah nilai", head: (x) => LT(x.text), headPath: "text.ms", blank: () => ({ icon: "check", text: blankL() }), fields: (p) => `${F.icon(p + ".icon", "Ikon")}${F.L(p + ".text", "Teks")}` },
    faq: { add: "Tambah soalan", head: (x) => LT(x.q), headPath: "q.ms", blank: () => ({ q: blankL(), a: blankL() }), fields: (p) => `${F.L(p + ".q", "Soalan")}${F.L(p + ".a", "Jawapan", { area: true, rows: 3 })}` },
  };
  const schemaFor = (path) => {
    if (/\.features$/.test(path)) return { add: "Tambah ciri", head: (f) => LT(f), headPath: "ms", noDup: true, blank: blankL, fields: (fp) => F.L(fp, "Teks ciri") };
    if (path === "albums") return null;
    return SCHEMAS[path];
  };

  // ===================== PANEL =====================
  const NAV = [
    ["dashboard", "Ringkasan", "star"], ["brand", "Jenama & Logo", "image"], ["texts", "Teks Laman", "edit"], ["services", "Perkhidmatan", "gift"],
    ["plans", "Pakej Harga", "tag"], ["sections", "Seksyen Laman", "doc"], ["gallery", "Galeri Testimoni", "image"], ["leads", "Pertanyaan Pelanggan", "users"], ["cta", "Pautan CTA", "globe"],
    ["reports", "Laporan & Excel", "doc"], ["settings", "Tetapan", "shield"], ["theme", "Tema Laman: Warna & Font", "pen"],
  ];
  const buildNav = () => {
    $("#nav").innerHTML = NAV.map(([id, label, ic], i) =>
      (id === "theme" ? '<p class="nav__sep">Rupa laman (bahagian terakhir)</p>' : "") +
      `<button type="button" class="nav__btn ${id === "theme" ? "nav__btn--last" : ""}" data-panel="${id}" ${id === panel ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span></button>`).join("");
  };
  const card = (title, sub, body, extra = "") => `<section class="card"><div class="card__h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${extra}</div>${body}</section>`;
  const acc = (title, count, body, open) => `<details class="acc" data-key="acc:${title}" ${open || openKeys.has("acc:" + title) ? "open" : ""}><summary><span>${title}</span>${count != null ? `<span class="badge">${count}</span>` : ""}</summary><div class="acc__body">${body}</div></details>`;

  const PANELS = {
    dashboard: () => {
      const imgs = cfg.albums.reduce((n, a) => n + a.images.length, 0);
      const k = (ic, n, l) => `<div class="kpi"><span class="kpi__ic">${icon(ic)}</span><div><b>${n}</b><span>${l}</span></div></div>`;
      queueMicrotask(loadVisitKpis);
      return `<div class="kpis">${k("gift", cfg.services.length, "Perkhidmatan")}${k("tag", cfg.plans.length, "Pakej harga")}${k("image", imgs, "Gambar galeri")}${k("doc", cfg.faq.length, "Soalan lazim")}${fbOn ? `<div class="kpi"><span class="kpi__ic">${icon("chat")}</span><div><b id="kLeads">${leads.filter((l) => l.status === "baru").length}</b><span>Pertanyaan baharu</span></div></div>` : ""}</div>
      <div class="kpis"><div class="kpi"><span class="kpi__ic">${icon("users")}</span><div><b id="kToday">…</b><span>Pelawat hari ini</span></div></div>
        <div class="kpi"><span class="kpi__ic">${icon("globe")}</span><div><b id="kTotal">…</b><span>Jumlah keseluruhan</span></div></div></div>
      ${card("Pintasan", "Terus ke bahagian yang anda mahu ubah.", `<div class="quick">${NAV.filter((n) => n[0] !== "dashboard").map(([id, l, ic]) => `<button type="button" data-panel="${id}">${icon(ic)}<span>${l}</span></button>`).join("")}</div>`)}
      ${card("Bagaimana perubahan sampai ke laman awam", "", `<div class="hint hint--ok"><b>Pada pelayar ini:</b> setiap suntingan terus nampak di laman awam yang dibuka (tab lain atau pratonton) tanpa kelewatan.</div>
        ${fbOn ? '<div class="hint hint--ok"><b>Pangkalan data aktif:</b> suntingan disimpan ke Firebase dan <b>semua pelawat</b> nampak perubahan serta-merta, tanpa perlu muat naik apa-apa.</div>' : '<div class="hint"><b>Untuk semua pelawat:</b> pergi ke <b>Tetapan &gt; Terbitkan</b>, muat turun <code>site-config.json</code>, kemudian muat naik ke hosting di sebelah <code>index.html</code>, atau sambungkan Firebase.</div>'}`)}`;
    },

    brand: () => card("Logo", "Muat naik gambar logo. Jika tiada, huruf Jawi di bawah dipakai.", `
        <div class="logo-prev"><div class="logo-prev__box">${cfg.brand.logo ? `<img src="${esc(cfg.brand.logo)}" alt="Logo semasa">` : esc(cfg.brand.mark)}</div>
          <div class="row"><button class="btn btn--soft" type="button" data-act="upload" data-target="logo">Muat naik logo</button>${cfg.brand.logo ? '<button class="btn btn--danger" type="button" data-act="logoDel">Buang logo</button>' : ""}</div></div>
        ${F.text("brand.mark", "Huruf logo (jika tiada gambar)")}`) +
      card("Maklumat jenama & hubungan", "", `
        <div class="grid2">${F.text("brand.name", "Nama")}${F.L("brand.subtitle", "Sub-tajuk di bawah nama")}</div>
        <div class="grid2">${F.text("brand.waNumber", "Nombor WhatsApp (format antarabangsa)", { inputmode: "numeric", ph: "60177977935", hint: "Tanpa +, tanpa ruang. Contoh: 60177977935" })}${F.text("brand.phoneDisplay", "Nombor dipaparkan", { ph: "017-797 7935" })}</div>
        ${F.L("brand.waMessage", "Mesej WhatsApp lalai", { area: true })}
        <div class="grid2">${F.text("brand.qalamLabel", "Label pautan portfolio (footer)")}${F.text("brand.qalamUrl", "Pautan portfolio (footer)", { type: "url" })}</div>`) +
      card("Hiasan & lokasi", "Teks hiasan pada hero, banner dan bahagian Tentang.", `
        <div class="grid3">${F.text("deco.hero", "Hiasan hero (Jawi)")}${F.text("deco.banner", "Hiasan banner (Jawi)")}${F.text("deco.aboutArt", "Teks besar bahagian Tentang")}</div>
        <div class="grid2">${F.text("deco.chipA", "Lokasi 1")}${F.text("deco.chipB", "Lokasi 2")}</div>`),

    texts: () => {
      const used = new Set(TEXT_GROUPS.flatMap((g) => g[1]));
      const groups = TEXT_GROUPS.map((g) => [g[0], g[1]]);
      const rest = Object.keys(cfg.t).filter((k) => !used.has(k) && !UNUSED_TEXT.has(k));
      const msg = rest.filter((k) => k.startsWith("msg_")), other = rest.filter((k) => !k.startsWith("msg_"));
      if (msg.length || other.length) groups.push(["Mesej sistem (borang, ralat, menu)", [...other, ...msg]]);
      return `<div class="hint hint--ok">Teks di sini dipaparkan di laman awam dalam dua bahasa. Guna <code>*kata*</code> untuk sorotan bergradient dan <code>[teks](https://pautan)</code> untuk pautan.</div>` +
        groups.map(([name, keys]) => acc(name, keys.length, keys.filter((k) => cfg.t[k]).map((k) => {
          const long = (cfg.t[k].ms || "").length > 60 || /lead|_p1|_p2|note|_sub|hint|msg_ok|msg_err/.test(k);
          return F.L("t." + k, LABELS[k] || k, { area: long, rows: 3 });
        }).join(""))).join("");
    },

    services: () => card("Perkhidmatan", "Tambah, ubah atau susun semula perkhidmatan. Setiap satu muncul sebagai kad, pop-up butiran, pilihan borang dan pautan footer.", listUI("services", SCHEMAS.services)),
    plans: () => card("Pakej harga", "Kad harga di bahagian Harga.", listUI("plans", SCHEMAS.plans)),

    sections: () =>
      acc("Jaminan ringkas (hero)", cfg.chips.length, listUI("chips", SCHEMAS.chips)) +
      acc("Jalur perkataan bergerak", cfg.ticker.length, listUI("ticker", SCHEMAS.ticker)) +
      acc("Angka harga", cfg.stats.length, listUI("stats", SCHEMAS.stats)) +
      acc("Masalah → penyelesaian", cfg.problems.length, listUI("problems", SCHEMAS.problems)) +
      acc("Langkah proses", cfg.steps.length, listUI("steps", SCHEMAS.steps)) +
      acc("Portfolio", cfg.works.length, listUI("works", SCHEMAS.works)) +
      acc("Tentang: nilai", cfg.values.length, listUI("values", SCHEMAS.values)) +
      acc("Soalan lazim (FAQ)", cfg.faq.length, listUI("faq", SCHEMAS.faq)),

    gallery: () => {
      const total = cfg.albums.reduce((n, a) => n + a.images.reduce((m, s) => m + s.length * 0.75, 0), 0);
      return `<div class="hint ${total > 20e6 ? "hint--err" : "hint--ok"}">Jumlah gambar: ${(total / 1048576).toFixed(1)} MB. Gambar dikecilkan secara automatik (maks 1200px). ${total > 20e6 ? "Terlalu besar, kurangkan gambar supaya laman kekal laju." : ""}</div>` +
        cfg.albums.map((a, ai) => acc(`Album: ${LT(a.name) || a.id}`, a.images.length, `
          ${F.L(`albums.${ai}.name`, "Nama album (tab)")}
          <div class="drop" data-drop="${ai}" tabindex="0" role="button" data-act="upload" data-target="album:${ai}">${icon("image")}<span>Tekan atau seret gambar ke sini</span><small class="muted">JPG, PNG atau WebP. Boleh pilih banyak sekali gus.</small></div>
          <div class="thumbs">${a.images.map((s, ii) => `<div class="thumb"><img src="${esc(s)}" alt="Gambar ${ii + 1}" loading="lazy"><div class="thumb__acts">
            <span><button class="iconbtn" type="button" data-act="imgL" data-a="${ai}" data-i="${ii}" aria-label="Alih ke kiri" ${ii === 0 ? "disabled" : ""}>${icon("check").replace(/<path[^>]*\/>/, '<path d="M15 6l-6 6 6 6"/>')}</button><button class="iconbtn" type="button" data-act="imgR" data-a="${ai}" data-i="${ii}" aria-label="Alih ke kanan" ${ii === a.images.length - 1 ? "disabled" : ""}>${icon("check").replace(/<path[^>]*\/>/, '<path d="M9 6l6 6-6 6"/>')}</button></span>
            <button class="iconbtn" type="button" data-act="imgDel" data-a="${ai}" data-i="${ii}" aria-label="Padam gambar"><svg class="ico" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>`).join("")}</div>
          <div class="row"><button class="btn btn--danger btn--sm" type="button" data-act="albumDel" data-a="${ai}">Padam album</button></div>`, ai === 0)).join("") +
        `<button type="button" class="btn-add" data-act="albumAdd">+ Tambah album</button>`;
    },

    leads: () => {
      if (!fbOn) return card("Pertanyaan pelanggan", "", '<div class="hint">Bahagian ini memerlukan sambungan pangkalan data. Isi <code>firebase-config.js</code> dan log masuk dengan akaun admin Firebase.</div>');
      queueMicrotask(() => { startLeads(); paintLeads(); });
      return card("Pertanyaan pelanggan", "Setiap borang sebut harga yang dihantar pelawat disimpan di sini, selain dihantar ke WhatsApp.", '<div id="leadsBox"></div>', '<button class="btn btn--soft btn--sm" type="button" data-act="xl" data-k="leads">Eksport Excel</button>');
    },
    cta: () => card("WhatsApp & hubungan", "", `<div class="grid2">${F.text("brand.waNumber", "Nombor WhatsApp", { inputmode: "numeric" })}${F.text("brand.phoneDisplay", "Nombor dipaparkan")}</div>${F.L("brand.waMessage", "Mesej WhatsApp lalai", { area: true })}<div class="grid2">${F.text("brand.qalamLabel", "Label pautan footer")}${F.text("brand.qalamUrl", "Pautan footer", { type: "url" })}</div>`) +
      card("Butang pada kad & pop-up perkhidmatan", "Pautan CTA bagi setiap perkhidmatan. Kosongkan pautan jika tiada butang.", cfg.services.map((s, i) => `<div class="grid2"><div class="f"><span>Perkhidmatan ${i + 1}: <b>${esc(LT(s.title))}</b></span>${F.L(`services.${i}.ctaLabel`, "Label butang")}</div>${F.text(`services.${i}.ctaUrl`, "Pautan", { type: "url", ph: "https://…" })}</div>`).join("")) +
      card("Butang pada kad harga", "", cfg.plans.map((p, i) => `<div class="grid3">${F.sel(`plans.${i}.action`, `Pakej ${i + 1}: ${esc(LT(p.kicker))}`, [["quote", "Buka borang sebut harga"], ["service", "Buka butiran perkhidmatan"], ["url", "Pergi ke pautan"]])}${F.text(`plans.${i}.url`, "Pautan", { type: "url", ph: "https://…" })}${F.L(`plans.${i}.btnLabel`, "Label (kosong = lalai)")}</div>`).join("")) +
      card("Butang portfolio", "Jika pautan diisi, kad portfolio terus ke pautan itu.", cfg.works.map((w, i) => F.text(`works.${i}.url`, `Portfolio ${i + 1}: ${esc(w.title)}`, { type: "url", ph: "https://…" })).join("")),

    reports: () => reportsPanel(),
    settings: () => settingsPanel(),
    theme: () => themePanel(),
  };

  const UNUSED_TEXT = new Set(["vs_note", "ft_tag", "ft_top", "aria_wa"]); // tidak lagi dipaparkan di laman awam
  const TEXT_GROUPS = [
    ["Menu & butang", ["skip", "nav_services", "nav_process", "nav_portfolio", "nav_testi", "nav_pricing", "nav_faq", "cta_quote", "cta_wa", "cta_details", "cta_ask"]],
    ["Hero (bahagian atas)", ["hero_title", "hero_lead"]],
    ["Seksyen masalah", ["p_eyebrow", "p_title"]],
    ["Seksyen perkhidmatan", ["sv_eyebrow", "sv_title", "sv_sub", "h_popular", "m_service"]],
    ["Seksyen proses", ["pr_eyebrow", "pr_title"]],
    ["Seksyen portfolio", ["pf_eyebrow", "pf_title"]],
    ["Seksyen testimoni", ["t_eyebrow", "t_title", "t_hint"]],
    ["Seksyen harga", ["h_eyebrow", "h_title"]],
    ["Seksyen tentang", ["ab_eyebrow", "ab_title", "ab_p1", "ab_p2", "ab_cta"]],
    ["Seksyen soalan lazim", ["q_eyebrow", "q_title"]],
    ["Banner penutup", ["c_title", "c_lead"]],
    ["Footer & statistik pelawat", ["ft_about", "ft_explore", "ft_contact", "ft_rights", "vs_title", "vs_today", "vs_total"]],
    ["Borang sebut harga", ["fm_title", "fm_sub", "fm_name", "fm_phone", "fm_plan", "fm_msg", "fm_submit", "op_other", "op_otherSub"]],
    ["Pop-up hubungi", ["ct_title", "ct_sub", "ct_wa", "ct_waSub", "ct_form", "ct_formSub", "ct_copy"]],
  ];
  const LABELS = {
    skip: "Pautan langkau kandungan", "nav_services": "Menu: Perkhidmatan", "nav_process": "Menu: Proses", "nav_portfolio": "Menu: Portfolio", "nav_testi": "Menu: Testimoni",
    "nav_pricing": "Menu: Harga", "nav_faq": "Menu: Soalan Lazim", "cta_quote": "Butang: Minta Sebut Harga", "cta_wa": "Butang: WhatsApp Saya", "cta_details": "Butang: Lihat Butiran", "cta_ask": "Butang: Tanya Dulu",
    "hero_title": "Tajuk hero", "hero_lead": "Perenggan hero", "p_eyebrow": "Label kecil", "p_title": "Tajuk seksyen", "sv_eyebrow": "Label kecil", "sv_title": "Tajuk seksyen", "sv_sub": "Sub-tajuk",
    "h_popular": "Reben: Paling diminta", "m_service": "Label pop-up: Perkhidmatan", "pr_eyebrow": "Label kecil", "pr_title": "Tajuk seksyen", "pf_eyebrow": "Label kecil", "pf_title": "Tajuk seksyen",
    "t_eyebrow": "Label kecil", "t_title": "Tajuk seksyen", "t_hint": "Arahan album", "h_eyebrow": "Label kecil", "h_title": "Tajuk seksyen", "ab_eyebrow": "Label kecil", "ab_title": "Tajuk seksyen",
    "ab_p1": "Perenggan 1", "ab_p2": "Perenggan 2", "ab_cta": "Butang", "q_eyebrow": "Label kecil", "q_title": "Tajuk seksyen", "c_title": "Tajuk banner", "c_lead": "Perenggan banner",
    "ft_about": "Penerangan jenama (footer)", "ft_tag": "Lokasi (footer)", "ft_explore": "Tajuk lajur: Teroka", "ft_contact": "Tajuk lajur: Hubungi", "ft_rights": "Hak cipta", "ft_top": "Kembali ke atas",
    "vs_title": "Tajuk statistik", "vs_note": "Nota statistik", "vs_today": "Label: hari ini", "vs_total": "Label: keseluruhan",
    "fm_title": "Tajuk borang", "fm_sub": "Sub-tajuk borang", "fm_name": "Medan: Nama", "fm_phone": "Medan: Telefon", "fm_plan": "Medan: Pakej", "fm_msg": "Medan: Mesej", "fm_submit": "Butang hantar",
    "op_other": "Pilihan: Belum pasti", "op_otherSub": "Pilihan: Belum pasti (kecil)", "ct_title": "Tajuk pop-up hubungi", "ct_sub": "Sub-tajuk", "ct_wa": "Pilihan WhatsApp", "ct_waSub": "Pilihan WhatsApp (kecil)",
    "ct_form": "Pilihan borang", "ct_formSub": "Pilihan borang (kecil)", "ct_copy": "Salin nombor",
    "msg_errName": "Ralat: nama", "msg_errPhone": "Ralat: telefon", "msg_ok": "Mesej berjaya", "msg_openWa": "Pautan sandaran WhatsApp", "msg_waIntro": "Pembuka mesej WhatsApp (borang)",
    "msg_name": "Awalan: Nama", "msg_phone": "Awalan: Telefon", "msg_plan": "Awalan: Pakej", "msg_msg": "Awalan: Mesej", "msg_copied": "Nombor disalin", "msg_copyFail": "Salin gagal",
    "msg_visFail": "Statistik gagal", "msg_empty": "Bingkai album kosong", "msg_photo": "Alt gambar testimoni", "msg_menuOpen": "Aria: buka menu", "msg_menuClose": "Aria: tutup menu", "msg_langBtn": "Aria: tukar bahasa",
    "aria_wa": "Aria: butang WhatsApp", "aria_close": "Aria: butang tutup",
  };

  // ===================== PANEL: TEMA (bahagian terakhir; warna dan font diasingkan) =====================
  let fontLinkAdded = false;
  const ensureFontPreview = () => {
    if (fontLinkAdded) return; fontLinkAdded = true;
    const specs = new Set([...C.FONTS.head, ...C.FONTS.body].map((f) => "family=" + f.spec));
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + [...specs].join("&") + "&display=swap"; document.head.appendChild(l);
  };
  const themePanel = () => {
    ensureFontPreview();
    const th = cfg.theme, r = C.resolveTheme(th), cr = C.contrast(r.primary, "#ffffff");
    const pals = C.PALETTES.map((p) => `<button type="button" class="pal" data-act="pal" data-v="${p.id}" aria-pressed="${th.palette === p.id}"><span class="pal__sw"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i><i style="background:${p.accent}"></i></span><b>${p.name}${th.palette === p.id ? "<em>Dipilih</em>" : ""}</b></button>`).join("");
    const cu = th.custom;
    const colorField = (k, label) => `<div class="color"><span>${label}</span><div><input type="color" data-cc="${k}" value="${esc(cu[k])}" aria-label="${label}"><input type="text" class="mono" data-cch="${k}" value="${esc(cu[k])}" maxlength="7" aria-label="${label} (hex)" style="min-height:44px;padding:0 10px;border:1.5px solid #c9d6da;border-radius:10px"></div></div>`;
    const fontCards = (list, key) => list.map((f) => `<button type="button" class="font" data-act="font" data-key="${key}" data-v="${esc(f.name)}" aria-pressed="${th[key] === f.name}" style="font-family:'${f.name}',sans-serif"><span class="font__aa">${key === "fontHead" ? "Khat, website &amp; video AI" : "Saya bantu anda dapatkan seni khat yang betul."}</span><small>${f.name} · ${f.cat}</small></button>`).join("");
    return card("Palet warna", "Pilih satu palet siap atau cipta warna tersuai. Perubahan terus nampak di laman awam.", `
        <div class="pals">${pals}<button type="button" class="pal" data-act="pal" data-v="custom" aria-pressed="${th.palette === "custom"}"><span class="pal__sw"><i style="background:${cu.primary}"></i><i style="background:${cu.secondary}"></i><i style="background:${cu.accent}"></i></span><b>Warna tersuai${th.palette === "custom" ? "<em>Dipilih</em>" : ""}</b></button></div>
        <div class="custom" id="customBox">${colorField("primary", "Warna utama")}${colorField("secondary", "Warna kedua")}${colorField("accent", "Warna sorotan")}</div>
        <div class="hint ${cr >= 4.5 ? "hint--ok" : "hint--err"}" id="contrastBox">Kontras teks putih atas warna utama: <b>${cr.toFixed(1)}:1</b> ${cr >= 4.5 ? "(lulus, cukup jelas dibaca)" : "(rendah)"}. Warna tersuai dilaraskan automatik supaya teks kekal jelas.</div>`) +
      card("Jenis font", "Dipilih berasingan daripada warna. Hanya font tanpa ekor (sans) disyorkan untuk rupa formal.", `
        <div class="f"><span>Font tajuk</span><div class="fonts">${fontCards(C.FONTS.head, "fontHead")}</div></div>
        <div class="f"><span>Font teks badan</span><div class="fonts">${fontCards(C.FONTS.body, "fontBody")}</div></div>`);
  };
  const refreshThemeUi = () => {
    const th = cfg.theme;
    $$("[data-act=pal]").forEach((b) => { const on = b.dataset.v === th.palette; b.setAttribute("aria-pressed", String(on)); const em = $("em", b); if (on && !em) b.querySelector("b").insertAdjacentHTML("beforeend", "<em>Dipilih</em>"); if (!on && em) em.remove(); });
    $$("[data-act=font]").forEach((b) => b.setAttribute("aria-pressed", String(th[b.dataset.key] === b.dataset.v)));
    const cr = C.contrast(C.resolveTheme(th).primary, "#ffffff"), box = $("#contrastBox");
    if (box) { box.className = "hint " + (cr >= 4.5 ? "hint--ok" : "hint--err"); box.innerHTML = `Kontras teks putih atas warna utama: <b>${cr.toFixed(1)}:1</b> ${cr >= 4.5 ? "(lulus, cukup jelas dibaca)" : "(rendah)"}. Warna tersuai dilaraskan automatik supaya teks kekal jelas.`; }
    const sw = $$(".pal").pop(); if (sw) $$("i", sw).forEach((i, n) => { i.style.background = th.custom[["primary", "secondary", "accent"][n]]; });
  };

  // ===================== PANEL: TETAPAN =====================
  const SECTION_LABELS = { ticker: "Jalur perkataan bergerak", stats: "Angka harga", problems: "Masalah → penyelesaian", services: "Perkhidmatan", process: "Proses", portfolio: "Portfolio", testimonials: "Galeri testimoni", pricing: "Harga", about: "Tentang", faq: "Soalan lazim", banner: "Banner penutup", visits: "Statistik pelawat (footer)" };
  const dbCard = () => card("Pangkalan data", "Sambungan Firebase Firestore untuk kandungan, gambar, statistik dan pertanyaan.", fbOn
    ? `<div class="hint hint--ok">Disambungkan ke projek <code>${esc(DB.projectId())}</code>. Semua suntingan disimpan terus dan semua pelawat nampak perubahan serta-merta.</div>
       <div class="row"><button class="btn btn--soft" type="button" data-act="dbPush">Hantar semula semua data ke pangkalan data</button><button class="btn btn--soft" type="button" data-act="dbPull">Muat semula dari pangkalan data</button></div>`
    : DB && DB.configured() ? '<div class="hint hint--err">Firebase dikonfigurasi tetapi tidak disambung (mod tempatan). Semak sambungan internet dan Rules, kemudian muat semula.</div>'
      : '<div class="hint">Mod tempatan. Isi <code>firebase-config.js</code> untuk menyambung pangkalan data.</div>');
  const settingsPanel = () => dbCard() +
    card("Paparan seksyen", "Matikan seksyen untuk menyembunyikannya (menu berkaitan turut hilang).", `<div class="grid3">${Object.keys(SECTION_LABELS).map((k) => F.bool("sections." + k, SECTION_LABELS[k])).join("")}</div>`) +
    card("Kesan klik", "Letusan kecil dan bunyi lembut setiap kali pelawat klik di laman awam.", F.bool("effects.sound", "Bunyi lembut bila klik")) +
    card("SEO", "Tajuk dan penerangan untuk enjin carian (Google).", `${F.text("seo.title", "Tajuk halaman")}${F.area("seo.description", "Penerangan (maks ±160 aksara)")}`) +
    card(fbOn ? "Sandaran & import" : "Terbitkan ke semua pelawat", fbOn ? "Simpan salinan sandaran konfigurasi (JSON) atau import semula." : "Perubahan di panel ini terus nampak pada pelayar ini. Untuk pelawat lain, terbitkan fail konfigurasi.", `
      <div class="hint" ${fbOn ? "hidden" : ""}><b>Langkah:</b> (1) tekan <b>Muat turun site-config.json</b>, (2) muat naik fail itu ke hosting, di folder yang sama dengan <code>index.html</code>, (3) selesai. Laman awam akan membacanya secara automatik.</div>
      <div class="row"><button class="btn btn--primary" type="button" data-act="exportJson">Muat turun site-config.json</button><button class="btn btn--soft" type="button" data-act="copyJson">Salin JSON</button>
        <button class="btn btn--soft" type="button" data-act="upload" data-target="import">Import konfigurasi</button></div>`) +
    (fbOn ? "" : card("Pengira pelawat", "Perkhidmatan kaunter awam percuma. Tukar hanya jika anda tahu apa yang anda buat.", `<div class="grid2">${F.text("visits.api", "Alamat API", { type: "url" })}${F.text("visits.ns", "Ruang nama (namespace)")}</div>`)) +
    (fbOn ? card("Akaun admin", "", `<div class="hint hint--ok">Anda log masuk sebagai <b>${esc(DB.user() ? DB.user().email : "")}</b>. Kata laluan diurus oleh Firebase Authentication.</div><div class="row"><button class="btn btn--soft" type="button" data-act="resetPw">Hantar emel set semula kata laluan</button></div>`) : "") +
    card("Set semula", "Padam semua suntingan dan kembali kepada kandungan asal.", `<button class="btn btn--danger" type="button" data-act="reset">Set semula ke asal</button>`);

  // ===================== PANEL: LAPORAN & EXCEL =====================
  const priceRows = () => cfg.services.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(LT(s.title))}</td><td>${s.priceMin ? "RM" + s.priceMin : "-"}</td><td>${s.priceMax ? "RM" + s.priceMax : "-"}</td><td>${s.visible === false ? "Disembunyi" : "Dipaparkan"}</td></tr>`).join("");
  const reportsPanel = () =>
    card("Eksport ke Excel (.xlsx)", "Templat khas berjenama: pengepala berwarna ikut tema laman, logo, jadual berjalur, format harga RM, tetapan cetak A4 dan nombor halaman.", `
      <div class="xl-grid">
        <button class="xl xl--all" type="button" data-act="xl" data-k="full"><i>${icon("doc")}</i><span>Laporan penuh<small>Semua helaian dalam satu fail</small></span></button>
        <button class="xl" type="button" data-act="xl" data-k="price"><i>${icon("tag")}</i><span>Senarai harga<small>Perkhidmatan + pakej</small></span></button>
        <button class="xl" type="button" data-act="xl" data-k="faq"><i>${icon("chat")}</i><span>Soalan lazim<small>BM dan BI</small></span></button>
        <button class="xl" type="button" data-act="xl" data-k="visits"><i>${icon("users")}</i><span>Statistik pelawat<small>30 hari terakhir + jumlah</small></span></button>
        <button class="xl" type="button" data-act="xl" data-k="content"><i>${icon("edit")}</i><span>Kandungan laman<small>Semua teks BM dan BI</small></span></button>
        <button class="xl" type="button" data-act="xl" data-k="gallery"><i>${icon("image")}</i><span>Inventori galeri<small>Album, bilangan, saiz</small></span></button>
        ${fbOn ? `<button class="xl" type="button" data-act="xl" data-k="leads"><i>${icon("users")}</i><span>Pertanyaan pelanggan<small>Semua borang sebut harga</small></span></button>` : ""}
      </div>
      <div class="progress" id="xlProg" hidden><i></i></div>
      <div class="hint">Muat turun berfungsi apabila panel dibuka daripada hosting atau fail yang disimpan di komputer. Dalam paparan pratonton dalam talian, pelayar boleh menyekat muat turun.</div>`) +
    card("Pratonton senarai harga", "Inilah data yang akan masuk ke helaian Senarai Harga.", `<div class="tbl"><table><thead><tr><th>Bil</th><th>Perkhidmatan</th><th>Harga min</th><th>Harga maks</th><th>Status</th></tr></thead><tbody>${priceRows()}</tbody></table></div>`);

  // ===================== PAPARAN PANEL =====================
  const showPanel = (name, keep) => {
    panel = name;
    $("#topTitle").textContent = (NAV.find((n) => n[0] === name) || [])[1] || "";
    $$(".nav__btn").forEach((b) => b.toggleAttribute("aria-current", b.dataset.panel === name));
    $$(".nav__btn").forEach((b) => { if (b.dataset.panel === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $("#main").innerHTML = PANELS[name]();
    if (!keep) window.scrollTo(0, 0);
    $("#side").classList.remove("open");
  };

  // ===================== PERISTIWA =====================
  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-bind]");
    if (el) {
      const v = el.type === "checkbox" ? el.checked : el.dataset.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value;
      commit(el.dataset.bind, v);
      if (el.dataset.bind.startsWith("sections.") || el.dataset.bind === "services" ) return;
      return;
    }
    const cc = e.target.closest("[data-cc]"), cch = e.target.closest("[data-cch]");
    if (cc || cch) {
      const k = (cc || cch).dataset.cc || (cc || cch).dataset.cch, v = (cc || cch).value.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
      commit("theme.custom." + k, v.toLowerCase()); commit("theme.palette", "custom");
      const other = cc ? $(`[data-cch="${k}"]`) : $(`[data-cc="${k}"]`); if (other) other.value = v.toLowerCase();
      refreshThemeUi();
    }
  });

  const mutate = (path, fn) => { const arr = C.getPath(cfg, path); fn(arr); structural(); rerender(); };
  const resetArm = new WeakMap();
  document.addEventListener("click", async (e) => {
    const pb = e.target.closest("[data-panel]");
    if (pb) { showPanel(pb.dataset.panel); return; }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act, path = b.dataset.path, i = Number(b.dataset.i);
    const arm = (label) => { if (b.classList.contains("armed")) { clearTimeout(resetArm.get(b)); return true; } b.classList.add("armed"); b.dataset.orig = b.innerHTML; b.textContent = label; resetArm.set(b, setTimeout(() => { b.classList.remove("armed"); b.innerHTML = b.dataset.orig; }, 3000)); return false; };
    switch (a) {
      case "add": { const sc = schemaFor(path); mutate(path, (arr) => { openKeys.add(`${path}.${arr.length}`); arr.push(sc.blank()); }); break; }
      case "del": if (arm("Pasti?")) mutate(path, (arr) => arr.splice(i, 1)); break;
      case "up": mutate(path, (arr) => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }); break;
      case "down": mutate(path, (arr) => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }); break;
      case "dup": mutate(path, (arr) => { const c = C.clone(arr[i]); if (c && typeof c === "object" && "id" in c) c.id = uid(String(c.id).split("-")[0]); arr.splice(i + 1, 0, c); openKeys.add(`${path}.${i + 1}`); }); break;
      case "icon": commit(path, b.dataset.v); $$(`[data-act=icon][data-path="${path}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === b.dataset.v))); break;
      case "pal": commit("theme.palette", b.dataset.v); refreshThemeUi(); break;
      case "font": commit("theme." + b.dataset.key, b.dataset.v); refreshThemeUi(); break;
      case "upload": $("#filePick").dataset.target = b.dataset.target; $("#filePick").multiple = b.dataset.target.startsWith("album"); $("#filePick").accept = b.dataset.target === "import" ? "application/json,.json" : "image/*"; $("#filePick").value = ""; $("#filePick").click(); break;
      case "logoDel": cfg.brand.logo = ""; structural(); rerender(); break;
      case "imgDel": await imgRemove(Number(b.dataset.a), Number(b.dataset.i)); structural(); rerender(); break;
      case "imgL": imgMove(Number(b.dataset.a), Number(b.dataset.i), -1); structural(); rerender(); break;
      case "imgR": imgMove(Number(b.dataset.a), Number(b.dataset.i), 1); structural(); rerender(); break;
      case "albumAdd": { const id = uid("album"); cfg.albums.push({ id, name: { ms: "Album baharu", en: "New album" }, images: [] }); openKeys.add("acc:Album: Album baharu"); structural(); rerender(); break; }
      case "albumDel": if (arm("Pasti padam?")) { const ai = Number(b.dataset.a); if (fbOn) for (const id of imgIds(ai).slice()) { try { await DB.delImage(id); } catch (e) { dbError(e); } } cfg.albums.splice(ai, 1); structural(); rerender(); } break;
      case "exportJson": downloadBlob(new Blob([JSON.stringify(stamp(), null, 1)], { type: "application/json" }), "site-config.json"); toast("site-config.json dimuat turun. Muat naik ke hosting di sebelah index.html."); break;
      case "copyJson": try { await navigator.clipboard.writeText(JSON.stringify(stamp())); toast("JSON disalin."); } catch (_) { toast("Salin gagal. Gunakan butang muat turun."); } break;
      case "reset": if (arm("Pasti set semula?")) {
        if (fbOn) for (const a of cfg.albums) for (const id of (a.imageIds || []).slice()) { try { await DB.delImage(id); } catch (_) { /* abaikan */ } }
        cfg = C.clone(DEFS); cfg.rev = Date.now(); structural(); rerender(); toast("Dikembalikan kepada kandungan asal."); } break;
      case "dbPush": try { await migrateImages(); await DB.saveConfig(remoteShape()); setStatus("saved"); toast("Semua data dihantar ke pangkalan data."); } catch (err) { dbError(err); } break;
      case "dbPull": if (await loadRemoteCfg()) { structural(); rerender(); toast("Dimuat semula dari pangkalan data."); } break;
      case "resetPw": try { await DB.resetPassword(DB.user().email); toast("Emel set semula kata laluan dihantar."); } catch (err) { dbError(err); } break;
      case "leadDel": if (arm("Pasti?")) { try { await DB.delLead(b.dataset.id); } catch (err) { dbError(err); } } break;
      case "xl": exportXlsx(b.dataset.k); break;
      case "refreshVisits": loadVisitKpis(); break;
    }
  });
  document.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-lead-status]");
    if (sel) { try { await DB.updateLead(sel.dataset.leadStatus, { status: sel.value }); } catch (err) { dbError(err); } }
  });
  document.addEventListener("toggle", (e) => { const d = e.target; if (d.dataset && d.dataset.key) (d.open ? openKeys.add(d.dataset.key) : openKeys.delete(d.dataset.key)); }, true);

  // Muat naik fail
  const fileToDataUrl = (file, max, mime, q) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => {
      if (file.type === "image/svg+xml") return res(r.result);
      const img = new Image();
      img.onerror = () => rej(new Error("Gambar tidak sah"));
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d"); if (mime === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h); res(c.toDataURL(mime, q));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
  const handleFiles = async (target, files) => {
    if (!files.length) return;
    try {
      if (target === "import") {
        const j = JSON.parse(await files[0].text());
        if (!j || !Array.isArray(j.services) || !j.brand) throw new Error("Bukan fail konfigurasi laman");
        cfg = C.merge(j, DEFS); if (fbOn) { cfg.albums.forEach((a) => { a.imageIds = []; }); await migrateImages(); } structural(); rerender(); toast("Konfigurasi diimport."); return;
      }
      if (target === "logo") { cfg.brand.logo = await fileToDataUrl(files[0], 320, "image/png", 0.92); structural(); rerender(); toast("Logo dikemas kini."); return; }
      if (target.startsWith("album:")) {
        const ai = Number(target.split(":")[1]); let n = 0;
        for (const f of files) {
          if (!f.type.startsWith("image/")) continue;
          let d = await fileToDataUrl(f, fbOn ? 1000 : 1200, "image/jpeg", fbOn ? 0.78 : 0.82);
          if (d.length > 850000) d = await fileToDataUrl(f, 800, "image/jpeg", 0.7); // had 900KB satu dokumen
          await imgAdd(ai, d); n++;
        }
        structural(); rerender(); toast(`${n} gambar ditambah.`);
      }
    } catch (err) { toast("Gagal: " + err.message); }
  };
  $("#filePick").addEventListener("change", (e) => handleFiles(e.target.dataset.target, [...e.target.files]));
  document.addEventListener("dragover", (e) => { const d = e.target.closest(".drop"); if (d) { e.preventDefault(); d.classList.add("over"); } });
  document.addEventListener("dragleave", (e) => { const d = e.target.closest(".drop"); if (d) d.classList.remove("over"); });
  document.addEventListener("drop", (e) => { const d = e.target.closest(".drop"); if (!d) return; e.preventDefault(); d.classList.remove("over"); handleFiles("album:" + d.dataset.drop, [...e.dataTransfer.files]); });
  document.addEventListener("keydown", (e) => { const d = e.target.closest && e.target.closest(".drop"); if (d && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); d.click(); } });

  // ===================== PRATONTON LANGSUNG =====================
  let pvW = 1280, pvOpen = false, pvLoaded = false, pvReadyT = 0;
  const fitPv = () => {
    const st = $("#pvStage"), f = $("#pvFrame"), s = Math.min(1, st.clientWidth / pvW);
    f.style.width = pvW + "px"; f.style.height = st.clientHeight / s + "px"; f.style.transform = `scale(${s})`;
    f.style.left = Math.max(0, (st.clientWidth - pvW * s) / 2) + "px";
  };
  const openPv = (on) => {
    pvOpen = on; $("#pv").hidden = !on; document.body.classList.toggle("pv-open", on); $("#pvBtn").setAttribute("aria-pressed", String(on));
    if (on && !pvLoaded) {
      pvLoaded = true;
      const tpl = $("#publicTpl"), f = $("#pvFrame");
      if (tpl) f.srcdoc = new TextDecoder().decode(Uint8Array.from(atob(tpl.textContent.trim()), (c) => c.charCodeAt(0))); else f.src = "index.html";
      pvReadyT = setTimeout(() => { $("#pvNote").textContent = "Pratonton tidak dapat dimuatkan dalam paparan ini. Perubahan tetap disiarkan ke tab laman awam yang dibuka pada pelayar yang sama."; }, 5000);
    }
    requestAnimationFrame(fitPv);
  };
  $("#pvBtn").addEventListener("click", () => openPv(!pvOpen));
  $("#pvClose").addEventListener("click", () => openPv(false));
  $$(".pv__dev button").forEach((b) => b.addEventListener("click", () => { pvW = Number(b.dataset.w); $$(".pv__dev button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); fitPv(); }));
  window.addEventListener("resize", fitPv);
  window.addEventListener("message", (e) => {
    if (e.data && e.data.iy === 1 && e.data.type === "ready") { clearTimeout(pvReadyT); $("#pvNote").textContent = ""; post({ iy: 1, type: "full", cfg }); }
  });
  if (chan) chan.onmessage = (e) => { if (e.data && e.data.iy === 1 && e.data.type === "need-full") post({ iy: 1, type: "full", cfg }); };

  // ===================== STATISTIK PELAWAT =====================
  const vget = (key) => fetch(`${cfg.visits.api}/get/${cfg.visits.ns}/${key}`).then((r) => (r.status === 404 ? { value: 0 } : r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((j) => Number(j.value) || 0);
  const dayKey = (offset = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(Date.now() - offset * 864e5));
  async function loadVisitKpis() {
    const t = $("#kToday"), g = $("#kTotal"); if (!t) return;
    try { const [d, tot] = fbOn ? await Promise.all([DB.getStat("d-" + dayKey()), DB.getStat("total")]) : await Promise.all([vget("d-" + dayKey()), vget("total")]); if ($("#kToday")) { $("#kToday").textContent = d.toLocaleString("ms-MY"); $("#kTotal").textContent = Math.max(d, tot).toLocaleString("ms-MY"); } }
    catch (_) { if ($("#kToday")) { $("#kToday").textContent = "–"; $("#kTotal").textContent = "–"; } }
  }

  // ===================== EXCEL (ExcelJS) =====================
  const stamp = () => { cfg.rev = Date.now(); return cfg; };
  const downloadBlob = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const argb = (hex) => "FF" + hex.replace("#", "").toUpperCase();
  const mix = (hex, t) => { const [r, g, b] = C.hexToRgb(hex); return C.rgbToHex(r + (255 - r) * (1 - t), g + (255 - g) * (1 - t), b + (255 - b) * (1 - t)); }; // t = peratus warna
  const thin = { style: "thin", color: { argb: "FFD5E1E0" } };

  function makeSheet(wb, o) {
    const th = C.resolveTheme(cfg.theme), n = o.cols.length;
    const ws = wb.addWorksheet(o.name, {
      views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: o.landscape === false ? "portrait" : "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }, printTitlesRow: "6:6" },
      headerFooter: { oddFooter: `&L&8${cfg.brand.name}&C&8Halaman &P / &N&R&8&D` },
      properties: { tabColor: { argb: argb(th.primary) } },
    });
    ws.columns = o.cols.map((c) => ({ key: c.key, width: c.w }));
    const band = (row, text, size, bold, fill, color, h) => {
      ws.mergeCells(row, 1, row, n); const c = ws.getCell(row, 1);
      c.value = text; c.font = { name: "Calibri", size, bold, color: { argb: color } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      c.alignment = { vertical: "middle", horizontal: "left", indent: 1 }; ws.getRow(row).height = h;
    };
    band(1, o.title, 20, true, argb(th.primary), "FFFFFFFF", 40);
    band(2, `${cfg.brand.name}  |  ${cfg.brand.phoneDisplay}  |  ${o.subtitle || ""}`, 11, false, argb(th.primary), "FFE6FFFB", 22);
    band(3, "", 8, false, argb(th.accent), "FFFFFFFF", 6);
    band(4, `Dijana pada ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}`, 9, false, argb(mix(th.primary, 0.1)), "FF475569", 18);
    ws.getRow(5).height = 8;
    const logo = cfg.brand.logo && /^data:image\/(png|jpeg)/.test(cfg.brand.logo) ? cfg.brand.logo : "";
    if (logo) {
      const id = wb.addImage({ base64: logo.split(",")[1], extension: logo.startsWith("data:image/png") ? "png" : "jpeg" });
      ws.addImage(id, { tl: { col: Math.max(0, n - 0.75), row: 0.15 }, ext: { width: 52, height: 52 } });
    }
    // pengepala jadual
    const hr = ws.getRow(6); hr.height = 28;
    o.cols.forEach((c, i) => {
      const cell = hr.getCell(i + 1); cell.value = c.h;
      cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(th.secondary) } };
      cell.alignment = { vertical: "middle", horizontal: c.align || "left", wrapText: true, indent: c.align === "center" ? 0 : 1 };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });
    // baris data berjalur
    o.rows.forEach((r, ri) => {
      const row = ws.getRow(7 + ri);
      o.cols.forEach((c, i) => {
        const cell = row.getCell(i + 1); cell.value = r[c.key] == null ? "" : r[c.key];
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
        cell.alignment = { vertical: "top", horizontal: c.align || "left", wrapText: true, indent: c.align === "center" ? 0 : 1 };
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        if (c.fmt) cell.numFmt = c.fmt;
        if (ri % 2) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(mix(th.primary, 0.06)) } };
      });
    });
    // tinggi baris mengikut baris teks (supaya senarai ciri tidak terpotong)
    o.rows.forEach((r, ri) => {
      const lines = Math.max(1, ...o.cols.map((c) => String(r[c.key] == null ? "" : r[c.key]).split("\n").reduce((n, ln) => n + Math.max(1, Math.ceil(ln.length / Math.max(6, c.w * 1.05))), 0)));
      ws.getRow(7 + ri).height = Math.min(300, lines * 13.5 + 8);
    });
    let last = 6 + o.rows.length;
    if (o.totals) {
      last++; const row = ws.getRow(last); row.height = 24;
      o.cols.forEach((c, i) => {
        const cell = row.getCell(i + 1); const t = o.totals[c.key]; cell.value = t === undefined ? "" : t;
        cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: argb(th.primary) } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(mix(th.accent, 0.22)) } };
        cell.border = { top: { style: "medium", color: { argb: argb(th.primary) } }, bottom: thin, left: thin, right: thin };
        cell.alignment = { vertical: "middle", horizontal: c.align || "left", indent: c.align === "center" ? 0 : 1 }; if (c.fmt) cell.numFmt = c.fmt;
      });
    }
    if (o.rows.length) ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + o.rows.length, column: n } };
    ws.pageSetup.printArea = `A1:${String.fromCharCode(64 + Math.min(n, 26))}${last}`;
    if (o.dataBar) ws.addConditionalFormatting({ ref: `${o.dataBar}7:${o.dataBar}${6 + o.rows.length}`, rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, showValue: true, gradient: false, border: false, cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: argb(mix(th.primary2, 0.55)) } }] });
    return ws;
  }

  const SHEETS = {
    summary: () => {
      const imgs = cfg.albums.reduce((n, a) => n + a.images.length, 0), mins = cfg.services.map((s) => Number(s.priceMin)).filter((x) => x > 0), maxs = cfg.services.map((s) => Number(s.priceMax)).filter((x) => x > 0);
      return { name: "Ringkasan", title: "Ringkasan Laman", subtitle: "Gambaran keseluruhan laman awam", landscape: false,
        cols: [{ key: "k", h: "Perkara", w: 34 }, { key: "v", h: "Nilai", w: 60 }],
        rows: [
          { k: "Nama", v: cfg.brand.name }, { k: "Sub-tajuk", v: LT(cfg.brand.subtitle) }, { k: "WhatsApp", v: cfg.brand.phoneDisplay }, { k: "Lokasi", v: `${cfg.deco.chipA}; ${cfg.deco.chipB}` },
          { k: "Bilangan perkhidmatan", v: cfg.services.length }, { k: "Bilangan pakej harga", v: cfg.plans.length },
          { k: "Harga terendah (RM)", v: mins.length ? Math.min(...mins) : "-" }, { k: "Harga tertinggi (RM)", v: maxs.length ? Math.max(...maxs) : "-" },
          { k: "Soalan lazim", v: cfg.faq.length }, { k: "Gambar galeri", v: imgs }, { k: "Palet warna", v: cfg.theme.palette }, { k: "Font tajuk / badan", v: `${cfg.theme.fontHead} / ${cfg.theme.fontBody}` },
        ] };
    },
    price: () => ({ name: "Senarai Harga", title: "Senarai Harga Perkhidmatan", subtitle: "Perkhidmatan dan harga semasa",
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "t", h: "Perkhidmatan", w: 34 }, { key: "d", h: "Penerangan", w: 52 }, { key: "min", h: "Harga min", w: 14, fmt: '"RM" #,##0', align: "right" }, { key: "max", h: "Harga maks", w: 14, fmt: '"RM" #,##0', align: "right" }, { key: "txt", h: "Harga dipaparkan", w: 20 }, { key: "f", h: "Ciri-ciri", w: 50 }, { key: "u", h: "Pautan CTA", w: 44 }, { key: "s", h: "Status", w: 14, align: "center" }],
      rows: cfg.services.map((s, i) => ({ n: i + 1, t: LT(s.title), d: LT(s.desc), min: Number(s.priceMin) || 0, max: Number(s.priceMax) || 0, txt: s.priceText, f: s.features.map((f) => "• " + LT(f)).join("\n"), u: s.ctaUrl || "-", s: s.visible === false ? "Disembunyi" : "Dipaparkan" })),
      totals: { t: "Julat harga", min: Math.min(...cfg.services.map((s) => Number(s.priceMin) || Infinity)) === Infinity ? 0 : Math.min(...cfg.services.map((s) => Number(s.priceMin) || Infinity)), max: Math.max(0, ...cfg.services.map((s) => Number(s.priceMax) || 0)) } }),
    plans: () => ({ name: "Pakej Harga", title: "Pakej Harga", subtitle: "Pakej di bahagian Harga",
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "k", h: "Pakej", w: 30 }, { key: "p", h: "Harga", w: 16, align: "right" }, { key: "to", h: "Sehingga", w: 14 }, { key: "u", h: "Unit", w: 12 }, { key: "f", h: "Ciri-ciri", w: 56 }, { key: "a", h: "Butang", w: 22 }, { key: "pop", h: "Menonjol", w: 12, align: "center" }],
      rows: cfg.plans.map((p, i) => ({ n: i + 1, k: LT(p.kicker), p: `${p.cur} ${p.price}`, to: p.priceTo || "-", u: LT(p.unit) || "-", f: p.features.map((f) => "• " + LT(f)).join("\n"), a: { quote: "Borang sebut harga", service: "Butiran perkhidmatan", url: "Pautan" }[p.action], pop: p.featured ? "Ya" : "-" })) }),
    faq: () => ({ name: "Soalan Lazim", title: "Soalan Lazim", subtitle: "Soalan dan jawapan dalam BM dan BI",
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "q", h: "Soalan (BM)", w: 38 }, { key: "a", h: "Jawapan (BM)", w: 56 }, { key: "qe", h: "Question (EN)", w: 38 }, { key: "ae", h: "Answer (EN)", w: 56 }],
      rows: cfg.faq.map((f, i) => ({ n: i + 1, q: f.q.ms, a: f.a.ms, qe: f.q.en, ae: f.a.en })) }),
    content: () => {
      const rows = []; let n = 0;
      TEXT_GROUPS.forEach(([g, keys]) => keys.forEach((k) => { if (cfg.t[k]) rows.push({ n: ++n, g, k, ms: cfg.t[k].ms, en: cfg.t[k].en }); }));
      Object.keys(cfg.t).filter((k) => !UNUSED_TEXT.has(k) && !TEXT_GROUPS.some((g) => g[1].includes(k))).forEach((k) => rows.push({ n: ++n, g: "Mesej sistem", k, ms: cfg.t[k].ms, en: cfg.t[k].en }));
      return { name: "Kandungan Laman", title: "Kandungan Laman", subtitle: "Semua teks laman awam (BM dan BI)",
        cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "g", h: "Bahagian", w: 26 }, { key: "k", h: "Kunci", w: 18 }, { key: "ms", h: "Bahasa Melayu", w: 60 }, { key: "en", h: "English", w: 60 }], rows };
    },
    leads: () => ({ name: "Pertanyaan", title: "Pertanyaan Pelanggan", subtitle: "Borang sebut harga dari laman awam",
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "d", h: "Tarikh", w: 20 }, { key: "nm", h: "Nama", w: 26 }, { key: "ph", h: "Telefon", w: 18 }, { key: "pk", h: "Pakej", w: 28 }, { key: "ms", h: "Mesej", w: 52 }, { key: "st", h: "Status", w: 14, align: "center" }, { key: "lg", h: "Bahasa", w: 10, align: "center" }],
      rows: leads.map((l, i) => ({ n: i + 1, d: fmtDt(l.createdAt), nm: l.name, ph: l.phone, pk: l.plan, ms: l.message || "-", st: { baru: "Baru", dihubungi: "Dihubungi", selesai: "Selesai" }[l.status] || l.status, lg: String(l.lang || "").toUpperCase() })) }),
    gallery: () => ({ name: "Inventori Galeri", title: "Inventori Galeri Testimoni", subtitle: "Album dan bilangan gambar", landscape: false,
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "a", h: "Album", w: 34 }, { key: "c", h: "Bilangan gambar", w: 18, align: "right" }, { key: "kb", h: "Anggaran saiz (KB)", w: 20, fmt: "#,##0", align: "right" }],
      rows: cfg.albums.map((a, i) => ({ n: i + 1, a: LT(a.name), c: a.images.length, kb: Math.round(a.images.reduce((m, s) => m + s.length * 0.75, 0) / 1024) })),
      totals: { a: "Jumlah", c: cfg.albums.reduce((n, a) => n + a.images.length, 0), kb: Math.round(cfg.albums.reduce((m, a) => m + a.images.reduce((x, s) => x + s.length * 0.75, 0), 0) / 1024) } }),
  };

  async function visitsSheet(progress) {
    const days = []; let fail = 0, st = null;
    if (fbOn) st = await DB.getStats();
    for (let i = 0; i < 30; i++) {
      const d = dayKey(i);
      if (fbOn) { days.push({ n: i + 1, date: d, day: new Intl.DateTimeFormat("ms-MY", { weekday: "long", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(Date.now() - i * 864e5)), c: st["d-" + d] || 0 }); progress(i + 1, 30); continue; }
      let v = null;
      for (let t = 0; t < 4 && v === null; t++) { // had kadar API: cuba lagi selepas jeda bila 429
        try { v = await vget("d-" + d); } catch (err) { if (String(err.message) === "429") await new Promise((r) => setTimeout(r, 2500)); else break; }
      }
      if (v === null) fail++;
      const dt = new Date(Date.now() - i * 864e5);
      days.push({ n: i + 1, date: d, day: new Intl.DateTimeFormat("ms-MY", { weekday: "long", timeZone: "Asia/Kuala_Lumpur" }).format(dt), c: v });
      progress(i + 1, 30); await new Promise((r) => setTimeout(r, 450)); // had kadar API: 30 per 10 saat
    }
    let total = null; try { total = fbOn ? (st.total || 0) : await vget("total"); } catch (_) { /* tiada */ }
    const sum = days.reduce((n, d) => n + (d.c || 0), 0);
    return { name: "Statistik Pelawat", title: "Statistik Pelawat", subtitle: `30 hari terakhir (waktu Malaysia)${fail ? ` | ${fail} hari gagal dimuatkan` : ""}`, landscape: false, dataBar: "D",
      cols: [{ key: "n", h: "Bil", w: 6, align: "center" }, { key: "date", h: "Tarikh", w: 16, align: "center" }, { key: "day", h: "Hari", w: 16 }, { key: "c", h: "Pelawat", w: 22, fmt: "#,##0", align: "right" }],
      rows: days.map((d) => ({ ...d, c: d.c == null ? "tiada data" : d.c })),
      totals: { day: `Jumlah 30 hari (purata ${Math.round(sum / 30)}/hari)`, c: sum }, _total: total };
  }

  async function exportXlsx(kind) {
    if (!window.ExcelJS) return toast("Pustaka Excel tidak dapat dimuatkan. Semak sambungan internet.");
    const prog = $("#xlProg"), bar = prog && $("i", prog);
    const set = (a, b) => { if (prog) { prog.hidden = false; bar.style.width = (a / b) * 100 + "%"; } };
    try {
      const wb = new ExcelJS.Workbook(); wb.creator = cfg.brand.name; wb.created = new Date(); wb.title = "Laporan " + cfg.brand.name;
      const want = { full: ["summary", "price", "plans", "faq", "visits", ...(fbOn ? ["leads"] : []), "content", "gallery"], leads: ["leads"], price: ["price", "plans"], faq: ["faq"], visits: ["visits"], content: ["content"], gallery: ["gallery"] }[kind];
      toast("Menjana fail Excel…");
      for (const k of want) {
        if (k === "visits") { const s = await visitsSheet(set); const t = s._total; makeSheet(wb, s); if (t != null) { const ws = wb.getWorksheet("Statistik Pelawat"); const r = 7 + s.rows.length + 2; ws.getCell(r, 2).value = "Jumlah keseluruhan"; ws.getCell(r, 2).font = { bold: true }; ws.getCell(r, 4).value = t; ws.getCell(r, 4).numFmt = "#,##0"; ws.getCell(r, 4).font = { bold: true }; } }
        else makeSheet(wb, SHEETS[k]());
      }
      const buf = await wb.xlsx.writeBuffer();
      const names = { leads: "Pertanyaan-Pelanggan", full: "Laporan-Penuh", price: "Senarai-Harga", faq: "Soalan-Lazim", visits: "Statistik-Pelawat", content: "Kandungan-Laman", gallery: "Inventori-Galeri" };
      downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${cfg.brand.name.replace(/\s+/g, "-")}-${names[kind]}-${dayKey()}.xlsx`);
      toast("Fail Excel dimuat turun.");
      window.__lastXlsx = buf.byteLength;
    } catch (err) { toast("Gagal menjana Excel: " + err.message); }
    finally { if (prog) setTimeout(() => { prog.hidden = true; if (bar) bar.style.width = "0"; }, 800); }
  }

  // ===================== PINTU MASUK (Firebase Authentication sahaja) =====================
  let entered = false;
  const enter = async () => {
    if (entered) return; entered = true;
    $("#gate").hidden = true; $("#app").hidden = false;
    if (DB && DB.configured()) { fbOn = true; if (!(await loadRemoteCfg())) fbOn = false; }
    if (!fbOn) cfg = await C.loadConfig();
    setStatus("saved");
    $("#sideName").textContent = cfg.brand.name;
    if (fbOn) startLeads();
    buildNav(); showPanel("dashboard");
    if (window.innerWidth >= 1500) openPv(true);
  };

  const AUTH_ERR = { "auth/invalid-credential": "Emel atau kata laluan salah.", "auth/wrong-password": "Emel atau kata laluan salah.", "auth/user-not-found": "Emel atau kata laluan salah.",
    "auth/invalid-email": "Format emel tidak sah.", "auth/too-many-requests": "Terlalu banyak percubaan. Cuba lagi sebentar.",
    "auth/unauthorized-domain": "Domain ini belum dibenarkan di Firebase Authentication.", "auth/operation-not-allowed": "Log masuk Emel/Kata laluan belum diaktifkan di Firebase." };

  // Logo pada skrin log masuk: guna logo laman jika ada (disimpan oleh pelayar ini), jika tidak huruf Jawi lalai
  // "network-request-failed" bermaksud permintaan tidak sampai ke Firebase. Internet mungkin ada, tetapi tempat fail ini dibuka menyekatnya.
  const embedded = () => { try { return window.top !== window; } catch (_) { return true; } };
  const netMsg = () => (embedded() || /claude|anthropic/i.test(location.hostname) || location.protocol === "about:"
    ? "Panel ini dibuka dalam pratonton yang menyekat sambungan ke Firebase. Buka fail ini dari hosting sebenar, atau simpan fail dan buka terus dalam Chrome."
    : "Pelayar tidak dapat menghubungi Firebase walaupun internet ada. Cuba matikan pemblokir iklan atau VPN untuk laman ini, atau buka dari hosting sebenar.");
  const showGateLogo = async () => {
    try {
      const c = (await C.kv.get("remote-cfg")) || (await C.kv.get("config"));
      const b = c && c.brand;
      if (b && b.logo) $("#gateLogo").innerHTML = `<img src="${esc(b.logo)}" alt="">`;
      else if (b && b.mark) $("#gateLogo span").textContent = b.mark;
    } catch (_) { /* guna lalai */ }
  };

  const gate = async () => {
    $("#gate").hidden = false; showGateLogo();
    const err = $("#gateErr");
    // ikon mata: papar / sembunyi kata laluan
    $("#gateEye").addEventListener("click", () => {
      const show = $("#gatePass").type === "password";
      $("#gatePass").type = show ? "text" : "password";
      $("#gateEye").setAttribute("aria-pressed", String(show));
      $("#gateEye").setAttribute("aria-label", show ? "Sembunyi kata laluan" : "Papar kata laluan");
      $(".ico--show", $("#gateEye")).toggleAttribute("hidden", show); $(".ico--hide", $("#gateEye")).toggleAttribute("hidden", !show);
      $("#gatePass").focus();
    });
    if (!DB || !DB.configured()) { err.textContent = "Sambungan Firebase belum dikonfigurasi."; $("#gateBtn").disabled = true; return; }
    try {
      await DB.initAuth();
      await DB.onAuth(async (u) => {
        if (!u) return;
        const allow = window.IY_ADMIN_UIDS;
        if (Array.isArray(allow) && allow.length && !allow.includes(u.uid)) { // akaun sah tetapi bukan admin
          err.textContent = "Akaun ini bukan admin laman.";
          try { await DB.signOut(); } catch (_) { /* abaikan */ }
          return;
        }
        enter();
      });
    } catch (_) { err.textContent = netMsg(); }
    $("#gateForm").onsubmit = async (e) => {
      e.preventDefault(); err.textContent = ""; $("#gateBtn").disabled = true;
      try { await DB.signIn($("#gateEmail").value.trim(), $("#gatePass").value); }
      catch (ex) { err.textContent = ex.code === "auth/network-request-failed" ? netMsg() : AUTH_ERR[ex.code] || "Log masuk gagal: " + (ex.code || ex.message); }
      finally { $("#gateBtn").disabled = false; }
    };
    $("#gateEmail").focus();
  };

  $("#logout").addEventListener("click", async () => {
    if (fbOn) { try { await DB.signOut(); } catch (_) { /* abaikan */ } }
    location.reload();
  });
  $("#menuBtn").addEventListener("click", () => $("#side").classList.toggle("open"));
  gate();
})();

/* core.js: modul teras dikongsi laman awam dan panel admin.
   Ikon, palet warna, font, utiliti warna, storan IndexedDB, penyiaran perubahan secara langsung. */
(function () {
  "use strict";

  // ---------- Ikon (grid 24, stroke) ----------
  const ICONS = {
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20l1.3-5.3A8.4 8.4 0 1 1 21 11.5Z"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    monitor: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
    video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    play: '<path d="m7 4 13 8-13 8V4Z"/>',
    pen: '<path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><path d="m2 2 7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    mobile: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  };
  const icon = (name, cls) =>
    `<svg class="ico ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;

  // ---------- Palet warna (primary, primary2, secondary, accent, accentInk) ----------
  const PALETTES = [
    { id: "teal", name: "Teal Premium", primary: "#0f766e", primary2: "#14b8a6", secondary: "#0e7490", accent: "#f59e0b", accentInk: "#b45309" },
    { id: "biru", name: "Biru Korporat", primary: "#1d4ed8", primary2: "#3b82f6", secondary: "#0369a1", accent: "#f59e0b", accentInk: "#b45309" },
    { id: "zamrud", name: "Hijau Zamrud", primary: "#047857", primary2: "#10b981", secondary: "#0f766e", accent: "#eab308", accentInk: "#a16207" },
    { id: "ungu", name: "Ungu Elegan", primary: "#6d28d9", primary2: "#8b5cf6", secondary: "#4338ca", accent: "#ec4899", accentInk: "#be185d" },
    { id: "maroon", name: "Maroon Formal", primary: "#9f1239", primary2: "#e11d48", secondary: "#be123c", accent: "#f59e0b", accentInk: "#b45309" },
    { id: "coklat", name: "Coklat Hangat", primary: "#92400e", primary2: "#d97706", secondary: "#b45309", accent: "#0d9488", accentInk: "#0f766e" },
    { id: "slate", name: "Slate Neutral", primary: "#334155", primary2: "#64748b", secondary: "#0369a1", accent: "#0ea5e9", accentInk: "#0369a1" },
  ];

  // ---------- Font (hanya keluarga yang disahkan wujud di Google Fonts) ----------
  const FONTS = {
    head: [
      { name: "Outfit", spec: "Outfit:wght@400..800", cat: "Sans" },
      { name: "Plus Jakarta Sans", spec: "Plus+Jakarta+Sans:wght@400..800", cat: "Sans" },
      { name: "Manrope", spec: "Manrope:wght@400..800", cat: "Sans" },
      { name: "Montserrat", spec: "Montserrat:wght@400..800", cat: "Sans" },
      { name: "Poppins", spec: "Poppins:wght@400;500;600;700;800", cat: "Sans" },
      { name: "Sora", spec: "Sora:wght@400..800", cat: "Sans" },
      { name: "Lexend", spec: "Lexend:wght@400..800", cat: "Sans" },
      { name: "Urbanist", spec: "Urbanist:wght@400..800", cat: "Sans" },
      { name: "DM Sans", spec: "DM+Sans:wght@400..700", cat: "Sans" },
      { name: "Merriweather", spec: "Merriweather:wght@400..700", cat: "Serif (berekor)" },
      { name: "Lora", spec: "Lora:wght@400..700", cat: "Serif (berekor)" },
    ],
    body: [
      { name: "Work Sans", spec: "Work+Sans:wght@400..700", cat: "Sans" },
      { name: "Inter", spec: "Inter:wght@400..700", cat: "Sans" },
      { name: "Open Sans", spec: "Open+Sans:wght@400..700", cat: "Sans" },
      { name: "Nunito Sans", spec: "Nunito+Sans:wght@400..800", cat: "Sans" },
      { name: "Source Sans 3", spec: "Source+Sans+3:wght@400..700", cat: "Sans" },
      { name: "IBM Plex Sans", spec: "IBM+Plex+Sans:wght@400;500;600;700", cat: "Sans" },
      { name: "Noto Sans", spec: "Noto+Sans:wght@400..700", cat: "Sans" },
      { name: "DM Sans", spec: "DM+Sans:wght@400..700", cat: "Sans" },
      { name: "Manrope", spec: "Manrope:wght@400..800", cat: "Sans" },
      { name: "Lora", spec: "Lora:wght@400..700", cat: "Serif (berekor)" },
    ],
  };
  const fontSpec = (list, name) => (list.find((f) => f.name === name) || list[0]).spec;
  const fontsHref = (theme) => {
    const specs = new Set([fontSpec(FONTS.head, theme.fontHead), fontSpec(FONTS.body, theme.fontBody), "Amiri:wght@700"]);
    return "https://fonts.googleapis.com/css2?" + [...specs].map((s) => "family=" + s).join("&") + "&display=swap";
  };

  // ---------- Utiliti warna ----------
  const hexToRgb = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  };
  const hslToRgb = (h, s, l) => {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  };
  const lum = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const shiftL = (hex, dl) => { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return rgbToHex(...hslToRgb(h, s, Math.max(0, Math.min(1, l + dl)))); };
  const darkenFor = (hex, against, min) => { let c = hex, n = 0; while (contrast(c, against) < min && n++ < 40) c = shiftL(c, -0.02); return c; };

  const resolveTheme = (theme) => {
    const t = theme || {};
    const pre = PALETTES.find((p) => p.id === t.palette);
    if (pre) return { primary: pre.primary, primary2: pre.primary2, secondary: pre.secondary, accent: pre.accent, accentInk: pre.accentInk };
    const c = t.custom || {};
    const primary = darkenFor(c.primary || "#0f766e", "#ffffff", 4.5);
    return {
      primary,
      primary2: shiftL(primary, 0.14),
      secondary: darkenFor(c.secondary || "#0e7490", "#ffffff", 4.5),
      accent: c.accent || "#f59e0b",
      accentInk: darkenFor(c.accent || "#f59e0b", "#ffffff", 4.5),
    };
  };

  const applyTheme = (theme, doc) => {
    doc = doc || document;
    const r = resolveTheme(theme), root = doc.documentElement.style;
    root.setProperty("--teal", r.primary);
    root.setProperty("--teal-2", r.primary2);
    root.setProperty("--cyan", r.secondary);
    root.setProperty("--amber", r.accent);
    root.setProperty("--amber-ink", r.accentInk);
    root.setProperty("--font-head", `"${theme.fontHead}", "Segoe UI", system-ui, sans-serif`);
    root.setProperty("--font-body", `"${theme.fontBody}", "Segoe UI", system-ui, sans-serif`);
    let link = doc.getElementById("iy-fonts");
    if (!link) { link = doc.createElement("link"); link.id = "iy-fonts"; link.rel = "stylesheet"; doc.head.appendChild(link); }
    const href = fontsHref(theme);
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    const meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", r.primary);
    return r;
  };

  // ---------- Teks ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // *sorotan* jadi perkataan bergradient, [teks](https://pautan) jadi pautan, baris baru jadi <br>
  const md = (s) => esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*([^*\n]+)\*/g, '<span class="grad">$1</span>')
    .replace(/\n/g, "<br>");

  // ---------- Objek ----------
  const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const parsePath = (p) => String(p).split(".");
  const getPath = (o, p) => parsePath(p).reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => {
    const ks = parsePath(p), last = ks.pop();
    const t = ks.reduce((a, k) => { if (a[k] == null) a[k] = {}; return a[k]; }, o);
    t[last] = v;
  };
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  // Isi kunci yang hilang daripada data lalai (tatasusunan diambil dari data tersimpan)
  const merge = (stored, defs) => {
    if (!isObj(stored) || !isObj(defs)) return stored === undefined ? clone(defs) : stored;
    const out = {};
    for (const k of new Set([...Object.keys(defs), ...Object.keys(stored)])) {
      if (!(k in stored)) out[k] = clone(defs[k]);
      else if (isObj(defs[k]) && isObj(stored[k])) out[k] = merge(stored[k], defs[k]);
      else out[k] = stored[k];
    }
    return out;
  };

  // ---------- Storan IndexedDB (tiada had 5MB seperti localStorage) ----------
  const DB = "iy-site", STORE = "kv";
  const openDb = () => new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("no idb"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const kv = {
    get: (k) => openDb().then((db) => new Promise((res, rej) => { const q = db.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); })).catch(() => undefined),
    set: (k, v) => openDb().then((db) => new Promise((res, rej) => { const t = db.transaction(STORE, "readwrite"); t.objectStore(STORE).put(v, k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); })).catch(() => false),
    del: (k) => openDb().then((db) => new Promise((res) => { const t = db.transaction(STORE, "readwrite"); t.objectStore(STORE).delete(k); t.oncomplete = () => res(true); })).catch(() => false),
  };

  // Config terbaru antara: tersimpan setempat (admin) dan site-config.json (diterbitkan)
  const loadConfig = async () => {
    const defs = window.IY_DEFAULTS;
    let local, file;
    try { local = await kv.get("config"); } catch (_) { /* tiada storan */ }
    try {
      const r = await fetch("site-config.json", { cache: "no-store" });
      if (r.ok) file = await r.json();
    } catch (_) { /* tiada fail diterbitkan */ }
    const pick = [local, file].filter(Boolean).sort((a, b) => (b.rev || 0) - (a.rev || 0))[0];
    return pick ? merge(pick, defs) : clone(defs);
  };

  // ---------- Penyiaran perubahan ----------
  const CH = "iy-site-config";
  const channel = () => (typeof BroadcastChannel === "function" ? new BroadcastChannel(CH) : null);

  window.IYCore = {
    ICONS, icon, PALETTES, FONTS, fontsHref, resolveTheme, applyTheme,
    hexToRgb, rgbToHex, contrast, shiftL, darkenFor,
    esc, md, clone, getPath, setPath, merge, kv, loadConfig, channel,
  };
})();

/* fb.js: sambungan Firebase (Firestore + Authentication) untuk laman awam dan panel admin.
   Aktif hanya jika window.IY_FIREBASE diisi (lihat firebase-config.js). Jika tidak, laman berjalan dalam mod tempatan.
   SDK dimuat dari cdnjs ketika diperlukan. */
(function () {
  "use strict";
  const VER = "10.12.2";
  const SRC = (n) => `https://cdnjs.cloudflare.com/ajax/libs/firebase/${VER}/firebase-${n}-compat.min.js`;
  const cfg = () => window.IY_FIREBASE;
  const configured = () => { const c = cfg(); return Boolean(c && c.apiKey && c.projectId); };

  const loadScript = (src) => new Promise((res, rej) => {
    const old = document.querySelector(`script[data-fb="${src}"]`);
    if (old) return old.dataset.done ? res() : old.addEventListener("load", res);
    const s = document.createElement("script");
    s.src = src; s.dataset.fb = src;
    s.onload = () => { s.dataset.done = "1"; res(); };
    s.onerror = () => rej(new Error("Gagal memuat " + src));
    document.head.appendChild(s);
  });

  let db = null, auth = null, boot = null, authBoot = null;
  const init = () => {
    if (!configured()) return Promise.resolve(false);
    if (!boot) boot = (async () => {
      await loadScript(SRC("app")); await loadScript(SRC("firestore"));
      const c = cfg();
      const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(c);
      db = window.firebase.firestore(app);
      if (c.emulator && c.emulator.firestore) db.useEmulator(c.emulator.firestore[0], c.emulator.firestore[1]);
      else db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
      return true;
    })();
    return boot;
  };
  const initAuth = () => {
    if (!authBoot) authBoot = (async () => {
      await init(); await loadScript(SRC("auth"));
      auth = window.firebase.auth();
      const c = cfg();
      if (c.emulator && c.emulator.auth) auth.useEmulator(c.emulator.auth, { disableWarnings: true });
      return true;
    })();
    return authBoot;
  };
  const ts = () => window.firebase.firestore.FieldValue.serverTimestamp();
  const inc = (path) => db.doc(path).set({ count: window.firebase.firestore.FieldValue.increment(1) }, { merge: true });
  const timeout = (p, ms, msg) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(msg || "Masa tamat")), ms))]);

  window.IYDB = {
    configured, init, initAuth,
    projectId: () => (configured() ? cfg().projectId : ""),

    // ----- kandungan laman -----
    watchConfig: (cb, err) => db.doc("site/config").onSnapshot((s) => cb(s.exists ? s.data() : null), err),
    getConfig: () => timeout(db.doc("site/config").get(), 8000, "Pangkalan data tidak menjawab").then((s) => (s.exists ? s.data() : null)),
    saveConfig: (obj) => db.doc("site/config").set(obj),

    // ----- gambar galeri (satu dokumen setiap gambar) -----
    watchImages: (album, cb, err) => db.collection("images").where("album", "==", album)
      .onSnapshot((s) => cb(s.docs.map((d) => ({ id: d.id, data: d.data().data }))), err),
    getImages: () => timeout(db.collection("images").get(), 20000, "Gambar tidak dapat dimuatkan").then((s) => s.docs.map((d) => ({ id: d.id, album: d.data().album, data: d.data().data }))),
    putImage: (id, album, data) => db.doc("images/" + id).set({ album, data }),
    delImage: (id) => db.doc("images/" + id).delete(),

    // ----- statistik pelawat -----
    hit: (dayKey) => Promise.all([inc("stats/total"), inc("stats/" + dayKey)]),
    getStat: (key) => db.doc("stats/" + key).get().then((s) => (s.exists ? Number(s.data().count) || 0 : 0)),
    getStats: () => db.collection("stats").get().then((s) => Object.fromEntries(s.docs.map((d) => [d.id, Number(d.data().count) || 0]))),

    // ----- pertanyaan pelanggan (leads) -----
    addLead: (o) => db.collection("leads").add({ name: o.name, phone: o.phone, plan: o.plan || "", message: o.message || "", lang: o.lang === "en" ? "en" : "ms", status: "baru", createdAt: ts() }),
    watchLeads: (cb, err) => db.collection("leads").orderBy("createdAt", "desc").limit(500)
      .onSnapshot((s) => cb(s.docs.map((d) => { const v = d.data(); return { id: d.id, ...v, createdAt: v.createdAt && v.createdAt.toDate ? v.createdAt.toDate() : new Date() }; })), err),
    updateLead: (id, patch) => db.doc("leads/" + id).update(patch),
    delLead: (id) => db.doc("leads/" + id).delete(),

    // ----- pengesahan admin -----
    signIn: async (email, pw) => { await initAuth(); return auth.signInWithEmailAndPassword(email, pw); },
    signOut: async () => { await initAuth(); return auth.signOut(); },
    resetPassword: async (email) => { await initAuth(); return auth.sendPasswordResetEmail(email); },
    onAuth: async (cb) => { await initAuth(); return auth.onAuthStateChanged(cb); },
    user: () => (auth ? auth.currentUser : null),
  };
})();

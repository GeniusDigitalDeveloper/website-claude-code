// PWA: daftar service worker + butang "Pasang Aplikasi" (website awam & panel admin)
(() => {
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW:", e)));
  }

  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let deferred = null;
  const btns = () => [...document.querySelectorAll("[data-install]")];
  const show = (on) => btns().forEach((b) => (b.hidden = !on));

  const note = (msg) => {
    const t = document.getElementById("toast");
    if (!t) return alert(msg);
    t.textContent = msg;
    t.classList.remove("bad");
    t.classList.add("show");
    clearTimeout(note.t);
    note.t = setTimeout(() => t.classList.remove("show"), 9000);
  };

  if (!standalone()) {
    if (ios) show(true); // iOS tiada prompt automatik: tunjuk arahan
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; show(true); });
  }
  addEventListener("appinstalled", () => { deferred = null; show(false); note("Aplikasi berjaya dipasang. Cari ikon Sumayyah di skrin utama / desktop."); });

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-install]")) return;
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
      show(false);
    } else if (ios) {
      note("iPhone/iPad: tekan butang Kongsi (kotak dengan anak panah ke atas) di Safari, kemudian pilih 'Add to Home Screen' / 'Tambah ke Skrin Utama'.");
    } else {
      note("Buka menu pelayar (⋮) dan pilih 'Install app' / 'Pasang aplikasi'.");
    }
  });
})();

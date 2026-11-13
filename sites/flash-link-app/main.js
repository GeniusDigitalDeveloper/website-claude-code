// Flash Link — pembalut desktop (Electron).
// Aplikasi memuatkan versi terkini dari pelayan, jadi setiap kemas kini yang diterbitkan
// sampai kepada pengguna serta-merta (tidak perlu pasang semula). Tiada pangkalan data tempatan.
const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Zum: lalai sedikit dikecilkan (-1 ≈ 83%) supaya muat skrin PC; pilihan pengguna disimpan.
const ZOOM_FILE = () => path.join(app.getPath("userData"), "zoom.json");
const loadZoom = () => { try { const z = JSON.parse(fs.readFileSync(ZOOM_FILE(), "utf8")).level; if (typeof z === "number") return Math.max(-4, Math.min(4, z)); } catch {} return -1; };
const setZoom = (wc, level) => { level = Math.max(-4, Math.min(4, level)); wc.setZoomLevel(level); try { fs.writeFileSync(ZOOM_FILE(), JSON.stringify({ level })); } catch {} };

const APP_URL = "https://genius-digital-flashlink-40bc9-5effc.web.app";
const APP_ORIGIN = new URL(APP_URL).origin;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const OK_HOSTS = /(^|\.)(google\.com|googleapis\.com|gstatic\.com|firebaseapp\.com|web\.app)$/;

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: "#07070A", title: "Genius Digital Flash Link", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  const wc = win.webContents;
  wc.on("dom-ready", () => wc.setZoomLevel(loadZoom()));
  // Ctrl + / Ctrl - / Ctrl 0 dan Ctrl + roda tetikus
  // Ctrl/Cmd + (=, +, numpad +), - (_, numpad -), 0 (numpad 0), dengan atau tanpa Shift/Alt; semua susun atur papan kekunci
  wc.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown" || !(i.control || i.meta)) return;
    const k = String(i.key || ""), c = String(i.code || "");
    const plus = k === "+" || k === "=" || k === "Add" || c === "Equal" || c === "NumpadAdd" || c === "BracketRight" && k === "+";
    const minus = k === "-" || k === "_" || k === "Subtract" || c === "Minus" || c === "NumpadSubtract";
    const zero = k === "0" || c === "Digit0" || c === "Numpad0";
    if (plus) { e.preventDefault(); setZoom(wc, wc.getZoomLevel() + 0.5); }
    else if (minus) { e.preventDefault(); setZoom(wc, wc.getZoomLevel() - 0.5); }
    else if (zero) { e.preventDefault(); setZoom(wc, -1); }
  });
  wc.on("zoom-changed", (_e, dir) => setZoom(wc, wc.getZoomLevel() + (dir === "in" ? 0.5 : -0.5)));
  wc.on("context-menu", (_e, p) => { const t = [{ role: "cut", enabled: p.isEditable }, { role: "copy", enabled: !!p.selectionText || p.isEditable }, { role: "paste", enabled: p.isEditable }, { role: "selectAll" }]; Menu.buildFromTemplate(t).popup(); });
  win.webContents.setUserAgent(UA); // supaya log masuk Google tidak menolak pelayar terbenam
  session.defaultSession.clearCache().catch(() => {}).finally(() => win.loadURL(APP_URL).catch(() => {})); // sentiasa muat versi terkini, bukan salinan lama
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => { if (isMain && code !== -3) win.loadFile(path.join(__dirname, "offline.html")); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    try { const h = new URL(url).hostname; if (new URL(url).origin === APP_ORIGIN || OK_HOSTS.test(h)) return { action: "allow" }; } catch {}
    shell.openExternal(url); return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith("file:") || url.startsWith(APP_ORIGIN)) return;
    try { if (OK_HOSTS.test(new URL(url).hostname)) return; } catch {}
    e.preventDefault(); shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: "Genius Digital Flash Link", submenu: [
    { label: "Semak kemas kini / Muat semula", accelerator: "CmdOrCtrl+R", click: (_i, w) => w && session.defaultSession.clearCache().then(() => w.webContents.reloadIgnoringCache()) },
    { label: "Skrin penuh", role: "togglefullscreen" },
    { type: "separator" },
    { label: "Keluar", role: "quit" },
  ] },
  { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
  { label: "Lihat", submenu: [
    { label: "Zum masuk (Ctrl +)", accelerator: "CmdOrCtrl+Plus", click: (_i, w) => w && setZoom(w.webContents, w.webContents.getZoomLevel() + 0.5) },
    { label: "Zum keluar (Ctrl -)", accelerator: "CmdOrCtrl+-", click: (_i, w) => w && setZoom(w.webContents, w.webContents.getZoomLevel() - 0.5) },
    { label: "Saiz lalai (Ctrl 0)", accelerator: "CmdOrCtrl+0", click: (_i, w) => w && setZoom(w.webContents, -1) },
  ] }]));
  createWindow();
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

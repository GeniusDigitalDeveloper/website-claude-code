// Flash Link — pembalut desktop (Electron).
// Aplikasi memuatkan versi terkini dari pelayan, jadi setiap kemas kini yang diterbitkan
// sampai kepada pengguna serta-merta (tidak perlu pasang semula). Tiada pangkalan data tempatan.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const APP_URL = "https://genius-digital-flashlink-40bc9-5effc.web.app"; // tukar ke domain sendiri bila sedia
const APP_ORIGIN = new URL(APP_URL).origin;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const OK_HOSTS = /(^|\.)(google\.com|googleapis\.com|gstatic\.com|firebaseapp\.com|web\.app)$/;

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: "#07070A", title: "Flash Link", autoHideMenuBar: true,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.webContents.setUserAgent(UA); // supaya log masuk Google tidak menolak pelayar terbenam
  win.loadURL(APP_URL).catch(() => {});
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
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: "Flash Link", submenu: [
    { label: "Kemas kini / Muat semula", accelerator: "CmdOrCtrl+R", click: (_i, w) => w && w.webContents.reloadIgnoringCache() },
    { label: "Skrin penuh", role: "togglefullscreen" },
    { type: "separator" },
    { label: "Keluar", role: "quit" },
  ] }]));
  createWindow();
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

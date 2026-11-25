// LUNARA MUSIC for Windows.
// The window shows the live app (https://lunara-music.web.app), so every deploy reaches users
// immediately: no update button, no re-download. The page itself reloads silently when a new
// version is published (only while music is paused).
const { app, BrowserWindow, shell, session, Menu, nativeTheme } = require("electron");
const path = require("node:path");

const APP_URL = "https://lunara-music.web.app";
const ALLOWED_HOSTS = new Set(["lunara-music.web.app", "lunara-music.firebaseapp.com", "genius-digital-40bc9.firebaseapp.com", "accounts.google.com"]);

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: "LUNARA MUSIC",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0b0a1f" : "#f7f5ff",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.once("ready-to-show", () => win.show());
  // Always fetch the newest HTML from the server.
  win.loadURL(APP_URL, { extraHeaders: "pragma: no-cache\n" });
  win.webContents.on("did-fail-load", (_e, code, _d, url) => {
    if (code !== -3 && url.startsWith(APP_URL)) win.loadFile(path.join(__dirname, "offline.html"));
  });
  // Google sign-in popups stay in-app; other external links open in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const host = new URL(url).host;
      if (ALLOWED_HOSTS.has(host) || host.endsWith(".google.com")) return { action: "allow" };
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!new URL(url).host.includes("lunara-music")) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(async () => {
  // Drop cached HTTP files from the previous run so the latest deploy always loads.
  await session.defaultSession.clearCache();
  createWindow();
});
app.on("window-all-closed", () => app.quit());

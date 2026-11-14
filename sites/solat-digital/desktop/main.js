const { app, BrowserWindow, powerSaveBlocker, Menu, shell, ipcMain, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const cfg = require("./app-config.json");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required"); // azan/nada boleh berbunyi tanpa klik
if (!app.requestSingleInstanceLock()) app.quit();

let win;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: cfg.kiosk ? "#0f172a" : "#f1f5f9", title: cfg.name, autoHideMenuBar: true,
    fullscreen: cfg.kiosk, kiosk: cfg.kiosk, icon: __dirname + "/build/icon.png",
    webPreferences: { backgroundThrottling: false, preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  Menu.setApplicationMenu(null);
  const load = () => win.loadURL(cfg.url).catch(() => setTimeout(load, 15000)); // cuba semula jika tiada internet
  load();
  win.webContents.on("did-fail-load", () => setTimeout(load, 15000));
  win.webContents.setWindowOpenHandler(({ url }) => { if (!url.startsWith("https://solat-digital-my.web.app")) shell.openExternal(url); return { action: url.startsWith("https://solat-digital-my.web.app") ? "allow" : "deny" }; });
  if (cfg.kiosk) {
    // TV: tidak tidur, tidak tertutup sendiri; pulih jika beku
    powerSaveBlocker.start("prevent-display-sleep");
    win.on("unresponsive", () => win.reload());
    win.webContents.on("render-process-gone", () => win.reload());
    setInterval(() => { if (!win.isDestroyed() && !win.isFullScreen()) win.setFullScreen(true); }, 60000);
  }
}
// Peti simpanan: hanya aplikasi Admin Owner (cfg.id === "admin")
const vaultFile = () => path.join(app.getPath("userData"), "vault.bin");
ipcMain.handle("vault:get", () => { if (cfg.id !== "admin" || !safeStorage.isEncryptionAvailable()) return null; try { return JSON.parse(safeStorage.decryptString(fs.readFileSync(vaultFile()))); } catch { return null; } });
ipcMain.handle("vault:set", (_e, e, p) => { if (cfg.id !== "admin" || !safeStorage.isEncryptionAvailable()) return; try { fs.writeFileSync(vaultFile(), safeStorage.encryptString(JSON.stringify({ e: String(e), p: String(p) }))); } catch {} });

app.whenReady().then(() => {
  create();
  if (cfg.kiosk && app.isPackaged) app.setLoginItemSettings({ openAtLogin: true }); // bermula sendiri bila Windows dihidupkan
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => app.quit());

const { contextBridge, ipcRenderer } = require("electron");
// Peti simpanan kata laluan Owner (hanya aplikasi Admin Owner). Dienkripsi oleh Windows (DPAPI) melalui safeStorage.
contextBridge.exposeInMainWorld("sdVault", { get: () => ipcRenderer.invoke("vault:get"), set: (e, p) => ipcRenderer.invoke("vault:set", e, p) });

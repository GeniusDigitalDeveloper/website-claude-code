const cfg = require("./app-config.json");
module.exports = {
  appId: "my.solatdigital." + cfg.id,
  productName: cfg.name,
  artifactName: cfg.artifact,
  directories: { output: "dist", buildResources: "build" },
  files: ["main.js", "app-config.json", "build/icon.png"],
  win: { target: [{ target: "nsis", arch: ["x64"] }], icon: "build/icon.ico" },
  nsis: { oneClick: true, perMachine: false, runAfterFinish: true, createDesktopShortcut: true, createStartMenuShortcut: true },
};

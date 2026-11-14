const cfg = require("./app-config.json");
module.exports = {
  appId: "my.solatdigital." + cfg.id,
  productName: cfg.name,
  artifactName: "SolatDigital-" + { tv: "TV", pengurus: "Pengurus", admin: "Admin" }[cfg.id] + ".${ext}",
  directories: { output: "dist", buildResources: "build" },
  files: ["main.js", "preload.js", "app-config.json", "build/icon.png"],
  win: { target: [{ target: "nsis", arch: ["x64"] }, { target: "zip", arch: ["x64"] }], icon: "build/icon.ico" },
  nsis: { artifactName: cfg.artifact, oneClick: true, perMachine: false, runAfterFinish: true, createDesktopShortcut: true, createStartMenuShortcut: true },
};

// Tulis app-config.json untuk aplikasi yang dipilih: node prepare.js tv|pengurus|admin
const fs = require("fs");
const BASE = "https://solat-digital-my.web.app";
const APPS = {
  tv: { id: "tv", name: "Solat Digital TV", url: BASE + "/", kiosk: true, artifact: "SolatDigital-TV-Setup.exe" },
  pengurus: { id: "pengurus", name: "Pengurus Solat Digital", url: BASE + "/pengurus/", kiosk: false, artifact: "SolatDigital-Pengurus-Setup.exe" },
  admin: { id: "admin", name: "Admin Solat Digital", url: BASE + "/super/", kiosk: false, artifact: "SolatDigital-Admin-Setup.exe" },
};
const a = APPS[process.argv[2]];
if (!a) { console.error("Guna: node prepare.js tv|pengurus|admin"); process.exit(1); }
fs.writeFileSync(__dirname + "/app-config.json", JSON.stringify(a, null, 2));
console.log("Aplikasi:", a.name);

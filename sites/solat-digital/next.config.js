const fs = require("fs");
const path = require("path");
// ID binaan unik setiap kali build; ditulis ke public/version.json dan dimasukkan ke dalam bundle.
const BUILD_ID = Date.now().toString(36);
try { fs.writeFileSync(path.join(__dirname, "public", "version.json"), JSON.stringify({ version: BUILD_ID, at: new Date().toISOString() })); } catch {}
/** @type {import("next").NextConfig} */
module.exports = { output: "export", trailingSlash: true, images: { unoptimized: true }, env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID } };

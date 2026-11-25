import type { NextConfig } from "next";
import { writeFileSync } from "node:fs";

// Unique id per build. Written to public/version.json and baked into the app, so running
// clients (browser, PWA, Windows EXE) can detect a new deploy and refresh themselves.
const BUILD_ID = process.env.LUNARA_BUILD_ID ?? new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
writeFileSync(new URL("./public/version.json", import.meta.url), JSON.stringify({ build: BUILD_ID }) + "\n");

// Static export for Firebase Hosting (lunara-music.web.app). Catalogue calls go straight to Deezer (JSONP).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
};

export default nextConfig;

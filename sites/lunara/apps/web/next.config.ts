import type { NextConfig } from "next";

// Static export for Firebase Hosting (lunara-music.web.app). Catalogue calls go straight to Deezer (JSONP).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;

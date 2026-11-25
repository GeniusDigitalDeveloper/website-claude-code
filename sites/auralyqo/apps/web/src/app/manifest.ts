import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AURALYQO",
    short_name: "AURALYQO",
    description: "Your Music. Your Universe.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0920",
    theme_color: "#0a0920",
    orientation: "any",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

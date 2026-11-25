import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LUNARA MUSIC",
    short_name: "LUNARA",
    description: "LUNARA MUSIC: Your Music. Your Universe. Platform muzik digital moden, mudah dan peribadi.",
    start_url: "/",
    display: "standalone",
    background_color: "#09063a",
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

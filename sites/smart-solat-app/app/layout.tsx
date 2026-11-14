import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Smart Solat", description: "Paparan waktu solat pintar untuk TV masjid dan surau, waktu rasmi JAKIM." };
export const viewport: Viewport = { themeColor: "#0F172A" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ms"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" /></head><body>{children}</body></html>);
}

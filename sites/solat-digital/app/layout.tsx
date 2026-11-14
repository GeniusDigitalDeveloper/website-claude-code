import type { Metadata, Viewport } from "next";
import "./globals.css";
import AutoUpdate from "@/components/AutoUpdate";
export const metadata: Metadata = { title: "Solat Digital", description: "Paparan waktu solat digital untuk TV masjid dan surau. Waktu rasmi JAKIM.", manifest: "/manifest-tv.json" };
export const viewport: Viewport = { themeColor: "#0F172A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ms"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" /><link rel="icon" href="/favicon.ico?v=2" sizes="any" /><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2" /><link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png?v=2" /><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" /></head><body><AutoUpdate />{children}</body></html>);
}

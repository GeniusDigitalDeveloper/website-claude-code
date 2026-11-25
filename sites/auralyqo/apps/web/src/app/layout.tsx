import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "AURALYQO — Your Music. Your Universe.", template: "%s | AURALYQO" },
  description: "AURALYQO: penstriman muzik global dan pemain muzik tempatan tanpa iklan, dengan fade in/fade out automatik, playlist, dan layout yang boleh anda ubah sendiri.",
  applicationName: "AURALYQO",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AURALYQO", statusBarStyle: "black-translucent" },
  openGraph: { title: "AURALYQO", description: "Your Music. Your Universe.", images: ["/icons/icon-512.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0920" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5fb" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint (no flash). Mirrors store/settings.ts.
const themeScript = `(()=>{try{var s=JSON.parse(localStorage.getItem('auralyqo-settings')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${sora.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

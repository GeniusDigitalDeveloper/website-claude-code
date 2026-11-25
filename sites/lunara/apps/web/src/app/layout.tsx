import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { BRAND } from "@/components/shell/Logo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "LUNARA MUSIC — Your Music. Your Universe.", template: "%s | LUNARA MUSIC" },
  description: BRAND.description,
  applicationName: "LUNARA MUSIC",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LUNARA MUSIC", statusBarStyle: "black-translucent" },
  openGraph: { title: "LUNARA MUSIC", description: BRAND.description, images: ["/brand/lunara-logo-600.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08062b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5fb" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint (no flash). Mirrors store/settings.ts.
const themeScript = `(()=>{try{var s=JSON.parse(localStorage.getItem('lunara-settings')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='dark'}})()`;

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

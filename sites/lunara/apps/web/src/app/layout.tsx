import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { BRAND } from "@/components/shell/Logo";
import { THEMES, themeVars } from "@/lib/themes";

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
  themeColor: "#f7f5ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved mode + colour theme before first paint (no flash). Mirrors components/shell/AppShell.tsx.
const themeScript = `(()=>{var T=${JSON.stringify(THEMES)};var V=${themeVars.toString()};try{var s=JSON.parse(localStorage.getItem('lunara-settings')||'{}').state||{};var m=s.theme||'light';var n=m==='night'||m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var t=T.find(function(x){return x.id===s.colorTheme})||T[0];var r=document.documentElement;r.dataset.theme=n?'dark':'light';if((s.language||'en')==='en'){r.lang='en';r.classList.add('i18n-wait');setTimeout(function(){r.classList.remove('i18n-wait')},2500)}var v=V(t,n);for(var k in v)r.style.setProperty(k,v[k])}catch(e){document.documentElement.dataset.theme='light'}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" suppressHydrationWarning className={`${inter.variable} ${sora.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

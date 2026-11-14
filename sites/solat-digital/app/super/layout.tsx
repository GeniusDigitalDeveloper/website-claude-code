import type { Metadata } from "next";
export const metadata: Metadata = { title: "Solat Digital (Admin Owner)", manifest: "/manifest-super.json", robots: { index: false } };
export default function L({ children }: { children: React.ReactNode }) { return <div className="theme-light min-h-dvh bg-bg text-fg">{children}</div>; }

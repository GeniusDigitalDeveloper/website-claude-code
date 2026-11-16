import ModeWrap from "@/components/ModeWrap";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Solat Digital (Admin Owner)", manifest: "/manifest-super.json", robots: { index: false } };
export default function L({ children }: { children: React.ReactNode }) { return <ModeWrap>{children}</ModeWrap>; }

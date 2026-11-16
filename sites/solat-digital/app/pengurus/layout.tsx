import ModeWrap from "@/components/ModeWrap";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Solat Digital (Pengurus Masjid)", manifest: "/manifest-pengurus.json" };
export default function L({ children }: { children: React.ReactNode }) { return <ModeWrap>{children}</ModeWrap>; }

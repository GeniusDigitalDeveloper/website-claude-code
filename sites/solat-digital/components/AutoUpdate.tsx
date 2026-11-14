"use client";
import { useEffect } from "react";

declare global { interface Window { __sdBusy?: boolean } }
const MINE = process.env.NEXT_PUBLIC_BUILD_ID;

/** Semak versi terkini setiap minit. Jika ada versi baharu, muat semula sendiri (tanpa sesiapa menekan apa-apa).
 *  Ditangguh sementara pop-up/azan sedang dimainkan atau admin ada suntingan belum disimpan (window.__sdBusy). */
export default function AutoUpdate() {
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const v = (await r.json()).version as string;
        if (v && MINE && v !== MINE && !window.__sdBusy) location.reload();
      } catch {}
    };
    const t = setInterval(check, 60000);
    const vis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", vis); addEventListener("online", check);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); removeEventListener("online", check); };
  }, []);
  return null;
}

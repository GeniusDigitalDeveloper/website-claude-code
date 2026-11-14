"use client";
import { useEffect, useState } from "react";
type BIP = Event & { prompt: () => Promise<void> };
export function usePwaInstall() {
  const [ev, setEv] = useState<BIP | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setEv(e as BIP); };
    addEventListener("beforeinstallprompt", f); addEventListener("appinstalled", () => setDone(true));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (matchMedia("(display-mode: standalone)").matches) setDone(true);
    return () => removeEventListener("beforeinstallprompt", f);
  }, []);
  return { canInstall: !!ev && !done, installed: done, install: async () => { await ev?.prompt(); setEv(null); } };
}

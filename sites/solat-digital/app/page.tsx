"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import TvDisplay from "@/components/TvDisplay";
import { db } from "@/lib/firebase";
import { DEMO_TV, type TvDoc } from "@/lib/types";
import { useDefaults } from "@/lib/useDefaults";
import { useAzanLibrary } from "@/lib/useAzan";
import { usePwaInstall } from "@/lib/usePwa";

function Inner() {
  const q = useSearchParams().get("m") || "";
  const [mid, setMid] = useState(q);
  const [booted, setBooted] = useState(false); const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { if (q) localStorage.setItem("sd_last_m", q); else { const l = localStorage.getItem("sd_last_m"); if (l) setMid(l); } } catch {} setBooted(true); }, [q]);
  const [cfg, setCfg] = useState<TvDoc>(DEMO_TV);
  const [extra, setExtra] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const lib = useAzanLibrary();
  const preview = useSearchParams().get("preview") === "1";
  const { eff } = useDefaults(mid);
  usePwaInstall();
  useEffect(() => {
    if (!mid) return;
    const key = "sd_cfg_" + mid; setLoaded(false);
    try { const c = localStorage.getItem(key); if (c) { setCfg(JSON.parse(c)); setLoaded(true); } } catch {}
    const u1 = onSnapshot(doc(db, "tv", mid), (s) => { setLoaded(true); if (!s.exists()) { if (!q) { try { localStorage.removeItem("sd_last_m"); localStorage.removeItem(key); } catch {} setCfg(DEMO_TV); setExtra([]); setMid(""); setMissing(false); } else setMissing(true); return; } setMissing(false); const d = s.data() as TvDoc; setCfg(d); try { localStorage.setItem(key, JSON.stringify(d)); } catch {} }, () => {});
    const u2 = onSnapshot(query(collection(db, "tv", mid, "img"), orderBy("order")), (s) => setExtra(s.docs.map((d) => d.data().data as string)), () => {});
    return () => { u1(); u2(); };
  }, [mid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!booted || (mid && !loaded)) return <main className="grid min-h-dvh place-items-center bg-[#0f172a]"><img src="/logo.png" alt="Solat Digital" className="h-28 w-auto animate-pulse" /></main>;
  if (missing) return <p className="grid min-h-dvh place-items-center p-8 text-center">Masjid tidak dijumpai. Semak pautan TV anda.</p>;
  return <TvDisplay m={cfg} mid={mid} azanLib={lib} extra={extra} defs={eff} preview={preview} />;
}
export default function Page() { return <Suspense fallback={<p className="p-8">Memuatkan…</p>}><Inner /></Suspense>; }

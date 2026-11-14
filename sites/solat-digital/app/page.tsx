"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import TvDisplay from "@/components/TvDisplay";
import { db } from "@/lib/firebase";
import { DEMO_TV, type TvDoc } from "@/lib/types";
import { useAzanLibrary } from "@/lib/useAzan";
import { usePwaInstall } from "@/lib/usePwa";

function Inner() {
  const q = useSearchParams().get("m") || "";
  const [mid, setMid] = useState(q);
  useEffect(() => { try { if (q) localStorage.setItem("sd_last_m", q); else { const l = localStorage.getItem("sd_last_m"); if (l) setMid(l); } } catch {} }, [q]);
  const [cfg, setCfg] = useState<TvDoc>(DEMO_TV);
  const [extra, setExtra] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const [defFont, setDefFont] = useState("");
  const lib = useAzanLibrary();
  useEffect(() => onSnapshot(doc(db, "config", "defaults"), (s) => setDefFont((s.data()?.font as string) || ""), () => {}), []);
  usePwaInstall();
  useEffect(() => {
    if (!mid) return;
    const key = "sd_cfg_" + mid;
    try { const c = localStorage.getItem(key); if (c) setCfg(JSON.parse(c)); } catch {}
    const u1 = onSnapshot(doc(db, "tv", mid), (s) => { if (!s.exists()) return setMissing(true); setMissing(false); const d = s.data() as TvDoc; setCfg(d); try { localStorage.setItem(key, JSON.stringify(d)); } catch {} }, () => {});
    const u2 = onSnapshot(query(collection(db, "tv", mid, "img"), orderBy("order")), (s) => setExtra(s.docs.map((d) => d.data().data as string)), () => {});
    return () => { u1(); u2(); };
  }, [mid]);
  if (missing) return <p className="grid min-h-dvh place-items-center p-8 text-center">Masjid tidak dijumpai. Semak pautan TV anda.</p>;
  return <TvDisplay m={cfg} mid={mid} azan={lib.find((a) => a.id === cfg.azanId) ?? null} extra={extra} defaultFont={defFont} />;
}
export default function Page() { return <Suspense fallback={<p className="p-8">Memuatkan…</p>}><Inner /></Suspense>; }

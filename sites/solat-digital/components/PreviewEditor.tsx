"use client";
import { useEffect, useRef, useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { Paintbrush, RotateCcw, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { ARABIC_FONTS, FONTS, type CustomFont, type ElStyle, type TvDoc } from "@/lib/types";

const SWATCH = ["#ffffff", "#fde047", "#fbbf24", "#86efac", "#34d399", "#67e8f9", "#60a5fa", "#f0abfc", "#fca5a5", "#0f172a"];
type Pick = { key: string; kind: "text" | "border" | "arabic"; label: string };

/** Pratonton live TV (iframe) yang boleh diklik. Perubahan terus ditulis ke pangkalan data dan dipaparkan pada TV sebenar. */
export default function PreviewEditor({ mid, tv, customFonts, canEdit = true }: { mid: string; tv: TvDoc; customFonts?: CustomFont[]; canEdit?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5); const [pick, setPick] = useState<Pick | null>(null);
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setScale(el.clientWidth / 1440)); ro.observe(el); setScale(el.clientWidth / 1440); return () => ro.disconnect(); }, []);
  useEffect(() => { const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.sd === "pick" && canEdit) setPick({ key: e.data.key, kind: e.data.kind, label: e.data.label }); }; addEventListener("message", f); return () => removeEventListener("message", f); }, [canEdit]);
  const st: ElStyle = (pick && tv.styles?.[pick.key]) || {};
  const write = (p: Partial<ElStyle>) => { if (!pick) return; const next = { ...st, ...p }; Object.keys(next).forEach((k) => !(next as Record<string, string>)[k] && delete (next as Record<string, string>)[k]); updateDoc(doc(db, "tv", mid), { [`styles.${pick.key}`]: Object.keys(next).length ? next : deleteField() }).catch(() => {}); };
  const colorKey = pick?.kind === "border" ? "border" : "color";
  const cur = (st as Record<string, string>)[colorKey] || "";
  return (
    <div>
      <div ref={wrap} className="pv-frame" style={{ height: 810 * scale }}>
        <iframe title="Paparan live TV" src={`/?m=${mid}&preview=1`} width={1440} height={810} style={{ transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }} />
      </div>
      {canEdit && <p className="mt-2 text-sm text-sub"><Paintbrush size={14} className="mr-1 inline" />Klik mana-mana tulisan atau bingkai pada paparan di atas untuk ubah font dan warna. Perubahan terus ke TV sebenar.</p>}
      {pick && (
        <div className="pop-card mt-3 card" role="dialog" aria-label={`Ubah ${pick.label}`}>
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Ubah: {pick.label}</h3><button className="btn !px-3" aria-label="Tutup" onClick={() => setPick(null)}><X size={18} /></button></div>
          {pick.kind === "arabic" ? (<>
            <label htmlFor="pe-ar" className="lbl">Font Arab (khat Thuluth)</label>
            <select id="pe-ar" className="inp" value={tv.arabicFont ?? ""} onChange={(e) => updateDoc(doc(db, "tv", mid), { arabicFont: e.target.value }).catch(() => {})}>
              <option value="">Ikut lalai sistem</option>{ARABIC_FONTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}{customFonts?.map((c) => <option key={c.id} value={"custom:" + c.id}>{c.name}</option>)}
            </select></>) : (<>
            {pick.kind === "text" && <><label htmlFor="pe-f" className="lbl">Font</label>
              <select id="pe-f" className="inp" value={st.font ?? ""} onChange={(e) => write({ font: e.target.value })}><option value="">Ikut font utama</option>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></>}
            <label htmlFor="pe-c" className="lbl">{pick.kind === "border" ? "Warna bingkai (border)" : "Warna tulisan"}</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="pe-c" type="color" aria-label="Pilih warna" className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1" value={/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffffff"} onChange={(e) => write({ [colorKey]: e.target.value })} />
              {SWATCH.map((c) => <button key={c} type="button" aria-label={`Warna ${c}`} className="swatch" style={{ background: c }} data-on={cur.toLowerCase() === c} onClick={() => write({ [colorKey]: c })} />)}
            </div></>)}
          {pick.kind !== "arabic" && <button className="btn mt-3" onClick={() => updateDoc(doc(db, "tv", mid), { [`styles.${pick.key}`]: deleteField() }).catch(() => {})}><RotateCcw size={16} /> Set semula ke asal</button>}
        </div>)}
    </div>
  );
}

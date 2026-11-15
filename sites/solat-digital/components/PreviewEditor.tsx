"use client";
import ZonePicker from "./ZonePicker";
import { ZONES } from "@/lib/zones";
import { useEffect, useRef, useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { Paintbrush, RotateCcw, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { ARABIC_FONTS, FONTS, type CustomFont, type ElStyle, type TvDoc } from "@/lib/types";

const SWATCH = ["#ffffff", "#fde047", "#fbbf24", "#86efac", "#34d399", "#67e8f9", "#60a5fa", "#f0abfc", "#fca5a5", "#0f172a"];
const PR_NAMES: Record<string, string> = { fajr: "Subuh", dhuhr: "Zuhur", asr: "Asar", maghrib: "Maghrib", isha: "Isyak", jumaat: "Jumaat" };
/** Teks yang boleh diganti kandungannya (kunci elemen -> teks asal / petunjuk). Teks lain dikira sistem (jam, tarikh, nombor). */
const TEXT_DEF = (key: string): { def: string; hint: string } | null => {
  if (key === "curl") return { def: "Waktu semasa", hint: "" };
  if (key === "nextl") return { def: "{waktu} dalam", hint: "{waktu} = nama waktu seterusnya." };
  if (key === "cdl") return { def: "{min} minit sebelum azan {waktu}", hint: "{min} = bilangan minit, {waktu} = nama waktu." };
  if (key.startsWith("ct-") && PR_NAMES[key.slice(3)]) return { def: PR_NAMES[key.slice(3)], hint: "Menggantikan nama waktu pada TV." };
  return null;
};
type Pick = { key: string; kind: "text" | "border" | "arabic"; label: string };

/** Pratonton live TV (iframe) yang boleh diklik. Perubahan terus ditulis ke pangkalan data dan dipaparkan pada TV sebenar. */
export default function PreviewEditor({ mid, tv, customFonts, canEdit = true, onRename, onZone, onSlide }: { mid: string; tv: TvDoc; customFonts?: CustomFont[]; canEdit?: boolean; onRename?: (n: string) => void; onZone?: (zone: string) => void; onSlide?: (id: string) => void }) {
  const [nm, setNm] = useState(tv.name); const nmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5); const [pick, setPick] = useState<Pick | null>(null);
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(() => setScale(el.clientWidth / 1440)); ro.observe(el); setScale(el.clientWidth / 1440); return () => ro.disconnect(); }, []);
  useEffect(() => { const f = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.sd === "pick" && canEdit) { if (e.data.kind === "slide") { onSlide?.(e.data.slide ?? ""); return; } setPick({ key: e.data.key, kind: e.data.kind, label: e.data.label }); } }; addEventListener("message", f); return () => removeEventListener("message", f); }, [canEdit, onSlide]);
  useEffect(() => { if (pick?.key === "name") setNm(tv.name); }, [pick?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const rename = (v: string) => { setNm(v); if (nmTimer.current) clearTimeout(nmTimer.current); nmTimer.current = setTimeout(() => { const t = v.trim(); if (t.length >= 3) onRename?.(t.slice(0, 120)); }, 700); };
  const td = pick ? TEXT_DEF(pick.key) : null;
  const [tt, setTt] = useState(""); const ttTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (pick) setTt(tv.texts?.[pick.key] ?? ""); }, [pick?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const retext = (v: string) => { setTt(v); if (ttTimer.current) clearTimeout(ttTimer.current); ttTimer.current = setTimeout(() => { if (!pick) return; const t = v.trim(); updateDoc(doc(db, "tv", mid), { [`texts.${pick.key}`]: t ? t.slice(0, 160) : deleteField() }).catch(() => {}); }, 700); };
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
          {pick.key === "name" && onRename && (<><label htmlFor="pe-nm" className="lbl">Teks nama masjid</label>
            <input id="pe-nm" className="inp" maxLength={120} value={nm} onChange={(e) => rename(e.target.value)} placeholder="Nama masjid / surau" />
            <p className="mt-1 text-xs text-sub">Disimpan sendiri dan terus berubah pada TV. Paparan guna HURUF BESAR.</p></>)}
          {pick.key === "sub" && onZone && (<div className="mt-2">
            <label htmlFor="pe-co" className="lbl">Negara</label>
            <select id="pe-co" className="inp" value="Malaysia" onChange={() => {}}><option>Malaysia</option></select>
            <p className="mt-1 text-xs text-sub">Waktu solat rasmi JAKIM hanya meliputi Malaysia.</p>
            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-green-700" checked={!tv.zone} onChange={(e) => onZone(e.target.checked ? "" : (tv.state && ZONES.find((z) => z[1] === tv.state)?.[0]) || "SGR01")} /> Kesan zon secara automatik (ikut lokasi peranti TV)</label>
            {tv.zone && <ZonePicker zone={tv.zone} onChange={onZone} idp="pe" />}
            <p className="mt-2 text-xs text-sub">Senarai negeri, zon dan daerah ikut pembahagian rasmi JAKIM (e-solat.gov.my). Terus berubah pada TV.</p></div>)}
          {td && (<><label htmlFor="pe-tx" className="lbl">Teks</label>
            <input id="pe-tx" className="inp" maxLength={160} value={tt} onChange={(e) => retext(e.target.value)} placeholder={td.def || "Teks lalai"} />
            <p className="mt-1 text-xs text-sub">{td.hint ? td.hint + " " : ""}Kosongkan untuk kembali ke teks asal. Terus berubah pada TV.</p></>)}
          {pick.kind === "text" && !td && pick.key !== "name" && <p className="mt-2 rounded-xl bg-muted p-3 text-sm text-sub">{["clock", "date", "hijri", "cdn", "nextt"].includes(pick.key) ? "Nilai ini dikira sistem (masa dan tarikh sebenar), jadi hanya font dan warna boleh diubah." : pick.key === "slide-text" ? "Sunting teks slaid di bahagian Slaid TV di bawah." : pick.key === "tickert" ? "Teks bergerak diurus di menu Slaid dan pengumuman." : "Font dan warna boleh diubah."}</p>}
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

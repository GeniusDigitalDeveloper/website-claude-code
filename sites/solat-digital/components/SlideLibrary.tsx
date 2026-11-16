"use client";
import { useEffect, useState } from "react";
import { BookOpen, Check, Plus, Quote } from "lucide-react";
import { LIBRARY, LIB_CATS, type LibItem } from "@/lib/hadithLibrary";
import { loadSlideFonts } from "@/lib/slideFonts";
import type { SlideItem } from "@/lib/types";
import { useCustomLib } from "@/components/OwnerEditors";
/** Pustaka templat siap pakai: hadis sahih dan ayat al-Quran bertulisan Arab. "Aktifkan ke TV" menambah slaid dengan latar foto masjid automatik. */
export default function SlideLibrary({ list, onAdd }: { list: SlideItem[]; onAdd: (it: Omit<SlideItem, "id">, lib: LibItem) => void }) {
  const custom = useCustomLib(); const ALL = [...LIBRARY, ...(custom.items ?? [])]; const CATS: [string, string][] = [...LIB_CATS.map(([k, v]) => [k, v] as [string, string]), ...(custom.cats ?? [])];
  const [tab, setTab] = useState<"hadis" | "ayat">("hadis"); const [cat, setCat] = useState("");
  useEffect(() => { loadSlideFonts([{ id: "x", kind: "hadis", text: "", on: true, ar: "x", arFont: "amiri" }]); }, []);
  const items = ALL.filter((x) => x.type === tab && (!cat || x.cat === cat));
  const n = (t: "hadis" | "ayat") => ALL.filter((x) => x.type === t).length;
  const active = new Set(list.map((x) => x.lib).filter(Boolean));
  return (
    <section className="card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Pustaka Templat TV Siap Pakai</h2><p className="text-sm text-sub">Pilih hadis sahih atau ayat al-Quran. Latar foto masjid dipilih automatik.</p></div>
      <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist">{([["hadis", `Hadis Sahih (${n("hadis")})`], ["ayat", `Ayat al-Quran (${n("ayat")})`]] as const).map(([k, lb]) => (
        <button key={k} type="button" role="tab" aria-selected={tab === k} className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === k ? "bg-card shadow" : "text-sub"}`} onClick={() => setTab(k)}>{lb}</button>))}</div></div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={`rounded-full border px-3 py-1 text-sm font-bold ${!cat ? "border-green-700 bg-green-700 text-white" : "border-line"}`} onClick={() => setCat("")}>Semua Kategori</button>
        {CATS.map(([k, lb]) => <button key={k} type="button" className={`rounded-full border px-3 py-1 text-sm font-bold ${cat === k ? "border-green-700 bg-green-700 text-white" : "border-line"}`} onClick={() => setCat(k)}>{lb}</button>)}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((it) => { const on = active.has(it.id); return (
          <article key={it.id} className={`rounded-2xl border p-4 ${on ? "border-green-600 bg-green-50 dark:bg-green-950/30" : "border-line"}`}>
            <div className="flex items-start justify-between gap-2"><b className="flex items-center gap-1 text-sm text-accent">{it.type === "hadis" ? <Quote size={14} /> : <BookOpen size={14} />} {it.src}</b><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{it.tag}</span></div>
            <p lang="ar" dir="rtl" className="mt-3 rounded-xl bg-muted p-3 text-center text-xl leading-loose" style={{ fontFamily: '"Amiri", serif' }}>{it.ar}</p>
            <p className="mt-2 text-sm italic text-sub">&ldquo;{it.ms}&rdquo;</p>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3"><span className="text-xs text-sub">Kategori: {it.cardCat}</span>
              <button type="button" className="btn btn-primary !min-h-9" disabled={on} onClick={() => onAdd({ kind: it.type, text: it.ms, source: it.src, ar: it.ar, arFont: "amiri", bg: it.bg, on: true, lib: it.id }, it)}>{on ? <><Check size={16} /> Telah aktif</> : <><Plus size={16} /> Aktifkan ke TV</>}</button></div>
          </article>); })}
      </div>
    </section>);
}

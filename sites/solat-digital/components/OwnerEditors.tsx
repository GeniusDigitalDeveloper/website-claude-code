"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { LIBRARY, LIB_CATS, type LibItem } from "@/lib/hadithLibrary";
import { SLIDE_BGS } from "@/lib/slideBackgrounds";
import { uid, type TvDoc } from "@/lib/types";

export type CustomLib = { items?: LibItem[]; cats?: [string, string][] };
export function useCustomLib(): CustomLib { const [d, setD] = useState<CustomLib>({}); useEffect(() => onSnapshot(doc(db, "config", "library"), (s) => setD((s.data() as CustomLib) ?? {}), () => {}), []); return d; }
const Lb = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;

/** Owner: tambah hadis / ayat dan kategori baharu ke pustaka yang dilihat semua admin masjid. */
export function HadithEditor() {
  const lib = useCustomLib(); const items = lib.items ?? []; const cats = lib.cats ?? [];
  const [c, setC] = useState(""); const [msg, setMsg] = useState("");
  const [f, setF] = useState({ type: "hadis" as "hadis" | "ayat", cat: "solat", tag: "", src: "", ar: "", ms: "", bg: "nabawi", cardCat: "" });
  const allCats = [...LIB_CATS.map(([k, v]) => [k, v] as [string, string]), ...cats];
  const save = async (p: CustomLib) => { try { await setDoc(doc(db, "config", "library"), { items: p.items ?? items, cats: p.cats ?? cats }); setMsg("Disimpan. Pustaka admin masjid dikemas kini serta-merta."); } catch { setMsg("Gagal simpan. Saiz data mungkin terlalu besar."); } };
  const add = () => {
    if (f.ar.trim().length < 5 || f.ms.trim().length < 5 || !f.src.trim()) return setMsg("Isi teks Arab, terjemahan dan sumber/rujukan.");
    const it: LibItem = { id: "c-" + uid(), type: f.type, cat: f.cat, tag: f.tag.trim() || (f.type === "hadis" ? "Hadis" : "Ayat"), src: f.src.trim(), ar: f.ar.trim(), ms: f.ms.trim(), bg: f.bg, cardCat: f.cardCat.trim() || allCats.find(([k]) => k === f.cat)?.[1] || "" };
    save({ items: [...items, it] }); setF({ ...f, tag: "", src: "", ar: "", ms: "", cardCat: "" });
  };
  const addCat = () => { const n = c.trim(); if (!n) return; const id = "k-" + n.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) + "-" + uid().slice(0, 3); save({ cats: [...cats, [id, n.slice(0, 30)]] }); setC(""); };
  return (
    <div className="grid gap-5">
      <section className="card"><h2 className="text-lg font-bold">Kategori pustaka</h2><p className="text-sm text-sub">Kategori asas: {LIB_CATS.map(([, v]) => v).join(", ")}. Tambah kategori baharu di sini.</p>
        <div className="mt-2 flex gap-2"><input className="inp" aria-label="Nama kategori baharu" placeholder="Cth: Ramadan & Puasa" maxLength={30} value={c} onChange={(e) => setC(e.target.value)} /><button type="button" className="btn btn-primary" onClick={addCat}><Plus size={18} /> Tambah</button></div>
        <ul className="mt-3 flex flex-wrap gap-2">{cats.map(([k, v]) => <li key={k} className="chip chip-ok">{v}<button type="button" aria-label={`Padam kategori ${v}`} className="ml-1" onClick={() => save({ cats: cats.filter(([x]) => x !== k) })}>×</button></li>)}{!cats.length && <li className="text-sm text-sub">Belum ada kategori tambahan.</li>}</ul></section>
      <section className="card"><h2 className="text-lg font-bold">Tambah hadis / ayat al-Quran</h2><p className="text-sm text-sub">Ia terus muncul dalam Pustaka Templat admin masjid (kini {LIBRARY.length} asas + {items.length} tambahan). Pastikan teks dan rujukan disemak oleh asatizah.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><Lb id="lt">Jenis</Lb><select id="lt" className="inp" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "hadis" | "ayat" })}><option value="hadis">Hadis sahih</option><option value="ayat">Ayat al-Quran</option></select></div>
          <div><Lb id="lc">Kategori</Lb><select id="lc" className="inp" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{allCats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><Lb id="lb">Latar foto automatik</Lb><select id="lb" className="inp" value={f.bg} onChange={(e) => setF({ ...f, bg: e.target.value })}>{SLIDE_BGS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></div>
          <div><Lb id="ltg">Tajuk pendek</Lb><input id="ltg" className="inp" maxLength={30} placeholder="Cth: Luruskan Saf" value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })} /></div>
          <div className="sm:col-span-2"><Lb id="lsr">Sumber / rujukan</Lb><input id="lsr" className="inp" maxLength={120} placeholder="Cth: HR. Muslim (no. 725)" value={f.src} onChange={(e) => setF({ ...f, src: e.target.value })} /></div>
        </div>
        <Lb id="lar">Teks Arab (berbaris)</Lb><textarea id="lar" dir="rtl" lang="ar" rows={2} maxLength={400} className="inp" style={{ fontFamily: '"Amiri", serif', fontSize: "1.3rem" }} value={f.ar} onChange={(e) => setF({ ...f, ar: e.target.value })} />
        <Lb id="lms">Terjemahan bahasa Melayu</Lb><textarea id="lms" rows={2} maxLength={400} className="inp" value={f.ms} onChange={(e) => setF({ ...f, ms: e.target.value })} />
        <button type="button" className="btn btn-primary mt-3" onClick={add}><Plus size={18} /> Tambah ke pustaka</button>{msg && <p role="status" className="mt-2 text-sm text-accent">{msg}</p>}</section>
      <section className="card"><h2 className="text-lg font-bold">Hadis dan ayat tambahan ({items.length})</h2>
        <ul className="mt-3 grid gap-2">{items.map((it) => (<li key={it.id} className="flex items-start gap-3 rounded-xl bg-muted p-3"><div className="min-w-0 flex-1"><b className="block">{it.src} <span className="chip chip-ok">{it.tag}</span></b><span lang="ar" dir="rtl" className="block text-lg" style={{ fontFamily: '"Amiri", serif' }}>{it.ar}</span><span className="block text-sm text-sub">{it.ms}</span></div><button type="button" className="btn" aria-label="Padam" onClick={() => save({ items: items.filter((x) => x.id !== it.id) })}><Trash2 size={16} /></button></li>))}
          {!items.length && <li className="text-sm text-sub">Belum ada tambahan. Hadis asas (12) dan ayat sedia ada tidak boleh dipadam.</li>}</ul></section>
    </div>);
}

export type QuickBg = { id: string; label: string; kind: "youtube" | "image"; url: string };
export function useQuickBg(): QuickBg[] { const [d, setD] = useState<QuickBg[]>([]); useEffect(() => onSnapshot(doc(db, "config", "quickbg"), (s) => setD(((s.data() as { items?: QuickBg[] })?.items) ?? []), () => {}), []); return d; }
/** Owner: pilihan pantas latar belakang (video YouTube atau imej) untuk admin masjid. */
export function QuickBgEditor() {
  const items = useQuickBg(); const [f, setF] = useState({ label: "", kind: "youtube" as "youtube" | "image", url: "" }); const [msg, setMsg] = useState("");
  const save = async (l: QuickBg[]) => { try { await setDoc(doc(db, "config", "quickbg"), { items: l }); setMsg("Disimpan. Admin masjid nampak pilihan ini serta-merta."); } catch { setMsg("Gagal simpan."); } };
  const add = () => { if (!f.label.trim() || !/^https?:\/\//.test(f.url.trim())) return setMsg("Isi nama dan pautan (bermula https://)."); save([...items, { id: uid(), label: f.label.trim().slice(0, 40), kind: f.kind, url: f.url.trim() }].slice(0, 30)); setF({ ...f, label: "", url: "" }); };
  return (
    <div className="grid gap-5">
      <section className="card"><h2 className="text-lg font-bold">Pilihan pantas latar belakang</h2><p className="text-sm text-sub">Senarai video YouTube (dimainkan senyap) atau imej latar yang admin masjid boleh pilih dengan satu klik. Contoh: Makkah Live, Madinah Live.</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_2fr]">
          <div><Lb id="qn">Nama</Lb><input id="qn" className="inp" maxLength={40} placeholder="Cth: Makkah Live" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
          <div><Lb id="qk">Jenis</Lb><select id="qk" className="inp" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "youtube" | "image" })}><option value="youtube">Video YouTube</option><option value="image">Imej</option></select></div>
          <div><Lb id="qu">Pautan</Lb><input id="qu" className="inp" placeholder="https://www.youtube.com/watch?v=…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></div></div>
        <button type="button" className="btn btn-primary mt-3" onClick={add}><Plus size={18} /> Tambah pilihan pantas</button>{msg && <p role="status" className="mt-2 text-sm text-accent">{msg}</p>}
        <ul className="mt-4 grid gap-2">{items.map((it) => (<li key={it.id} className="flex items-center gap-3 rounded-xl bg-muted p-3"><div className="min-w-0 flex-1"><b>{it.label}</b> <span className="chip chip-ok">{it.kind === "youtube" ? "YouTube" : "Imej"}</span><span className="block truncate text-xs text-sub">{it.url}</span></div><button type="button" className="btn" aria-label="Padam" onClick={() => save(items.filter((x) => x.id !== it.id))}><Trash2 size={16} /></button></li>))}
          {!items.length && <li className="text-sm text-sub">Belum ada pilihan pantas.</li>}</ul></section>
    </div>);
}

/** Owner: status persediaan Siaran Kuliah (Live) setiap masjid (data sahaja). */
export function LiveStatus({ rows, tv }: { rows: { id: string; name: string; state: string }[]; tv: Record<string, TvDoc> }) {
  const done = (id: string) => !!tv[id]?.live?.speaker?.trim();
  const n = rows.filter((r) => done(r.id)).length;
  return (
    <section className="card"><h2 className="text-lg font-bold">Persediaan Siaran Kuliah (Live)</h2><p className="text-sm text-sub">Data sahaja: masjid mana sudah menetapkan maklumat live dan yang belum. {n} daripada {rows.length} masjid sudah menetapkan.</p>
      <ul className="mt-3 grid gap-2">{rows.map((r) => (<li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3"><div className="min-w-0"><b className="block truncate">{r.name}</b><span className="text-xs text-sub">{r.state || "-"}{done(r.id) ? ` · ${tv[r.id].live!.speaker}${tv[r.id].live!.topic ? " · " + tv[r.id].live!.topic : ""}` : ""}</span></div><span className={`chip ${done(r.id) ? "chip-ok" : "chip-demo"}`}>{done(r.id) ? "Sudah setup" : "Belum setup"}</span></li>))}
        {!rows.length && <li className="text-sm text-sub">Belum ada masjid berdaftar.</li>}</ul></section>);
}

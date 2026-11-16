"use client";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { X, ArrowDown, ArrowUp, Check, GripVertical, ImagePlus, Info, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { coverImage } from "@/lib/image";
import { DEFAULT_SLIDES } from "@/lib/defaultSlides";
import { SLIDE_BGS, bgOf } from "@/lib/slideBackgrounds";
import { SLIDE_TEMPLATES } from "@/lib/slideTemplates";
import VideoAdder from "@/components/VideoAdder";
import { deleteVideo } from "@/lib/media";
import SlidePanel from "@/components/SlidePanel";
import { SLIDE_AR_FONTS, SLIDE_FONTS, SLIDE_SIZES } from "@/lib/slideFonts";
import { KIND_LABEL, uid, type SlideItem } from "@/lib/types";

const MAX = 15;
/** Urus slaid TV: muat naik gambar 1920x1080, templat, susun (seret), sunting, padam. Perubahan susunan terus ke TV. */
export default function SlideManager({ mid, slides, onLive, flash }: { mid: string; slides: SlideItem[] | undefined; onLive: (l: SlideItem[]) => void; flash: (m: string) => void }) {
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null); const [buf, setBuf] = useState<SlideItem | null>(null);
  const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null); const [busy, setBusy] = useState(false);
  type Dlg = { id?: string; text: string; source: string; data: string; bg: string; oldImg?: string; ar: string; arFont: string; arSz: number; font: string; sz: number; jumaat: boolean };
  const [dlg, setDlg] = useState<Dlg | null>(null); const dfile = useRef<HTMLInputElement>(null);
  const newDlg = (): Dlg => ({ text: "", source: "", data: "", bg: "", ar: "", arFont: "amiri", arSz: 1, font: "", sz: 1, jumaat: false });
  const editDlg = (it: SlideItem) => setDlg({ id: it.id, text: it.text, source: it.source ?? "", data: "", bg: it.imgId ? "" : it.bg ?? "", oldImg: it.imgId, ar: it.ar ?? "", arFont: it.arFont ?? "amiri", arSz: it.arSz ?? 1, font: it.font ?? "", sz: it.sz ?? 1, jumaat: !!it.jumaat });
  const file = useRef<HTMLInputElement>(null); const repl = useRef<HTMLInputElement>(null); const replFor = useRef<string>("");
  useEffect(() => onSnapshot(collection(db, "tv", mid, "slideimg"), (s) => setImgs(Object.fromEntries(s.docs.map((d) => [d.id, d.data().data as string]))), () => {}), [mid]);
  const list = slides ?? DEFAULT_SLIDES;
  // Kekalkan kedudukan skrol semasa padam/susun/sunting slaid supaya halaman tidak melompat ke atas
  const commit = (l: SlideItem[]) => {
    const y = window.scrollY; onLive(l.slice(0, MAX)); const back = () => { if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }); };
    requestAnimationFrame(() => { back(); requestAnimationFrame(back); }); [60, 160, 350, 700].forEach((ms) => setTimeout(back, ms));
  };
  const full = list.length >= MAX;

  const upload = async (f: Blob): Promise<string | null> => {
    try {
      const { data, srcW, srcH } = await coverImage(f);
      if (Math.abs(srcW / srcH - 16 / 9) > 0.08) flash("Nisbah gambar bukan 16:9. Gambar dipotong supaya muat. Guna 1920 x 1080 untuk hasil terbaik.");
      if (data.length > 900000) { flash("Gambar terlalu besar."); return null; }
      return (await addDoc(collection(db, "tv", mid, "slideimg"), { data, at: Date.now() })).id;
    } catch { flash("Gambar tidak sah."); return null; }
  };
  const addFiles = async (fl: FileList | null) => {
    if (!fl || busy) return; setBusy(true); const add: SlideItem[] = [];
    for (const f of Array.from(fl)) { if (list.length + add.length >= MAX) { flash(`Maksimum ${MAX} slaid.`); break; } if (!f.type.startsWith("image/")) continue; const id = await upload(f); if (id) add.push({ id: uid(), kind: "gambar", text: "", on: true, imgId: id }); }
    if (add.length) commit([...list, ...add]); setBusy(false); if (file.current) file.current.value = "";
  };
  const pickDlgImg = async (f?: File | null) => {
    if (!f || !dlg) return; if (!f.type.startsWith("image/")) return flash("Pilih fail gambar.");
    try { const { data } = await coverImage(f); if (data.length > 900000) return flash("Gambar terlalu besar."); setDlg((d) => (d ? { ...d, data, bg: "" } : d)); } catch { flash("Gambar tidak sah."); }
    if (dfile.current) dfile.current.value = "";
  };
  const saveDlg = async () => {
    if (!dlg) return; if (!dlg.text.trim() && !dlg.ar.trim()) return flash("Tulis teks (atau teks Arab) untuk slaid.");
    if (!dlg.data && !dlg.bg && !dlg.oldImg) return flash("Pilih gambar latar dahulu (muat naik atau pilih foto).");
    setBusy(true);
    try {
      let imgId = dlg.oldImg;
      if (dlg.data) { imgId = (await addDoc(collection(db, "tv", mid, "slideimg"), { data: dlg.data, at: Date.now() })).id; if (dlg.oldImg) deleteDoc(doc(db, "tv", mid, "slideimg", dlg.oldImg)).catch(() => {}); }
      else if (dlg.bg && dlg.oldImg) { deleteDoc(doc(db, "tv", mid, "slideimg", dlg.oldImg)).catch(() => {}); imgId = undefined; }
      const f = { text: dlg.text.trim(), source: dlg.source.trim(), ar: dlg.ar.trim() || undefined, arFont: dlg.ar.trim() ? dlg.arFont : undefined, arSz: dlg.ar.trim() && dlg.arSz !== 1 ? dlg.arSz : undefined, font: dlg.font || undefined, sz: dlg.sz !== 1 ? dlg.sz : undefined, jumaat: dlg.jumaat || undefined, imgId, bg: imgId ? undefined : dlg.bg || undefined };
      const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
      if (dlg.id) commit(list.map((x) => (x.id === dlg.id ? ({ ...(({ ar, arFont, arSz, font, sz, jumaat, imgId: _i, bg: _b, ...r }) => r)(x as Record<string, unknown> & SlideItem), ...clean(f) } as SlideItem) : x)));
      else commit([...list, { id: uid(), kind: "umum", on: true, ...clean(f) } as SlideItem]);
      setDlg(null);
    } catch { flash("Gagal menyimpan slaid."); }
    setBusy(false);
  };
  const replaceImg = async (f?: File | null) => {
    const sid = replFor.current; if (!f || !sid) return; setBusy(true); const it = list.find((x) => x.id === sid); const nid = await upload(f);
    if (nid && it) { if (it.imgId) deleteDoc(doc(db, "tv", mid, "slideimg", it.imgId)).catch(() => {}); commit(list.map((x) => (x.id === sid ? { ...x, imgId: nid } : x))); }
    setBusy(false); if (repl.current) repl.current.value = "";
  };
  const remove = (it: SlideItem) => { if (!confirm("Padam slaid ini?")) return; if (it.vidPath) deleteVideo(it.vidPath); if (it.imgId) deleteDoc(doc(db, "tv", mid, "slideimg", it.imgId)).catch(() => {}); commit(list.filter((x) => x.id !== it.id)); if (editId === it.id) { setEditId(null); setBuf(null); } };
  const move = (from: number, to: number) => { if (to < 0 || to >= list.length || from === to) return; const l = [...list]; const [x] = l.splice(from, 1); l.splice(to, 0, x); commit(l); };
  const upd = (id: string, p: Partial<SlideItem>) => commit(list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const startEdit = (it: SlideItem) => { setEditId(it.id); setBuf({ ...it }); };
  const saveEdit = () => { if (!buf) return; if (buf.kind !== "gambar" && !buf.text.trim()) return flash("Teks slaid tidak boleh kosong."); upd(buf.id, buf); setEditId(null); setBuf(null); };
  const thumb = (it: SlideItem) => it.kind === "video" ? { backgroundImage: "linear-gradient(135deg,#1e1b4b,#0f172a)" } : it.kind === "gambar" ? { backgroundImage: imgs[it.imgId ?? ""] ? `url(${imgs[it.imgId!]})` : undefined } : { backgroundImage: it.imgId && imgs[it.imgId] ? `linear-gradient(rgba(2,6,23,.45),rgba(2,6,23,.65)), url(${imgs[it.imgId]})` : bgOf(it.bg) ? `linear-gradient(rgba(2,6,23,.45),rgba(2,6,23,.65)), url(${bgOf(it.bg)!.url})` : "linear-gradient(135deg,#064e3b,#0f172a)" };

  return (
    <div>
      <div className="blink-note" role="note"><Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Saiz slaid gambar yang dimasukkan hendaklah <b>1920 x 1080 piksel</b> (nisbah 16:9). Gambar lain saiz akan dipotong.</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={full || busy} onClick={() => file.current?.click()}><ImagePlus size={18} /> {busy ? "Memuat naik…" : "Muat naik gambar slaid"}</button>
        <button type="button" className="btn" disabled={full} onClick={() => setDlg(newDlg())}><Plus size={18} /> Slaid teks</button>
        <input ref={file} type="file" accept="image/*" multiple className="hidden" aria-label="Pilih gambar slaid" onChange={(e) => addFiles(e.target.files)} />
        <input ref={repl} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar ganti" onChange={(e) => replaceImg(e.target.files?.[0])} />
      </div>
      {dlg && typeof document !== "undefined" && createPortal((() => {
        const hasAr = !!dlg.ar.trim(); const cur = dlg.data || (dlg.oldImg ? imgs[dlg.oldImg] : "") || "";
        const pv: SlideItem = { id: "__pv", kind: "umum", on: true, text: dlg.text || (hasAr ? "" : "Teks anda akan keluar di sini."), source: dlg.source, ar: dlg.ar, arFont: dlg.arFont, arSz: dlg.arSz, font: dlg.font || undefined, sz: dlg.sz, ...(cur ? { imgId: "__pv" } : { bg: dlg.bg || undefined }) };
        const Sz = ({ v, on }: { v: number; on: (n: number) => void }) => <select className="inp" aria-label="Saiz" value={v} onChange={(e) => on(Number(e.target.value))}>{SLIDE_SIZES.map((z) => <option key={z.v} value={z.v}>{z.label}</option>)}</select>;
        return (
        <div className="theme-light fixed inset-0 z-[90] grid place-items-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label={dlg.id ? "Sunting slaid" : "Tambah slaid teks"} onClick={(e) => { if (e.target === e.currentTarget) setDlg(null); }}>
          <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-bold" style={{ color: "var(--color-fg)" }}>{dlg.id ? "Sunting slaid" : "Tambah slaid teks"}</h3><button type="button" className="btn !px-3" aria-label="Tutup" onClick={() => setDlg(null)}><X size={18} /></button></div>
            <span className="lbl">Gambar latar</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => dfile.current?.click()}><ImagePlus size={18} /> {dlg.data || dlg.oldImg ? "Tukar gambar" : "Muat naik gambar"}</button>
              <select aria-label="Atau pilih foto sedia ada" className="inp !w-auto" value={dlg.bg} onChange={(e) => setDlg({ ...dlg, bg: e.target.value, data: "" })}><option value="">Atau pilih foto sedia ada</option>{SLIDE_BGS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
              <input ref={dfile} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar latar" onChange={(e) => pickDlgImg(e.target.files?.[0])} />
            </div>
            <label htmlFor="dl-ar" className="lbl">Teks Arab (pilihan)</label>
            <textarea id="dl-ar" rows={2} dir="rtl" lang="ar" maxLength={400} className="inp" style={{ fontFamily: '"Amiri", serif', fontSize: "1.25rem" }} value={dlg.ar} onChange={(e) => setDlg({ ...dlg, ar: e.target.value })} placeholder="Tulis atau tampal ayat / hadis dalam tulisan Arab" />
            {hasAr && (<div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div><label htmlFor="dl-af" className="lbl !mt-0">Font Arab</label><select id="dl-af" className="inp" value={dlg.arFont} onChange={(e) => setDlg({ ...dlg, arFont: e.target.value })}>{SLIDE_AR_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></div>
              <div><label className="lbl !mt-0">Saiz Arab</label><Sz v={dlg.arSz} on={(n) => setDlg({ ...dlg, arSz: n })} /></div>
              {SLIDE_AR_FONTS.find((f) => f.id === dlg.arFont)?.note && <p className="text-xs text-sub sm:col-span-2">{SLIDE_AR_FONTS.find((f) => f.id === dlg.arFont)!.note}</p>}
            </div>)}
            <label htmlFor="dl-tx" className="lbl">{hasAr ? "Maksud (bahasa Melayu)" : "Teks atas gambar"}</label>
            <textarea id="dl-tx" rows={3} maxLength={400} className="inp" value={dlg.text} onChange={(e) => setDlg({ ...dlg, text: e.target.value })} placeholder={hasAr ? "Tulis maksud / terjemahan di sini." : "Tulis teks slaid anda di sini."} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div><label htmlFor="dl-f" className="lbl !mt-0">Font {hasAr ? "maksud" : "teks"}</label><select id="dl-f" className="inp" value={dlg.font} onChange={(e) => setDlg({ ...dlg, font: e.target.value })}><option value="">Ikut font utama</option>{SLIDE_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
              <div><label className="lbl !mt-0">Saiz {hasAr ? "maksud" : "teks"}</label><Sz v={dlg.sz} on={(n) => setDlg({ ...dlg, sz: n })} /></div>
            </div>
            <label htmlFor="dl-sr" className="lbl">Rujukan / sumber (pilihan)</label>
            <input id="dl-sr" className="inp" maxLength={120} value={dlg.source} onChange={(e) => setDlg({ ...dlg, source: e.target.value })} placeholder="cth: HR. al-Bukhari no. 1" />
            <label className="mt-2 flex min-h-11 items-center gap-2 text-sm" style={{ color: "var(--color-fg)" }}><input type="checkbox" className="size-5 accent-green-700" checked={dlg.jumaat} onChange={(e) => setDlg({ ...dlg, jumaat: e.target.checked })} /> Jumaat sahaja</label>
            <span className="lbl">Pratonton</span>
            <div className="mx-auto w-full max-w-sm"><SlidePanel slides={[pv]} anim="fade" secs={10} T={() => ({})} B={() => ({})} imgs={{ __pv: cur }} /></div>
            <div className="mt-4 flex gap-2"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveDlg}><Check size={18} /> {busy ? "Menyimpan…" : "Simpan slaid"}</button><button type="button" className="btn" onClick={() => setDlg(null)}>Batal</button></div>
          </div>
        </div>); })(), document.body)}
      <div className="mt-3"><VideoAdder basePath={`tv/${mid}/slidevid`} disabled={full} flash={flash} onAdd={(it) => commit([...list, { ...it, id: uid() }])} /></div>
      <div className="mt-3"><span className="lbl !mt-0">Tambah daripada templat</span><div className="flex flex-wrap gap-2">{SLIDE_TEMPLATES.map((t) => <button key={t.id} type="button" className="btn" disabled={full} onClick={() => { commit([...list, { ...t.make(), id: uid() }]); flash(`Templat ${t.label} ditambah. Tekan pensel untuk sunting teks.`); }}>{t.label}</button>)}</div></div>
      <p className="mt-3 text-sm text-sub">{list.length} / {MAX} slaid. Seret <GripVertical size={14} className="inline" /> atau guna anak panah untuk susun. {!slides && "Anda sedang guna pek slaid asas; sebarang perubahan akan menyalinnya untuk disunting."}</p>
      <ul className="mt-3 grid gap-2" aria-label="Senarai slaid">
        {list.map((it, i) => (
          <li key={it.id} id={"sl-" + it.id} className="sl-item" data-over={over === i && drag !== i} data-drag={drag === i} draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver((o) => (o === i ? null : o))} onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }}>
            <span className="sl-grip" aria-hidden="true"><GripVertical size={20} /></span>
            <div className="sl-thumb" style={thumb(it)}>{it.kind === "video" && <span className="font-extrabold tracking-wider">VIDEO</span>}{it.kind !== "gambar" && it.kind !== "video" && <span className="line-clamp-3 font-bold [text-shadow:0_1px_2px_rgba(0,0,0,.8)]">{it.text}</span>}</div>
            <div className="min-w-0"><b className="block truncate">{it.kind === "gambar" ? "Gambar slaid" : it.kind === "video" ? "Video animasi" : it.title || KIND_LABEL[it.kind]}</b><span className="block truncate text-xs text-sub">{it.kind === "gambar" ? "Kekal seperti dimuat naik" : it.kind === "video" ? `${it.vidPath ? "Dimuat naik" : "Pautan"} · ${it.dur || 15} saat` : it.source || it.text}</span>{it.jumaat && <span className="chip chip-demo !text-[.68rem]">Jumaat sahaja</span>}</div>
            <div className="sl-actions">
              <button type="button" className="switch" role="switch" aria-checked={it.on} aria-label={`Aktifkan slaid ${i + 1}`} onClick={() => upd(it.id, { on: !it.on })} />
              <button type="button" className="btn !min-h-9 !px-2" aria-label="Naik" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
              <button type="button" className="btn !min-h-9 !px-2" aria-label="Turun" disabled={i === list.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
              {it.kind === "video" ? <button type="button" className="btn !min-h-9 !px-2" aria-label="Sunting video" onClick={() => (editId === it.id ? (setEditId(null), setBuf(null)) : startEdit(it))}><Pencil size={16} /></button>
                : it.kind === "gambar" ? <button type="button" className="btn !min-h-9 !px-2" aria-label="Ganti gambar" onClick={() => { replFor.current = it.id; repl.current?.click(); }}><RefreshCw size={16} /></button>
                : <button type="button" className="btn !min-h-9 !px-2" aria-label="Sunting slaid" onClick={() => editDlg(it)}><Pencil size={16} /></button>}
              <button type="button" className="btn !min-h-9 !px-2 text-danger" aria-label="Padam slaid" onClick={() => remove(it)}><Trash2 size={16} /></button>
            </div>
            {editId === it.id && buf && it.kind === "video" && (
              <div className="sl-edit">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><label htmlFor={"vd" + it.id} className="lbl !mt-0">Tempoh paparan (saat, 5 hingga 120)</label><input id={"vd" + it.id} type="number" min={5} max={120} className="inp" value={buf.dur ?? 15} onChange={(e) => setBuf({ ...buf, dur: Math.max(5, Math.min(120, Math.round(+e.target.value) || 15)) })} /></div>
                  {!it.vidPath && <div><label htmlFor={"vu" + it.id} className="lbl !mt-0">Pautan video</label><input id={"vu" + it.id} className="inp" value={buf.videoUrl ?? ""} onChange={(e) => setBuf({ ...buf, videoUrl: e.target.value })} /></div>}
                </div>
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!buf.jumaat} onChange={(e) => setBuf({ ...buf, jumaat: e.target.checked })} /> Jumaat sahaja</label>
                <div className="mt-2 flex gap-2"><button type="button" className="btn btn-primary" onClick={() => { upd(buf.id, buf); setEditId(null); setBuf(null); }}><Check size={18} /> Simpan video</button><button type="button" className="btn" onClick={() => { setEditId(null); setBuf(null); }}>Batal</button></div>
              </div>)}
            {it.kind === "gambar" && <label className="sl-edit !border-0 !pt-0 flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!it.jumaat} onChange={(e) => upd(it.id, { jumaat: e.target.checked })} /> Jumaat sahaja</label>}
          </li>))}
      </ul>
      <p className="mt-3 text-xs text-sub">Slaid gambar dipaparkan tepat seperti dimuat naik (font dan warna sistem tidak mengubahnya). Hanya slaid teks dan templat boleh diubah tulisannya. Kredit foto latar: lihat nota kecil pada slaid.</p>
    </div>
  );
}

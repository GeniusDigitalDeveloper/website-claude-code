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
import { KIND_LABEL, uid, type SlideItem } from "@/lib/types";

const MAX = 15;
/** Urus slaid TV: muat naik gambar 1920x1080, templat, susun (seret), sunting, padam. Perubahan susunan terus ke TV. */
export default function SlideManager({ mid, slides, onLive, flash }: { mid: string; slides: SlideItem[] | undefined; onLive: (l: SlideItem[]) => void; flash: (m: string) => void }) {
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null); const [buf, setBuf] = useState<SlideItem | null>(null);
  const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null); const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<{ text: string; source: string; data: string; bg: string } | null>(null); const dfile = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null); const repl = useRef<HTMLInputElement>(null); const replFor = useRef<string>("");
  useEffect(() => onSnapshot(collection(db, "tv", mid, "slideimg"), (s) => setImgs(Object.fromEntries(s.docs.map((d) => [d.id, d.data().data as string]))), () => {}), [mid]);
  const list = slides ?? DEFAULT_SLIDES;
  const commit = (l: SlideItem[]) => onLive(l.slice(0, MAX));
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
    if (!dlg) return; if (!dlg.text.trim()) return flash("Tulis teks untuk slaid.");
    if (!dlg.data && !dlg.bg) return flash("Pilih gambar latar dahulu (muat naik atau pilih foto).");
    setBusy(true);
    try {
      const imgId = dlg.data ? (await addDoc(collection(db, "tv", mid, "slideimg"), { data: dlg.data, at: Date.now() })).id : undefined;
      commit([...list, { id: uid(), kind: "umum", text: dlg.text.trim(), source: dlg.source.trim(), on: true, ...(imgId ? { imgId } : { bg: dlg.bg }) }]);
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
        <button type="button" className="btn" disabled={full} onClick={() => setDlg({ text: "", source: "", data: "", bg: "" })}><Plus size={18} /> Slaid teks</button>
        <input ref={file} type="file" accept="image/*" multiple className="hidden" aria-label="Pilih gambar slaid" onChange={(e) => addFiles(e.target.files)} />
        <input ref={repl} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar ganti" onChange={(e) => replaceImg(e.target.files?.[0])} />
      </div>
      {dlg && typeof document !== "undefined" && createPortal((() => { const pv = dlg.data || bgOf(dlg.bg)?.url || ""; return (
        <div className="theme-light fixed inset-0 z-[90] grid place-items-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Tambah slaid teks" onClick={(e) => { if (e.target === e.currentTarget) setDlg(null); }}>
          <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto">
            <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-bold" style={{ color: "var(--color-fg)" }}>Tambah slaid teks</h3><button type="button" className="btn !px-3" aria-label="Tutup" onClick={() => setDlg(null)}><X size={18} /></button></div>
            <p className="mt-1 text-sm text-sub">1. Pilih gambar latar. 2. Tulis teks yang akan terletak di atas gambar. 3. Semak pratonton di bawah, kemudian simpan.</p>
            <span className="lbl">Gambar latar</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => dfile.current?.click()}><ImagePlus size={18} /> {dlg.data ? "Tukar gambar" : "Muat naik gambar"}</button>
              <select aria-label="Atau pilih foto sedia ada" className="inp !w-auto" value={dlg.bg} onChange={(e) => setDlg({ ...dlg, bg: e.target.value, data: "" })}><option value="">Atau pilih foto sedia ada</option>{SLIDE_BGS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
              <input ref={dfile} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar latar" onChange={(e) => pickDlgImg(e.target.files?.[0])} />
            </div>
            <label htmlFor="dl-tx" className="lbl">Teks atas gambar</label>
            <textarea id="dl-tx" rows={3} maxLength={400} className="inp" value={dlg.text} onChange={(e) => setDlg({ ...dlg, text: e.target.value })} placeholder="Tulis teks slaid anda di sini." />
            <label htmlFor="dl-sr" className="lbl">Rujukan / sumber (pilihan)</label>
            <input id="dl-sr" className="inp" maxLength={120} value={dlg.source} onChange={(e) => setDlg({ ...dlg, source: e.target.value })} placeholder="cth: HR. al-Bukhari no. 1" />
            <span className="lbl">Pratonton</span>
            <div className="relative mx-auto grid w-full max-w-md overflow-hidden rounded-2xl bg-slate-800" style={{ aspectRatio: "16 / 9", containerType: "inline-size", ...(pv ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.45), rgba(2,6,23,.75)), url(${pv})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
              {!pv && <span className="place-self-center text-sm text-white/70">Belum ada gambar</span>}
              {pv && <div className="flex h-full flex-col justify-center" style={{ padding: "5cqw" }}><p className="font-bold leading-snug text-white" style={{ fontSize: dlg.text.length > 170 ? "4cqw" : dlg.text.length > 110 ? "4.8cqw" : "5.6cqw" }}>{dlg.text || "Teks anda akan keluar di sini."}</p>{dlg.source && <p className="mt-2 font-semibold" style={{ fontSize: "3cqw", color: "#fde68a" }}>{dlg.source}</p>}</div>}
            </div>
            <div className="mt-4 flex gap-2"><button type="button" className="btn btn-primary" disabled={busy} onClick={saveDlg}><Check size={18} /> {busy ? "Menyimpan…" : "Simpan slaid"}</button><button type="button" className="btn" onClick={() => setDlg(null)}>Batal</button></div>
          </div>
        </div>); })(), document.body)}
      <div className="mt-3"><VideoAdder basePath={`tv/${mid}/slidevid`} disabled={full} flash={flash} onAdd={(it) => commit([...list, { ...it, id: uid() }])} /></div>
      <div className="mt-3"><span className="lbl !mt-0">Tambah daripada templat</span><div className="flex flex-wrap gap-2">{SLIDE_TEMPLATES.map((t) => <button key={t.id} type="button" className="btn" disabled={full} onClick={() => { commit([...list, { ...t.make(), id: uid() }]); flash(`Templat ${t.label} ditambah. Tekan pensel untuk sunting teks.`); }}>{t.label}</button>)}</div></div>
      <p className="mt-3 text-sm text-sub">{list.length} / {MAX} slaid. Seret <GripVertical size={14} className="inline" /> atau guna anak panah untuk susun. {!slides && "Anda sedang guna pek slaid asas; sebarang perubahan akan menyalinnya untuk disunting."}</p>
      <ul className="mt-3 grid gap-2" aria-label="Senarai slaid">
        {list.map((it, i) => (
          <li key={it.id} className="sl-item" data-over={over === i && drag !== i} data-drag={drag === i} draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver((o) => (o === i ? null : o))} onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }}>
            <span className="sl-grip" aria-hidden="true"><GripVertical size={20} /></span>
            <div className="sl-thumb" style={thumb(it)}>{it.kind === "video" && <span className="font-extrabold tracking-wider">VIDEO</span>}{it.kind !== "gambar" && it.kind !== "video" && <span className="line-clamp-3 font-bold [text-shadow:0_1px_2px_rgba(0,0,0,.8)]">{it.text}</span>}</div>
            <div className="min-w-0"><b className="block truncate">{it.kind === "gambar" ? "Gambar slaid" : it.kind === "video" ? "Video animasi" : it.title || KIND_LABEL[it.kind]}</b><span className="block truncate text-xs text-sub">{it.kind === "gambar" ? "Kekal seperti dimuat naik" : it.kind === "video" ? `${it.vidPath ? "Dimuat naik" : "Pautan"} · ${it.dur || 15} saat` : it.source || it.text}</span>{it.jumaat && <span className="chip chip-demo !text-[.68rem]">Jumaat sahaja</span>}</div>
            <div className="sl-actions">
              <button type="button" className="switch" role="switch" aria-checked={it.on} aria-label={`Aktifkan slaid ${i + 1}`} onClick={() => upd(it.id, { on: !it.on })} />
              <button type="button" className="btn !min-h-9 !px-2" aria-label="Naik" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
              <button type="button" className="btn !min-h-9 !px-2" aria-label="Turun" disabled={i === list.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
              {it.kind === "video" ? <button type="button" className="btn !min-h-9 !px-2" aria-label="Sunting video" onClick={() => (editId === it.id ? (setEditId(null), setBuf(null)) : startEdit(it))}><Pencil size={16} /></button>
                : it.kind === "gambar" ? <button type="button" className="btn !min-h-9 !px-2" aria-label="Ganti gambar" onClick={() => { replFor.current = it.id; repl.current?.click(); }}><RefreshCw size={16} /></button>
                : <button type="button" className="btn !min-h-9 !px-2" aria-label="Sunting slaid" onClick={() => (editId === it.id ? (setEditId(null), setBuf(null)) : startEdit(it))}><Pencil size={16} /></button>}
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
            {editId === it.id && buf && it.kind !== "gambar" && it.kind !== "video" && (
              <div className="sl-edit">
                <label htmlFor={"st" + it.id} className="lbl !mt-0">Teks slaid</label><textarea id={"st" + it.id} rows={3} maxLength={400} className="inp" value={buf.text} onChange={(e) => setBuf({ ...buf, text: e.target.value })} />
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><label htmlFor={"ss" + it.id} className="lbl !mt-0">Rujukan / sumber</label><input id={"ss" + it.id} className="inp" placeholder="cth: HR. al-Bukhari no. 1" value={buf.source ?? ""} onChange={(e) => setBuf({ ...buf, source: e.target.value })} /></div>
                  <div><label htmlFor={"sb" + it.id} className="lbl !mt-0">Latar (foto sebenar)</label><select id={"sb" + it.id} className="inp" value={buf.bg ?? ""} onChange={(e) => setBuf({ ...buf, bg: e.target.value || undefined })}><option value="">Tiada (gradien hijau)</option>{SLIDE_BGS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></div>
                </div>
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!buf.jumaat} onChange={(e) => setBuf({ ...buf, jumaat: e.target.checked })} /> Jumaat sahaja</label>
                <div className="mt-2 flex gap-2"><button type="button" className="btn btn-primary" onClick={saveEdit}><Check size={18} /> Simpan slaid</button><button type="button" className="btn" onClick={() => { setEditId(null); setBuf(null); }}>Batal</button></div>
              </div>)}
            {it.kind === "gambar" && <label className="sl-edit !border-0 !pt-0 flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!it.jumaat} onChange={(e) => upd(it.id, { jumaat: e.target.checked })} /> Jumaat sahaja</label>}
          </li>))}
      </ul>
      <p className="mt-3 text-xs text-sub">Slaid gambar dipaparkan tepat seperti dimuat naik (font dan warna sistem tidak mengubahnya). Hanya slaid teks dan templat boleh diubah tulisannya. Kredit foto latar: lihat nota kecil pada slaid.</p>
    </div>
  );
}

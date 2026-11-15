"use client";
import { useRef, useState } from "react";
import { Film, Info, Link2, Upload } from "lucide-react";
import { MAX_VIDEO_BYTES, driveDirect, saveVideo, youtubeId } from "@/lib/media";
import type { SlideItem } from "@/lib/types";

/** Tambah slaid video animasi: pautan (MP4/WebM/YouTube/Drive) atau muat naik klip kecil (maks 4 MB). */
export default function VideoAdder({ basePath, onAdd, disabled, flash }: { basePath: string; onAdd: (it: Omit<SlideItem, "id">) => void; disabled?: boolean; flash: (m: string) => void }) {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const file = useRef<HTMLInputElement>(null);
  const fromLink = () => {
    const u = url.trim(); if (!u) return;
    if (!/^https:\/\//i.test(u)) return flash("Pautan video mesti bermula https://");
    const yt = youtubeId(u); const direct = driveDirect(u);
    if (!yt && !/\.(mp4|webm)(\?|#|$)/i.test(direct) && !/drive\.google\.com/.test(direct)) flash("Pautan tidak dikenali sebagai MP4/WebM. Cuba juga; jika tidak bermain, guna pautan terus ke fail .mp4.");
    onAdd({ kind: "video", text: "", on: true, videoUrl: yt ? u : direct, dur: 15 }); setUrl(""); flash("Slaid video ditambah.");
  };
  const upload = async (f?: File | null) => {
    if (!f) return; if (busy) return;
    if (!/^video\/(mp4|webm)$/.test(f.type)) { flash("Format mesti MP4 atau WebM."); if (file.current) file.current.value = ""; return; }
    if (f.size > MAX_VIDEO_BYTES) { flash(`Video terlalu besar (maks 4 MB). Untuk video besar guna pautan.`); if (file.current) file.current.value = ""; return; }
    setBusy(true);
    try { const path = await saveVideo(basePath, f); onAdd({ kind: "video", text: "", on: true, vidPath: path, mime: f.type, dur: 15 }); flash("Video dimuat naik dan ditambah."); }
    catch { flash("Gagal memuat naik video."); }
    setBusy(false); if (file.current) file.current.value = "";
  };
  return (
    <div className="rounded-2xl border border-line p-3">
      <h3 className="flex items-center gap-2 font-bold"><Film size={18} aria-hidden="true" /> Slaid video animasi</h3>
      <div className="blink-note mt-2" role="note"><Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Video hendaklah nisbah <b>16:9 (1920 x 1080)</b>, format <b>MP4 atau WebM</b>, dan tanpa bunyi. Muat naik terus: maksimum <b>4 MB</b> (klip pendek). Video besar: guna pautan.</span></div>
      <label htmlFor="vd-url" className="lbl">Pautan video (MP4/WebM, YouTube atau Google Drive)</label>
      <div className="flex gap-2"><input id="vd-url" className="inp" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fromLink()} />
        <button type="button" className="btn" disabled={disabled || !url.trim()} onClick={fromLink}><Link2 size={18} /> Tambah</button></div>
      <div className="mt-3"><button type="button" className="btn btn-primary" disabled={disabled || busy} onClick={() => file.current?.click()}><Upload size={18} /> {busy ? "Memuat naik…" : "Muat naik video (maks 4 MB)"}</button>
        <input ref={file} type="file" accept="video/mp4,video/webm" className="hidden" aria-label="Pilih video" onChange={(e) => upload(e.target.files?.[0])} /></div>
    </div>
  );
}

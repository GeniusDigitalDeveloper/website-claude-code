"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";
const BOX = 300;
/** Potong gambar profil: seret untuk gerak, gelangsar untuk zum. Boleh dibuka semula pada gambar asal untuk potong bahagian lain. */
export default function PhotoCropper({ src, onCancel, onSave }: { src: string; onCancel: () => void; onSave: (cropped: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = src; }, [src]);
  const base = img ? BOX / Math.min(img.width, img.height) : 1; // skala minimum (menutup petak)
  const clamp = (o: { x: number; y: number }, z: number) => {
    if (!img) return o; const w = img.width * base * z, h = img.height * base * z;
    return { x: Math.min(0, Math.max(BOX - w, o.x)), y: Math.min(0, Math.max(BOX - h, o.y)) };
  };
  useEffect(() => { if (img) setOff(clamp({ x: (BOX - img.width * base) / 2, y: (BOX - img.height * base) / 2 }, 1)); }, [img]); // eslint-disable-line react-hooks/exhaustive-deps
  const setZ = (z: number) => { if (!img) return; const cx = BOX / 2, cy = BOX / 2; const k = z / zoom; setZoom(z); setOff((o) => clamp({ x: cx - (cx - o.x) * k, y: cy - (cy - o.y) * k }, z)); };
  const save = () => {
    if (!img) return; const out = document.createElement("canvas"); out.width = out.height = 256; const g = out.getContext("2d")!; const k = base * zoom;
    g.drawImage(img, -off.x / k, -off.y / k, BOX / k, BOX / k, 0, 0, 256, 256); onSave(out.toDataURL("image/jpeg", 0.85));
  };
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="Potong gambar profil">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold">Laras gambar profil</h3><button type="button" className="rounded-full p-2 hover:bg-slate-100" aria-label="Tutup" onClick={onCancel}><X size={18} /></button></div>
        <p className="mt-1 text-sm text-slate-600">Seret gambar untuk gerakkan dan guna gelangsar untuk zum. Bahagian dalam bulatan akan menjadi gambar profil anda.</p>
        <div className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-2xl bg-slate-200" style={{ width: BOX, height: BOX }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; }}
          onPointerMove={(e) => { const d = drag.current; if (d) setOff(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }, zoom)); }}
          onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
          {img && <img src={src} alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 max-w-none" style={{ width: img.width * base * zoom, height: img.height * base * zoom, transform: `translate(${off.x}px, ${off.y}px)` }} />}
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 0, transparent 69%, rgba(0,0,0,.55) 70%)" }} aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" style={{ margin: 0 }} aria-hidden="true" />
        </div>
        <div className="mt-4 flex items-center gap-3"><ZoomOut size={18} aria-hidden="true" /><input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZ(+e.target.value)} className="w-full accent-green-700" aria-label="Zum" /><ZoomIn size={18} aria-hidden="true" /></div>
        <div className="mt-5 flex gap-2"><button type="button" className="btn btn-primary flex-1 justify-center" onClick={save}><Check size={18} /> Simpan gambar</button><button type="button" className="btn" onClick={onCancel}>Batal</button></div>
      </div>
    </div>, document.body);
}

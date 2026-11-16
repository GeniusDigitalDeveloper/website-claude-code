"use client";
import { useRef } from "react";
import { Camera } from "lucide-react";
/** Muat naik gambar profil: dipotong segi empat sama, dikecilkan 256px (JPEG) supaya ringan. */
export function resizeSquare(file: File, px = 256): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = px; c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, px, px); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.85)); };
    img.onerror = () => rej(new Error("img")); img.src = u;
  });
}
export default function Avatar({ photo, initials, size = 64, onPick }: { photo?: string; initials: string; size?: number; onPick?: (dataUrl: string) => void }) {
  const f = useRef<HTMLInputElement>(null);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {photo ? <img src={photo} alt="Gambar profil" className="size-full rounded-full object-cover" /> : <span className="grid size-full place-items-center rounded-full bg-muted font-extrabold text-accent" style={{ fontSize: size / 3 }} aria-hidden="true">{initials}</span>}
      {onPick && (<><button type="button" className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-green-700 text-white shadow-lg" aria-label="Tukar gambar profil" onClick={() => f.current?.click()}><Camera size={16} /></button>
        <input ref={f} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar profil" onChange={async (e) => { const x = e.target.files?.[0]; if (!x) return; try { onPick(await resizeSquare(x)); } catch {} if (f.current) f.current.value = ""; }} /></>)}
    </span>);
}

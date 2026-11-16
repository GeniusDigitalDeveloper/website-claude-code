"use client";
import { useRef, useState } from "react";
import { Camera, Crop } from "lucide-react";
import PhotoCropper from "@/components/PhotoCropper";
/** Gambar asal dikecilkan (maks 640px) dan disimpan supaya boleh dipotong semula kemudian. */
export function resizeMax(file: File, px = 640): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, px / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.8)); };
    img.onerror = () => rej(new Error("img")); img.src = u;
  });
}
export default function Avatar({ photo, initials, size = 64, onSave, srcOrig, canEditCrop = false }: { photo?: string; initials: string; size?: number; onSave?: (p: { photo: string; src: string }) => void; srcOrig?: string; canEditCrop?: boolean }) {
  const f = useRef<HTMLInputElement>(null); const [crop, setCrop] = useState<string | null>(null);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {photo ? <img src={photo} alt="Gambar profil" className="size-full rounded-full object-cover" /> : <span className="grid size-full place-items-center rounded-full bg-muted font-extrabold text-accent" style={{ fontSize: size / 3 }} aria-hidden="true">{initials}</span>}
      {onSave && (<>
        <button type="button" className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-green-700 text-white shadow-lg" aria-label="Tukar gambar profil" onClick={() => f.current?.click()}><Camera size={16} /></button>
        {canEditCrop && srcOrig && <button type="button" className="absolute -bottom-1 -left-1 grid size-8 place-items-center rounded-full bg-slate-800 text-white shadow-lg" aria-label="Laras dan potong semula gambar" onClick={() => setCrop(srcOrig)}><Crop size={16} /></button>}
        <input ref={f} type="file" accept="image/*" className="hidden" aria-label="Pilih gambar profil" onChange={async (e) => { const x = e.target.files?.[0]; if (!x) return; try { setCrop(await resizeMax(x)); } catch {} if (f.current) f.current.value = ""; }} />
        {crop && <PhotoCropper src={crop} onCancel={() => setCrop(null)} onSave={(c) => { onSave({ photo: c, src: crop }); setCrop(null); }} />}
      </>)}
    </span>);
}

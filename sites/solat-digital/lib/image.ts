/** Potong (cover) dan kecilkan gambar ke saiz tetap (lalai 1280x720, 16:9) sebagai JPEG supaya muat dalam satu dokumen Firestore. */
export async function coverImage(file: Blob, w = 1280, h = 720, q = 0.78): Promise<{ data: string; srcW: number; srcH: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img")); i.src = url; });
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!;
    const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k; g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
    return { data: c.toDataURL("image/jpeg", q), srcW: img.width, srcH: img.height };
  } finally { URL.revokeObjectURL(url); }
}

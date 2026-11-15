import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** Pautan kongsi Google Drive -> pautan terus (boleh dimainkan dalam <video> jika fail dikongsi "Anyone with the link"). */
export const driveDirect = (u: string) => { const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/); return m && /drive\.google\.com/.test(u) ? `https://drive.google.com/uc?export=download&id=${m[1]}` : u.trim(); };
/** ID video YouTube daripada pelbagai bentuk pautan. */
export const youtubeId = (u: string): string | null => { const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/); return m ? m[1] : null; };
export const ytEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`;

export const MAX_VIDEO_BYTES = 4 * 1024 * 1024; // ~8 kepingan
const CHUNK = 512 * 1024;
const b64 = (buf: Uint8Array) => { let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); return btoa(s); };

/** Simpan fail video kecil dalam Firestore sebagai kepingan: <basePath>/<id> (meta) dan <basePath>/<id>/c/<n>. Pulangkan laluan dokumen video. */
export async function saveVideo(basePath: string, file: File): Promise<string> {
  if (!/^video\/(mp4|webm)$/.test(file.type)) throw new Error("format");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("besar");
  const data = new Uint8Array(await file.arrayBuffer()), parts = Math.ceil(data.length / CHUNK);
  const meta = await addDoc(collection(db, basePath), { name: file.name.slice(0, 80), mime: file.type, size: file.size, parts, at: Date.now() });
  try { for (let i = 0; i < parts; i++) await setDoc(doc(db, basePath, meta.id, "c", String(i).padStart(3, "0")), { i, d: b64(data.subarray(i * CHUNK, (i + 1) * CHUNK)) }); }
  catch (e) { await deleteVideo(`${basePath}/${meta.id}`); throw e; }
  return `${basePath}/${meta.id}`;
}
export async function deleteVideo(vidPath: string) {
  try { const segs = vidPath.split("/"); const s = await getDocs(collection(db, vidPath, "c")); await Promise.all(s.docs.map((d) => deleteDoc(d.ref).catch(() => {}))); await deleteDoc(doc(db, segs[0], ...segs.slice(1))).catch(() => {}); } catch {}
}
const blobCache = new Map<string, Promise<string>>();
/** Muat kepingan dan bina URL blob (dicache setiap sesi). */
export function loadVideoBlob(vidPath: string, mime: string): Promise<string> {
  if (!blobCache.has(vidPath)) blobCache.set(vidPath, (async () => {
    const s = await getDocs(query(collection(db, vidPath, "c"), orderBy("i")));
    const parts = s.docs.map((d) => { const bin = atob(d.data().d as string); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; });
    return URL.createObjectURL(new Blob(parts as BlobPart[], { type: mime || "video/mp4" }));
  })().catch((e) => { blobCache.delete(vidPath); throw e; }));
  return blobCache.get(vidPath)!;
}

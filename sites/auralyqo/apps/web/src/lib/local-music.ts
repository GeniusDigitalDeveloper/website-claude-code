/**
 * Local & imported music.
 *
 * Web/PWA build:
 *  - "Import files"  : <input type=file multiple> (works on Android, iOS Files app, desktop).
 *                       The file is copied into this device's IndexedDB so it keeps playing offline.
 *  - "Scan a folder" : File System Access API (Chrome/Edge desktop & Android where available).
 *                       Only a handle + relative path is stored; files are read in place, never copied
 *                       and never uploaded. "Rescan" re-walks the folder for new/removed songs.
 *  - Removing a song only removes it from AURALYQO's library. Original files are never deleted.
 *
 * The native Android build (apps/mobile) uses MediaStore for automatic whole-device detection;
 * a browser cannot read the whole device without the user picking a folder.
 */
import { createStore, del, get, keys, set } from "idb-keyval";
import type { Track } from "./types";

const files = typeof indexedDB !== "undefined" ? createStore("auralyqo-files", "blobs") : undefined;
const handles = typeof indexedDB !== "undefined" ? createStore("auralyqo-handles", "dirs") : undefined;

export const SUPPORTED_EXT = ["mp3", "m4a", "aac", "flac", "wav", "ogg", "oga", "opus"] as const;
const MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: 'audio/ogg; codecs="opus"',
};
export const ACCEPT = ".mp3,.m4a,.aac,.flac,.wav,.ogg,.oga,.opus,audio/*";

export interface LocalMeta {
  /** device-folder (scanned in place) or imported (copied into app storage) */
  origin: "folder" | "imported";
  fileName: string;
  path?: string; // relative path inside the scanned folder
  folderId?: string;
  size: number;
  lastModified: number;
  format: string;
  canPlayHere: boolean;
  addedAt: number;
}
export type LocalTrack = Track & { local: LocalMeta };

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
export const isAudioName = (name: string) => (SUPPORTED_EXT as readonly string[]).includes(ext(name));

export function canPlayFormat(format: string) {
  if (typeof document === "undefined") return true;
  const a = document.createElement("audio");
  return a.canPlayType(MIME[format] ?? "") !== "";
}

async function artworkToDataUrl(data: Uint8Array, format: string): Promise<string | undefined> {
  try {
    const blob = new Blob([data as BlobPart], { type: format });
    const bmp = await createImageBitmap(blob);
    const size = 320;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const s = Math.min(bmp.width, bmp.height);
    c.getContext("2d")!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
    return c.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

async function readTags(file: File) {
  try {
    const { parseBlob } = await import("music-metadata");
    const m = await parseBlob(file, { duration: true, skipCovers: false });
    const pic = m.common.picture?.[0];
    return {
      title: m.common.title,
      artist: m.common.artist ?? m.common.albumArtist,
      album: m.common.album,
      genre: m.common.genres?.[0],
      duration: m.format.duration ?? 0,
      artwork: pic ? await artworkToDataUrl(pic.data, pic.format) : undefined,
    };
  } catch {
    return { duration: 0 } as { title?: string; artist?: string; album?: string; genre?: string; duration: number; artwork?: string };
  }
}

const fingerprint = (f: File, path?: string) => `${path ?? f.name}|${f.size}|${f.lastModified}`;

async function hashId(s: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf).slice(0, 10), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function toTrack(file: File, meta: Omit<LocalMeta, "fileName" | "size" | "lastModified" | "format" | "canPlayHere" | "addedAt">): Promise<LocalTrack> {
  const id = `loc:${await hashId(fingerprint(file, meta.path))}`;
  const tags = await readTags(file);
  const format = ext(file.name);
  const canPlayHere = canPlayFormat(format);
  return {
    id,
    source: meta.origin === "folder" ? "local" : "imported",
    provider: "device",
    title: tags.title || file.name.replace(/\.[^.]+$/, ""),
    artist: tags.artist || "Artis tidak diketahui",
    album: tags.album,
    genre: tags.genre,
    artwork: tags.artwork,
    duration: Math.round(tags.duration || 0),
    playable: canPlayHere,
    local: { ...meta, fileName: file.name, size: file.size, lastModified: file.lastModified, format, canPlayHere, addedAt: Date.now() },
  };
}

/** Import picked files: copies them into on-device storage (IndexedDB). Never uploaded. */
export async function importFiles(list: FileList | File[], onProgress?: (done: number, total: number) => void) {
  const arr = Array.from(list).filter((f) => isAudioName(f.name));
  const out: LocalTrack[] = [];
  for (let i = 0; i < arr.length; i++) {
    const f = arr[i];
    const t = await toTrack(f, { origin: "imported" });
    if (files) await set(t.id, f, files);
    out.push(t);
    onProgress?.(i + 1, arr.length);
  }
  return out;
}

export const folderScanSupported = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

type DirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterable<FileSystemHandle>;
  queryPermission(o: { mode: "read" }): Promise<PermissionState>;
  requestPermission(o: { mode: "read" }): Promise<PermissionState>;
};

async function walk(dir: DirHandle, prefix = "", acc: { file: File; path: string }[] = []) {
  for await (const h of dir.values()) {
    if (h.kind === "directory") await walk(h as DirHandle, `${prefix}${h.name}/`, acc);
    else if (isAudioName(h.name)) acc.push({ file: await (h as FileSystemFileHandle).getFile(), path: `${prefix}${h.name}` });
  }
  return acc;
}

async function ensurePermission(dir: DirHandle) {
  if ((await dir.queryPermission({ mode: "read" })) === "granted") return true;
  return (await dir.requestPermission({ mode: "read" })) === "granted";
}

/** Ask the user to pick a music folder, remember it, and scan it. */
export async function addFolder(onProgress?: (done: number, total: number) => void) {
  const dir = (await (window as unknown as { showDirectoryPicker: (o?: object) => Promise<DirHandle> }).showDirectoryPicker({
    id: "auralyqo-music",
    mode: "read",
    startIn: "music",
  })) as DirHandle;
  const folderId = await hashId(`${dir.name}|${Date.now()}`);
  if (handles) await set(folderId, dir, handles);
  const tracks = await scanFolder(folderId, dir, onProgress);
  return { folderId, name: dir.name, tracks };
}

async function scanFolder(folderId: string, dir: DirHandle, onProgress?: (d: number, t: number) => void) {
  const found = await walk(dir);
  const out: LocalTrack[] = [];
  for (let i = 0; i < found.length; i++) {
    out.push(await toTrack(found[i].file, { origin: "folder", path: found[i].path, folderId }));
    onProgress?.(i + 1, found.length);
  }
  return out;
}

/** Re-walk every remembered folder. Returns the fresh list per folder (caller merges, keeping user edits). */
export async function rescanFolders(onProgress?: (d: number, t: number) => void) {
  if (!handles) return [];
  const result: { folderId: string; name: string; tracks: LocalTrack[]; denied?: boolean }[] = [];
  for (const k of await keys(handles)) {
    const dir = (await get(k, handles)) as DirHandle | undefined;
    if (!dir) continue;
    if (!(await ensurePermission(dir).catch(() => false))) {
      result.push({ folderId: String(k), name: dir.name, tracks: [], denied: true });
      continue;
    }
    result.push({ folderId: String(k), name: dir.name, tracks: await scanFolder(String(k), dir, onProgress) });
  }
  return result;
}

export async function forgetFolder(folderId: string) {
  if (handles) await del(folderId, handles);
}

export async function listFolders() {
  if (!handles) return [];
  const out: { id: string; name: string }[] = [];
  for (const k of await keys(handles)) {
    const d = (await get(k, handles)) as DirHandle | undefined;
    if (d) out.push({ id: String(k), name: d.name });
  }
  return out;
}

const urlCache = new Map<string, string>();

/** Object URL for playback. Folder tracks are read in place; imported ones come from IndexedDB. */
export async function localUrl(t: LocalTrack): Promise<string> {
  const hit = urlCache.get(t.id);
  if (hit) return hit;
  let blob: Blob | undefined;
  if (t.local.origin === "imported") {
    blob = files ? ((await get(t.id, files)) as Blob | undefined) : undefined;
  } else if (t.local.folderId && handles) {
    const dir = (await get(t.local.folderId, handles)) as DirHandle | undefined;
    if (dir && (await ensurePermission(dir))) {
      let h: FileSystemDirectoryHandle = dir;
      const parts = (t.local.path ?? t.local.fileName).split("/");
      for (const p of parts.slice(0, -1)) h = await h.getDirectoryHandle(p);
      blob = await (await h.getFileHandle(parts[parts.length - 1])).getFile();
    }
  }
  if (!blob) throw new Error("Fail tidak dijumpai. Mungkin telah dialih atau dipadam dari peranti.");
  const url = URL.createObjectURL(blob);
  urlCache.set(t.id, url);
  return url;
}

/** Remove from AURALYQO only. The original file on the device is never touched. */
export async function removeFromLibrary(t: LocalTrack) {
  const u = urlCache.get(t.id);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(t.id);
  if (t.local.origin === "imported" && files) await del(t.id, files);
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { used: e.usage ?? 0, quota: e.quota ?? 0 };
}

"use client";
/**
 * Default content (YouTube only), built ahead of time into /content/home.json by scripts/build-content.mjs,
 * so opening the app costs visitors no API quota. Sections: nasyid, zikir, jiwang, 80s/90s rock, AI covers, English hits.
 */
import type { Album, Artist, Track } from "./types";

export type Category = "nasyid" | "zikir" | "jiwang" | "rock" | "ai" | "english";

export interface HomeContent {
  built: number;
  tracks: Record<Category, Track[]>;
  albums: { malay: Album[]; english: Album[] };
  artists: { malay: Artist[]; english: Artist[] };
  /** normalised artist name → "ytc:<channel id>" */
  channels: Record<string, string>;
}

let promise: Promise<HomeContent> | null = null;

export function loadContent(): Promise<HomeContent> {
  promise ??= fetch("/content/home.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<HomeContent>;
    })
    .then((c) => {
      const tracks = { nasyid: [], zikir: [], jiwang: [], rock: [], ai: [], english: [] } as HomeContent["tracks"];
      return {
        ...c,
        tracks: Object.assign(tracks, c.tracks),
        albums: Object.assign({ malay: [], english: [] }, c.albums),
        artists: Object.assign({ malay: [], english: [] }, c.artists),
        channels: c.channels ?? {},
      };
    })
    .catch((e) => {
      promise = null;
      throw e;
    });
  return promise;
}

export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*-\s*topic$/, "")
    .replace(/[^a-z0-9]+/g, "");

export const CATEGORY_LABEL: Record<Category, string> = {
  nasyid: "Nasyid",
  zikir: "Zikir & Selawat",
  jiwang: "Jiwang",
  rock: "Rock 80an & 90an",
  ai: "AI Cover",
  english: "English Hits",
};

/** Tiles for Explore / Genres: each opens a search. */
export const MOODS: { name: string; q: string }[] = [
  { name: "Nasyid", q: "nasyid" },
  { name: "Zikir & Selawat", q: "zikir selawat" },
  { name: "Jiwang", q: "lagu jiwang" },
  { name: "Rock Kapak", q: "rock kapak 90an" },
  { name: "Slow Rock", q: "slow rock malaysia" },
  { name: "AI Cover", q: "ai cover melayu" },
  { name: "Pop Melayu", q: "lagu pop melayu terkini" },
  { name: "English Hits", q: "top hits official music video" },
  { name: "Acoustic", q: "acoustic cover" },
  { name: "Qasidah", q: "qasidah" },
  { name: "Raya", q: "lagu raya" },
  { name: "Tenang", q: "lagu tenang relax" },
];

export function shuffle<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

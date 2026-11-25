"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import type { LocalTrack } from "@/lib/local-music";
import type { Album, Track, UserPlaylist } from "@/lib/types";

const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 16);
const now = () => Date.now();

/** Strip device-only fields before a track goes into a synced structure. */
export const syncSafe = (t: Track): Track => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { local, ...rest } = t as LocalTrack;
  return rest;
};

export interface LibraryState {
  favourites: Track[];
  playlists: UserPlaylist[];
  recent: Track[];
  searchHistory: string[];
  savedAlbums: Album[];
  /** device-only, never synced to the cloud */
  localTracks: LocalTrack[];
  artistPlays: Record<string, { name: string; count: number }>;
  resume: { track: Track; position: number; at: number } | null;
  /** how far each partly-heard song got (seconds), so every list can show it and resume from there */
  progress: Record<string, { pos: number; dur: number; at: number; track?: Track }>;
  clearProgress: (id: string) => void;
  updatedAt: Record<string, number>;
  hydrated: boolean;

  isFav: (id: string) => boolean;
  toggleFav: (t: Track) => void;
  addRecent: (t: Track) => void;
  clearRecent: () => void;
  setResume: (t: Track, position: number, duration?: number) => void;
  addSearch: (q: string) => void;
  removeSearch: (q: string) => void;
  clearSearch: () => void;
  toggleSavedAlbum: (a: Album) => void;

  createPlaylist: (p?: Partial<UserPlaylist>) => string;
  updatePlaylist: (id: string, patch: Partial<UserPlaylist>) => void;
  deletePlaylist: (id: string) => void;
  duplicatePlaylist: (id: string) => string | null;
  addToPlaylist: (id: string, tracks: Track[]) => number;
  removeFromPlaylist: (id: string, index: number) => void;
  movePlaylistTrack: (id: string, from: number, to: number) => void;

  upsertLocal: (tracks: LocalTrack[], replaceFolderId?: string) => void;
  editLocal: (id: string, patch: Partial<Pick<Track, "title" | "artist" | "album" | "genre" | "artwork">>) => void;
  removeLocal: (ids: string[]) => void;
  replace: (s: Partial<LibraryState>) => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => {
      const touch = (...k: string[]) => ({ updatedAt: { ...get().updatedAt, ...Object.fromEntries(k.map((x) => [x, now()])) } });
      return {
        favourites: [],
        playlists: [],
        recent: [],
        searchHistory: [],
        savedAlbums: [],
        localTracks: [],
        artistPlays: {},
        resume: null,
        progress: {},
        updatedAt: {},
        hydrated: false,

        isFav: (id) => get().favourites.some((t) => t.id === id),
        toggleFav: (t) =>
          set((s) => ({
            favourites: s.favourites.some((x) => x.id === t.id) ? s.favourites.filter((x) => x.id !== t.id) : [syncSafe(t), ...s.favourites],
            ...touch("favourites"),
          })),
        addRecent: (t) =>
          set((s) => {
            const plays = { ...s.artistPlays };
            if (t.artistId) plays[t.artistId] = { name: t.artist, count: (plays[t.artistId]?.count ?? 0) + 1 };
            return { recent: [syncSafe(t), ...s.recent.filter((x) => x.id !== t.id)].slice(0, 50), artistPlays: plays, ...touch("recent", "artistPlays") };
          }),
        clearRecent: () => set({ recent: [], resume: null, ...touch("recent") }),
        setResume: (t, position, duration = 0) =>
          set((s) => {
            const progress = { ...s.progress, [t.id]: { pos: Math.round(position), dur: Math.round(duration || t.duration || 0), at: now(), track: syncSafe(t) } };
            // keep the 120 most recent, and drop anything not resumed for a week
            const week = now() - 7 * 86_400_000;
            const keep = Object.entries(progress).filter(([, v]) => v.at > week).sort((a, b) => b[1].at - a[1].at).slice(0, 120);
            return { resume: { track: syncSafe(t), position, at: now() }, progress: Object.fromEntries(keep), ...touch("resume", "progress") };
          }),
        clearProgress: (id) =>
          set((s) => {
            if (!s.progress[id]) return {};
            const progress = { ...s.progress };
            delete progress[id];
            return { progress, ...touch("progress") };
          }),
        addSearch: (q) =>
          set((s) => ({ searchHistory: [q, ...s.searchHistory.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 15), ...touch("searchHistory") })),
        removeSearch: (q) => set((s) => ({ searchHistory: s.searchHistory.filter((x) => x !== q), ...touch("searchHistory") })),
        clearSearch: () => set({ searchHistory: [], ...touch("searchHistory") }),
        toggleSavedAlbum: (a) =>
          set((s) => ({
            savedAlbums: s.savedAlbums.some((x) => x.id === a.id) ? s.savedAlbums.filter((x) => x.id !== a.id) : [{ ...a, tracks: undefined }, ...s.savedAlbums],
            ...touch("savedAlbums"),
          })),

        createPlaylist: (p = {}) => {
          const id = uid();
          const pl: UserPlaylist = {
            id,
            name: p.name?.trim() || `Playlist saya #${get().playlists.length + 1}`,
            description: p.description ?? "",
            cover: p.cover,
            isPublic: p.isPublic ?? false,
            tracks: (p.tracks ?? []).map(syncSafe),
            createdAt: now(),
            updatedAt: now(),
          };
          set((s) => ({ playlists: [pl, ...s.playlists], ...touch("playlists") }));
          return id;
        },
        updatePlaylist: (id, patch) =>
          set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)), ...touch("playlists") })),
        deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id), ...touch("playlists") })),
        duplicatePlaylist: (id) => {
          const src = get().playlists.find((p) => p.id === id);
          if (!src) return null;
          return get().createPlaylist({ ...src, name: `${src.name} (salinan)` });
        },
        addToPlaylist: (id, tracks) => {
          const p = get().playlists.find((x) => x.id === id);
          if (!p) return 0;
          const have = new Set(p.tracks.map((t) => t.id));
          const add = tracks.filter((t) => !have.has(t.id)).map(syncSafe);
          get().updatePlaylist(id, { tracks: [...p.tracks, ...add] });
          return add.length;
        },
        removeFromPlaylist: (id, index) => {
          const p = get().playlists.find((x) => x.id === id);
          if (p) get().updatePlaylist(id, { tracks: p.tracks.filter((_, i) => i !== index) });
        },
        movePlaylistTrack: (id, from, to) => {
          const p = get().playlists.find((x) => x.id === id);
          if (!p) return;
          const arr = [...p.tracks];
          const [x] = arr.splice(from, 1);
          arr.splice(to, 0, x);
          get().updatePlaylist(id, { tracks: arr });
        },

        upsertLocal: (tracks, replaceFolderId) =>
          set((s) => {
            const prev = new Map(s.localTracks.map((t) => [t.id, t]));
            let base = s.localTracks;
            if (replaceFolderId) {
              const fresh = new Set(tracks.map((t) => t.id));
              base = base.filter((t) => t.local.folderId !== replaceFolderId || fresh.has(t.id));
            }
            const map = new Map(base.map((t) => [t.id, t]));
            for (const t of tracks) {
              const old = prev.get(t.id);
              // keep user's metadata edits and original "added" date on rescan
              map.set(t.id, old ? { ...t, title: old.title, artist: old.artist, album: old.album, genre: old.genre, artwork: old.artwork ?? t.artwork, local: { ...t.local, addedAt: old.local.addedAt } } : t);
            }
            return { localTracks: [...map.values()].sort((a, b) => b.local.addedAt - a.local.addedAt) };
          }),
        editLocal: (id, patch) => set((s) => ({ localTracks: s.localTracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        removeLocal: (ids) => set((s) => ({ localTracks: s.localTracks.filter((t) => !ids.includes(t.id)) })),
        replace: (s) => set(s),
      };
    },
    {
      name: "lunara-library",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ hydrated, ...rest }) => (void hydrated, rest),
      onRehydrateStorage: () => () => useLibrary.setState({ hydrated: true }),
    },
  ),
);

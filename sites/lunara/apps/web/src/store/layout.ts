"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Everything about the layout is data, not a fixed template.
 * Users edit it in Layout Studio (/studio) or directly on Home with "Edit layout".
 */
export type LayoutPreset = "sidebar" | "bento" | "cinematic" | "compact";
export type SectionKind = "row" | "grid" | "list" | "hero" | "circles";

export type SectionId =
  | "greeting"
  | "continue"
  | "recent"
  | "madeForYou"
  | "dailyMix"
  | "trending"
  | "topHits"
  | "newReleases"
  | "artists"
  | "albums"
  | "favourites"
  | "recentlyAdded"
  | "playlists"
  | "genres";

export interface SectionConfig {
  id: SectionId;
  visible: boolean;
  kind: SectionKind;
  title?: string; // custom title override
}

export const SECTION_LABEL: Record<SectionId, string> = {
  greeting: "Ucapan & sorotan",
  continue: "Sambung Mendengar",
  recent: "Baru Dimainkan",
  madeForYou: "Dibuat Untuk Anda",
  dailyMix: "Daily Mix",
  trending: "Trending Seluruh Dunia",
  topHits: "Top Global Hits",
  newReleases: "Keluaran Baharu",
  artists: "Artis Popular",
  albums: "Album Disyorkan",
  favourites: "Lagu Kegemaran Anda",
  recentlyAdded: "Muzik Baru Ditambah",
  playlists: "Playlist Anda",
  genres: "Terokai Genre",
};

export const SECTION_KINDS: Record<SectionId, SectionKind[]> = {
  greeting: ["hero"],
  continue: ["row", "list"],
  recent: ["row", "grid", "list"],
  madeForYou: ["row", "grid"],
  dailyMix: ["row", "grid"],
  trending: ["list", "row", "grid"],
  topHits: ["row", "list", "grid"],
  newReleases: ["row", "grid"],
  artists: ["circles", "row"],
  albums: ["row", "grid"],
  favourites: ["list", "row"],
  recentlyAdded: ["list", "row"],
  playlists: ["row", "grid"],
  genres: ["grid", "row"],
};

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "greeting", visible: true, kind: "hero" },
  { id: "continue", visible: true, kind: "row" },
  { id: "recent", visible: true, kind: "row" },
  { id: "madeForYou", visible: true, kind: "row" },
  { id: "trending", visible: true, kind: "list" },
  { id: "newReleases", visible: true, kind: "row" },
  { id: "artists", visible: true, kind: "circles" },
  { id: "dailyMix", visible: true, kind: "row" },
  { id: "topHits", visible: true, kind: "row" },
  { id: "albums", visible: true, kind: "row" },
  { id: "favourites", visible: true, kind: "list" },
  { id: "recentlyAdded", visible: true, kind: "list" },
  { id: "playlists", visible: true, kind: "row" },
  { id: "genres", visible: false, kind: "grid" },
];

export const ACCENTS = {
  aurora: { name: "Lunara (logo)", from: "#38bdf8", via: "#7c3aed", to: "#d946ef" },
  violet: { name: "Electric Violet", from: "#c026d3", via: "#7c3aed", to: "#4f46e5" },
  ocean: { name: "Deep Ocean", from: "#3b82f6", via: "#2563eb", to: "#06b6d4" },
  sunset: { name: "Sunset", from: "#f43f5e", via: "#f97316", to: "#facc15" },
  mint: { name: "Mint", from: "#10b981", via: "#14b8a6", to: "#22d3ee" },
} as const;
export type AccentId = keyof typeof ACCENTS;

export interface LayoutState {
  preset: LayoutPreset;
  sections: SectionConfig[];
  cardSize: "s" | "m" | "l";
  density: "comfortable" | "compact";
  radius: number; // px
  glass: boolean;
  accent: AccentId;
  sidebarSide: "left" | "right";
  sidebarCollapsed: boolean;
  showRightPanel: boolean; // "Now playing" / library panel like the bento reference
  playerStyle: "bar" | "floating";
  editing: boolean;
  updatedAt: number;
  set: (p: Partial<Omit<LayoutState, "set" | "moveSection" | "updateSection" | "applyPreset" | "reset" | "replace">>) => void;
  moveSection: (from: number, to: number) => void;
  updateSection: (id: SectionId, patch: Partial<SectionConfig>) => void;
  applyPreset: (p: LayoutPreset) => void;
  reset: () => void;
  replace: (s: Partial<LayoutState>) => void;
}

const PRESET_DEFAULTS: Record<LayoutPreset, Partial<LayoutState>> = {
  sidebar: { cardSize: "m", density: "comfortable", showRightPanel: false, playerStyle: "bar", radius: 14, glass: false },
  bento: { cardSize: "m", density: "comfortable", showRightPanel: true, playerStyle: "bar", radius: 22, glass: true },
  cinematic: { cardSize: "l", density: "comfortable", showRightPanel: false, playerStyle: "floating", radius: 18, glass: true },
  compact: { cardSize: "s", density: "compact", showRightPanel: false, playerStyle: "bar", radius: 10, glass: false },
};

const base = {
  preset: "bento" as LayoutPreset,
  sections: DEFAULT_SECTIONS,
  accent: "aurora" as AccentId,
  sidebarSide: "left" as const,
  sidebarCollapsed: false,
  editing: false,
  updatedAt: 0,
  ...(PRESET_DEFAULTS.bento as Required<Pick<LayoutState, "cardSize" | "density" | "showRightPanel" | "playerStyle" | "radius" | "glass">>),
};

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      ...base,
      set: (p) => set({ ...p, updatedAt: Date.now() }),
      moveSection: (from, to) =>
        set((s) => {
          const arr = [...s.sections];
          const [x] = arr.splice(from, 1);
          arr.splice(to, 0, x);
          return { sections: arr, updatedAt: Date.now() };
        }),
      updateSection: (id, patch) =>
        set((s) => ({ sections: s.sections.map((x) => (x.id === id ? { ...x, ...patch } : x)), updatedAt: Date.now() })),
      applyPreset: (p) => set({ preset: p, ...PRESET_DEFAULTS[p], updatedAt: Date.now() }),
      reset: () => set({ ...base, sections: DEFAULT_SECTIONS, updatedAt: Date.now() }),
      replace: (s) => set(s),
    }),
    {
      name: "lunara-layout",
      version: 1,
      skipHydration: true,
      partialize: ({ editing, ...rest }) => (void editing, rest),
      merge: (persisted, current) => {
        const p = persisted as Partial<LayoutState>;
        // keep sections added in future versions
        const ids = new Set(p.sections?.map((s) => s.id));
        const sections = [...(p.sections ?? []), ...DEFAULT_SECTIONS.filter((d) => !ids.has(d.id))];
        return { ...current, ...p, sections };
      },
    },
  ),
);

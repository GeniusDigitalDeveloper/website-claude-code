"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_FADE, type FadeSettings } from "@/lib/audio-engine";

export type ThemePref = "light" | "night" | "system";
export type Quality = "standard" | "high" | "lossless";

export interface SettingsState {
  theme: ThemePref;
  colorTheme: string;
  fade: FadeSettings;
  quality: Quality;
  autoplay: boolean;
  normalize: boolean;
  playbackRate: number;
  language: "ms" | "en";
  languageChosen: boolean;
  notifications: boolean;
  keepHistory: boolean;
  privatePlaylistsByDefault: boolean;
  updatedAt: number;
  set: (patch: Partial<Omit<SettingsState, "set" | "setFade" | "replace">>) => void;
  setFade: (patch: Partial<FadeSettings>) => void;
  replace: (s: Partial<SettingsState>) => void;
}

export const FADE_OPTIONS = [0.5, 1, 2, 3, 5] as const;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      colorTheme: "lunara",
      fade: { ...DEFAULT_FADE },
      quality: "high",
      autoplay: true,
      normalize: false,
      playbackRate: 1,
      language: "en",
      languageChosen: false,
      notifications: true,
      keepHistory: true,
      privatePlaylistsByDefault: true,
      updatedAt: 0,
      set: (patch) => set({ ...patch, updatedAt: Date.now() }),
      setFade: (patch) => set((s) => ({ fade: { ...s.fade, ...patch }, updatedAt: Date.now() })),
      replace: (s) => set(s),
    }),
    {
      name: "lunara-settings",
      version: 3,
      skipHydration: true,
      migrate: (s, v) => {
        const st = s as Omit<Partial<SettingsState>, "theme"> & { theme?: string };
        // v3: English is the default until the user explicitly picks a language
        if (v < 3 && !(st as { languageChosen?: boolean }).languageChosen) (st as { language?: string }).language = "en";
        if (v < 2) {
          if (st.theme === "dark") st.theme = "night";
          st.colorTheme = st.colorTheme ?? "lunara";
        }
        return st as unknown as SettingsState;
      },
    },
  ),
);

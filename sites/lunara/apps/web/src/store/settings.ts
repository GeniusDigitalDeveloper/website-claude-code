"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_FADE, type FadeSettings } from "@/lib/audio-engine";

export type ThemePref = "light" | "dark" | "system";
export type Quality = "standard" | "high" | "lossless";

export interface SettingsState {
  theme: ThemePref;
  fade: FadeSettings;
  quality: Quality;
  autoplay: boolean;
  normalize: boolean;
  playbackRate: number;
  language: "ms" | "en";
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
      theme: "system",
      fade: { ...DEFAULT_FADE },
      quality: "high",
      autoplay: true,
      normalize: false,
      playbackRate: 1,
      language: "ms",
      notifications: true,
      keepHistory: true,
      privatePlaylistsByDefault: true,
      updatedAt: 0,
      set: (patch) => set({ ...patch, updatedAt: Date.now() }),
      setFade: (patch) => set((s) => ({ fade: { ...s.fade, ...patch }, updatedAt: Date.now() })),
      replace: (s) => set(s),
    }),
    { name: "lunara-settings", version: 1, skipHydration: true },
  ),
);

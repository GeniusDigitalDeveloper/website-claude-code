"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

/**
 * Profile image kept on this device:
 *  - `avatar`   : the cropped result shown everywhere
 *  - `original` : the uncropped source, so the user can re-crop / re-zoom later without picking a new file
 * When signed in, both are also stored in Firebase Storage (users/{uid}/avatar/*).
 */
interface LocalProfile {
  name: string;
  avatar?: string;
  original?: string;
  originalFor?: string; // uid (or "device") the original belongs to
  set: (p: Partial<Omit<LocalProfile, "set">>) => void;
}
export const useLocalProfile = create<LocalProfile>()(
  persist((set) => ({ name: "", set: (p) => set(p) }), { name: "auralyqo-local-profile", storage: createJSONStorage(() => idbStorage), skipHydration: true }),
);

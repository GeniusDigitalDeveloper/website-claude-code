import { createStore, del, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

const store = typeof indexedDB !== "undefined" ? createStore("lunara-state", "kv") : undefined;

/** Async IndexedDB storage for large persisted state (library with artwork thumbnails). */
export const idbStorage: StateStorage = {
  getItem: async (k) => (store ? ((await get(k, store)) as string | undefined) ?? null : null),
  setItem: async (k, v) => {
    if (store) await set(k, v, store);
  },
  removeItem: async (k) => {
    if (store) await del(k, store);
  },
};

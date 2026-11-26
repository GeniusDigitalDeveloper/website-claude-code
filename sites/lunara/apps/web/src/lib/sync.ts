"use client";
/**
 * Cross-device sync (Firestore).  users/{uid}/data/{library|settings|layout}
 *
 * - Local stores are the source of truth on each device; works fully offline.
 * - On sign-in we pull, merge, then listen live (onSnapshot) and push changes (debounced).
 * - Conflicts: last-writer-wins per field group using `updatedAt`; playlists merge per playlist
 *   by their own `updatedAt`, so a playlist created offline on one device is never lost.
 * - Local/imported audio files and their device paths are NEVER synced (privacy + storage rules).
 */
import { purgeLegacyLibrary } from "@/store/library";
import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "./firebase";
import { useLibrary, type LibraryState } from "@/store/library";
import { useSettings, type SettingsState } from "@/store/settings";
import { useLayout, type LayoutState } from "@/store/layout";
import type { UserPlaylist } from "./types";

const LIB_KEYS = ["favourites", "playlists", "recent", "searchHistory", "savedAlbums", "artistPlays", "resume", "progress"] as const;
type LibKey = (typeof LIB_KEYS)[number];

const strip = <T,>(o: T) => JSON.parse(JSON.stringify(o)) as T; // drop functions/undefined for Firestore

function mergePlaylists(local: UserPlaylist[], remote: UserPlaylist[], remoteWins: boolean) {
  const map = new Map<string, UserPlaylist>();
  for (const p of remoteWins ? remote : local) map.set(p.id, p);
  for (const p of remoteWins ? local : remote) {
    const have = map.get(p.id);
    if (!have) {
      // exists only on the losing side: keep it if it was created after the winner's last write
      if (!remoteWins) map.set(p.id, p);
      else if (p.createdAt > (useLibrary.getState().updatedAt.playlists ?? 0) - 1) map.set(p.id, p);
    } else if (p.updatedAt > have.updatedAt) map.set(p.id, p);
  }
  return [...map.values()].sort((a, b) => b.createdAt - a.createdAt);
}

let unsubs: Unsubscribe[] = [];
let applyingRemote = false;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
export type SyncStatus = "off" | "syncing" | "synced" | "offline" | "error";
let statusCb: (s: SyncStatus) => void = () => {};
export const onSyncStatus = (cb: (s: SyncStatus) => void) => (statusCb = cb);

export function stopSync() {
  unsubs.forEach((u) => u());
  unsubs = [];
  statusCb("off");
}

export function startSync(uid: string) {
  const d = db();
  if (!d) return;
  stopSync();
  statusCb("syncing");
  const ref = (k: string) => doc(d, "lunara_users", uid, "data", k);

  const push = (k: "library" | "settings" | "layout") => {
    if (applyingRemote) return;
    clearTimeout(timers[k]);
    timers[k] = setTimeout(async () => {
      try {
        statusCb("syncing");
        let payload: Record<string, unknown>;
        if (k === "library") {
          const s = useLibrary.getState();
          payload = Object.fromEntries(LIB_KEYS.map((x) => [x, s[x]]));
          payload.updatedAt = s.updatedAt;
        } else if (k === "settings") {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { set, setFade, replace, ...rest } = useSettings.getState();
          payload = rest;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { set, moveSection, updateSection, applyPreset, reset, replace, editing, ...rest } = useLayout.getState();
          payload = rest;
        }
        await setDoc(ref(k), strip(payload));
        statusCb(navigator.onLine ? "synced" : "offline");
      } catch {
        statusCb("error");
      }
    }, 1200);
  };

  unsubs.push(
    onSnapshot(ref("library"), (snap) => {
      const r = snap.data() as (Partial<LibraryState> & { updatedAt?: Record<string, number> }) | undefined;
      if (!r) return push("library");
      const l = useLibrary.getState();
      const patch: Partial<LibraryState> = {};
      const ts = { ...l.updatedAt };
      let localNewer = false;
      for (const k of LIB_KEYS as readonly LibKey[]) {
        const rt = r.updatedAt?.[k] ?? 0;
        const lt = l.updatedAt[k] ?? 0;
        if (k === "playlists") {
          (patch as Record<string, unknown>).playlists = mergePlaylists(l.playlists, (r.playlists as UserPlaylist[]) ?? [], rt >= lt);
          ts[k] = Math.max(rt, lt);
          if (lt > rt) localNewer = true;
        } else if (rt > lt) {
          (patch as Record<string, unknown>)[k] = r[k];
          ts[k] = rt;
        } else if (lt > rt) localNewer = true;
      }
      applyingRemote = true;
      useLibrary.setState({ ...patch, updatedAt: ts });
      applyingRemote = false;
      purgeLegacyLibrary(); // old Deezer items coming back from the cloud are removed (and the cleanup is synced)
      if (localNewer) push("library");
      statusCb(snap.metadata.fromCache ? "offline" : "synced");
    }, () => statusCb("error")),
    onSnapshot(ref("settings"), (snap) => {
      const r = snap.data() as Partial<SettingsState> | undefined;
      if (!r) return push("settings");
      if ((r.updatedAt ?? 0) > useSettings.getState().updatedAt) {
        applyingRemote = true;
        useSettings.getState().replace(r);
        applyingRemote = false;
      } else if ((r.updatedAt ?? 0) < useSettings.getState().updatedAt) push("settings");
    }),
    onSnapshot(ref("layout"), (snap) => {
      const r = snap.data() as Partial<LayoutState> | undefined;
      if (!r) return push("layout");
      if ((r.updatedAt ?? 0) > useLayout.getState().updatedAt) {
        applyingRemote = true;
        useLayout.getState().replace(r);
        applyingRemote = false;
      } else if ((r.updatedAt ?? 0) < useLayout.getState().updatedAt) push("layout");
    }),
  );

  unsubs.push(
    useLibrary.subscribe((s, p) => {
      if (s.updatedAt !== p.updatedAt) push("library");
    }),
    useSettings.subscribe((s, p) => {
      if (s.updatedAt !== p.updatedAt) push("settings");
    }),
    useLayout.subscribe((s, p) => {
      if (s.updatedAt !== p.updatedAt) push("layout");
    }),
  );
}

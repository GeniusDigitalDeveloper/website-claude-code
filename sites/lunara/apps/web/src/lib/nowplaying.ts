"use client";
/**
 * "Now playing" for live-stream overlays (OBS). While the listener is signed in and has a LUNARA API key,
 * the current song is written to lunara_nowplaying/{apiKey} = { title, artist, isPlaying, updatedAt }.
 * Only when the song or play/pause changes (never on a timer). The live system reads that one document
 * through Firestore's REST address with the key; nothing can list these documents, and only the key's
 * owner can write them (Firestore rules). Free: no server needed.
 */
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

let current: { uid: string; key: string | null } | null = null;
let last = "";

export async function loadApiKey(uid: string): Promise<string | null> {
  if (current?.uid === uid) return current.key;
  const d = db();
  if (!d) return null;
  const snap = await getDoc(doc(d, "lunara_users", uid, "data", "apikey")).catch(() => null);
  const key = (snap?.data()?.key as string | undefined) ?? null;
  current = { uid, key };
  last = "";
  return key;
}

/** Called by Settings → API key when the key is generated, replaced or deleted. */
export function setCachedApiKey(uid: string, key: string | null) {
  current = { uid, key };
  last = "";
}

export function clearApiKeyCache() {
  current = null;
  last = "";
}

/** Remove the now-playing document of a key (before that key is replaced or deleted). */
export async function removeNowPlaying(key: string) {
  const d = db();
  if (d) await deleteDoc(doc(d, "lunara_nowplaying", key)).catch(() => {});
}

export async function publishNowPlaying(t: { title: string; artist: string } | null, isPlaying: boolean) {
  const d = db();
  const key = current?.key;
  if (!d || !key || !t) return;
  const sig = `${key}|${t.title}|${t.artist}|${isPlaying}`;
  if (sig === last) return; // nothing changed: no write
  last = sig;
  await setDoc(doc(d, "lunara_nowplaying", key), { title: t.title.slice(0, 300), artist: t.artist.slice(0, 200), isPlaying, updatedAt: serverTimestamp() }).catch(() => {
    last = ""; // try again on the next change
  });
}

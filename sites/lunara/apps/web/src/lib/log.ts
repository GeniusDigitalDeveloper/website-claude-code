"use client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

let last = 0;
/** Report playback errors for the admin dashboard (signed-in users only, rate-limited, no personal data). */
export function logPlaybackError(trackId: string | undefined, message: string) {
  const d = db();
  const uid = auth()?.currentUser?.uid;
  if (!d || !uid || Date.now() - last < 10_000) return;
  last = Date.now();
  void addDoc(collection(d, "lunara_error_logs"), { uid, trackId: trackId ?? null, message: message.slice(0, 300), ua: navigator.userAgent.slice(0, 160), at: serverTimestamp() }).catch(() => {});
}

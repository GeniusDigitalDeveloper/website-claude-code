"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { effective, type Defaults } from "./types";
/** Langgan config/defaults. Pulangkan tetapan mentah dan tetapan berkesan untuk masjid (Beta dipertimbangkan). */
export function useDefaults(mid: string) {
  const [raw, setRaw] = useState<Defaults>({});
  useEffect(() => onSnapshot(doc(db, "config", "defaults"), (s) => setRaw((s.data() as Defaults) || {}), () => {}), []);
  return { raw, eff: effective(raw, mid) };
}

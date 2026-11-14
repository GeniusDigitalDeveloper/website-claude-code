"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { AzanDoc } from "./types";
export type AzanItem = AzanDoc & { id: string };
export function useAzanLibrary() {
  const [list, setList] = useState<AzanItem[]>([]);
  useEffect(() => onSnapshot(collection(db, "azan"), (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as AzanDoc) })).filter((a) => a.active)), () => {}), []);
  return list;
}

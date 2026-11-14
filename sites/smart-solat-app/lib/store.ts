"use client";
import { useCallback, useEffect, useState } from "react";

export type Announcement = { id: string; text: string; on: boolean };
export type Masjid = {
  id: string; name: string; zone: string; // zone "" = auto-kesan
  azan: boolean; announcements: Announcement[];
  slides: string[]; anim: "kenburns" | "zoomout" | "fade"; secs: number; pin: string;
};
const KEY = "ss_masjids";
export const uid = () => Math.random().toString(36).slice(2, 9);
export const newMasjid = (name = "Masjid Baharu"): Masjid => ({
  id: uid(), name, zone: "", azan: true, announcements: [], slides: [], anim: "kenburns", secs: 10, pin: "",
});
const read = (): Masjid[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (m: Masjid[]) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} };

export function useMasjids() {
  const [list, setList] = useState<Masjid[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let l = read();
    if (!l.length) { l = [{ ...newMasjid("Masjid Contoh"), id: "contoh" }]; write(l); }
    setList(l); setReady(true);
    const f = (e: StorageEvent) => e.key === KEY && setList(read());
    addEventListener("storage", f); return () => removeEventListener("storage", f);
  }, []);
  const save = useCallback((next: Masjid[]) => { setList(next); write(next); }, []);
  return { list, ready, save };
}
export const parseImport = (txt: string): Masjid[] => {
  const v = JSON.parse(txt); const a = Array.isArray(v) ? v : [v];
  return a.filter((x) => x && typeof x.name === "string").map((x) => ({ ...newMasjid(x.name), ...x, id: uid() }));
};

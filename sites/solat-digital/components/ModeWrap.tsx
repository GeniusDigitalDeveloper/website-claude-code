"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
export type Mode = "auto" | "light" | "dark";
const Ctx = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({ mode: "auto", setMode: () => {} });
/** Tema panel: ikut sistem (auto), cerah atau gelap. Disimpan pada peranti ini. */
export default function ModeWrap({ children }: { children: ReactNode }) {
  const [mode, setModeS] = useState<Mode>("auto"); const [dark, setDark] = useState(false);
  useEffect(() => { try { const m = localStorage.getItem("sd_mode") as Mode | null; if (m === "light" || m === "dark" || m === "auto") setModeS(m); } catch {} }, []);
  useEffect(() => { const q = matchMedia("(prefers-color-scheme: dark)"); const f = () => setDark(q.matches); f(); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  const setMode = (m: Mode) => { setModeS(m); try { localStorage.setItem("sd_mode", m); } catch {} };
  const isDark = mode === "dark" || (mode === "auto" && dark);
  return <Ctx.Provider value={{ mode, setMode }}><div className={`${isDark ? "mode-dark" : "theme-light"} min-h-dvh bg-bg text-fg`}>{children}</div></Ctx.Provider>;
}
export const useMode = () => useContext(Ctx);
export function ModeToggle() {
  const { mode, setMode } = useMode(); const next: Mode = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
  const Ic = mode === "auto" ? Laptop : mode === "light" ? Sun : Moon;
  const lb = mode === "auto" ? "Ikut sistem" : mode === "light" ? "Cerah" : "Gelap";
  return <button type="button" className="btn !min-h-10 !px-3" aria-label={`Mod paparan: ${lb}. Tekan untuk tukar`} title={`Mod: ${lb}`} onClick={() => setMode(next)}><Ic size={18} /></button>;
}

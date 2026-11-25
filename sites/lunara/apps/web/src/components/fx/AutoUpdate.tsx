"use client";
import { useEffect } from "react";
import { usePlayer } from "@/store/player";

/**
 * Real-time updates with no "Update" button: every 60 s (and when the window regains focus)
 * the app checks /version.json. When a new deploy is live it reloads itself silently, but only
 * while no music is playing, so listening is never interrupted. Queue, settings and library
 * are persisted, so nothing is lost across the reload.
 */
export function AutoUpdate() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!mine || process.env.NODE_ENV !== "production") return;
    let pending = false;
    const reloadWhenIdle = () => {
      if (!usePlayer.getState().playing) location.reload();
    };
    const check = async () => {
      if (pending) return reloadWhenIdle();
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        const { build } = (await r.json()) as { build?: string };
        if (build && build !== mine) {
          pending = true;
          reloadWhenIdle();
        }
      } catch {
        /* offline: try again later */
      }
    };
    const id = setInterval(check, 60_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const unsub = usePlayer.subscribe((s, p) => {
      if (pending && p.playing && !s.playing) setTimeout(reloadWhenIdle, 2500); // paused/finished: safe moment
    });
    void check();
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      unsub();
    };
  }, []);
  return null;
}

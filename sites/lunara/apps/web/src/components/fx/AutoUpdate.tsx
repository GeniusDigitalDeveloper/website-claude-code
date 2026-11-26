"use client";
import { useEffect } from "react";
import { usePlayer } from "@/store/player";

/**
 * Real-time updates with no "Update" button and no Ctrl+Shift+R. The app checks /version.json every
 * 60 s (and when the window regains focus). When a new version is live it switches to it at a moment
 * that never interrupts listening:
 *  - nothing loaded in the player → right away;
 *  - music playing → when the next song starts (the new version opens on that song and keeps playing);
 *  - the listener paused → after 2 minutes of pause (it stays paused, as they left it).
 * A click, a focus change, a short buffering gap or a song change never causes a reload by itself.
 */
export function AutoUpdate() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!mine || process.env.NODE_ENV !== "production") return;
    let pending = false;
    let pausedSince = 0;

    const reload = () => {
      // keep the "was playing" mark fresh so the next version carries on with the music
      try {
        if (usePlayer.getState().playing) localStorage.setItem("lunara-was-playing", String(Date.now()));
      } catch {
        /* ignore */
      }
      location.reload();
    };
    const idleNow = () => {
      const s = usePlayer.getState();
      if (!s.queue.length) return true;
      if (s.playing || s.buffering) return false;
      return pausedSince > 0 && Date.now() - pausedSince > 120_000;
    };
    const check = async () => {
      if (!pending) {
        try {
          const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
          const { build } = (await r.json()) as { build?: string };
          if (build && build !== mine) pending = true;
        } catch {
          /* offline: try again later */
        }
      }
      if (pending && idleNow()) reload();
    };

    const id = setInterval(check, 60_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const unsub = usePlayer.subscribe((s, p) => {
      if (s.playing) pausedSince = 0;
      else if (p.playing && !s.playing) pausedSince = Date.now();
      // a new song has just started while a new version is waiting: switch now, the song carries on
      const cur = s.queue[s.index]?.id;
      if (pending && s.playing && cur && cur !== p.queue[p.index]?.id) setTimeout(reload, 400);
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

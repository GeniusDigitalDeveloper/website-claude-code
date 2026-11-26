"use client";
import { useEffect } from "react";
import { clearApiKeyCache, loadApiKey, publishNowPlaying } from "@/lib/nowplaying";
import { useAuth } from "@/store/auth";
import { usePlayer } from "@/store/player";

/** Keeps lunara_nowplaying/{apiKey} in step with the player (see lib/nowplaying.ts). Renders nothing. */
export function NowPlayingSync() {
  const uid = useAuth((s) => s.user?.uid);
  useEffect(() => {
    if (!uid) return void clearApiKeyCache();
    let live = true;
    const push = () => {
      const s = usePlayer.getState();
      const t = s.queue[s.index];
      void publishNowPlaying(t ? { title: t.title, artist: t.artist } : null, Boolean(t && s.playing));
    };
    void loadApiKey(uid).then(() => live && push());
    const unsub = usePlayer.subscribe((s, p) => {
      const a = s.queue[s.index]?.id;
      const b = p.queue[p.index]?.id;
      if (a !== b || s.playing !== p.playing) push();
    });
    // closing the tab/app while a song plays: mark it as not playing (best effort)
    const bye = () => {
      const s = usePlayer.getState();
      const t = s.queue[s.index];
      if (t && s.playing) void publishNowPlaying({ title: t.title, artist: t.artist }, false);
    };
    window.addEventListener("pagehide", bye);
    return () => {
      live = false;
      unsub();
      window.removeEventListener("pagehide", bye);
    };
  }, [uid]);
  return null;
}

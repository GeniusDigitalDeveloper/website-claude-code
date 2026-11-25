"use client";
import { usePlayer } from "@/store/player";
import { cx } from "../ui";

/**
 * Hosts the YouTube player used for full-length songs. YouTube's terms require the player to be
 * visible (≥ 200×200 px) while it plays, so it shows as a glass card above the player bar.
 * When nothing plays from YouTube it stays mounted but invisible (the player is created once).
 */
export function YouTubeHost() {
  const t = usePlayer((s) => s.queue[s.index]);
  const full = usePlayer((s) => s.full);
  const show = Boolean(t && full && t.provider === "deezer");
  return (
    <div
      aria-hidden={!show}
      className={cx(
        "fixed z-[45] overflow-hidden rounded-2xl transition-[opacity,scale] duration-500",
        "right-2 bottom-[calc(140px+env(safe-area-inset-bottom))] h-[200px] w-[200px] md:right-5 md:bottom-28 md:h-[200px] md:w-[356px]",
        show ? "panel scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
      )}
    >
      <div className="relative h-full w-full bg-black">
        <div id="yt-player-mount" className="h-full w-full" />
      </div>
    </div>
  );
}

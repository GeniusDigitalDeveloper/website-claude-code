"use client";
import { playRadio } from "@/lib/radio";
import { Heart, Pause, Play } from "lucide-react";
import Link from "next/link";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { useLayout } from "@/store/layout";
import { Artwork, cx, fmt, SourceBadge } from "../ui";
import { TrackMenu } from "./TrackMenu";

export function NowEq({ paused }: { paused?: boolean }) {
  return (
    <span className={cx("eq text-acc", paused && "paused")} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

export function TrackRow({ t, i, list, onRemove, removeLabel, showAlbum = true, numbered = false, dragHandle, radio = false }: { t: Track; i: number; list: Track[]; onRemove?: () => void; removeLabel?: string; showAlbum?: boolean; numbered?: boolean; dragHandle?: React.ReactNode; radio?: boolean }) {
  const isCur = usePlayer((s) => s.queue[s.index]?.id === t.id);
  const playing = usePlayer((s) => s.playing);
  const fav = useLibrary((s) => s.favourites.some((f) => f.id === t.id));
  const compact = useLayout((s) => s.density === "compact");
  const pr = useLibrary((s) => s.progress[t.id]);
  const livePos = usePlayer((s) => (s.queue[s.index]?.id === t.id ? s.position : -1));
  const click = () => {
    if (isCur) usePlayer.getState().toggle();
    else if (radio) void playRadio(t); // search results: same-kind songs follow, not other versions of it
    else void usePlayer.getState().playList(list, i, { shuffle: false });
  };
  return (
    <div
      className={cx("group grid items-center gap-3 rounded-xl px-2 transition-colors hover:bg-card-hover", compact ? "py-1" : "py-1.5", showAlbum ? "grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_auto]" : "grid-cols-[auto_1fr_auto]", isCur && "bg-card", !t.playable && "opacity-60")}
      onDoubleClick={click}
    >
      <div className="flex items-center gap-2">
        {dragHandle}
        {numbered && <span className="hidden w-5 text-right text-xs tabular-nums text-faint sm:block">{i + 1}</span>}
        <button type="button" onClick={click} aria-label={isCur && playing ? `Jeda ${t.title}` : `Main ${t.title}`} className="relative cursor-pointer" disabled={!t.playable}>
          <Artwork src={t.artwork} alt="" className={compact ? "h-9 w-9" : "h-11 w-11"} rounded="rounded-lg" />
          <span className={cx("absolute inset-0 grid place-items-center rounded-lg bg-black/45 text-white transition-opacity", isCur ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")}>
            {isCur && playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </span>
        </button>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isCur && <NowEq paused={!playing} />}
          <span translate="no" className={cx("truncate text-sm font-semibold", isCur && "text-acc")}>{t.title}</span>
          {t.explicit && <span className="rounded bg-card-hover px-1 text-[9px] font-bold text-muted">E</span>}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted">
          {t.artistId ? (
            <Link translate="no" href={`/artist?id=${t.artistId}`} className="truncate hover:text-fg hover:underline">
              {t.artist}
            </Link>
          ) : (
            <span translate="no" className="truncate">{t.artist}</span>
          )}
          <SourceBadge t={t} className="shrink-0" />
        </div>
      </div>
      {showAlbum && (
        <div translate="no" className="hidden min-w-0 text-xs text-muted md:block">
          {t.albumId ? (
            <Link href={`/album?id=${t.albumId}`} className="truncate hover:text-fg hover:underline">
              {t.album}
            </Link>
          ) : (
            <span className="truncate">{t.album ?? ""}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        <button type="button" aria-label={fav ? `Buang ${t.title} dari kegemaran` : `Suka ${t.title}`} aria-pressed={fav} onClick={() => useLibrary.getState().toggleFav(t)} className={cx("hidden h-8 w-8 cursor-pointer place-items-center rounded-full transition hover:bg-card sm:grid", fav ? "text-rose-500" : "text-muted opacity-0 group-hover:opacity-100 focus:opacity-100")}>
          <Heart className={cx("h-4 w-4", fav && "fill-current")} />
        </button>
        {/* where the song got to (resumes from there), not the full length */}
        {livePos >= 0 ? (
          <span className="w-12 text-right text-xs font-semibold tabular-nums text-acc">{fmt(livePos)}</span>
        ) : pr && pr.pos > 5 ? (
          <span className="flex w-12 items-center justify-end gap-0.5 text-xs font-semibold tabular-nums text-acc" title="Sambung dari sini">
            <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
            {fmt(pr.pos)}
          </span>
        ) : (
          <span className="w-12 text-right text-xs tabular-nums text-muted">{fmt(t.duration)}</span>
        )}
        <TrackMenu track={t} onRemove={onRemove} removeLabel={removeLabel} />
      </div>
    </div>
  );
}

export function TrackList({ tracks, onRemove, removeLabel, showAlbum, numbered, limit, radio }: { tracks: Track[]; onRemove?: (i: number) => void; removeLabel?: string; showAlbum?: boolean; numbered?: boolean; limit?: number; radio?: boolean }) {
  const shown = limit ? tracks.slice(0, limit) : tracks;
  return (
    <div className="flex flex-col">
      {shown.map((t, i) => (
        <TrackRow key={`${t.id}-${i}`} t={t} i={i} list={tracks} onRemove={onRemove ? () => onRemove(i) : undefined} removeLabel={removeLabel} showAlbum={showAlbum} numbered={numbered} radio={radio} />
      ))}
    </div>
  );
}

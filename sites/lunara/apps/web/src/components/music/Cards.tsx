"use client";
import { Pause, Play } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Album, Artist, PlaylistSummary, Track } from "@/lib/types";
import { useLayout } from "@/store/layout";
import { usePlayer } from "@/store/player";
import { Artwork, cx, fmt, SourceBadge } from "../ui";
import { useLibrary } from "@/store/library";

export const cardWidth = (s: "s" | "m" | "l") => (s === "s" ? "w-32 md:w-36" : s === "l" ? "w-44 md:w-56" : "w-36 md:w-44");

function PlayFab({ onClick, label, active }: { onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cx(
        "btn-luxe absolute right-2 bottom-2 grid h-11 w-11 cursor-pointer place-items-center rounded-full shadow-xl transition duration-300",
        active
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
      )}
    >
      {active ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
    </button>
  );
}

function Shell({ href, children, grid, onClick, label }: { href?: string; children: React.ReactNode; grid?: boolean; onClick?: () => void; label?: string }) {
  const size = useLayout((s) => s.cardSize);
  const cls = cx("group block shrink-0 snap-start cursor-pointer rounded-[var(--radius)] p-2.5 transition-colors duration-200 hover:bg-card-hover", !grid && cardWidth(size));
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={cx(!grid && "shrink-0")}>
      {href ? (
        <Link href={href} className={cls}>
          {children}
        </Link>
      ) : (
        <div
          className={cls}
          role={onClick ? "button" : undefined}
          tabIndex={onClick ? 0 : undefined}
          aria-label={label}
          onClick={onClick}
          onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
        >
          {children}
        </div>
      )}
    </motion.div>
  );
}

export function TrackCard({ t, list, i, grid }: { t: Track; list: Track[]; i: number; grid?: boolean }) {
  const isCur = usePlayer((s) => s.queue[s.index]?.id === t.id);
  const playing = usePlayer((s) => s.playing);
  const go = () => (isCur ? usePlayer.getState().toggle() : usePlayer.getState().playList(list, i, { shuffle: false }));
  const pr = useLibrary((s) => s.progress[t.id]);
  return (
    <Shell grid={grid} href={t.albumId ? `/album?id=${t.albumId}` : undefined} onClick={t.albumId ? undefined : go} label={isCur && playing ? `Jeda ${t.title}` : `Main ${t.title}`}>
      <div className="relative">
        <Artwork src={t.artwork} alt={`${t.title} oleh ${t.artist}`} className="aspect-square w-full shadow-[var(--shadow)]" />
        {pr && pr.pos > 5 && pr.dur > 0 && <ResumeBar pos={pr.pos} dur={pr.dur} />}
        {t.playable && <PlayFab onClick={go} label={isCur && playing ? `Jeda ${t.title}` : `Main ${t.title}`} active={isCur && playing} />}
      </div>
      <p translate="no" className={cx("mt-2.5 truncate text-sm font-semibold", isCur && "text-acc")}>{t.title}</p>
      <p translate="no" className="mt-0.5 truncate text-xs text-muted">{t.artist}</p>
      <SourceBadge t={t} className="mt-1.5" />
    </Shell>
  );
}

/** Thin bar on a cover showing how far a song was heard, plus the resume time. */
export function ResumeBar({ pos, dur }: { pos: number; dur: number }) {
  return (
    <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur" title="Sambung dari sini">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (pos / dur) * 100)}%` }} />
      </div>
      <span className="tabular-nums">{fmt(pos)}</span>
    </div>
  );
}

export function AlbumCard({ a, grid, onPlay }: { a: Album; grid?: boolean; onPlay?: () => void }) {
  return (
    <Shell grid={grid} href={`/album?id=${a.id}`}>
      <div className="relative">
        <Artwork src={a.cover} alt={`Album ${a.title}`} className="aspect-square w-full shadow-[var(--shadow)]" />
        {onPlay && <PlayFab onClick={onPlay} label={`Main album ${a.title}`} />}
      </div>
      <p translate="no" className="mt-2.5 truncate text-sm font-semibold">{a.title}</p>
      <p className="mt-0.5 truncate text-xs text-muted">
        {a.artist}
        {a.releaseDate ? ` · ${a.releaseDate.slice(0, 4)}` : ""}
      </p>
    </Shell>
  );
}

export function PlaylistCard({ p, href, onPlay, grid }: { p: PlaylistSummary; href: string; onPlay?: () => void; grid?: boolean }) {
  return (
    <Shell grid={grid} href={href}>
      <div className="relative">
        <Artwork src={p.cover} alt={`Playlist ${p.title}`} className="aspect-square w-full shadow-[var(--shadow)]" />
        {onPlay && <PlayFab onClick={onPlay} label={`Main playlist ${p.title}`} />}
      </div>
      <p translate="no" className="mt-2.5 truncate text-sm font-semibold">{p.title}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{p.creator ?? (p.nbTracks ? `${p.nbTracks} lagu` : "Playlist")}</p>
    </Shell>
  );
}

export function ArtistCircle({ a, grid }: { a: Artist; grid?: boolean }) {
  const size = useLayout((s) => s.cardSize);
  return (
    <Link href={`/artist?id=${a.id}`} className={cx("group block shrink-0 snap-start cursor-pointer rounded-[var(--radius)] p-2.5 text-center transition hover:bg-card-hover", !grid && cardWidth(size))}>
      <Artwork src={a.picture} alt={a.name} className="aspect-square w-full shadow-[var(--shadow)] transition-transform duration-300 group-hover:scale-[1.03]" rounded="rounded-full" />
      <p translate="no" className="mt-2.5 truncate text-sm font-semibold">{a.name}</p>
      <p className="mt-0.5 text-xs text-muted">{a.id.startsWith("ytc:") ? "Artis" : a.fans ? `${Intl.NumberFormat("ms", { notation: "compact" }).format(a.fans)} peminat` : "Artis"}</p>
    </Link>
  );
}

export function Collection({ kind, children }: { kind: "row" | "grid"; children: React.ReactNode }) {
  if (kind === "grid") return <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{children}</div>;
  return <>{children}</>;
}

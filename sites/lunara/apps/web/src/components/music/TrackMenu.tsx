"use client";
import { Disc3, Heart, ListEnd, ListPlus, ListStart, MoreHorizontal, Plus, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { cx } from "../ui";

export function TrackMenu({ track, onRemove, removeLabel = "Buang dari senarai ini", className }: { track: Track; onRemove?: () => void; removeLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, up: false });
  const [sub, setSub] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const playlists = useLibrary((s) => s.playlists);
  const fav = useLibrary((s) => s.favourites.some((f) => f.id === track.id));

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setSub(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btn.current!.getBoundingClientRect();
    const up = r.bottom + 340 > window.innerHeight;
    setPos({ x: Math.min(Math.max(8, r.right - 240), window.innerWidth - 248), y: up ? r.top : r.bottom, up });
    setOpen((o) => !o);
  };
  const act = (fn: () => void) => () => {
    fn();
    setOpen(false);
    setSub(false);
  };
  const item = "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-card-hover";

  return (
    <>
      <button ref={btn} type="button" aria-label={`Pilihan lain untuk ${track.title}`} aria-haspopup="menu" aria-expanded={open} onClick={toggle} className={cx("grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-card-hover hover:text-fg", className)}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90]" onClick={() => (setOpen(false), setSub(false))}>
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{ left: pos.x, top: pos.up ? undefined : pos.y + 6, bottom: pos.up ? window.innerHeight - pos.y + 6 : undefined }}
              className="panel panel-strong thin-scroll absolute max-h-[70vh] w-60 overflow-y-auto p-1.5 shadow-2xl"
            >
              {!sub ? (
                <>
                  <button role="menuitem" className={item} onClick={act(() => usePlayer.getState().playNext([track]))}>
                    <ListStart className="h-4 w-4" /> Main seterusnya
                  </button>
                  <button role="menuitem" className={item} onClick={act(() => usePlayer.getState().addToQueue([track]))}>
                    <ListEnd className="h-4 w-4" /> Tambah ke giliran
                  </button>
                  <button role="menuitem" className={item} onClick={() => setSub(true)}>
                    <ListPlus className="h-4 w-4" /> Tambah ke playlist
                  </button>
                  <button role="menuitem" className={item} onClick={act(() => useLibrary.getState().toggleFav(track))}>
                    <Heart className={cx("h-4 w-4", fav && "fill-current text-rose-500")} /> {fav ? "Buang dari kegemaran" : "Suka lagu ini"}
                  </button>
                  {track.albumId && (
                    <Link role="menuitem" href={`/album?id=${track.albumId}`} className={item} onClick={() => setOpen(false)}>
                      <Disc3 className="h-4 w-4" /> Pergi ke album
                    </Link>
                  )}
                  {track.artistId && (
                    <Link role="menuitem" href={`/artist?id=${track.artistId}`} className={item} onClick={() => setOpen(false)}>
                      <User className="h-4 w-4" /> Pergi ke artis
                    </Link>
                  )}
                  {onRemove && (
                    <button role="menuitem" className={cx(item, "text-rose-600 dark:text-rose-400")} onClick={act(onRemove)}>
                      <Trash2 className="h-4 w-4" /> {removeLabel}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    role="menuitem"
                    className={item}
                    onClick={act(() => {
                      const id = useLibrary.getState().createPlaylist({ tracks: [track] });
                      toast(`Playlist baharu dicipta dengan "${track.title}"`);
                      void id;
                    })}
                  >
                    <Plus className="h-4 w-4" /> Playlist baharu
                  </button>
                  <div className="my-1 h-px bg-line" />
                  {playlists.length === 0 && <p className="px-3 py-2 text-xs text-muted">Belum ada playlist.</p>}
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      role="menuitem"
                      className={item}
                      onClick={act(() => {
                        const n = useLibrary.getState().addToPlaylist(p.id, [track]);
                        toast(n ? `Ditambah ke "${p.name}"` : `Sudah ada dalam "${p.name}"`);
                      })}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="ml-auto text-xs text-muted">{p.tracks.length}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

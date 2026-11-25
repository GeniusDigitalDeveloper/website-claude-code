"use client";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { Artwork, cx, fmt } from "../ui";
import { TrackMenu } from "../music/TrackMenu";

/** Bento-style side column: compact now-playing card + "My Library" tabs (inspired by the reference layout). */
export function RightPanel() {
  const t = usePlayer((s) => s.queue[s.index]);
  const playing = usePlayer((s) => s.playing);
  const pos = usePlayer((s) => s.position);
  const dur = usePlayer((s) => s.duration);
  const favs = useLibrary((s) => s.favourites);
  const albums = useLibrary((s) => s.savedAlbums);
  const playlists = useLibrary((s) => s.playlists);
  const [tab, setTab] = useState<"liked" | "albums" | "playlists">("liked");
  const p = usePlayer.getState;
  return (
    <aside aria-label="Panel pustaka" className="sticky top-3 hidden h-[calc(100dvh-24px)] w-[320px] shrink-0 flex-col gap-3 xl:flex">
      <div className="panel relative overflow-hidden p-4">
        {t?.artwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.artwork} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 blur-2xl" />
        )}
        <div className="relative">
          <p className="text-xs font-semibold text-muted">Sedang dimainkan</p>
          {t ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <Artwork src={t.artwork} alt="" className="h-16 w-16" rounded="rounded-xl" />
                <div className="min-w-0">
                  <p translate="no" className="truncate font-display font-bold">{t.title}</p>
                  <p translate="no" className="truncate text-sm text-muted">{t.artist}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] tabular-nums text-muted">
                {fmt(pos)}
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="grad-bg h-full" style={{ width: `${dur ? (pos / dur) * 100 : 0}%` }} />
                </div>
                {fmt(dur)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button aria-label="Sebelumnya" onClick={() => p().prev()} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-card-hover">
                  <SkipBack className="h-4 w-4 fill-current" />
                </button>
                <button aria-label={playing ? "Jeda" : "Main"} onClick={() => p().toggle()} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-fg text-bg">
                  {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                </button>
                <button aria-label="Seterusnya" onClick={() => p().next()} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-card-hover">
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Belum ada lagu. Pilih apa sahaja untuk mula.</p>
          )}
        </div>
      </div>
      <div className="panel flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">Pustaka Saya</h2>
          <Link href="/library" className="text-xs font-semibold text-muted hover:text-fg">
            Lihat semua
          </Link>
        </div>
        <div className="mt-3 flex gap-1.5">
          {(
            [
              ["liked", "Disukai"],
              ["albums", "Album"],
              ["playlists", "Playlist"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cx("cursor-pointer rounded-full px-3 py-1 text-xs font-semibold", tab === k ? "btn-white font-bold" : "chip-glass text-muted")}>
              {l}
            </button>
          ))}
        </div>
        <div className="thin-scroll mt-3 min-h-0 flex-1 overflow-y-auto">
          {tab === "liked" &&
            (favs.length ? (
              favs.slice(0, 30).map((f, i) => (
                <div key={f.id} className="group flex items-center gap-3 rounded-xl p-1.5 hover:bg-card-hover">
                  <button className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" onClick={() => p().playList(favs, i, { shuffle: false })}>
                    <Artwork src={f.artwork} alt="" className="h-10 w-10" rounded="rounded-lg" />
                    <span className="min-w-0">
                      <span translate="no" className="block truncate text-sm font-medium">{f.title}</span>
                      <span translate="no" className="block truncate text-xs text-muted">{f.artist}</span>
                    </span>
                  </button>
                  <TrackMenu track={f} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Tekan ikon hati pada mana-mana lagu.</p>
            ))}
          {tab === "albums" &&
            (albums.length ? (
              albums.map((a) => (
                <Link key={a.id} href={`/album?id=${a.id}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-card-hover">
                  <Artwork src={a.cover} alt="" className="h-10 w-10" rounded="rounded-lg" />
                  <span className="min-w-0">
                    <span translate="no" className="block truncate text-sm font-medium">{a.title}</span>
                    <span translate="no" className="block truncate text-xs text-muted">{a.artist}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">Simpan album dari halaman album.</p>
            ))}
          {tab === "playlists" &&
            (playlists.length ? (
              playlists.map((pl) => (
                <Link key={pl.id} href={`/playlist?id=${pl.id}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-card-hover">
                  <Artwork src={pl.cover ?? pl.tracks[0]?.artwork} alt="" className="h-10 w-10" rounded="rounded-lg" />
                  <span className="min-w-0">
                    <span translate="no" className="block truncate text-sm font-medium">{pl.name}</span>
                    <span className="block truncate text-xs text-muted">{pl.tracks.length} lagu</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">Belum ada playlist.</p>
            ))}
        </div>
      </div>
    </aside>
  );
}

"use client";
import { Clock3, Disc3, HardDrive, Heart, ListMusic, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { AlbumCard, PlaylistCard } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, Empty, Segmented } from "@/components/ui";

type Tab = "playlists" | "albums" | "recent";

export function LibraryView() {
  const sp = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "playlists");
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");
  const playlists = useLibrary((s) => s.playlists);
  const albums = useLibrary((s) => s.savedAlbums);
  const recent = useLibrary((s) => s.recent);
  const favs = useLibrary((s) => s.favourites.length);
  const local = useLibrary((s) => s.localTracks.length);
  const shown = playlists.filter((p) => filter === "all" || (filter === "public" ? p.isPublic : !p.isPublic));

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Pustaka</h1>
        <Btn onClick={() => router.push(`/playlist/${useLibrary.getState().createPlaylist()}`)}>
          <Plus className="h-4 w-4" /> Playlist baharu
        </Btn>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/favourites", icon: Heart, label: "Lagu kegemaran", n: favs },
          { href: "/local", icon: HardDrive, label: "Muzik peranti", n: local },
          { href: "/library?tab=albums", icon: Disc3, label: "Album disimpan", n: albums.length, onClick: () => setTab("albums") },
          { href: "/library?tab=recent", icon: Clock3, label: "Baru dimainkan", n: recent.length, onClick: () => setTab("recent") },
        ].map((x) => (
          <Link key={x.label} href={x.href} onClick={x.onClick} className="group flex items-center gap-3 rounded-[var(--radius)] bg-card p-4 ring-1 ring-line transition hover:bg-card-hover">
            <span className="grad-bg grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white">
              <x.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{x.label}</span>
              <span className="text-xs text-muted">{x.n}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented
          label="Bahagian pustaka"
          value={tab}
          onChange={setTab}
          options={[
            { value: "playlists", label: `Playlist (${playlists.length})` },
            { value: "albums", label: `Album (${albums.length})` },
            { value: "recent", label: "Baru dimainkan" },
          ]}
        />
        {tab === "playlists" && (
          <Segmented
            label="Tapis playlist"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Semua" },
              { value: "public", label: "Awam" },
              { value: "private", label: "Peribadi" },
            ]}
          />
        )}
      </div>
      <div className="mt-5">
        {tab === "playlists" &&
          (shown.length ? (
            <>
              <p className="mb-2 text-xs text-faint">Disusun mengikut terbaru dicipta</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {shown.map((p) => (
                  <PlaylistCard key={p.id} grid p={{ id: p.id, title: p.name, cover: p.cover ?? p.tracks[0]?.artwork, nbTracks: p.tracks.length, creator: `${p.isPublic ? "Awam" : "Peribadi"} · ${p.tracks.length} lagu` }} href={`/playlist/${p.id}`} onPlay={p.tracks.length ? () => usePlayer.getState().playList(p.tracks, 0, { shuffle: false }) : undefined} />
                ))}
              </div>
            </>
          ) : (
            <Empty icon={<ListMusic className="h-6 w-6" />} title="Belum ada playlist">
              Cipta playlist dan tambah lagu dari carian, album atau muzik peranti.
            </Empty>
          ))}
        {tab === "albums" &&
          (albums.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {albums.map((a) => (
                <AlbumCard key={a.id} a={a} grid />
              ))}
            </div>
          ) : (
            <Empty icon={<Disc3 className="h-6 w-6" />} title="Belum ada album disimpan">
              Tekan &quot;Simpan&quot; pada halaman album.
            </Empty>
          ))}
        {tab === "recent" &&
          (recent.length ? (
            <>
              <div className="mb-2 flex justify-end">
                <button onClick={() => useLibrary.getState().clearRecent()} className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
                  Padam sejarah
                </button>
              </div>
              <TrackList tracks={recent} />
            </>
          ) : (
            <Empty icon={<Clock3 className="h-6 w-6" />} title="Tiada sejarah" />
          ))}
      </div>
    </div>
  );
}

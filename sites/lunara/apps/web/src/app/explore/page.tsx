"use client";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import { usePlayer } from "@/store/player";
import { AlbumCard, PlaylistCard } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, HScroll, SectionHead, Skeleton } from "@/components/ui";
import { Play, Shuffle } from "lucide-react";
import Link from "next/link";

export default function Explore() {
  const chart = useAsync("chart", () => catalog.chart());
  const rel = useAsync("releases", () => catalog.newReleases());
  const genres = useAsync("genres", () => catalog.genres(), 3600_000);
  const tracks = chart.data?.tracks ?? [];
  return (
    <div className="space-y-10 px-4 pt-5 md:px-8 md:pt-7">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Teroka</h1>
        <p className="mt-1 text-sm text-muted">Carta dunia, keluaran baharu dan genre, terus dari katalog Deezer.</p>
      </div>
      <section>
        <SectionHead
          title="Trending Seluruh Dunia: Top 20"
          action={
            tracks.length ? (
              <div className="flex gap-2">
                <Btn onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: false })} className="px-4 py-1.5">
                  <Play className="h-3.5 w-3.5 fill-current" /> Main
                </Btn>
                <Btn variant="ghost" onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: true })} className="px-4 py-1.5">
                  <Shuffle className="h-3.5 w-3.5" /> Rawak
                </Btn>
              </div>
            ) : null
          }
        />
        {chart.data ? <TrackList tracks={tracks} numbered /> : <Skeleton className="h-96" />}
      </section>
      <section>
        <SectionHead title="Keluaran Baharu" />
        <HScroll>{rel.data?.map((a) => <AlbumCard key={a.id} a={a} />)}</HScroll>
      </section>
      <section>
        <SectionHead title="Top Global Hits: Playlist" />
        <HScroll>{chart.data?.playlists.map((p) => <PlaylistCard key={p.id} p={p} href={`/playlist?id=dz-${p.id}`} />)}</HScroll>
      </section>
      <section>
        <SectionHead title="Genre" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {genres.data?.map((g, i) => (
            <Link key={g.id} href={`/search?q=${encodeURIComponent(g.name)}`} className="relative block h-24 overflow-hidden rounded-[var(--radius)] p-3">
              <div className="grad-bg absolute inset-0" style={{ filter: `hue-rotate(${i * 27}deg)` }} />
              <span className="relative font-display text-lg font-bold text-white drop-shadow">{g.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

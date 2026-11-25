"use client";
import { Play, Shuffle } from "lucide-react";
import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { albumsFrom, MALAY, mixFrom } from "@/lib/malay";
import { useAsync } from "@/lib/useAsync";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/store/player";
import { AlbumCard } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, HScroll, SectionHead, Skeleton } from "@/components/ui";

function PlayAll({ tracks }: { tracks?: Track[] }) {
  if (!tracks?.length) return null;
  return (
    <div className="flex gap-2">
      <Btn onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: false })} className="px-4 py-1.5">
        <Play className="h-3.5 w-3.5 fill-current" /> Main
      </Btn>
      <Btn variant="ghost" onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: true })} className="px-4 py-1.5">
        <Shuffle className="h-3.5 w-3.5" /> Rawak
      </Btn>
    </div>
  );
}

function Category({ title, sub, cacheKey, ids, per }: { title: string; sub: string; cacheKey: string; ids: string[]; per: number }) {
  const { data } = useAsync(cacheKey, () => mixFrom(ids, per));
  return (
    <section>
      <SectionHead title={title} sub={sub} action={<PlayAll tracks={data} />} />
      {data ? <TrackList tracks={data} numbered limit={12} /> : <Skeleton className="h-72" />}
    </section>
  );
}

export default function Explore() {
  const rock = useAsync("my:rockAlbums", () => albumsFrom(MALAY.rock, 2));
  const genres = useAsync("genres", () => catalog.genres(), 3600_000);
  return (
    <div className="space-y-10 px-4 pt-5 md:px-8 md:pt-7">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Teroka</h1>
        <p className="mt-1 text-sm text-muted">Nasyid, zikir, rock jiwang dan rock kapak Melayu. Gunakan carian di atas untuk lagu dari seluruh dunia.</p>
      </div>
      <Category title="Nasyid Pilihan" sub="Raihan, Hijjaz, Rabbani, Inteam, Saujana dan lagi" cacheKey="my:nasyid-ex" ids={MALAY.nasyid} per={3} />
      <Category title="Zikir & Selawat" sub="Hafiz Hamidun, Inteam, Raihan, Hijjaz" cacheKey="my:zikir" ids={MALAY.zikir} per={5} />
      <Category title="Rock Jiwang & Balada Melayu" sub="Iklim, Slam, Ukays, Exists, Lestari dan lagi" cacheKey="my:jiwang-ex" ids={MALAY.jiwang} per={2} />
      <section>
        <SectionHead title="Album Rock Kapak 80an & 90an" sub="Search, Wings, Lefthanded, XPDC, Awie, BPR, Amuk" />
        <HScroll>{rock.data?.map((a) => <AlbumCard key={a.id} a={a} />)}</HScroll>
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

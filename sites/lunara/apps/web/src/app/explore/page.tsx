"use client";
import { Play, Shuffle } from "lucide-react";
import Link from "next/link";
import { type Category as CategoryId, loadContent, MOODS } from "@/lib/content";
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

function Category({ title, sub, cat }: { title: string; sub: string; cat: CategoryId }) {
  const { data } = useAsync("home", loadContent, 3600_000);
  const tracks = data?.tracks[cat];
  return (
    <section>
      <SectionHead title={title} sub={sub} action={<PlayAll tracks={tracks} />} />
      {tracks ? <TrackList tracks={tracks} numbered limit={12} /> : <Skeleton className="h-72" />}
    </section>
  );
}

export default function Explore() {
  const home = useAsync("home", loadContent, 3600_000);
  return (
    <div className="space-y-10 px-4 pt-5 md:px-8 md:pt-7">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Teroka</h1>
        <p className="mt-1 text-sm text-muted">Nasyid, zikir, jiwang, rock kapak, AI cover dan English hits. Gunakan carian di atas untuk apa sahaja lagu atau video.</p>
      </div>
      <Category title="Nasyid Pilihan" sub="Raihan, Hijjaz, Inteam, UNIC dan lagi" cat="nasyid" />
      <Category title="Zikir & Selawat" sub="Zikir dan selawat merdu" cat="zikir" />
      <Category title="Jiwang" sub="Lagu jiwang 90an hingga terkini" cat="jiwang" />
      <Category title="Rock 80an & 90an" sub="Slow rock dan rock kapak legenda" cat="rock" />
      <Category title="AI Cover" sub="Lagu Melayu versi AI" cat="ai" />
      <Category title="English Hits" sub="Top hits official music video" cat="english" />
      {(home.data?.albums.malay.length ?? 0) > 0 && (
        <section>
          <SectionHead title="Album" />
          <HScroll>{home.data!.albums.malay.map((a) => <AlbumCard key={a.id} a={a} />)}</HScroll>
        </section>
      )}
      <section>
        <SectionHead title="Genre & mood" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MOODS.map((g, i) => (
            <Link key={g.name} href={`/search?q=${encodeURIComponent(g.q)}`} className="relative block h-24 overflow-hidden rounded-[var(--radius)] p-3">
              <div className="grad-bg absolute inset-0" style={{ filter: `hue-rotate(${i * 27}deg)` }} />
              <span className="relative font-display text-lg font-bold text-white drop-shadow">{g.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

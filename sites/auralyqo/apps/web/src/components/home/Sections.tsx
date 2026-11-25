"use client";
import { Clock3, Heart, HardDrive, Play, Shuffle, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import type { Track } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { SECTION_LABEL, type SectionConfig, type SectionId } from "@/store/layout";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { AlbumCard, ArtistCircle, Collection, PlaylistCard, TrackCard } from "../music/Cards";
import { TrackList } from "../music/TrackRow";
import { Artwork, Btn, cx, fmt, HScroll, SectionHead, Skeleton } from "../ui";

const useChart = () => useAsync("chart", () => catalog.chart());

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 15) return "Selamat tengah hari";
  if (h < 19) return "Selamat petang";
  return "Selamat malam";
}

function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="w-36 shrink-0 md:w-44">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-3 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorNote({ msg }: { msg: string }) {
  return <p className="rounded-xl bg-card px-4 py-3 text-sm text-muted">Katalog tidak dapat dicapai sekarang ({msg}). Muzik peranti anda masih boleh dimainkan.</p>;
}

function Tracks({ tracks, kind }: { tracks: Track[]; kind: SectionConfig["kind"] }) {
  if (kind === "list") return <TrackList tracks={tracks} limit={10} numbered showAlbum />;
  const cards = tracks.map((t, i) => <TrackCard key={`${t.id}-${i}`} t={t} list={tracks} i={i} grid={kind === "grid"} />);
  return kind === "grid" ? <Collection kind="grid">{cards.slice(0, 12)}</Collection> : <HScroll>{cards}</HScroll>;
}

/* ---------- individual sections ---------- */

function Greeting() {
  const [hello, setHello] = useState("Selamat datang");
  useEffect(() => setHello(greeting()), []);
  const name = useAuth((s) => s.profile?.displayName?.split(" ")[0]);
  const { data } = useAsync("releases", () => catalog.newReleases());
  const chart = useChart();
  const recent = useLibrary((s) => s.recent);
  const hero = data?.[0];
  const quick = recent.length >= 4 ? recent.slice(0, 6) : (chart.data?.tracks ?? []).slice(0, 6);
  const playHero = async () => {
    if (!hero) return;
    const a = await catalog.album(hero.id);
    if (a.tracks?.length) void usePlayer.getState().playList(a.tracks, 0, { shuffle: false });
  };
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
        {hello}
        {name ? `, ${name}` : ""}
      </motion.h1>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {hero ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative isolate min-h-[220px] overflow-hidden rounded-[var(--radius)] p-6 md:min-h-[260px] md:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.cover} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
            <p className="text-xs font-semibold tracking-wider text-white/80 uppercase">Keluaran pilihan</p>
            <h2 className="mt-2 max-w-md font-display text-3xl leading-tight font-extrabold text-white md:text-4xl">{hero.title}</h2>
            <p className="mt-1 text-sm text-white/80">{hero.artist}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn onClick={playHero}>
                <Play className="h-4 w-4 fill-current" /> Main sekarang
              </Btn>
              <Link href={`/album/${hero.id}`} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
                Lihat album
              </Link>
            </div>
          </motion.div>
        ) : (
          <Skeleton className="min-h-[220px] md:min-h-[260px]" />
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {quick.length
            ? quick.map((t, i) => (
                <button key={t.id} onClick={() => usePlayer.getState().playList(quick, i, { shuffle: false })} className="group flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl bg-card pr-2 text-left ring-1 ring-line transition hover:bg-card-hover">
                  <Artwork src={t.artwork} alt="" className="h-14 w-14" rounded="rounded-none" />
                  <span className="line-clamp-2 min-w-0 text-xs font-semibold md:text-sm">{t.title}</span>
                </button>
              ))
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      </div>
    </div>
  );
}

function Continue({ kind }: { kind: SectionConfig["kind"] }) {
  const resume = useLibrary((s) => s.resume);
  const recent = useLibrary((s) => s.recent);
  if (!resume) return <p className="text-sm text-muted">Lagu yang anda jeda akan muncul di sini supaya anda boleh sambung dari saat yang sama.</p>;
  const t = resume.track;
  const go = async () => {
    const p = usePlayer.getState();
    const at = p.queue.findIndex((q) => q.id === t.id);
    if (at >= 0 && at === p.index) return p.play();
    usePlayer.setState({ queue: [t, ...recent.filter((r) => r.id !== t.id).slice(0, 20)], index: 0 });
    usePlayer.getState().play();
  };
  const pct = t.playableSeconds || t.duration ? (resume.position / (t.playableSeconds || t.duration)) * 100 : 0;
  return (
    <div className={cx("flex gap-3", kind === "list" ? "flex-col" : "")}>
      <button onClick={go} className="group flex w-full max-w-md cursor-pointer items-center gap-4 rounded-[var(--radius)] bg-card p-3 text-left ring-1 ring-line transition hover:bg-card-hover">
        <Artwork src={t.artwork} alt="" className="h-16 w-16" rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t.title}</p>
          <p className="truncate text-xs text-muted">{t.artist}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <div className="grad-bg h-full" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <Clock3 className="h-3 w-3" /> {fmt(resume.position)}
          </div>
        </div>
        <span className="grad-bg grid h-10 w-10 place-items-center rounded-full text-white">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </button>
    </div>
  );
}

function topArtists(limit: number): { id: string; name: string }[] {
  const s = useLibrary.getState();
  const plays = Object.entries(s.artistPlays).sort((a, b) => b[1].count - a[1].count).map(([id, v]) => ({ id, name: v.name }));
  const favs = s.favourites.filter((f) => f.artistId).map((f) => ({ id: f.artistId!, name: f.artist }));
  const seen = new Set<string>();
  return [...plays, ...favs].filter((a) => !seen.has(a.id) && seen.add(a.id)).slice(0, limit);
}

function MadeForYou({ kind }: { kind: SectionConfig["kind"] }) {
  const plays = useLibrary((s) => s.artistPlays);
  const favCount = useLibrary((s) => s.favourites.length);
  const seeds = topArtists(2);
  const key = seeds.length ? `mfy:${seeds.map((s) => s.id).join(",")}` : null;
  const { data, loading, error } = useAsync(key, async () => {
    const lists = await Promise.all(seeds.map((s) => catalog.artistRadio(s.id)));
    const out: Track[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 25; i++)
      for (const l of lists)
        if (l[i] && !seen.has(l[i].id)) {
          seen.add(l[i].id);
          out.push(l[i]);
        }
    return out.filter((t) => t.playable);
  });
  void plays;
  void favCount;
  if (!seeds.length) return <p className="text-sm text-muted">Dengar atau suka beberapa lagu dahulu. Cadangan peribadi dibina daripada artis yang anda dengar (radio artis Deezer), bukan data rekaan.</p>;
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data} kind={kind} />;
}

function DailyMix({ kind }: { kind: SectionConfig["kind"] }) {
  const chart = useChart();
  const mine = topArtists(4);
  const seeds = mine.length >= 2 ? mine : (chart.data?.artists ?? []).slice(0, 4).map((a) => ({ id: a.id, name: a.name, picture: a.picture }));
  const pics = chart.data?.artists ?? [];
  if (!seeds.length) return <RowSkeleton />;
  const play = async (id: string, name: string) => {
    try {
      const tr = (await catalog.artistRadio(id)).filter((t) => t.playable);
      if (tr.length) void usePlayer.getState().playList(tr, 0, { shuffle: false });
      toast(`Daily Mix: ${name} dan artis serupa`);
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const cards = seeds.map((s, i) => (
    <button key={s.id} onClick={() => play(s.id, s.name)} className={cx("group relative shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius)] text-left", kind === "grid" ? "" : "w-40 md:w-52")} aria-label={`Main Daily Mix ${i + 1}: ${s.name}`}>
      <div className="grad-bg aspect-square w-full p-4" style={{ filter: `hue-rotate(${i * 35}deg)` }}>
        <Artwork src={("picture" in s ? (s as { picture?: string }).picture : undefined) ?? pics.find((p) => p.id === s.id)?.picture} alt="" className="h-2/3 w-2/3 shadow-xl" rounded="rounded-full" />
        <p className="absolute bottom-3 left-4 font-display text-lg font-extrabold text-white drop-shadow">Daily Mix {i + 1}</p>
      </div>
      <p className="mt-2 truncate px-1 text-xs text-muted">{s.name} &amp; lagi</p>
    </button>
  ));
  return kind === "grid" ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards}</div> : <HScroll>{cards}</HScroll>;
}

function Trending({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useChart();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data.tracks} kind={kind} />;
}

function TopHits({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useChart();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  const playPl = async (id: string) => {
    const p = await catalog.playlist(id);
    void usePlayer.getState().playList(p.tracks.filter((t) => t.playable), 0, { shuffle: false });
  };
  if (kind === "list") return <Tracks tracks={data.tracks.slice(10)} kind="list" />;
  const cards = data.playlists.map((p) => <PlaylistCard key={p.id} p={p} href={`/playlist/dz-${p.id}`} onPlay={() => playPl(p.id)} grid={kind === "grid"} />);
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

const playAlbum = async (id: string) => {
  const a = await catalog.album(id);
  if (a.tracks?.length) void usePlayer.getState().playList(a.tracks, 0, { shuffle: false });
};

function NewReleases({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useAsync("releases", () => catalog.newReleases());
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  const cards = data.map((a) => <AlbumCard key={a.id} a={a} grid={kind === "grid"} onPlay={() => playAlbum(a.id)} />);
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

function Artists({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useChart();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  if (kind === "row") return <HScroll>{data.artists.map((a) => <ArtistCircle key={a.id} a={a} />)}</HScroll>;
  return <HScroll>{data.artists.map((a) => <ArtistCircle key={a.id} a={a} />)}</HScroll>;
}

function Albums({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useChart();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  const cards = data.albums.map((a) => <AlbumCard key={a.id} a={a} grid={kind === "grid"} onPlay={() => playAlbum(a.id)} />);
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

function Favourites({ kind }: { kind: SectionConfig["kind"] }) {
  const favs = useLibrary((s) => s.favourites);
  if (!favs.length)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Heart className="h-4 w-4" /> Tekan ikon hati pada lagu untuk simpan di sini. Disegerak ke semua peranti bila log masuk.
      </p>
    );
  return <Tracks tracks={favs} kind={kind} />;
}

function Recent({ kind }: { kind: SectionConfig["kind"] }) {
  const recent = useLibrary((s) => s.recent);
  if (!recent.length) return <p className="text-sm text-muted">Lagu yang anda main akan muncul di sini.</p>;
  return <Tracks tracks={recent} kind={kind} />;
}

function RecentlyAdded({ kind }: { kind: SectionConfig["kind"] }) {
  const local = useLibrary((s) => s.localTracks);
  if (!local.length)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] bg-card p-4 ring-1 ring-line">
        <HardDrive className="h-5 w-5 text-acc" />
        <p className="flex-1 text-sm text-muted">Tambah lagu MP3, M4A, FLAC, WAV, OGG atau OPUS dari peranti anda. Fail kekal pada peranti, tidak dimuat naik.</p>
        <Btn href="/local" variant="soft">
          Tambah muzik
        </Btn>
      </div>
    );
  return <Tracks tracks={local} kind={kind} />;
}

function Playlists({ kind }: { kind: SectionConfig["kind"] }) {
  const pls = useLibrary((s) => s.playlists);
  if (!pls.length)
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Sparkles className="h-4 w-4" /> Cipta playlist pertama anda.
        <Btn variant="soft" onClick={() => useLibrary.getState().createPlaylist()}>
          Playlist baharu
        </Btn>
      </div>
    );
  const cards = pls.map((p) => (
    <PlaylistCard key={p.id} grid={kind === "grid"} p={{ id: p.id, title: p.name, cover: p.cover ?? p.tracks[0]?.artwork, nbTracks: p.tracks.length }} href={`/playlist/${p.id}`} onPlay={p.tracks.length ? () => usePlayer.getState().playList(p.tracks, 0, { shuffle: false }) : undefined} />
  ));
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

function Genres({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading } = useAsync("genres", () => catalog.genres(), 3600_000);
  if (loading || !data) return <RowSkeleton />;
  const items = data.map((g, i) => (
    <Link key={g.id} href={`/search?q=${encodeURIComponent(g.name)}`} className={cx("relative block h-24 shrink-0 overflow-hidden rounded-[var(--radius)] p-3", kind === "row" && "w-44")}>
      <div className="grad-bg absolute inset-0" style={{ filter: `hue-rotate(${i * 27}deg)` }} />
      <span className="relative font-display text-lg font-bold text-white drop-shadow">{g.name}</span>
    </Link>
  ));
  return kind === "row" ? <HScroll>{items}</HScroll> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items}</div>;
}

export const SECTION_COMPONENT: Record<SectionId, (p: { kind: SectionConfig["kind"] }) => React.ReactNode> = {
  greeting: () => <Greeting />,
  continue: Continue,
  recent: Recent,
  madeForYou: MadeForYou,
  dailyMix: DailyMix,
  trending: Trending,
  topHits: TopHits,
  newReleases: NewReleases,
  artists: Artists,
  albums: Albums,
  favourites: Favourites,
  recentlyAdded: RecentlyAdded,
  playlists: Playlists,
  genres: Genres,
};

export const SECTION_LINK: Partial<Record<SectionId, string>> = {
  favourites: "/favourites",
  recentlyAdded: "/local",
  playlists: "/library",
  trending: "/explore",
  newReleases: "/explore",
  recent: "/library?tab=recent",
};

export function SectionActions({ id }: { id: SectionId }) {
  const favs = useLibrary((s) => s.favourites);
  if (id !== "favourites" || !favs.length) return null;
  return (
    <>
      <button aria-label="Main semua kegemaran" onClick={() => usePlayer.getState().playList(favs, 0, { shuffle: false })} className="grad-bg grid h-8 w-8 cursor-pointer place-items-center rounded-full text-white">
        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
      </button>
      <button aria-label="Main rawak kegemaran" onClick={() => usePlayer.getState().playList(favs, 0, { shuffle: true })} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-card ring-1 ring-line">
        <Shuffle className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

export { SECTION_LABEL, SectionHead };

"use client";
import { Heart, HardDrive, Pause, Play, Shuffle, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { type Category, loadContent, MOODS, normName, shuffle } from "@/lib/content";
import { kindOf } from "@/lib/radio";
import { useAsync } from "@/lib/useAsync";
import { youtubeChannel, youtubePlaylist } from "@/lib/yt-search";
import type { Track } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { SECTION_LABEL, type SectionConfig, type SectionId } from "@/store/layout";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { AlbumCard, ArtistCircle, Collection, PlaylistCard, TrackCard } from "../music/Cards";
import { TrackList } from "../music/TrackRow";
import { Artwork, Btn, cx, fmt, HScroll, SectionHead, Skeleton } from "../ui";

const useHome = () => useAsync("home", loadContent, 3600_000);

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
  return <p className="rounded-xl bg-card px-4 py-3 text-sm text-muted">Kandungan tidak dapat dimuatkan sekarang ({msg}). Muzik peranti anda masih boleh dimainkan.</p>;
}

function Tracks({ tracks, kind }: { tracks: Track[]; kind: SectionConfig["kind"] }) {
  if (kind === "list") return <TrackList tracks={tracks} limit={10} numbered showAlbum />;
  const cards = tracks.map((t, i) => <TrackCard key={`${t.id}-${i}`} t={t} list={tracks} i={i} grid={kind === "grid"} />);
  return kind === "grid" ? <Collection kind="grid">{cards.slice(0, 12)}</Collection> : <HScroll>{cards}</HScroll>;
}

/* ---------- individual sections ---------- */

/** English / Malay script only (no Cyrillic, Korean, Japanese, Arabic… titles in the banner). */
const LATIN = /^[\u0000-\u024F\u2000-\u206F\s]+$/;

type Hero = { kicker: string; title: string; sub: string; cover?: string; href: string; linkLabel: string; playlistId?: string; tracks?: Track[] };

/**
 * The home banner follows what the listener plays most: the artist with the highest play count leads
 * (it changes by itself as the counts change). A new listener sees an international (English) chart album.
 */
function useHero(): Hero | undefined {
  const plays = useLibrary((s) => s.artistPlays);
  const top = Object.entries(plays).sort((a, b) => b[1].count - a[1].count)[0];
  const topId = top && top[1].count >= 2 ? top[0] : null;
  const [day, setDay] = useState(0);
  useEffect(() => setDay(new Date().getDate()), []);
  const { data } = useAsync(`hero3:${topId ?? "default"}:${day}`, async (): Promise<Hero | undefined> => {
    const home = await loadContent();
    // the listener's most played artist, through their YouTube channel
    const channel = topId?.startsWith("ytc:") ? topId : top ? home.channels[normName(top[1].name)] : undefined;
    if (topId && channel) {
      const c = await youtubeChannel(channel).catch(() => null);
      const songs = (c?.tracks ?? []).filter((t) => LATIN.test(t.title));
      if (c && songs.length)
        return { kicker: "Artis paling kerap anda dengar", title: c.artist.name, sub: `${songs.length} lagu terkini`, cover: songs[day % songs.length]?.artwork ?? c.artist.picture, href: `/artist?id=${channel}`, linkLabel: "Lihat artis", tracks: songs };
    }
    // new listener: an English album of the day
    const en = home.albums.english.filter((x) => LATIN.test(x.title));
    const a = en[day % Math.max(1, en.length)];
    return a ? { kicker: "Album pilihan hari ini", title: a.title, sub: a.artist, cover: a.cover, href: `/album?id=${a.id}`, linkLabel: "Lihat album", playlistId: a.id } : undefined;
  });
  return data;
}

function Greeting() {
  const [hello, setHello] = useState("Selamat datang");
  useEffect(() => setHello(greeting()), []);
  const name = useAuth((s) => s.profile?.displayName?.split(" ")[0]);
  const hero = useHero();
  const home = useHome();
  const recent = useLibrary((s) => s.recent);
  const quick = recent.length >= 4 ? recent.slice(0, 6) : (home.data?.tracks.nasyid ?? []).slice(0, 6);
  const playHero = async () => {
    if (!hero) return;
    const tracks = hero.tracks ?? (hero.playlistId ? (await youtubePlaylist(hero.playlistId)).tracks : []);
    if (tracks.length) void usePlayer.getState().playList(tracks, 0, { shuffle: false });
  };
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
        {hello}
        {name ? <span translate="no">, {name}</span> : ""}
      </motion.h1>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {hero ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative isolate min-h-[220px] overflow-hidden rounded-[var(--radius)] p-6 md:min-h-[260px] md:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.cover} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
            <p className="text-xs font-semibold tracking-wider text-white/80 uppercase">{hero.kicker}</p>
            <h2 translate="no" className="mt-2 line-clamp-2 max-w-md font-display text-3xl leading-tight font-extrabold text-white md:text-4xl">{hero.title}</h2>
            <p translate="no" className="mt-1 text-sm text-white/80">{hero.sub}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Btn onClick={playHero}>
                <Play className="h-4 w-4 fill-current" /> Main sekarang
              </Btn>
              <Link href={hero.href} className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
                {hero.linkLabel}
              </Link>
            </div>
          </motion.div>
        ) : (
          <Skeleton className="min-h-[220px] md:min-h-[260px]" />
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {quick.length
            ? quick.map((t, i) => (
                <button key={t.id} onClick={() => usePlayer.getState().playList(quick, i, { shuffle: false })} className="chip-glass group flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl pr-2 text-left transition hover:bg-card-hover">
                  <Artwork src={t.artwork} alt="" className="h-14 w-14" rounded="rounded-none" />
                  <span translate="no" className="line-clamp-2 min-w-0 text-xs font-semibold md:text-sm">{t.title}</span>
                </button>
              ))
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      </div>
    </div>
  );
}

/**
 * Continue Listening: unfinished songs (up to 4 in view, the rest scroll sideways). Each resumes from where
 * it stopped. A song disappears once finished, or if it is not resumed within a week.
 */
const WEEK = 7 * 86_400_000;
function ContinueCard({ t, pos, dur, list, i }: { t: Track; pos: number; dur: number; list: Track[]; i: number }) {
  const isCur = usePlayer((s) => s.queue[s.index]?.id === t.id);
  const playing = usePlayer((s) => s.playing);
  const live = usePlayer((s) => (s.queue[s.index]?.id === t.id ? s.position : -1));
  const at = live >= 0 ? live : pos;
  const total = dur || t.duration || 0;
  const go = () => (isCur ? usePlayer.getState().toggle() : usePlayer.getState().playList(list, i, { shuffle: false }));
  return (
    <button
      onClick={go}
      className="chip-glass group flex w-[min(320px,82vw)] shrink-0 snap-start cursor-pointer items-center gap-3 rounded-[var(--radius)] p-3 text-left transition hover:bg-card-hover md:w-[calc((100%-48px)/4)] md:min-w-[230px]"
      aria-label={isCur && playing ? `Jeda ${t.title}` : `Main ${t.title}`}
    >
      <Artwork src={t.artwork} alt="" className="h-14 w-14" rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p translate="no" className={cx("truncate text-sm font-semibold", isCur && "text-acc")}>
          {t.title}
        </p>
        <p translate="no" className="truncate text-xs text-muted">
          {t.artist}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-acc">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <div className="grad-bg h-full" style={{ width: `${total ? Math.min(100, (at / total) * 100) : 0}%` }} />
          </div>
          <span className="tabular-nums">{fmt(at)}</span>
        </div>
      </div>
      <span className="btn-luxe grid h-9 w-9 shrink-0 place-items-center rounded-full">{isCur && playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}</span>
    </button>
  );
}

function Continue({ kind }: { kind: SectionConfig["kind"] }) {
  const progress = useLibrary((s) => s.progress);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  const items = Object.values(progress)
    .filter((e) => e.track && e.pos > 5 && now - e.at < WEEK && (!e.dur || e.pos < e.dur - 15))
    .sort((a, b) => b.at - a.at);
  if (!items.length) return <p className="text-sm text-muted">Lagu yang anda jeda akan muncul di sini supaya anda boleh sambung dari saat yang sama.</p>;
  const list = items.map((e) => e.track!) as Track[];
  const cards = items.map((e, i) => <ContinueCard key={e.track!.id} t={e.track!} pos={e.pos} dur={e.dur} list={list} i={i} />);
  return kind === "list" ? <div className="flex flex-col gap-2">{cards}</div> : <HScroll>{cards}</HScroll>;
}

function topArtists(limit: number): { id: string; name: string }[] {
  const s = useLibrary.getState();
  const plays = Object.entries(s.artistPlays).sort((a, b) => b[1].count - a[1].count).map(([id, v]) => ({ id, name: v.name }));
  const favs = s.favourites.filter((f) => f.artistId).map((f) => ({ id: f.artistId!, name: f.artist }));
  const seen = new Set<string>();
  return [...plays, ...favs].filter((a) => a.id.startsWith("ytc:") && !seen.has(a.id) && seen.add(a.id)).slice(0, limit);
}

/** Songs of the same kinds the listener plays (built-in lists) + their top artists' latest songs. */
async function mixFor(seeds: { id: string }[], home: Awaited<ReturnType<typeof loadContent>>) {
  const chans = await Promise.all(seeds.map((x) => youtubeChannel(x.id).then((c) => c.tracks.slice(0, 12)).catch(() => [] as Track[])));
  const kinds = new Set<Category>();
  for (const t of chans.flat()) {
    const k = kindOf(t);
    kinds.add(k === "ai-rock" ? "ai" : k ?? "english");
  }
  const pools = [...chans, ...[...kinds].map((k) => shuffle(home.tracks[k]).slice(0, 12))];
  const out: Track[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < 30 && pools.some((p) => p[i]); i++) for (const p of pools)
      if (p[i] && !seen.has(p[i].id)) {
        seen.add(p[i].id);
        out.push(p[i]);
      }
  return out;
}

function MadeForYou({ kind }: { kind: SectionConfig["kind"] }) {
  useLibrary((s) => s.artistPlays);
  const seeds = topArtists(2);
  const key = seeds.length ? `mfy2:${seeds.map((s) => s.id).join(",")}` : null;
  const { data, loading, error } = useAsync(key, async () => mixFor(seeds, await loadContent()));
  if (!seeds.length) return <StarterMix kind={kind} />;
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data} kind={kind} />;
}

function DailyMix({ kind }: { kind: SectionConfig["kind"] }) {
  const home = useHome();
  const mine = topArtists(4);
  const seeds = mine.length >= 2 ? mine.map((m) => ({ ...m, picture: home.data?.artists.malay.find((a) => a.id === m.id)?.picture })) : (home.data?.artists.malay ?? []).slice(0, 6);
  if (!seeds.length) return <RowSkeleton />;
  const play = async (id: string, name: string) => {
    try {
      const tr = await mixFor([{ id }], await loadContent());
      if (tr.length) void usePlayer.getState().playList(tr, 0, { shuffle: false });
      toast(`Daily Mix: ${name} dan artis serupa`);
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const cards = seeds.map((s, i) => (
    <button key={s.id} onClick={() => play(s.id, s.name)} className={cx("group relative shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius)] text-left", kind === "grid" ? "" : "w-40 md:w-52")} aria-label={`Main Daily Mix ${i + 1}: ${s.name}`}>
      <div className="grad-bg aspect-square w-full p-4" style={{ filter: `hue-rotate(${i * 35}deg)` }}>
        <Artwork src={s.picture} alt="" className="h-2/3 w-2/3 shadow-xl" rounded="rounded-full" />
        <p className="absolute bottom-3 left-4 font-display text-lg font-extrabold text-white drop-shadow">Daily Mix {i + 1}</p>
      </div>
      <p className="mt-2 truncate px-1 text-xs text-muted">{s.name} &amp; lagi</p>
    </button>
  ));
  return kind === "grid" ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards}</div> : <HScroll>{cards}</HScroll>;
}

function Trending({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data.tracks.english} kind={kind} />;
}

function TopHits({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data.tracks.ai} kind={kind} />;
}

const playAlbum = async (id: string) => {
  const a = await youtubePlaylist(id);
  if (a.tracks.length) void usePlayer.getState().playList(a.tracks, 0, { shuffle: false });
};

function AlbumRow({ list, kind }: { list: import("@/lib/types").Album[]; kind: SectionConfig["kind"] }) {
  const cards = list.map((a) => <AlbumCard key={a.id} a={a} grid={kind === "grid"} onPlay={() => playAlbum(a.id)} />);
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

function NewReleases({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <AlbumRow list={data.albums.english} kind={kind} />;
}

function Artists({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  void kind;
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <HScroll>{data.artists.english.map((a) => <ArtistCircle key={a.id} a={a} />)}</HScroll>;
}

function Albums({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <AlbumRow list={[...data.albums.english, ...data.albums.malay]} kind={kind} />;
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
    <PlaylistCard key={p.id} grid={kind === "grid"} p={{ id: p.id, title: p.name, cover: p.cover ?? p.tracks[0]?.artwork, nbTracks: p.tracks.length }} href={`/playlist?id=${p.id}`} onPlay={p.tracks.length ? () => usePlayer.getState().playList(p.tracks, 0, { shuffle: false }) : undefined} />
  ));
  return kind === "grid" ? <Collection kind="grid">{cards}</Collection> : <HScroll>{cards}</HScroll>;
}

function Genres({ kind }: { kind: SectionConfig["kind"] }) {
  const items = MOODS.map((g, i) => (
    <Link key={g.name} href={`/search?q=${encodeURIComponent(g.q)}`} className={cx("relative block h-24 shrink-0 overflow-hidden rounded-[var(--radius)] p-3", kind === "row" && "w-44")}>
      <div className="grad-bg absolute inset-0" style={{ filter: `hue-rotate(${i * 27}deg)` }} />
      <span className="relative font-display text-lg font-bold text-white drop-shadow">{g.name}</span>
    </Link>
  ));
  return kind === "row" ? <HScroll>{items}</HScroll> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items}</div>;
}

/** Before the user has any history: a mix of every kind. Replaced by their own taste as they listen. */
function StarterMix({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useAsync("starter2", async () => {
    const h = await loadContent();
    const pools = (["nasyid", "ai", "jiwang", "rock", "zikir", "english"] as Category[]).map((k) => shuffle(h.tracks[k]).slice(0, 5));
    const out: Track[] = [];
    for (let i = 0; i < 5; i++) for (const p of pools) if (p[i]) out.push(p[i]);
    return out;
  });
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data} kind={kind} />;
}

function CategoryTracks({ cat, kind }: { cat: Category; kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <Tracks tracks={data.tracks[cat]} kind={kind} />;
}

function RockAlbums({ kind }: { kind: SectionConfig["kind"] }) {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <AlbumRow list={data.albums.malay.length ? data.albums.malay : data.albums.english} kind={kind} />;
}

function MalayArtists() {
  const { data, loading, error } = useHome();
  if (error) return <ErrorNote msg={error} />;
  if (loading || !data) return <RowSkeleton />;
  return <HScroll>{data.artists.malay.map((a) => <ArtistCircle key={a.id} a={a} />)}</HScroll>;
}

export const SECTION_COMPONENT: Record<SectionId, (p: { kind: SectionConfig["kind"] }) => React.ReactNode> = {
  greeting: () => <Greeting />,
  nasyid: ({ kind }) => <CategoryTracks cat="nasyid" kind={kind} />,
  zikir: ({ kind }) => <CategoryTracks cat="zikir" kind={kind} />,
  jiwang: ({ kind }) => <CategoryTracks cat="jiwang" kind={kind} />,
  rockAlbums: RockAlbums,
  malayArtists: () => <MalayArtists />,
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
      <button aria-label="Main semua kegemaran" onClick={() => usePlayer.getState().playList(favs, 0, { shuffle: false })} className="btn-luxe grid h-8 w-8 cursor-pointer place-items-center rounded-full">
        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
      </button>
      <button aria-label="Main rawak kegemaran" onClick={() => usePlayer.getState().playList(favs, 0, { shuffle: true })} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-card ring-1 ring-line">
        <Shuffle className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

export { SECTION_LABEL, SectionHead };

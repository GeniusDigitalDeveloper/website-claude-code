"use client";
/**
 * Every song, video, artist, album and playlist in LUNARA comes from YouTube, without API quota:
 *  - search: Piped (open YouTube front-end, free, no key), several instances tried in turn;
 *  - playlists & channel uploads: the official YouTube player lists a playlist's videos (getPlaylist),
 *    and YouTube oEmbed gives each video's title and channel. Both free and unlimited.
 * The YouTube Data API (with its daily quota) is only a last fallback. Results are cached on the device.
 */
import type { Artist, PlaylistSummary, Track } from "./types";

const KEY = process.env.NEXT_PUBLIC_YT_KEY ?? "";
const API = "https://www.googleapis.com/youtube/v3";
const LS = "lunara-yts:";
const TTL = 12 * 3600_000;
const ok = <T,>(p: Promise<T>) => p.then((v) => v, () => null);

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const raw = localStorage.getItem(LS + key);
    if (raw) {
      const v = JSON.parse(raw) as { at: number; d: T };
      if (Date.now() - v.at < TTL) return v.d;
    }
  } catch {
    /* ignore */
  }
  const d = await fn();
  try {
    localStorage.setItem(LS + key, JSON.stringify({ at: Date.now(), d }));
  } catch {
    /* ignore */
  }
  return d;
}

async function api<T>(path: string): Promise<T> {
  if (!KEY) throw new Error("Tiada kunci YouTube.");
  const r = await fetch(`${API}/${path}&key=${KEY}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.code === 403 ? "Had carian hari ini sudah penuh. Cuba lagi esok." : `YouTube ${d.error.code}`);
  return d as T;
}

/** ISO 8601 duration (PT3M25S) to seconds. */
function isoSec(s?: string) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s ?? "");
  return m ? +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) : 0;
}

const decode = (s: string) => {
  if (typeof document === "undefined") return s;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
};

/** Like YouTube: the video's own title, and the channel as the artist. */
function splitTitle(raw: string, channel: string) {
  return { title: decode(raw).replace(/\s+/g, " ").trim(), artist: decode(channel).replace(/\s*-\s*Topic$/i, "").trim() };
}

type Snip = { title: string; channelTitle: string; channelId: string; thumbnails?: Record<string, { url: string }> };
const thumb = (s: Snip) => s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url;

/** Turn video ids into playable tracks (with real durations). */
async function videosToTracks(ids: string[]): Promise<Track[]> {
  if (!ids.length) return [];
  const d = await api<{ items: { id: string; snippet: Snip; contentDetails: { duration: string }; status?: { embeddable?: boolean } }[] }>(
    `videos?part=snippet,contentDetails,status&id=${ids.join(",")}`,
  );
  return d.items
    .filter((v) => v.status?.embeddable !== false)
    .map((v) => {
      const { artist, title } = splitTitle(v.snippet.title, v.snippet.channelTitle);
      return {
        id: `yt:${v.id}`,
        source: "stream" as const,
        provider: "youtube" as const,
        title,
        artist,
        artistId: `ytc:${v.snippet.channelId}`,
        artwork: thumb(v.snippet),
        duration: isoSec(v.contentDetails.duration),
        playable: true,
      };
    }); // every video opens: songs, MVs, shorts, live recordings, long mixes
}

/* ------------------------------------------------------------------ Piped (free search) */

const PIPED = ["https://api.piped.private.coffee", "https://pipedapi.ducks.party", "https://pipedapi.kavin.rocks", "https://pipedapi.r4fo.com", "https://pipedapi.adminforge.de"];
let good = 0;

async function piped<T>(path: string): Promise<T> {
  let last: unknown;
  for (let n = 0; n < PIPED.length; n++) {
    const i = (good + n) % PIPED.length;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(PIPED[i] + path, { signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = (await r.json()) as T & { error?: string };
      if (d && (d as { error?: string }).error) throw new Error(String((d as { error?: string }).error));
      good = i;
      return d;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("Carian tidak tersedia buat masa ini.");
}

/** Piped serves images through its own proxy: use YouTube's image servers directly instead. */
function unproxy(u?: string | null) {
  if (!u) return undefined;
  try {
    const x = new URL(u);
    const host = x.searchParams.get("host");
    if (!host) return u;
    x.searchParams.delete("host");
    const q = x.searchParams.toString();
    return `https://${host}${x.pathname}${q ? `?${q}` : ""}`;
  } catch {
    return u;
  }
}
const vidOf = (url: string) => /[?&]v=([\w-]{11})/.exec(url)?.[1] ?? /\/(?:watch\/|shorts\/)?([\w-]{11})$/.exec(url)?.[1] ?? "";
const chanOf = (url?: string | null) => /\/channel\/(UC[\w-]{22})/.exec(url ?? "")?.[1];
const listOf = (url: string) => /[?&]list=([\w-]+)/.exec(url)?.[1] ?? "";
const vthumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const cleanName = (s: string) => decode(s).replace(/\s*-\s*Topic$/i, "").trim();

type PItem = {
  type: string;
  url: string;
  title?: string;
  name?: string;
  uploaderName?: string;
  uploaderUrl?: string | null;
  duration?: number;
  thumbnail?: string;
  videos?: number;
};

function pipedTrack(i: PItem): Track | null {
  const id = vidOf(i.url);
  if (!id) return null;
  const ch = chanOf(i.uploaderUrl);
  return { id: `yt:${id}`, source: "stream", provider: "youtube", title: decode(i.title ?? "").replace(/\s+/g, " ").trim(), artist: cleanName(i.uploaderName ?? ""), artistId: ch ? `ytc:${ch}` : undefined, artwork: vthumb(id), duration: i.duration && i.duration > 0 ? i.duration : 0, playable: true };
}

async function pipedSearch(q: string) {
  const first = await piped<{ items: PItem[]; nextpage?: string }>(`/search?q=${encodeURIComponent(q)}&filter=all`);
  let items = first.items ?? [];
  if (first.nextpage) {
    const more = await ok(piped<{ items: PItem[] }>(`/nextpage/search?nextpage=${encodeURIComponent(first.nextpage)}&q=${encodeURIComponent(q)}&filter=all`));
    if (more?.items) items = items.concat(more.items);
  }
  const tracks = items.filter((i) => i.type === "stream").map(pipedTrack).filter((t): t is Track => !!t);
  const channels: Artist[] = items
    .filter((i) => i.type === "channel" && chanOf(i.url))
    .map((c) => ({ id: `ytc:${chanOf(c.url)}`, name: cleanName(c.name ?? ""), picture: unproxy(c.thumbnail) }));
  const playlists: PlaylistSummary[] = items
    .filter((i) => i.type === "playlist" && /\/playlist\?list=/.test(i.url)) // skip auto "Mix" radios
    .map((p) => ({ id: `ytp-${listOf(p.url)}`, title: decode(p.name ?? ""), cover: unproxy(p.thumbnail), creator: cleanName(p.uploaderName ?? ""), nbTracks: p.videos && p.videos > 0 ? p.videos : undefined }));
  return { tracks, channels, playlists };
}

/* ------------------------------------------------------- YouTube player + oEmbed (free lists) */

function ensureYT(): Promise<void> {
  return new Promise((res, rej) => {
    const w = window as unknown as { YT?: { Player?: unknown } };
    if (w.YT?.Player) return res();
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const sc = document.createElement("script");
      sc.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(sc);
    }
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (w.YT?.Player) (clearInterval(iv), res());
      else if (Date.now() - t0 > 15000) (clearInterval(iv), rej(new Error("YouTube tidak dapat dimuatkan.")));
    }, 200);
  });
}

let listChain: Promise<unknown> = Promise.resolve();
/** Video ids of a playlist (also a channel's uploads list "UU…"), up to 200, read by a hidden YouTube player. */
function listIds(list: string): Promise<string[]> {
  const run = async () => {
    try {
      const raw = localStorage.getItem(LS + "l:" + list);
      if (raw) {
        const v = JSON.parse(raw) as { at: number; ids: string[] };
        if (Date.now() - v.at < TTL) return v.ids;
      }
    } catch {
      /* ignore */
    }
    await ensureYT();
    const ids = await new Promise<string[]>((resolve, reject) => {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-10000px;top:0;width:200px;height:200px;pointer-events:none";
      const inner = document.createElement("div");
      host.appendChild(inner);
      document.body.appendChild(host);
      const t0 = Date.now();
      let iv = 0;
      const finish = (v: string[] | null, err?: string) => {
        clearInterval(iv);
        try {
          player.destroy();
        } catch {
          /* ignore */
        }
        host.remove();
        if (v) resolve(v);
        else reject(new Error(err ?? "Senarai tidak dapat dibaca."));
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      const player = new YT.Player(inner, {
        width: 200,
        height: 200,
        playerVars: { listType: "playlist", list, autoplay: 0, mute: 1 },
        events: {
          onReady: () => {
            iv = window.setInterval(() => {
              const got = player.getPlaylist?.() as string[] | null;
              if (got?.length) finish(got);
              else if (Date.now() - t0 > 12000) finish(null, "Senarai kosong atau tidak dibenarkan.");
            }, 250);
          },
          onError: (e: { data: number }) => finish(null, `yt:${e.data}`),
        },
      });
    });
    try {
      localStorage.setItem(LS + "l:" + list, JSON.stringify({ at: Date.now(), ids }));
    } catch {
      /* ignore */
    }
    return ids;
  };
  const p = listChain.then(run, run);
  listChain = p.catch(() => null);
  return p;
}

type OE = { title: string; author_name: string; author_url?: string; thumbnail_url?: string };
async function oembed(url: string): Promise<OE | null> {
  const key = LS + "oe:" + url.replace(/^https:\/\/www\.youtube\.com\//, "");
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as OE;
  } catch {
    /* ignore */
  }
  const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`).catch(() => null);
  if (!r?.ok) return null;
  const d = (await r.json()) as OE;
  const small = { title: d.title, author_name: d.author_name, author_url: d.author_url, thumbnail_url: d.thumbnail_url };
  try {
    localStorage.setItem(key, JSON.stringify(small));
  } catch {
    /* ignore */
  }
  return small;
}

/** Titles + channel names for video ids (oEmbed, 8 at a time). Videos that can't be embedded are left out. */
async function idsToTracks(ids: string[], channel?: { id: string; name: string }): Promise<Track[]> {
  const out: (Track | null)[] = new Array(ids.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const k = next++;
      const id = ids[k];
      const d = await oembed(`https://www.youtube.com/watch?v=${id}`);
      if (!d) continue;
      out[k] = { id: `yt:${id}`, source: "stream", provider: "youtube", title: decode(d.title), artist: channel?.name ?? cleanName(d.author_name), artistId: channel?.id, artwork: vthumb(id), duration: 0, playable: true };
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return out.filter((t): t is Track => !!t);
}

/** Songs, artists (channels) and playlists for anything typed: free search first, Data API only as a fallback. */
export async function searchYouTube(q: string): Promise<{ tracks: Track[]; channels: Artist[]; playlists: PlaylistSummary[] }> {
  return cached(`s4:${q.toLowerCase()}`, async () => {
    const r = (await ok(pipedSearch(q))) ?? (KEY ? await ok(apiSearch(q)) : null);
    if (!r) throw new Error("Carian tidak dapat dicapai sekarang. Cuba lagi sebentar.");
    // the channels behind the top songs are artists too (e.g. "Artist - Topic", AI music channels)
    for (const t of r.tracks.slice(0, 8)) if (t.artistId && !r.channels.some((c) => c.id === t.artistId)) r.channels.push({ id: t.artistId, name: t.artist, picture: t.artwork });
    rememberChannels(r.channels);
    return { tracks: r.tracks, channels: r.channels.slice(0, 12), playlists: r.playlists };
  });
}

async function apiSearch(q: string) {
  const r = await api<{ items: { id: { kind: string; videoId?: string; channelId?: string; playlistId?: string }; snippet: Snip }[] }>(
    `search?part=snippet&type=video,channel,playlist&maxResults=40&q=${encodeURIComponent(q)}`,
  );
  const tracks = await videosToTracks(r.items.filter((i) => i.id.videoId).map((i) => i.id.videoId!).slice(0, 30));
  const channels: Artist[] = r.items.filter((i) => i.id.channelId && i.id.kind.endsWith("channel")).map((c) => ({ id: `ytc:${c.id.channelId}`, name: decode(c.snippet.title), picture: thumb(c.snippet) }));
  const playlists: PlaylistSummary[] = r.items.filter((i) => i.id.playlistId).map((p) => ({ id: `ytp-${p.id.playlistId}`, title: decode(p.snippet.title), cover: thumb(p.snippet), creator: decode(p.snippet.channelTitle) }));
  return { tracks, channels, playlists };
}

/** A YouTube playlist (or album): read by the YouTube player + oEmbed, free. */
export async function youtubePlaylist(id: string): Promise<{ title: string; cover?: string; creator?: string; tracks: Track[] }> {
  const pid = id.replace(/^ytp-/, "");
  return cached(`p4:${pid}`, async () => {
    const [meta, ids] = await Promise.all([oembed(`https://www.youtube.com/playlist?list=${pid}`), ok(listIds(pid))]);
    if (ids?.length) {
      const tracks = await idsToTracks(ids.slice(0, 150));
      return { title: decode(meta?.title ?? "Playlist"), cover: meta?.thumbnail_url ?? tracks[0]?.artwork, creator: meta ? cleanName(meta.author_name) : undefined, tracks };
    }
    if (!KEY) throw new Error("Playlist tidak dapat dibuka.");
    const p = await api<{ items: { snippet: Snip }[] }>(`playlists?part=snippet&id=${pid}`);
    const sn = p.items[0]?.snippet;
    if (!sn) throw new Error("Playlist tidak dijumpai.");
    const items = await api<{ items: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=50&playlistId=${pid}`);
    return { title: decode(sn.title), cover: thumb(sn), creator: decode(sn.channelTitle), tracks: await videosToTracks(items.items.map((i) => i.contentDetails.videoId)) };
  });
}

const PAGE = 50;

/** A YouTube channel shown as an artist: details + all its uploads (50 at a time), free. */
export async function youtubeChannel(id: string): Promise<{ artist: Artist; tracks: Track[]; uploads: string; next?: string }> {
  const cid = id.replace(/^ytc:/, "");
  return cached(`c4:${cid}`, async () => {
    const info = await ok(piped<{ name: string; avatarUrl?: string; subscriberCount?: number; relatedStreams?: PItem[] }>(`/channel/${cid}`));
    const uploads = "UU" + cid.slice(2);
    let name = info?.name ? cleanName(info.name) : "";
    const ids = await ok(listIds(uploads));
    let tracks: Track[] = [];
    let next: string | undefined;
    if (ids?.length) {
      if (!name) name = cleanName((await oembed(`https://www.youtube.com/watch?v=${ids[0]}`))?.author_name ?? "");
      tracks = await idsToTracks(ids.slice(0, PAGE), { id, name });
      next = ids.length > PAGE ? String(PAGE) : undefined;
    } else if (info?.relatedStreams?.length) {
      tracks = info.relatedStreams.map(pipedTrack).filter((t): t is Track => !!t);
    } else if (name) {
      // e.g. "Artist - Topic" channels have no public uploads list: find their songs by name
      const r = await ok(pipedSearch(name));
      tracks = (r?.tracks ?? []).filter((t) => t.artistId === id || t.artist.toLowerCase() === name.toLowerCase());
      if (tracks.length < 5) tracks = r?.tracks ?? [];
    } else if (KEY) {
      const c = await api<{ items: { snippet: Snip; statistics?: { subscriberCount?: string } }[] }>(`channels?part=snippet,statistics&id=${cid}`);
      name = decode(c.items[0]?.snippet.title ?? "");
    }
    if (!name && !tracks.length) throw new Error("Artis tidak dijumpai.");
    for (const t of tracks) if (!t.artistId) Object.assign(t, { artistId: id });
    return {
      artist: { id, name: name || tracks[0]?.artist || "Artis", picture: unproxy(info?.avatarUrl) ?? tracks[0]?.artwork, fans: info?.subscriberCount && info.subscriberCount > 0 ? info.subscriberCount : undefined, nbAlbums: ids?.length || undefined },
      tracks,
      uploads,
      next,
    };
  });
}

/** The next 50 of a channel's uploads (or any list); the token is the position in the list. */
export async function uploadsPage(playlistId: string, pageToken?: string): Promise<{ tracks: Track[]; next?: string }> {
  const from = Number(pageToken ?? 0) || 0;
  const ids = await listIds(playlistId);
  const slice = ids.slice(from, from + PAGE);
  const first = await ok(idsToTracks(slice.slice(0, 1)));
  const name = first?.[0]?.artist;
  const tracks = await idsToTracks(slice, name ? { id: `ytc:UC${playlistId.slice(2)}`, name } : undefined);
  return { tracks, next: ids.length > from + PAGE ? String(from + PAGE) : undefined };
}

const normName = (s: string) => s.toLowerCase().replace(/\s*-\s*topic$/, "").replace(/[^a-z0-9]+/g, "");

/** Remember channels seen in search results, so an artist page can find its channel for free. */
export function rememberChannels(list: Artist[]) {
  try {
    for (const a of list) if (a.id.startsWith("ytc:")) localStorage.setItem(LS + "n:" + normName(a.name), a.id);
  } catch {
    /* ignore */
  }
}

/** The YouTube channel of an artist known by name (cached; a search costs 100 units only the first time). */
export async function channelForName(name: string): Promise<string | null> {
  const k = normName(name);
  if (!k) return null;
  try {
    const hit = localStorage.getItem(LS + "n:" + k);
    if (hit) return hit === "-" ? null : hit;
  } catch {
    /* ignore */
  }
  const r = await ok(piped<{ items: PItem[] }>(`/search?q=${encodeURIComponent(name)}&filter=channels`));
  const list = (r?.items ?? []).filter((c) => chanOf(c.url));
  const exact = list.find((c) => normName(c.name ?? "") === k) ?? list.find((c) => normName(c.name ?? "").startsWith(k));
  const id = exact ? `ytc:${chanOf(exact.url)}` : null;
  try {
    localStorage.setItem(LS + "n:" + k, id ?? "-");
  } catch {
    /* ignore */
  }
  return id;
}

/** Search predictions exactly like the YouTube search box (free endpoint, no API quota). JSONP because it has no CORS. */
let sugSeq = 0;
export function suggestYouTube(q: string): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !q.trim()) return resolve([]);
    const cb = `__lunaraSug${++sugSeq}`;
    const s = document.createElement("script");
    const done = (v: string[]) => {
      clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[cb];
      s.remove();
      resolve(v);
    };
    const timer = setTimeout(() => done([]), 4000);
    (window as unknown as Record<string, unknown>)[cb] = (d: [string, [string, ...unknown[]][]]) => done((d?.[1] ?? []).map((x) => String(x[0])).slice(0, 10));
    s.onerror = () => done([]);
    s.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=ms&gl=MY&q=${encodeURIComponent(q)}&callback=${cb}`;
    document.head.appendChild(s);
  });
}

/** A channel's own playlists (1 unit). */
export async function channelPlaylists(id: string): Promise<PlaylistSummary[]> {
  const cid = id.replace(/^ytc:/, "");
  return cached(`cp2:${cid}`, async () => {
    const ch = await ok(piped<{ tabs?: { name: string; data: string }[] }>(`/channel/${cid}`));
    const tab = ch?.tabs?.find((t) => t.name === "playlists");
    if (tab) {
      const t = await ok(piped<{ content?: PItem[] }>(`/channels/tabs?data=${encodeURIComponent(tab.data)}`));
      const items = (t?.content ?? []).filter((p) => p.type === "playlist" && listOf(p.url));
      if (items.length) return items.map((p) => ({ id: `ytp-${listOf(p.url)}`, title: decode(p.name ?? ""), cover: unproxy(p.thumbnail), nbTracks: p.videos && p.videos > 0 ? p.videos : undefined }));
    }
    if (!KEY) return [];
    const r = await api<{ items: { id: string; snippet: Snip; contentDetails?: { itemCount?: number } }[] }>(`playlists?part=snippet,contentDetails&maxResults=25&channelId=${cid}`);
    return r.items
      .filter((p) => (p.contentDetails?.itemCount ?? 1) > 0)
      .map((p) => ({ id: `ytp-${p.id}`, title: decode(p.snippet.title), cover: thumb(p.snippet), nbTracks: p.contentDetails?.itemCount }));
  });
}

"use client";
/**
 * Search YouTube directly (songs + channels), the source of every song, video, artist, album and playlist in LUNARA
 * (AI songs, independent artists, covers, YouTube-only channels) can be found and played in full.
 *
 * Quota: search.list costs 100 units, playlistItems/videos/channels cost 1 each. Results are cached
 * on the device for 12 hours so a repeated search costs nothing.
 */
import type { Artist, PlaylistSummary, Track } from "./types";

const KEY = process.env.NEXT_PUBLIC_YT_KEY ?? "";
const API = "https://www.googleapis.com/youtube/v3";
const LS = "lunara-yts:";
const TTL = 12 * 3600_000;

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

/**
 * One search call (100 units) returns songs, channels and playlists together, so typing an artist,
 * a channel or a playlist name all find something.
 */
export async function searchYouTube(q: string): Promise<{ tracks: Track[]; channels: Artist[]; playlists: PlaylistSummary[] }> {
  if (!KEY) return { tracks: [], channels: [], playlists: [] };
  return cached(`s3:${q.toLowerCase()}`, async () => {
    const r = await api<{ items: { id: { kind: string; videoId?: string; channelId?: string; playlistId?: string }; snippet: Snip }[] }>(
      `search?part=snippet&type=video,channel,playlist&maxResults=40&q=${encodeURIComponent(q)}`,
    );
    const ids = r.items.filter((i) => i.id.videoId).map((i) => i.id.videoId!);
    const tracks = await videosToTracks(ids.slice(0, 30));
    const channels: Artist[] = r.items.filter((i) => i.id.channelId && i.id.kind.endsWith("channel")).map((c) => ({ id: `ytc:${c.id.channelId}`, name: decode(c.snippet.title), picture: thumb(c.snippet) }));
    // the channels behind the top songs are artists too (e.g. "Artist - Topic", AI music channels)
    for (const t of tracks.slice(0, 8)) {
      if (t.artistId && !channels.some((c) => c.id === t.artistId)) channels.push({ id: t.artistId, name: t.artist, picture: t.artwork });
    }
    const playlists: PlaylistSummary[] = r.items
      .filter((i) => i.id.playlistId)
      .map((p) => ({ id: `ytp-${p.id.playlistId}`, title: decode(p.snippet.title), cover: thumb(p.snippet), creator: decode(p.snippet.channelTitle) }));
    rememberChannels(channels);
    return { tracks, channels: channels.slice(0, 12), playlists };
  });
}

/** A YouTube playlist: its songs (1 unit per call). */
export async function youtubePlaylist(id: string): Promise<{ title: string; cover?: string; creator?: string; tracks: Track[] }> {
  const pid = id.replace(/^ytp-/, "");
  return cached(`p3:${pid}`, async () => {
    const p = await api<{ items: { snippet: Snip }[] }>(`playlists?part=snippet&id=${pid}`);
    const sn = p.items[0]?.snippet;
    if (!sn) throw new Error("Playlist tidak dijumpai.");
    const items = await api<{ items: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=50&playlistId=${pid}`);
    const tracks = await videosToTracks(items.items.map((i) => i.contentDetails.videoId));
    return { title: decode(sn.title), cover: thumb(sn), creator: decode(sn.channelTitle), tracks };
  });
}

/** A YouTube channel shown as an artist: its details and uploads, 50 at a time (1 unit per call). */
export async function youtubeChannel(id: string): Promise<{ artist: Artist; tracks: Track[]; uploads: string; next?: string }> {
  const cid = id.replace(/^ytc:/, "");
  return cached(`c3:${cid}`, async () => {
    const c = await api<{ items: { snippet: Snip; statistics?: { subscriberCount?: string; videoCount?: string }; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
      `channels?part=snippet,statistics,contentDetails&id=${cid}`,
    );
    const ch = c.items[0];
    if (!ch) throw new Error("Artis tidak dijumpai.");
    const uploads = ch.contentDetails.relatedPlaylists.uploads;
    const page = await uploadsPage(uploads);
    return {
      artist: { id, name: decode(ch.snippet.title), picture: thumb(ch.snippet), fans: ch.statistics?.subscriberCount ? +ch.statistics.subscriberCount : undefined, nbAlbums: ch.statistics?.videoCount ? +ch.statistics.videoCount : undefined },
      tracks: page.tracks,
      uploads,
      next: page.next,
    };
  });
}

/** One page (50) of a channel's uploads or of any playlist. */
export async function uploadsPage(playlistId: string, pageToken?: string): Promise<{ tracks: Track[]; next?: string }> {
  const r = await api<{ items: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(
    `playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}${pageToken ? `&pageToken=${pageToken}` : ""}`,
  );
  return { tracks: await videosToTracks(r.items.map((i) => i.contentDetails.videoId)), next: r.nextPageToken };
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
  if (!k || !KEY) return null;
  try {
    const hit = localStorage.getItem(LS + "n:" + k);
    if (hit) return hit === "-" ? null : hit;
  } catch {
    /* ignore */
  }
  const r = await api<{ items: { id: { channelId: string }; snippet: Snip }[] }>(`search?part=snippet&type=channel&maxResults=5&q=${encodeURIComponent(name)}`).catch(() => ({ items: [] }));
  const exact = r.items.find((c) => normName(decode(c.snippet.title)) === k) ?? r.items.find((c) => normName(decode(c.snippet.title)).startsWith(k));
  const id = exact ? `ytc:${exact.id.channelId}` : null;
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
  return cached(`cp:${cid}`, async () => {
    const r = await api<{ items: { id: string; snippet: Snip; contentDetails?: { itemCount?: number } }[] }>(`playlists?part=snippet,contentDetails&maxResults=25&channelId=${cid}`);
    return r.items
      .filter((p) => (p.contentDetails?.itemCount ?? 1) > 0)
      .map((p) => ({ id: `ytp-${p.id}`, title: decode(p.snippet.title), cover: thumb(p.snippet), nbTracks: p.contentDetails?.itemCount }));
  });
}

"use client";
/**
 * Search YouTube directly (songs + channels), so music that is not in the Deezer catalogue
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

/** "Artist - Title (Official Video)" → { artist, title } ; falls back to the channel name. */
function splitTitle(raw: string, channel: string) {
  const clean = decode(raw)
    .replace(/\s*[([](official|lyric|lirik|music|audio|video|mv|hd|4k|visualizer)[^)\]]*[)\]]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const ch = decode(channel).replace(/\s*-\s*Topic$/i, "").trim();
  const m = /^(.+?)\s+[-–—|]\s+(.+)$/.exec(clean);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: ch, title: clean };
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
        album: decode(v.snippet.channelTitle).replace(/\s*-\s*Topic$/i, ""),
        artwork: thumb(v.snippet),
        duration: isoSec(v.contentDetails.duration),
        playable: true,
      };
    })
    .filter((t) => t.duration === 0 || (t.duration >= 45 && t.duration <= 20 * 60)); // songs, not shorts or 3-hour mixes
}

/**
 * One search call (100 units) returns songs, channels and playlists together, so typing an artist,
 * a channel or a playlist name all find something.
 */
export async function searchYouTube(q: string): Promise<{ tracks: Track[]; channels: Artist[]; playlists: PlaylistSummary[] }> {
  if (!KEY) return { tracks: [], channels: [], playlists: [] };
  return cached(`s2:${q.toLowerCase()}`, async () => {
    const r = await api<{ items: { id: { kind: string; videoId?: string; channelId?: string; playlistId?: string }; snippet: Snip }[] }>(
      `search?part=snippet&type=video,channel,playlist&maxResults=40&q=${encodeURIComponent(q)}`,
    );
    const ids = r.items.filter((i) => i.id.videoId).map((i) => i.id.videoId!);
    const tracks = await videosToTracks(ids.slice(0, 30));
    const channels: Artist[] = r.items.filter((i) => i.id.channelId && i.id.kind.endsWith("channel")).map((c) => ({ id: `ytc:${c.id.channelId}`, name: decode(c.snippet.title), picture: thumb(c.snippet) }));
    // the channels behind the top songs are artists too (e.g. "Artist - Topic", AI music channels)
    for (const t of tracks.slice(0, 8)) {
      if (t.artistId && !channels.some((c) => c.id === t.artistId)) channels.push({ id: t.artistId, name: t.album ?? t.artist, picture: t.artwork });
    }
    const playlists: PlaylistSummary[] = r.items
      .filter((i) => i.id.playlistId)
      .map((p) => ({ id: `ytp-${p.id.playlistId}`, title: decode(p.snippet.title), cover: thumb(p.snippet), creator: decode(p.snippet.channelTitle) }));
    return { tracks, channels: channels.slice(0, 12), playlists };
  });
}

/** A YouTube playlist: its songs (1 unit per call). */
export async function youtubePlaylist(id: string): Promise<{ title: string; cover?: string; creator?: string; tracks: Track[] }> {
  const pid = id.replace(/^ytp-/, "");
  return cached(`p:${pid}`, async () => {
    const p = await api<{ items: { snippet: Snip }[] }>(`playlists?part=snippet&id=${pid}`);
    const sn = p.items[0]?.snippet;
    if (!sn) throw new Error("Playlist tidak dijumpai.");
    const items = await api<{ items: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=50&playlistId=${pid}`);
    const tracks = await videosToTracks(items.items.map((i) => i.contentDetails.videoId));
    return { title: decode(sn.title), cover: thumb(sn), creator: decode(sn.channelTitle), tracks };
  });
}

/** A YouTube channel shown as an artist: its details and latest uploads (cheap: 1 unit per call). */
export async function youtubeChannel(id: string): Promise<{ artist: Artist; tracks: Track[] }> {
  const cid = id.replace(/^ytc:/, "");
  return cached(`c:${cid}`, async () => {
    const c = await api<{ items: { snippet: Snip & { thumbnails: Record<string, { url: string }> }; statistics?: { subscriberCount?: string; videoCount?: string }; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
      `channels?part=snippet,statistics,contentDetails&id=${cid}`,
    );
    const ch = c.items[0];
    if (!ch) throw new Error("Artis tidak dijumpai.");
    const up = await api<{ items: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=50&playlistId=${ch.contentDetails.relatedPlaylists.uploads}`);
    const tracks = await videosToTracks(up.items.map((i) => i.contentDetails.videoId));
    return {
      artist: { id, name: decode(ch.snippet.title), picture: thumb(ch.snippet), fans: ch.statistics?.subscriberCount ? +ch.statistics.subscriberCount : undefined },
      tracks,
    };
  });
}

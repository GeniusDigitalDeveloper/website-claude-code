import type { Album, Artist, PlaylistSummary, Track } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Read-only access to the public Deezer API (https://developers.deezer.com/api).
 * Deezer does not send CORS headers, so the static app (Firebase Hosting) uses Deezer's
 * official JSONP output. Only whitelisted catalogue endpoints are called.
 */
const ALLOWED = [
  /^search(\/(track|album|artist|playlist))?$/,
  /^chart\/0(\/(tracks|albums|artists|playlists))?$/,
  /^editorial\/0\/(selection|charts)$/,
  /^genre$/,
  /^track\/\d+$/,
  /^album\/\d+(\/tracks)?$/,
  /^artist\/\d+(\/(top|albums|related|radio))?$/,
  /^playlist\/\d+(\/tracks)?$/,
];
let seq = 0;
const memo = new Map<string, { at: number; data: unknown }>();

function jsonp<T>(url: string, timeoutMs = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = `__lunaraDz${Date.now().toString(36)}${seq++}`;
    const el = document.createElement("script");
    const w = window as unknown as Record<string, unknown>;
    const done = () => {
      clearTimeout(timer);
      delete w[cb];
      el.remove();
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error("katalog tidak membalas"));
    }, timeoutMs);
    w[cb] = (data: T) => {
      done();
      resolve(data);
    };
    el.src = `${url}${url.includes("?") ? "&" : "?"}output=jsonp&callback=${cb}`;
    el.async = true;
    el.onerror = () => {
      done();
      reject(new Error("katalog tidak dapat dicapai"));
    };
    document.head.appendChild(el);
  });
}

// Deezer allows ~50 requests / 5 s per user. Stay under it, de-duplicate identical calls,
// retry politely on "quota exceeded", and keep slow-changing catalogue data in localStorage.
const WINDOW_MS = 5000;
const MAX_PER_WINDOW = 40;
const sent: number[] = [];
const inflight = new Map<string, Promise<any>>();
const LS_PREFIX = "lunara-dz:";
const LS_TTL = 6 * 3600_000;

async function slot() {
  for (;;) {
    const now = Date.now();
    while (sent.length && now - sent[0] > WINDOW_MS) sent.shift();
    if (sent.length < MAX_PER_WINDOW) {
      sent.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, WINDOW_MS - (now - sent[0]) + 30));
  }
}

function lsGet(url: string) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + url);
    if (!raw) return undefined;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > LS_TTL) return undefined;
    return data;
  } catch {
    return undefined;
  }
}
function lsSet(url: string, data: unknown) {
  try {
    localStorage.setItem(LS_PREFIX + url, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage full: drop our old entries and carry on
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX)).slice(0, 40).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

async function api<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  if (!ALLOWED.some((r) => r.test(path))) throw new Error("endpoint_not_allowed");
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v).slice(0, 200)]));
  const url = `https://api.deezer.com/${path}${qs.size ? `?${qs}` : ""}`;
  const noCache = path.startsWith("track/"); // preview links are signed and expire
  const persist = !noCache && !path.startsWith("search");
  const hit = memo.get(url);
  if (!noCache && hit && Date.now() - hit.at < 10 * 60_000) return hit.data as T;
  if (persist) {
    const stored = lsGet(url);
    if (stored !== undefined) {
      memo.set(url, { at: Date.now(), data: stored });
      return stored as T;
    }
  }
  const running = inflight.get(url);
  if (running) return running as Promise<T>;
  const job = (async () => {
    for (let attempt = 0; ; attempt++) {
      await slot();
      const data = await jsonp<any>(url);
      if (data?.error) {
        // code 4 = quota exceeded: wait and retry
        if (data.error.code === 4 && attempt < 4) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        throw new Error(data.error.message ?? "upstream_error");
      }
      if (!noCache) memo.set(url, { at: Date.now(), data });
      if (persist) lsSet(url, data);
      return data as T;
    }
  })();
  inflight.set(url, job);
  try {
    return await job;
  } finally {
    inflight.delete(url);
  }
}

/** Health check used by the admin dashboard. */
export async function pingCatalog() {
  const t = performance.now();
  await api("chart/0", { limit: 1 });
  return Math.round(performance.now() - t);
}

export const PREVIEW_SECONDS = 30;

/** Official Deezer page for the full-length song (opens the Deezer app/site). */
export const fullSongUrl = (t: { id: string; provider: string }) => (t.provider === "deezer" ? `https://www.deezer.com/track/${t.id.replace(/^dz:/, "")}` : null);

export function mapTrack(t: any, albumFallback?: { title?: string; id?: number; cover?: string }): Track {
  return {
    id: `dz:${t.id}`,
    source: "stream",
    provider: "deezer",
    title: t.title_short || t.title,
    artist: t.artist?.name ?? "",
    artistId: t.artist?.id ? String(t.artist.id) : undefined,
    album: t.album?.title ?? albumFallback?.title,
    albumId: t.album?.id ? String(t.album.id) : albumFallback?.id ? String(albumFallback.id) : undefined,
    artwork: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium || albumFallback?.cover,
    duration: t.duration ?? 0,
    playableSeconds: t.preview ? PREVIEW_SECONDS : 0,
    playable: Boolean(t.preview) && t.readable !== false,
    explicit: Boolean(t.explicit_lyrics),
  };
}

export const mapAlbum = (a: any): Album => ({
  id: String(a.id),
  title: a.title,
  artist: a.artist?.name ?? "",
  artistId: a.artist?.id ? String(a.artist.id) : undefined,
  cover: a.cover_xl || a.cover_big || a.cover_medium,
  releaseDate: a.release_date,
  genre: a.genres?.data?.map((g: any) => g.name).join(", "),
  duration: a.duration,
  nbTracks: a.nb_tracks,
  recordType: a.record_type,
  tracks: a.tracks?.data?.map((t: any) => mapTrack(t, { title: a.title, id: a.id, cover: a.cover_xl || a.cover_big })),
});

export const mapArtist = (a: any): Artist => ({
  id: String(a.id),
  name: a.name,
  picture: a.picture_xl || a.picture_big || a.picture_medium,
  fans: a.nb_fan,
  nbAlbums: a.nb_album,
});

export const mapPlaylist = (p: any): PlaylistSummary => ({
  id: String(p.id),
  title: p.title,
  description: p.description,
  cover: p.picture_xl || p.picture_big || p.picture_medium,
  nbTracks: p.nb_tracks,
  creator: p.user?.name ?? p.creator?.name,
});

const dzId = (id: string) => id.replace(/^dz:/, "");

export const catalog = {
  async searchAll(q: string) {
    const [tracks, albums, artists] = await Promise.all([
      api("search/track", { q, limit: 25 }),
      api("search/album", { q, limit: 12 }),
      api("search/artist", { q, limit: 12 }),
    ]);
    return {
      tracks: (tracks.data ?? []).map((t: any) => mapTrack(t)) as Track[],
      albums: (albums.data ?? []).map(mapAlbum) as Album[],
      artists: (artists.data ?? []).map(mapArtist) as Artist[],
    };
  },
  async suggest(q: string) {
    const r = await api("search", { q, limit: 6 });
    return (r.data ?? []).map((t: any) => mapTrack(t)) as Track[];
  },
  async chart() {
    const r = await api("chart/0", { limit: 20 });
    return {
      tracks: (r.tracks?.data ?? []).map((t: any) => mapTrack(t)) as Track[],
      albums: (r.albums?.data ?? []).map(mapAlbum) as Album[],
      artists: (r.artists?.data ?? []).map(mapArtist) as Artist[],
      playlists: (r.playlists?.data ?? []).map(mapPlaylist) as PlaylistSummary[],
    };
  },
  async newReleases() {
    const r = await api("editorial/0/selection");
    return (r.data ?? []).map(mapAlbum) as Album[];
  },
  async genres(): Promise<{ id: string; name: string; picture?: string }[]> {
    const r = await api("genre");
    return (r.data ?? []).filter((g: any) => g.id !== 0).map((g: any) => ({ id: String(g.id), name: g.name as string, picture: g.picture_xl || g.picture_big }));
  },
  async track(id: string) {
    return mapTrack(await api(`track/${dzId(id)}`));
  },
  async album(id: string) {
    return mapAlbum(await api(`album/${id}`));
  },
  async artist(id: string) {
    const [a, top, albums, related] = await Promise.all([
      api(`artist/${id}`),
      api(`artist/${id}/top`, { limit: 10 }),
      api(`artist/${id}/albums`, { limit: 50 }),
      api(`artist/${id}/related`, { limit: 12 }),
    ]);
    const all = (albums.data ?? []).map(mapAlbum) as Album[];
    return {
      artist: mapArtist(a),
      top: (top.data ?? []).map((t: any) => mapTrack(t)) as Track[],
      albums: all.filter((x) => x.recordType !== "single"),
      singles: all.filter((x) => x.recordType === "single"),
      related: (related.data ?? []).map(mapArtist) as Artist[],
    };
  },
  async artistTop(id: string, limit = 10) {
    const r = await api(`artist/${id}/top`, { limit });
    return (r.data ?? []).map((t: any) => mapTrack(t)) as Track[];
  },
  async artistAlbums(id: string) {
    const r = await api(`artist/${id}/albums`, { limit: 25 });
    const all = (r.data ?? []).map(mapAlbum) as Album[];
    const albums = all.filter((a) => a.recordType !== "single");
    return (albums.length ? albums : all).map((a) => ({ ...a, artistId: a.artistId ?? id }));
  },
  async artistInfo(id: string) {
    return mapArtist(await api(`artist/${id}`));
  },
  async artistRadio(id: string) {
    const r = await api(`artist/${id}/radio`, { limit: 25 });
    return (r.data ?? []).map((t: any) => mapTrack(t)) as Track[];
  },
  async playlist(id: string) {
    const p = await api(`playlist/${id}`);
    return { ...mapPlaylist(p), tracks: (p.tracks?.data ?? []).map((t: any) => mapTrack(t)) as Track[] };
  },
  /** Resolve a fresh, signed preview URL right before playback (Deezer preview links expire). */
  async previewUrl(id: string): Promise<string | null> {
    const t = await api(`track/${dzId(id)}`);
    return t.preview || null;
  },
};

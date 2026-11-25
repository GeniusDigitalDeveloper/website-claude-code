import type { Album, Artist, PlaylistSummary, Track } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function api<T = any>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`/api/catalog/${path}${qs.size ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
  return res.json();
}

export const PREVIEW_SECONDS = 30;

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

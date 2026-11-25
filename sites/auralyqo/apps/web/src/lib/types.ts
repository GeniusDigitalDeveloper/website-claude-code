/** Where a track comes from. Shown as a badge on every track so users always know the source. */
export type TrackSource = "stream" | "local" | "imported";

export interface Track {
  /** Unique within AURALYQO: "dz:<id>" for Deezer catalogue, "loc:<uuid>" for local/imported files. */
  id: string;
  source: TrackSource;
  provider: "deezer" | "device";
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  artwork?: string;
  /** Full length of the recording in seconds (catalogue metadata). */
  duration: number;
  /** Seconds the provider authorises us to play. Deezer public API = 30s preview. */
  playableSeconds?: number;
  /** False when the provider says it is not playable in this territory. */
  playable: boolean;
  explicit?: boolean;
  genre?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  cover?: string;
  releaseDate?: string;
  genre?: string;
  tracks?: Track[];
  duration?: number;
  nbTracks?: number;
  recordType?: string;
}

export interface Artist {
  id: string;
  name: string;
  picture?: string;
  fans?: number;
  nbAlbums?: number;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  nbTracks?: number;
  creator?: string;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  cover?: string; // data URL (small, cropped) or remote URL
  isPublic: boolean;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Default content for new users: Malay nasyid, zikir/selawat, jiwang and 80s/90s "rock kapak".
 * Artist IDs are verified Deezer IDs of the Malaysian artists (names like "Search" or "Wings"
 * collide with foreign artists, so we never rely on name search here).
 * Once a user listens/likes songs, "Made For You" and "Daily Mix" follow their own taste instead.
 */
import { catalog } from "./catalog";
import type { Album, Artist, Track } from "./types";

export const MALAY = {
  nasyid: ["64913", "3751731", "241021", "1447050", "4044708", "68003", "1493606", "4783061"], // Raihan, Hijjaz, Rabbani, Inteam, Saujana, NowSeeHeart, Mirwana, In Team
  zikir: ["5157170", "1447050", "64913", "3751731"], // Hafiz Hamidun, Inteam, Raihan, Hijjaz
  jiwang: ["64854", "358684272", "4931568", "4755367", "378233", "243703", "66538", "65530", "14885939"], // Iklim, Slam, Ukays, Exists, Lestari, Febians, Saleem, Jamal Abdillah, Siti Nurhaliza
  rock: ["320179", "8966418", "264801", "1629181", "242535", "4831863", "10979804", "242335"], // Search, Wings, Lefthanded, XPDC, Awie, Amy Search, BPR, Amuk
};
/** Every curated Malay artist id, used to keep "related artists" Malay. */
export const MALAY_ALL = new Set([...MALAY.nasyid, ...MALAY.zikir, ...MALAY.jiwang, ...MALAY.rock]);

export const MALAY_SEED_ARTISTS = ["64913", "320179", "64854", "5157170"]; // for Daily Mix before the user has history

export const MALAY_SEARCH_CHIPS = ["Raihan", "Hafiz Hamidun", "Hijjaz", "Inteam", "Search", "Iklim", "Slam", "XPDC", "Exists", "Wings", "Siti Nurhaliza", "Jamal Abdillah"];

const settle = async <T,>(ps: Promise<T>[]) => (await Promise.allSettled(ps)).flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));

/** Interleave each artist's most popular songs so the list feels mixed, not grouped. */
/**
 * Deezer sometimes merges a same-name foreign artist into a Malaysian artist's page
 * (e.g. an English lo-fi producer also called "Raihan"). Keep only songs credited to the
 * artist itself and skip the all-lowercase lo-fi style titles those uploads use.
 */
const isCurated = (t: Track, id: string) => t.playable && t.artistId === id && /[A-Z]/.test(t.title);

export async function mixFrom(ids: string[], perArtist = 4): Promise<Track[]> {
  const lists = await settle(ids.map(async (id) => (await catalog.artistTop(id, perArtist + 8)).filter((t) => isCurated(t, id))));
  const out: Track[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < perArtist; i++)
    for (const l of lists) {
      const t = l[i];
      const key = t ? `${t.title.toLowerCase()}|${t.artist.toLowerCase()}` : "";
      if (t && !seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    }
  return out;
}

export async function albumsFrom(ids: string[], perArtist = 3): Promise<Album[]> {
  const lists = await settle(
    ids.map(async (id) => {
      const [info, albums] = await Promise.all([catalog.artistInfo(id), catalog.artistAlbums(id)]);
      return albums.map((a) => ({ ...a, artist: a.artist || info.name, artistId: id }));
    }),
  );
  const out: Album[] = [];
  for (let i = 0; i < perArtist; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

export async function artistsFrom(ids: string[]): Promise<Artist[]> {
  return settle(ids.map((id) => catalog.artistInfo(id)));
}

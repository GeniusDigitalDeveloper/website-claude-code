"use client";
/**
 * "Radio" queue: the song the listener picked plays first, then other songs of the SAME KIND follow
 * (AI covers → AI songs, 90s slow rock → 90s rock, jiwang → jiwang, nasyid → nasyid, zikir → zikir),
 * never a list of other versions of the same song.
 */
import { catalog } from "./catalog";
import { MALAY } from "./malay";
import type { Track } from "./types";
import { searchYouTube, youtubeChannel } from "./yt-search";
import { usePlayer } from "@/store/player";

type Kind = "ai-rock" | "ai" | "zikir" | "nasyid" | "rock" | "jiwang" | null;

const QUERY: Record<Exclude<Kind, null>, string> = {
  "ai-rock": "slow rock malaysia ai cover",
  ai: "lagu melayu ai cover",
  zikir: "zikir selawat merdu",
  nasyid: "nasyid malaysia popular",
  rock: "slow rock malaysia 90an",
  jiwang: "lagu jiwang melayu terkini",
};

const ROCK_NAMES =
  /slow ?rock|rock kapak|rock 8|rock 9|80an|90an|iklim|saleem|\bsearch\b|wings|ekamatra|xpdc|lefthanded|\bbpr\b|\bslam\b|exists|\bspring\b|umbrella|febians|\bscreen\b|lestari|\bamuk\b|\bscan\b|new boyz|hattan|\bamy\b|\bmay\b|\baxl\b|\bstings\b|\bvoice\b|rock legend|rock malaysia/;

export function kindOf(t: Track): Kind {
  const s = `${t.title} ${t.artist} ${t.album ?? ""}`.toLowerCase();
  const id = t.artistId ?? "";
  const ai = /\bai\b|a\.i\.|ai cover|cover ai/.test(s);
  if (/zikir|selawat|salawat|sholawat|shalawat|asmaul|istighfar|tahlil|ya rasulullah|ya nabi|qasidah/.test(s) || id === "5157170") return "zikir";
  if (/nasyid|nasheed|raihan|hijjaz|rabbani|inteam|in-team|\bunic\b|mirwana|far east|devotees/.test(s) || MALAY.nasyid.includes(id)) return ai ? "ai" : "nasyid";
  const rock = ROCK_NAMES.test(s) || MALAY.rock.includes(id);
  if (ai) return rock ? "ai-rock" : "ai";
  if (rock) return "rock";
  if (/jiwang|balada|ballad|cinta|rindu|kekasih|kasih|hati|patah|luka/.test(s) || MALAY.jiwang.includes(id)) return "jiwang";
  return null;
}

/** The core song name, so other versions of the same song can be left out. */
function base(title: string) {
  return title
    .toLowerCase()
    .split(/\s[-–—|]\s|\(|\[|\|/)[0]
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPILATION = /kumpulan|full album|\balbum\b|top \d+|top twenty|nonstop|non stop|compilation|playlist|koleksi|lagu-lagu|lagu lagu|medley|\bmix\b/i;

function variety(seed: Track, list: Track[], max = 30) {
  const b = base(seed.title);
  const perArtist: Record<string, number> = {};
  const seen = new Set<string>([b]);
  const out: Track[] = [];
  for (const t of list) {
    const k = base(t.title);
    if (COMPILATION.test(t.title) || (t.duration && t.duration > 12 * 60)) continue; // one song at a time, not 1-hour mixes
    if (t.id === seed.id || !k || seen.has(k) || (b.length > 3 && t.title.toLowerCase().includes(b))) continue;
    const a = t.artist.toLowerCase();
    if ((perArtist[a] ?? 0) >= 3) continue;
    perArtist[a] = (perArtist[a] ?? 0) + 1;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function shuffle<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

async function similar(seed: Track): Promise<Track[]> {
  const kind = kindOf(seed);
  const pools: Track[][] = [];
  if (kind) pools.push((await searchYouTube(QUERY[kind]).catch(() => ({ tracks: [] as Track[] }))).tracks);
  // same artist / channel adds a few more of the same style
  if (seed.artistId?.startsWith("ytc:")) pools.push((await youtubeChannel(seed.artistId).catch(() => ({ tracks: [] as Track[] }))).tracks.slice(0, 15));
  else if (seed.provider === "deezer" && seed.artistId) pools.push(await catalog.artistRadio(seed.artistId).catch(() => [] as Track[]));
  if (!kind && !pools.some((p) => p.length)) pools.push((await searchYouTube(`${seed.artist} lagu popular`).catch(() => ({ tracks: [] as Track[] }))).tracks);
  // mix: two songs of the style, then one more from the same artist/channel
  const sa = shuffle(pools[0] ?? []);
  const sb = shuffle(pools[1] ?? []);
  const mixed: Track[] = [];
  while (sa.length || sb.length) {
    mixed.push(...sa.splice(0, 2));
    mixed.push(...sb.splice(0, 1));
  }
  return variety(seed, mixed.filter((t) => t.playable));
}

/** Play a song now, and fill "Up next" with songs of the same kind. */
export async function playRadio(seed: Track) {
  await usePlayer.getState().playList([seed], 0, { shuffle: false });
  const more = await similar(seed);
  const st = usePlayer.getState();
  if (st.queue[st.index]?.id !== seed.id || !more.length) return;
  usePlayer.setState({ queue: [...st.queue.slice(0, st.index + 1), ...more], unshuffled: null });
}

"use client";
/**
 * "Radio" queue: the song the listener picked plays first, then other songs of the SAME KIND follow
 * (AI covers → AI songs, 90s slow rock → 90s rock, jiwang → jiwang, nasyid → nasyid, zikir → zikir),
 * never a list of other versions of the same song.
 */
import { type Category, loadContent, shuffle as shuf } from "./content";
import type { Track } from "./types";
import { searchYouTube, youtubeChannel } from "./yt-search";
import { usePlayer } from "@/store/player";

type Kind = "ai-rock" | "ai" | "zikir" | "nasyid" | "rock" | "jiwang" | null;

/** Built-in song lists used for each kind (no search quota needed). */
const POOL: Record<Exclude<Kind, null>, Category[]> = {
  "ai-rock": ["ai"],
  ai: ["ai"],
  zikir: ["zikir"],
  nasyid: ["nasyid"],
  rock: ["rock", "jiwang"],
  jiwang: ["jiwang", "rock"],
};

const ROCK_NAMES =
  /slow ?rock|rock kapak|rock 8|rock 9|80an|90an|iklim|saleem|\bsearch\b|wings|ekamatra|xpdc|lefthanded|\bbpr\b|\bslam\b|exists|\bspring\b|umbrella|febians|\bscreen\b|lestari|\bamuk\b|\bscan\b|new boyz|hattan|\bamy\b|\bmay\b|\baxl\b|\bstings\b|\bvoice\b|rock legend|rock malaysia/;

export function kindOf(t: Track): Kind {
  const s = `${t.title} ${t.artist} ${t.album ?? ""}`.toLowerCase();
  const ai = /\bai\b|a\.i\.|ai cover|cover ai/.test(s);
  if (/zikir|selawat|salawat|sholawat|shalawat|asmaul|istighfar|tahlil|ya rasulullah|ya nabi|qasidah/.test(s)) return "zikir";
  if (/nasyid|nasheed|raihan|hijjaz|rabbani|inteam|in-team|\bunic\b|mirwana|far east|devotees/.test(s)) return ai ? "ai" : "nasyid";
  const rock = ROCK_NAMES.test(s);
  if (ai) return rock ? "ai-rock" : "ai";
  if (rock) return "rock";
  if (/jiwang|balada|ballad|cinta|rindu|kekasih|kasih|hati|patah|luka/.test(s)) return "jiwang";
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

export async function similar(seed: Track): Promise<Track[]> {
  const kind = kindOf(seed);
  const pools: Track[][] = [];
  const home = await loadContent().catch(() => null);
  if (kind && home) pools.push(POOL[kind].flatMap((c) => home.tracks[c]));
  // same artist / channel adds a few more of the same style
  if (seed.artistId?.startsWith("ytc:")) pools.push((await youtubeChannel(seed.artistId).catch(() => ({ tracks: [] as Track[] }))).tracks.slice(0, 15));
  if (!pools.some((p) => p.length)) pools.push((await searchYouTube(`${seed.artist} lagu popular`).catch(() => ({ tracks: [] as Track[] }))).tracks);
  if (!kind && home) pools.push(shuf([...home.tracks.english, ...home.tracks.jiwang]).slice(0, 20));
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

// Builds public/content/home.json: the default home content (YouTube only), so visitors spend no API quota.
// Run: node scripts/build-content.mjs   (reads NEXT_PUBLIC_YT_KEY from .env.local; sends the site's referrer)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const KEY = /NEXT_PUBLIC_YT_KEY=(.+)/.exec(env)[1].trim();
const API = "https://www.googleapis.com/youtube/v3";
let units = 0;
const CACHE = process.env.YT_CACHE ?? "/tmp/lunara-yt-cache.json";
let cache = {};
try { cache = JSON.parse(readFileSync(CACHE, "utf8")); } catch {}
async function api(path, cost = 1) {
  if (cache[path]) return cache[path];
  units += cost;
  const r = await fetch(`${API}/${path}&key=${KEY}`, { headers: { Referer: "https://lunara-music.web.app/" } });
  const d = await r.json();
  if (d.error) throw new Error(`${path.split("?")[0]}: ${d.error.message}`);
  cache[path] = d;
  writeFileSync(CACHE, JSON.stringify(cache));
  return d;
}
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const thumb = (s) => s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url;
const iso = (s) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s ?? ""); return m ? +(m[1] ?? 0) * 3600 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) : 0; };
const norm = (s) => s.toLowerCase().replace(/\s*-\s*topic$/, "").replace(/[^a-z0-9]+/g, "");
const LATIN = /^[\u0000-ɏ -⁯☀-➿\s\p{Extended_Pictographic}]+$/u;
const BAD = /kumpulan|full album|top \d+|nonstop|non stop|compilation|playlist|koleksi|medley|karaoke|minus one|tutorial|reaction|\bmix\b|lagu-lagu|lagu lagu|live stream/i;

async function videos(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const d = await api(`videos?part=snippet,contentDetails,status&id=${ids.slice(i, i + 50).join(",")}`);
    for (const v of d.items) {
      if (v.status?.embeddable === false) continue;
      const duration = iso(v.contentDetails.duration);
      const title = dec(v.snippet.title).replace(/\s+/g, " ").trim();
      if (duration < 60 || duration > 12 * 60 || BAD.test(title) || !LATIN.test(title)) continue;
      out.push({ id: `yt:${v.id}`, source: "stream", provider: "youtube", title, artistTopic: / - Topic$/i.test(v.snippet.channelTitle) || undefined, artist: dec(v.snippet.channelTitle).replace(/\s*-\s*Topic$/i, ""), artistId: `ytc:${v.snippet.channelId}`, artwork: thumb(v.snippet), duration, playable: true });
    }
  }
  return out;
}
async function searchTracks(q, n = 50) {
  const d = await api(`search?part=snippet&type=video&videoEmbeddable=true&maxResults=${n}&regionCode=MY&q=${encodeURIComponent(q)}`, 100);
  return videos(d.items.map((i) => i.id.videoId));
}
async function searchAlbums(q, re = /album/i) {
  const d = await api(`search?part=snippet&type=playlist&maxResults=25&q=${encodeURIComponent(q)}`, 100);
  return d.items
    .filter((p) => re.test(p.snippet.title) && LATIN.test(p.snippet.title) && !/koleksi|kumpulan|full album|best of|terbaik/i.test(p.snippet.title))
    .map((p) => ({ id: `ytp-${p.id.playlistId}`, title: dec(p.snippet.title).replace(/\s*[-|]?\s*\(?full album\)?/i, "").trim(), artist: dec(p.snippet.channelTitle), cover: thumb(p.snippet) }));
}
function mixUnique(lists, max, perArtist = 3) {
  const seen = new Set(), count = {}, out = [];
  const base = (t) => t.title.toLowerCase().split(/\s[-–—|]\s|\(|\[|\|/)[0].replace(/[^a-z0-9]+/g, "");
  const iters = lists.map((l) => [...l]);
  while (out.length < max && iters.some((l) => l.length)) {
    for (const l of iters) {
      const t = l.shift();
      if (!t) continue;
      const k = base(t);
      if (seen.has(t.id) || seen.has(k) || (count[t.artist] ?? 0) >= perArtist) continue;
      seen.add(t.id); seen.add(k); count[t.artist] = (count[t.artist] ?? 0) + 1;
      out.push(t);
      if (out.length >= max) break;
    }
  }
  return out;
}

const Q = {
  nasyid: ["raihan nasyid", "hijjaz rabbani inteam nasyid", "unic mirwana nasyid"],
  zikir: ["zikir merdu", "selawat nabi merdu", "zikir munajat hafiz hamidun", "selawat syifa merdu"],
  jiwang: ["lagu jiwang melayu 90an", "lagu jiwang melayu terkini"],
  rock: ["slow rock malaysia 90an", "rock kapak 80an 90an", "search wings xpdc lagu rock", "lagu rock melayu legenda official"],
  ai: ["slow rock malaysia ai cover", "lagu melayu ai cover"],
  english: ["top hits 2026 official music video", "billboard hot 100 official music video"],
};
let prev = { tracks: {}, albums: {}, artists: {}, channels: {} };
try { prev = JSON.parse(readFileSync(new URL("../public/content/home.json", import.meta.url), "utf8")); } catch {}
const content = { built: Date.now(), tracks: { ...prev.tracks }, albums: { ...prev.albums }, artists: { ...prev.artists }, channels: { ...prev.channels } };
for (const [k, qs] of Object.entries(Q)) {
  const lists = [];
  for (const q of qs) lists.push(await searchTracks(q).catch((e) => (console.log("skip", q, e.message.slice(0, 60)), [])));
  const fresh = mixUnique(lists, 40, k === "english" ? 2 : 3);
  if (fresh.length >= (prev.tracks[k]?.length ?? 0)) content.tracks[k] = fresh; // keep the old list when quota ran out
  console.log(k, content.tracks[k]?.length, "units", units);
}
if (process.env.TRACKS_ONLY) {
  for (const l of Object.values(content.tracks)) for (const t of l) delete t.artistTopic;
  writeFileSync(new URL("../public/content/home.json", import.meta.url), JSON.stringify(content));
  console.log("tracks only, done", units);
  process.exit(0);
}
content.albums.malay = mixUnique([await searchAlbums("slow rock malaysia album"), await searchAlbums("raihan hijjaz nasyid album"), await searchAlbums("iklim search wings album"), await searchAlbums("album rock melayu 90an"), await searchAlbums("album nasyid malaysia")], 24, 4);
content.albums.english = (await searchAlbums("official album 2025 2026")).slice(0, 15);
console.log("albums", content.albums.malay.length, content.albums.english.length, "units", units);

// artists: take official channels that appear in the songs above; only search for the rest
const NAMES = {
  malay: ["Raihan", "Hijjaz", "Rabbani", "Inteam", "UNIC", "Hafiz Hamidun", "Iklim", "Slam", "Ukays", "Exists", "Lestari", "Search", "Wings", "XPDC", "Amy Search", "Pengagum Sunyi"],
  english: ["Taylor Swift", "Ed Sheeran", "The Weeknd", "Bruno Mars", "Billie Eilish", "Dua Lipa"],
};
const SEARCH_AS = { Rabbani: "Rabbani nasyid official", Wings: "Wings band rock malaysia official", Search: "Search band rock malaysia official", Slam: "Slam official", Lestari: "Lestari band official", UNIC: "UNIC nasyid official" };
const allTracks = Object.values(content.tracks).flat();
for (const [grp, names] of Object.entries(NAMES)) {
  const ids = [];
  for (const n of names) {
    const k = norm(n);
    let hit = allTracks.find((t) => !t.artistTopic && (norm(t.artist) === k || norm(t.artist).startsWith(k + "official")));
    let id = hit?.artistId;
    if (!id) {
      const d = await api(`search?part=snippet&type=channel&maxResults=8&q=${encodeURIComponent(SEARCH_AS[n] ?? n)}`, 100);
      const ok = d.items.filter((c) => !/ - topic$/i.test(dec(c.snippet.title)));
      const c = ok.find((c) => norm(dec(c.snippet.title)).startsWith(k)) ?? ok[0];
      id = c ? `ytc:${c.id.channelId}` : null;
    }
    if (id) { ids.push(id); content.channels[k] = id; }
  }
  const d = await api(`channels?part=snippet,statistics&id=${ids.map((x) => x.slice(4)).join(",")}`);
  content.artists[grp] = ids.map((id) => d.items.find((c) => `ytc:${c.id}` === id)).filter(Boolean).map((c) => ({ id: `ytc:${c.id}`, name: dec(c.snippet.title), picture: thumb(c.snippet), fans: c.statistics?.subscriberCount ? +c.statistics.subscriberCount : undefined }));
  console.log(grp, content.artists[grp].map((a) => a.name).join(", "), "units", units);
}
mkdirSync(new URL("../public/content/", import.meta.url), { recursive: true });
for (const l of Object.values(content.tracks)) for (const t of l) delete t.artistTopic;
writeFileSync(new URL("../public/content/home.json", import.meta.url), JSON.stringify(content));
console.log("done, units used", units);

"use client";
/**
 * Full-length playback through the official YouTube IFrame Player (in-app, no other app needed).
 *
 * - The catalogue song (title + artist) is matched to a YouTube video with the YouTube Data API
 *   (`NEXT_PUBLIC_YT_KEY`). Matches are cached on the device and in Firestore (lunara_yt) so each
 *   song costs search quota only once for everyone.
 * - YouTube's terms require the player to stay visible (≥ 200×200 px): <YouTubeHost/> shows it.
 * - Fades are real volume ramps through the player's setVolume().
 * - If there is no key, the quota is used up, or no video is found, the caller falls back to the preview.
 */
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Track } from "./types";
import type { EngineEvent, FadeSettings } from "./audio-engine";

const KEY = process.env.NEXT_PUBLIC_YT_KEY ?? "";
let disabledUntil = 0; // set when the key is rejected or the daily quota is exhausted

export const youtubeEnabled = () => Boolean(KEY) && Date.now() > disabledUntil;
let lastError = "";

/** Diagnostic used in Settings: runs one real search from this browser and reports what Google answered. */
export async function testYouTube(): Promise<{ ok: boolean; detail: string }> {
  if (!KEY) return { ok: false, detail: "Tiada kunci YouTube dalam binaan ini." };
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=raihan&key=${KEY}`);
    const d = await r.json();
    if (d.error) return { ok: false, detail: `${d.error.code} ${d.error.message} ${(d.error.details ?? []).map((x: { reason?: string }) => x.reason ?? "").join(" ")}`.trim() };
    disabledUntil = 0;
    return { ok: true, detail: `OK: ${d.items?.[0]?.snippet?.title ?? "berjaya"}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
export const youtubeLastError = () => lastError;

const LS = "lunara-yt:";
const dzId = (t: Track) => t.id.replace(/^dz:/, "");

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find (and cache) the YouTube video for a catalogue track. Returns null when unavailable. */
export async function findVideo(t: Track): Promise<string | null> {
  if (t.provider !== "deezer") return null;
  const id = dzId(t);
  try {
    const hit = localStorage.getItem(LS + id);
    if (hit) return hit === "-" ? null : hit;
  } catch {
    /* ignore */
  }
  if (!KEY) return null; // no YouTube key configured: play the preview without any delay
  const d = db();
  if (d) {
    const snap = await getDoc(doc(d, "lunara_yt", id)).catch(() => null);
    const v = snap?.data()?.v as string | undefined;
    if (v) {
      remember(id, v);
      return v;
    }
  }
  if (!youtubeEnabled()) return null;
  const q = `${t.artist} ${t.title}`;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=${encodeURIComponent(q)}&key=${KEY}`;
  let data: { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[]; error?: { code: number } };
  try {
    data = await (await fetch(url)).json();
  } catch {
    return null;
  }
  if (data.error) {
    lastError = `${data.error.code}`;
    disabledUntil = Date.now() + (data.error.code === 403 ? 30 * 60_000 : 60_000);
    return null;
  }
  const items = data.items ?? [];
  const title = norm(t.title);
  const artist = norm(t.artist);
  const score = (it: (typeof items)[number]) => {
    const s = norm(`${it.snippet.title} ${it.snippet.channelTitle}`);
    let p = 0;
    if (s.includes(title)) p += 3;
    if (s.includes(artist)) p += 2;
    if (/karaoke|cover|instrumental|minus one|reaction|tutorial|lirik minus/.test(s)) p -= 3;
    if (/official|audio|topic|music video|lirik/.test(s)) p += 1;
    return p;
  };
  const best = [...items].sort((a, b) => score(b) - score(a))[0];
  const vid = best && score(best) >= 3 ? best.id.videoId : null;
  remember(id, vid ?? "-");
  if (vid && d && auth()?.currentUser) void setDoc(doc(d, "lunara_yt", id), { v: vid, at: serverTimestamp() }).catch(() => {});
  return vid;
}

function remember(id: string, v: string) {
  try {
    localStorage.setItem(LS + id, v);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* YouTube IFrame player as a playback "deck" with real volume fades   */
/* ------------------------------------------------------------------ */

interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cueVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(s: number, allow: boolean): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(r: number): void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, o: object) => YTPlayer; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Listener = (e: EngineEvent) => void;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class YouTubeDeck {
  private player: YTPlayer | null = null;
  private ready: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private token = 0;
  private gain = 0; // 0..1 fade gain
  private volume = 0.8; // user volume 0..1
  private endedSent = false;
  active = false;
  videoId: string | null = null;
  fade: FadeSettings | null = null;
  hostEl: HTMLElement | null = null;

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: EngineEvent) {
    this.listeners.forEach((l) => l(e));
  }

  private init() {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      const make = () => {
        const mount = document.getElementById("yt-player-mount");
        if (!mount || !window.YT) return reject(new Error("YouTube player unavailable"));
        // Methods exist only after onReady, so the instance is stored then.
        const pl = new window.YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, iv_load_policy: 3, fs: 0, origin: location.origin },
          events: {
            onReady: () => {
              this.player = pl;
              resolve();
            },
            onStateChange: (e: { data: number }) => this.onState(e.data),
            onError: () => this.emit({ type: "error", message: "Video lagu ini tidak boleh dimainkan." }),
          },
        });
      };
      if (window.YT?.Player) return make();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        make();
      };
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        s.onerror = () => reject(new Error("YouTube tidak dapat dicapai"));
        document.head.appendChild(s);
      }
      setTimeout(() => reject(new Error("YouTube lambat memuat")), 15000);
    });
    return this.ready;
  }

  private onState(s: number) {
    // 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (s === 0 && !this.endedSent) {
      this.endedSent = true;
      this.emit({ type: "ended" });
    } else if (s === 1) this.emit({ type: "buffering", buffering: false });
    else if (s === 3) this.emit({ type: "buffering", buffering: true });
  }

  private apply() {
    this.player?.setVolume(Math.round(100 * this.gain * Math.pow(this.volume, 2)));
  }
  private async ramp(to: number, sec: number, my: number) {
    const from = this.gain;
    const steps = Math.max(1, Math.round(sec * 30));
    for (let i = 1; i <= steps; i++) {
      if (my !== this.token) return false;
      this.gain = from + ((to - from) * i) / steps;
      this.apply();
      await sleep((sec * 1000) / steps);
    }
    return my === this.token;
  }
  private fadeIn() {
    return this.fade?.enabled && this.fade.fadeIn ? this.fade.fadeInSec : 0;
  }
  private fadeOut() {
    return this.fade?.enabled && this.fade.fadeOut ? this.fade.fadeOutSec : 0;
  }
  private startClock() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (!this.player || !this.active) return;
      this.emit({ type: "time", position: this.player.getCurrentTime() || 0, duration: this.player.getDuration() || 0 });
    }, 250);
  }

  get playing() {
    return this.player ? this.player.getPlayerState() === 1 : false;
  }
  get position() {
    return this.player ? this.player.getCurrentTime() || 0 : 0;
  }

  async load(videoId: string, opts: { autoplay: boolean; startAt?: number }) {
    const my = ++this.token;
    await this.init();
    if (my !== this.token) return false;
    this.active = true;
    this.videoId = videoId;
    this.endedSent = false;
    this.gain = 0;
    this.apply();
    this.emit({ type: "buffering", buffering: opts.autoplay });
    if (opts.autoplay) this.player!.loadVideoById({ videoId, startSeconds: opts.startAt ?? 0 });
    else this.player!.cueVideoById({ videoId, startSeconds: opts.startAt ?? 0 });
    this.startClock();
    if (opts.autoplay) {
      this.emit({ type: "state", playing: true });
      void this.ramp(1, this.fadeIn(), my);
    }
    return true;
  }

  async play() {
    const my = ++this.token;
    if (!this.player) return;
    this.player.playVideo();
    this.emit({ type: "state", playing: true });
    await this.ramp(1, this.fadeIn(), my);
  }

  async pause() {
    const my = ++this.token;
    this.emit({ type: "state", playing: false });
    if (await this.ramp(0, this.fadeOut(), my)) this.player?.pauseVideo();
  }

  /** Fade out and stop (used before switching to another track). */
  async fadeOutAndStop() {
    const my = ++this.token;
    if (this.playing) await this.ramp(0, this.fadeOut(), my);
    if (my === this.token) this.player?.pauseVideo();
  }

  stop() {
    this.token++;
    this.active = false;
    this.videoId = null;
    this.player?.stopVideo();
  }

  seek(s: number) {
    this.player?.seekTo(s, true);
  }
  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }
  setRate(r: number) {
    this.player?.setPlaybackRate(r);
  }
  debugGain() {
    return this.gain;
  }
}

let deck: YouTubeDeck | null = null;
export function getYouTube() {
  if (!deck) {
    deck = new YouTubeDeck();
    (window as unknown as { __lunaraYT: YouTubeDeck }).__lunaraYT = deck;
  }
  return deck;
}

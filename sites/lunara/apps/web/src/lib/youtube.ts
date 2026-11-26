"use client";
/**
 * Full-length playback through the official YouTube IFrame Player (in-app, no other app needed).
 *
 * - Songs and videos come from YouTube itself (search, channels, playlists: see yt-search.ts).
 * - YouTube's terms require the player to stay visible (≥ 200×200 px): <YouTubeHost/> shows it.
 * - Fades are real volume ramps through the player's setVolume().
 */
import type { Track } from "./types";
import type { EngineEvent, FadeSettings } from "./audio-engine";
import { create } from "zustand";

/** UI state for the pop-out (Picture-in-Picture) video window. */
export const useYtWindow = create<{ popped: boolean; supported: boolean }>(() => ({ popped: false, supported: false }));

const KEY = process.env.NEXT_PUBLIC_YT_KEY ?? "";
let disabledUntil = 0; // set when the key is rejected or the daily quota is exhausted

export const youtubeEnabled = () => Boolean(KEY) && Date.now() > disabledUntil;
const lastError = "";

/** Diagnostic used in Settings/Admin: one cheap real request (1 quota unit) from this browser. */
export async function testYouTube(): Promise<{ ok: boolean; detail: string }> {
  if (!KEY) return { ok: false, detail: "Tiada kunci YouTube dalam binaan ini." };
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${KEY}`);
    const d = await r.json();
    if (d.error) return { ok: false, detail: `${d.error.code} ${d.error.message} ${(d.error.details ?? []).map((x: { reason?: string }) => x.reason ?? "").join(" ")}`.trim() };
    disabledUntil = 0;
    return { ok: true, detail: `OK: ${d.items?.[0]?.snippet?.title ?? "berjaya"}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
export const youtubeLastError = () => lastError;

/** The YouTube video behind a track (every streamed track in LUNARA is a YouTube video). */
export async function findVideo(t: Track): Promise<string | null> {
  return t.provider === "youtube" ? t.id.replace(/^yt:/, "") : null;
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
  destroy(): void;
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
  private mainPlayer: YTPlayer | null = null; // the in-app player while the video is popped out
  private pipWin: Window | null = null;

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
            onError: (e: { data: number }) => this.emit({ type: "error", message: `yt:${e.data}` }),
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

  /** playing or buffering */
  get busy() {
    if (!this.player) return false;
    const st = this.player.getPlayerState();
    return st === 1 || st === 3;
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

  /** Try to carry on after the system paused the player (no fade, no state change). */
  resumeQuietly() {
    try {
      this.player?.playVideo();
    } catch {
      /* ignore */
    }
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

  /**
   * Move the video into its own always-on-top window (Document Picture-in-Picture, Chrome/Edge),
   * which the user can drag to a second screen. Playback continues from the same second.
   */
  async popOut(): Promise<boolean> {
    const dpip = (window as unknown as { documentPictureInPicture?: { requestWindow(o: object): Promise<Window> } }).documentPictureInPicture;
    if (!dpip || !this.player || !this.videoId || this.pipWin || !window.YT) return false;
    const pip = await dpip.requestWindow({ width: 480, height: 290 });
    pip.document.title = "LUNARA MUSIC";
    const st = pip.document.createElement("style");
    st.textContent = "html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100vw;height:100vh;display:block}";
    pip.document.head.appendChild(st);

    const at = this.player.getCurrentTime() || 0;
    const wasPlaying = this.busy;
    const vid = this.videoId;
    const main = this.player;
    main.pauseVideo();
    // Our own page hosts the player inside the window (YouTube needs a real embedding page)
    const frame = pip.document.createElement("iframe");
    frame.allow = "autoplay; encrypted-media";
    frame.src = `/yt-pip?v=${encodeURIComponent(vid)}&t=${Math.floor(at)}&play=${wasPlaying ? 1 : 0}`;
    pip.document.body.appendChild(frame);
    const popped = await new Promise<YTPlayer>((resolve, reject) => {
      frame.addEventListener("load", () => {
        const w = frame.contentWindow as unknown as { lunaraPipReady: Promise<YTPlayer>; lunaraPipState: ((d: number) => void) | null; lunaraPipError: ((d: number) => void) | null };
        w.lunaraPipState = (d) => this.onState(d);
        // if the separate window can't play it, bring the video back into the app instead of failing
        w.lunaraPipError = (code) => {
          (window as unknown as { __lunaraPipError?: number }).__lunaraPipError = code;
          this.popIn();
        };
        w.lunaraPipReady.then(resolve, reject);
      });
      setTimeout(() => reject(new Error("timeout")), 15000);
    }).catch(() => null);
    if (!popped) {
      pip.close();
      main.playVideo();
      return false;
    }
    this.mainPlayer = main;
    this.player = popped;
    this.pipWin = pip;
    popped.seekTo(at, true);
    this.apply();
    if (wasPlaying) popped.playVideo();
    useYtWindow.setState({ popped: true });
    pip.addEventListener("pagehide", () => this.popIn(true));
    return true;
  }

  /** Bring the video back into the app (also runs when the pop-out window is closed). */
  popIn(windowClosing = false) {
    if (!this.pipWin || !this.mainPlayer) return;
    const p = this.player;
    const at = p?.getCurrentTime() || 0;
    const wasPlaying = this.busy;
    const vid = this.videoId;
    this.player = this.mainPlayer;
    this.mainPlayer = null;
    const win = this.pipWin;
    this.pipWin = null;
    try {
      p?.destroy();
    } catch {
      /* window already gone */
    }
    if (!windowClosing) win.close();
    useYtWindow.setState({ popped: false });
    if (vid && this.active) {
      if (wasPlaying) this.player.loadVideoById({ videoId: vid, startSeconds: at });
      else this.player.cueVideoById({ videoId: vid, startSeconds: at });
      this.apply();
    }
  }

  get isPopped() {
    return this.pipWin !== null;
  }

  stop() {
    if (this.pipWin) {
      try {
        this.player?.destroy();
      } catch {
        /* ignore */
      }
      this.player = this.mainPlayer;
      this.mainPlayer = null;
      this.pipWin.close();
      this.pipWin = null;
      useYtWindow.setState({ popped: false });
    }
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
    useYtWindow.setState({ supported: "documentPictureInPicture" in window });
    deck = new YouTubeDeck();
    (window as unknown as { __lunaraYT: YouTubeDeck }).__lunaraYT = deck;
  }
  return deck;
}

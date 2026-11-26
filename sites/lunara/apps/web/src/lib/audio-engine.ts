/**
 * LUNARA MUSIC audio engine.
 *
 * Signal path:  <audio> deck A ─▶ GainNode (fade A) ─┐
 *               <audio> deck B ─▶ GainNode (fade B) ─┴▶ GainNode (master = user volume) ─▶ speakers
 *
 * - Fades are real gain automation on the audio graph (linearRamp on AudioParam), not CSS.
 * - The user's volume lives on the master node, so fades never touch or lose it.
 * - Every operation takes a token; a newer operation cancels older pending ones, so rapid
 *   Play/Pause taps never overlap and never leave the gain stuck halfway.
 * - Two decks let the next song start while the current one fades out (crossfade).
 * - iOS ignores HTMLMediaElement.volume, which is why everything goes through Web Audio.
 */

export interface FadeSettings {
  enabled: boolean; // master switch: "Enable fade transition"
  fadeIn: boolean; // automatic fade-in on play/resume/track start
  fadeOut: boolean; // automatic fade-out on pause/track change
  fadeInSec: number;
  fadeOutSec: number;
  crossfade: boolean; // independent from pause/resume fades
  crossfadeSec: number;
}

export const DEFAULT_FADE: FadeSettings = {
  enabled: true,
  fadeIn: true,
  fadeOut: true,
  fadeInSec: 2,
  fadeOutSec: 2,
  crossfade: false,
  crossfadeSec: 6,
};

type Listener = (e: EngineEvent) => void;
export type EngineEvent =
  | { type: "time"; position: number; duration: number }
  | { type: "state"; playing: boolean }
  | { type: "buffering"; buffering: boolean }
  | { type: "ended" }
  | { type: "error"; message: string };

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode | null;
  url: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private decks: Deck[] = [];
  private active = 0;
  private token = 0;
  private listeners = new Set<Listener>();
  private volume = 0.8;
  private rate = 1;
  fade: FadeSettings = { ...DEFAULT_FADE };
  /** True while a crossfade is mixing two decks. */
  crossfading = false;

  constructor() {
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = "auto";
      el.crossOrigin = "anonymous"; // required for Web Audio on cross-origin audio
      el.setAttribute("playsinline", "");
      this.decks.push({ el, gain: null, url: null });
      el.addEventListener("timeupdate", () => i === this.active && this.emitTime());
      el.addEventListener("durationchange", () => i === this.active && this.emitTime());
      el.addEventListener("waiting", () => i === this.active && this.emit({ type: "buffering", buffering: true }));
      el.addEventListener("playing", () => i === this.active && this.emit({ type: "buffering", buffering: false }));
      el.addEventListener("canplay", () => i === this.active && this.emit({ type: "buffering", buffering: false }));
      el.addEventListener("ended", () => i === this.active && !this.crossfading && this.emit({ type: "ended" }));
      el.addEventListener("error", () => {
        if (i !== this.active || !el.src) return;
        const code = el.error?.code;
        this.emit({
          type: "error",
          message: code === 4 ? "Format audio ini tidak disokong oleh pelayar ini." : "Gagal memuatkan audio. Semak sambungan internet.",
        });
      });
    }
  }

  /** Lazily build the audio graph on the first user gesture (autoplay policy). */
  private ensureGraph() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return; // fallback: element volume ramps
    this.ctx = new AC({ latencyHint: "playback" });
    this.master = this.ctx.createGain();
    this.master.gain.value = this.curve(this.volume);
    this.master.connect(this.ctx.destination);
    for (const d of this.decks) {
      const src = this.ctx.createMediaElementSource(d.el);
      d.gain = this.ctx.createGain();
      d.gain.gain.value = 0;
      src.connect(d.gain).connect(this.master);
    }
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: EngineEvent) {
    this.listeners.forEach((l) => l(e));
  }
  private emitTime() {
    const el = this.cur.el;
    this.emit({ type: "time", position: el.currentTime || 0, duration: Number.isFinite(el.duration) ? el.duration : 0 });
  }

  private get cur() {
    return this.decks[this.active];
  }
  private get other() {
    return this.decks[1 - this.active];
  }
  get playing() {
    return !this.cur.el.paused;
  }
  get position() {
    return this.cur.el.currentTime || 0;
  }
  get element() {
    return this.cur.el;
  }

  /** Perceptual volume curve so the slider feels linear to the ear. */
  private curve(v: number) {
    return Math.pow(Math.min(1, Math.max(0, v)), 2);
  }

  // ---------- gain automation ----------
  private now() {
    return this.ctx?.currentTime ?? 0;
  }
  private rampDeck(d: Deck, target: number, seconds: number) {
    if (d.gain && this.ctx) {
      const p = d.gain.gain;
      const t = this.now();
      const from = p.value; // current computed value, even mid-ramp
      p.cancelScheduledValues(t);
      p.setValueAtTime(from, t);
      if (seconds <= 0) p.setValueAtTime(target, t);
      else p.linearRampToValueAtTime(target, t + seconds);
      return;
    }
    // Fallback without Web Audio: step element volume (not effective on iOS, which always has Web Audio)
    const start = d.el.volume;
    const steps = Math.max(1, Math.round(seconds * 30));
    let i = 0;
    const tick = () => {
      i++;
      d.el.volume = Math.min(1, Math.max(0, start + ((target * this.volume - start) * i) / steps));
      if (i < steps) setTimeout(tick, (seconds * 1000) / steps);
    };
    tick();
  }
  private setDeckGain(d: Deck, v: number) {
    if (d.gain && this.ctx) {
      d.gain.gain.cancelScheduledValues(this.now());
      d.gain.gain.setValueAtTime(v, this.now());
    } else d.el.volume = v * this.volume;
  }

  private fadeInSec() {
    return this.fade.enabled && this.fade.fadeIn ? this.fade.fadeInSec : 0;
  }
  private fadeOutSec() {
    return this.fade.enabled && this.fade.fadeOut ? this.fade.fadeOutSec : 0;
  }

  // ---------- public controls ----------
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.curve(this.volume), this.now(), 0.02);
    else this.decks.forEach((d) => (d.el.volume = this.volume));
  }
  setRate(r: number) {
    this.rate = r;
    this.decks.forEach((d) => {
      d.el.playbackRate = r;
      d.el.preservesPitch = true;
    });
  }
  seek(sec: number) {
    const el = this.cur.el;
    if (Number.isFinite(sec)) el.currentTime = Math.max(0, Math.min(sec, el.duration || sec));
    this.emitTime();
  }

  /** Play/Resume: start at gain 0 from the saved position, ramp up to full. */
  async play() {
    this.ensureGraph();
    const my = ++this.token;
    const d = this.cur;
    if (!d.url) return;
    if (d.el.paused) this.setDeckGain(d, 0);
    try {
      await d.el.play();
    } catch (e) {
      if (my === this.token) this.emit({ type: "error", message: (e as Error).message || "Main balik disekat oleh pelayar." });
      return;
    }
    if (my !== this.token) return;
    this.rampDeck(d, 1, this.fadeInSec());
    this.emit({ type: "state", playing: true });
  }

  /** Pause: ramp to 0, then pause. A newer Play during the ramp cancels the pause. */
  async pause() {
    const my = ++this.token;
    const d = this.cur;
    const sec = this.fadeOutSec();
    this.emit({ type: "state", playing: false });
    if (sec > 0 && !d.el.paused) {
      this.rampDeck(d, 0, sec);
      await sleep(sec * 1000 + 30);
    }
    if (my !== this.token) return; // user pressed play again mid-fade
    d.el.pause();
    this.setDeckGain(d, 0);
  }

  /**
   * Switch track (next/prev/select): fade the current one out, load the new source,
   * then fade in. `cut` skips the fade-out (used when nothing is playing).
   */
  async load(url: string, opts: { autoplay: boolean; startAt?: number }) {
    this.ensureGraph();
    const my = ++this.token;
    this.crossfading = false;
    const d = this.cur;
    // silence the other deck in case a crossfade was interrupted
    const o = this.other;
    if (!o.el.paused) {
      this.rampDeck(o, 0, 0.15);
      setTimeout(() => o.el.pause(), 200);
    }
    const sec = this.fadeOutSec();
    if (!d.el.paused && sec > 0) {
      this.rampDeck(d, 0, sec);
      await sleep(sec * 1000 + 30);
      if (my !== this.token) return false;
    }
    d.el.pause();
    this.setDeckGain(d, 0);
    d.url = url;
    d.el.src = url;
    d.el.playbackRate = this.rate;
    if (opts.startAt) {
      await new Promise<void>((res) => {
        const h = () => {
          d.el.removeEventListener("loadedmetadata", h);
          res();
        };
        d.el.addEventListener("loadedmetadata", h);
        setTimeout(res, 4000);
      });
      if (my !== this.token) return false;
      d.el.currentTime = opts.startAt;
    }
    this.emitTime();
    if (opts.autoplay) {
      this.token--; // let play() own the next token without cancelling us
      await this.play();
    }
    return true;
  }

  /** Crossfade into the next track on the idle deck (independent of pause/resume fades). */
  async crossfadeTo(url: string) {
    this.ensureGraph();
    const my = ++this.token;
    const from = this.cur;
    const to = this.other;
    this.crossfading = true;
    to.url = url;
    to.el.src = url;
    to.el.playbackRate = this.rate;
    this.setDeckGain(to, 0);
    try {
      await to.el.play();
    } catch (e) {
      this.crossfading = false;
      this.emit({ type: "error", message: (e as Error).message });
      return false;
    }
    if (my !== this.token) return false;
    const sec = this.fade.crossfadeSec;
    this.active = 1 - this.active; // UI now follows the incoming track
    this.rampDeck(from, 0, sec);
    this.rampDeck(to, 1, sec);
    this.emitTime();
    this.emit({ type: "state", playing: true });
    setTimeout(() => {
      if (this.decks[1 - this.active] === from) from.el.pause();
      this.crossfading = false;
    }, sec * 1000 + 50);
    return true;
  }

  stop() {
    this.token++;
    this.decks.forEach((d) => {
      d.el.pause();
      d.el.removeAttribute("src");
      d.url = null;
    });
    this.emit({ type: "state", playing: false });
  }

  /** Debug/QA helper: current fade gain of the active deck (0..1). */
  debugGain() {
    return this.cur.gain?.gain.value ?? this.cur.el.volume;
  }
}

let engine: AudioEngine | null = null;
export function getEngine() {
  if (typeof window === "undefined") throw new Error("AudioEngine is client-only");
  if (!engine) {
    engine = new AudioEngine();
    (window as unknown as { __lunaraEngine: AudioEngine }).__lunaraEngine = engine;
  }
  return engine;
}

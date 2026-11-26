"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getEngine } from "@/lib/audio-engine";
import { catalog } from "@/lib/catalog";
import { localUrl, type LocalTrack } from "@/lib/local-music";
import type { Track } from "@/lib/types";
import { useLibrary, syncSafe } from "./library";
import { useSettings } from "./settings";
import { toast } from "./toast";
import { logPlaybackError } from "@/lib/log";
import { findVideo, findVideos, getYouTube, markBadVideo, youtubeEnabled } from "@/lib/youtube";
import type { EngineEvent } from "@/lib/audio-engine";

/** Which player is producing sound: the audio engine (device files, previews) or YouTube (full songs). */
let backend: "audio" | "yt" = "audio";
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export type Repeat = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  /** order before shuffle was switched on, so it can be restored */
  unshuffled: Track[] | null;
  index: number;
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  fullOpen: boolean;
  queueOpen: boolean;
  /** true while the current song plays in full (YouTube or a device file), false for a 30 s preview */
  full: boolean;

  current: () => Track | undefined;
  playList: (tracks: Track[], start?: number, opts?: { shuffle?: boolean }) => Promise<void>;
  playTrack: (t: Track) => Promise<void>;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: (auto?: boolean) => Promise<void>;
  prev: () => Promise<void>;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  jumpTo: (i: number) => Promise<void>;
  addToQueue: (t: Track[]) => void;
  playNext: (t: Track[]) => void;
  removeAt: (i: number) => void;
  move: (from: number, to: number) => void;
  clearQueue: () => void;
  saveQueueAsPlaylist: (name: string) => string;
  setUi: (p: Partial<Pick<PlayerState, "fullOpen" | "queueOpen">>) => void;
}

function shuffled<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Resolve a playable URL for any track source. */
async function resolveUrl(t: Track): Promise<string> {
  if (t.provider === "device") {
    const lt = useLibrary.getState().localTracks.find((x) => x.id === t.id) ?? (t as LocalTrack);
    if (!lt.local) throw new Error("Lagu tempatan ini hanya ada pada peranti asal.");
    return localUrl(lt);
  }
  const url = await catalog.previewUrl(t.id);
  if (!url) throw new Error("Pembekal tidak membenarkan lagu ini dimainkan di rantau anda.");
  return url;
}

let loadSeq = 0;
let ytFails = 0; // consecutive songs that could not be played
let xfadeFor: string | null = null;
let lastResumeSave = 0;

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => {
      async function loadCurrent(autoplay: boolean, startAt?: number) {
        const t = get().current();
        if (!t) return;
        // Resume a partly-heard song from where the listener stopped (anywhere it is started from)
        if (startAt === undefined) {
          const pr = useLibrary.getState().progress[t.id];
          if (pr && pr.pos > 5 && (!pr.dur || pr.pos < pr.dur - 15)) startAt = pr.pos;
        }
        const my = ++loadSeq;
        xfadeFor = null;
        set({ position: startAt ?? 0, duration: t.playableSeconds || t.duration || 0, buffering: autoplay });
        if (!t.playable) {
          toast(`"${t.title}" tidak boleh dimainkan: tiada kebenaran main balik dari pembekal.`);
          set({ buffering: false });
          if (autoplay) return void get().next(true);
          return;
        }
        try {
          // Full song in-app through YouTube when available; otherwise the provider's preview.
          const vid = t.provider === "youtube" ? await findVideo(t) : t.provider === "deezer" && youtubeEnabled() ? await withTimeout(findVideo(t), 7000) : t.provider === "deezer" ? await withTimeout(findVideo(t), 2500) : null;
          if (my !== loadSeq) return;
          const yt = getYouTube();
          if (vid) {
            if (backend === "audio" && getEngine().playing) await getEngine().pause();
            if (my !== loadSeq) return;
            backend = "yt";
            set({ full: true, duration: t.duration || 0 });
            await yt.load(vid, { autoplay, startAt });
            if (autoplay && useSettings.getState().keepHistory) useLibrary.getState().addRecent(t);
            updateMediaSession(t);
            return;
          }
          if (backend === "yt") {
            await yt.fadeOutAndStop();
            yt.stop();
            backend = "audio";
          }
          set({ full: t.provider === "device" });
          const url = await resolveUrl(t);
          if (my !== loadSeq) return;
          await getEngine().load(url, { autoplay, startAt });
          if (autoplay && useSettings.getState().keepHistory) useLibrary.getState().addRecent(t);
          updateMediaSession(t);
        } catch (e) {
          if (my !== loadSeq) return;
          set({ buffering: false, playing: false });
          toast((e as Error).message);
          logPlaybackError(t.id, (e as Error).message);
        }
      }

      return {
        queue: [],
        unshuffled: null,
        index: 0,
        playing: false,
        buffering: false,
        position: 0,
        duration: 0,
        volume: 0.8,
        muted: false,
        shuffle: false,
        repeat: "off",
        fullOpen: false,
        queueOpen: false,
        full: false,

        current: () => get().queue[get().index],

        playList: async (tracks, start = 0, opts) => {
          if (!tracks.length) return;
          let q = tracks.map((t) => ({ ...t }));
          let idx = start;
          const doShuffle = opts?.shuffle ?? get().shuffle;
          let unshuffled: Track[] | null = null;
          if (doShuffle) {
            unshuffled = q;
            const first = opts?.shuffle ? q[Math.floor(Math.random() * q.length)] : q[start];
            q = [first, ...shuffled(q.filter((x) => x !== first))];
            idx = 0;
          }
          set({ queue: q, index: idx, unshuffled, shuffle: doShuffle });
          await loadCurrent(true);
        },
        playTrack: async (t) => {
          const { queue, index } = get();
          const at = queue.findIndex((x) => x.id === t.id);
          if (at >= 0) return get().jumpTo(at);
          const q = [...queue.slice(0, index + 1), t, ...queue.slice(index + 1)];
          set({ queue: q, index: queue.length ? index + 1 : 0 });
          await loadCurrent(true);
        },
        toggle: () => (get().playing ? get().pause() : get().play()),
        play: () => {
          const e = getEngine();
          const t = get().current();
          if (!t) return;
          if (backend === "yt" && getYouTube().videoId) return void getYouTube().play();
          if (!e.element.src) {
            const resume = useLibrary.getState().resume;
            void loadCurrent(true, resume && resume.track.id === t.id ? resume.position : undefined);
          } else void e.play();
        },
        pause: () => void (backend === "yt" ? getYouTube().pause() : getEngine().pause()),
        next: async (auto = false) => {
          const { queue, index, repeat } = get();
          if (auto && repeat === "one") {
            if (backend === "yt") {
              getYouTube().seek(0);
              return void getYouTube().play();
            }
            getEngine().seek(0);
            return void getEngine().play();
          }
          if (index < queue.length - 1) {
            set({ index: index + 1 });
            return loadCurrent(true);
          }
          if (repeat === "all" && queue.length) {
            set({ index: 0 });
            return loadCurrent(true);
          }
          // Autoplay: continue with similar music from the catalogue (artist radio)
          const cur = get().current();
          if (useSettings.getState().autoplay && cur?.artistId) {
            try {
              const more = (await catalog.artistRadio(cur.artistId)).filter((t) => t.playable && !queue.some((q) => q.id === t.id));
              if (more.length) {
                set({ queue: [...queue, ...more], index: index + 1 });
                toast("Autoplay: menyambung dengan lagu serupa");
                return loadCurrent(true);
              }
            } catch {
              /* fall through */
            }
          }
          if (auto) set({ playing: false, position: 0 });
        },
        prev: async () => {
          const { index, position, queue, repeat } = get();
          if (position > 3 || (index === 0 && repeat !== "all")) return get().seek(0);
          set({ index: index === 0 ? queue.length - 1 : index - 1 });
          await loadCurrent(true);
        },
        seek: (s) => {
          if (backend === "yt") getYouTube().seek(s);
          else getEngine().seek(s);
          set({ position: s });
        },
        setVolume: (v) => {
          getEngine().setVolume(v);
          getYouTube().setVolume(v);
          set({ volume: v, muted: v === 0 });
        },
        toggleMute: () => {
          const m = !get().muted;
          getEngine().setVolume(m ? 0 : get().volume || 0.6);
          getYouTube().setVolume(m ? 0 : get().volume || 0.6);
          set({ muted: m });
        },
        setRate: (r) => {
          getEngine().setRate(r);
          getYouTube().setRate(r);
          useSettings.getState().set({ playbackRate: r });
        },
        toggleShuffle: () => {
          const { shuffle, queue, index, unshuffled } = get();
          const cur = queue[index];
          if (!shuffle) {
            const rest = shuffled(queue.filter((_, i) => i !== index));
            set({ shuffle: true, unshuffled: queue, queue: cur ? [cur, ...rest] : rest, index: 0 });
          } else {
            const orig = unshuffled ?? queue;
            const known = new Set(orig.map((t) => t.id));
            const restored = [...orig, ...queue.filter((t) => !known.has(t.id))];
            set({ shuffle: false, unshuffled: null, queue: restored, index: Math.max(0, restored.findIndex((t) => t.id === cur?.id)) });
          }
        },
        cycleRepeat: () => set({ repeat: get().repeat === "off" ? "all" : get().repeat === "all" ? "one" : "off" }),
        jumpTo: async (i) => {
          if (i < 0 || i >= get().queue.length) return;
          set({ index: i });
          await loadCurrent(true);
        },
        addToQueue: (t) => {
          const empty = !get().queue.length;
          set({ queue: [...get().queue, ...t] });
          toast(t.length > 1 ? `${t.length} lagu ditambah ke giliran` : `Ditambah ke giliran: ${t[0]?.title}`);
          if (empty) void loadCurrent(true);
        },
        playNext: (t) => {
          const { queue, index } = get();
          const empty = !queue.length;
          set({ queue: [...queue.slice(0, index + 1), ...t, ...queue.slice(index + 1)] });
          toast(`Dimainkan seterusnya: ${t[0]?.title}${t.length > 1 ? ` +${t.length - 1}` : ""}`);
          if (empty) void loadCurrent(true);
        },
        removeAt: (i) => {
          const { queue, index } = get();
          if (i === index) {
            const q = queue.filter((_, k) => k !== i);
            set({ queue: q, index: Math.min(index, q.length - 1) });
            if (q.length) void loadCurrent(get().playing);
            else getEngine().stop();
            return;
          }
          set({ queue: queue.filter((_, k) => k !== i), index: i < index ? index - 1 : index });
        },
        move: (from, to) => {
          const { queue, index } = get();
          const q = [...queue];
          const [x] = q.splice(from, 1);
          q.splice(to, 0, x);
          const curId = queue[index]?.id;
          set({ queue: q, index: Math.max(0, q.findIndex((t) => t.id === curId)) });
        },
        clearQueue: () => {
          const cur = get().current();
          set({ queue: cur ? [cur] : [], index: 0, unshuffled: null });
        },
        saveQueueAsPlaylist: (name) => useLibrary.getState().createPlaylist({ name, tracks: get().queue.map(syncSafe) }),
        setUi: (p) => set(p),
      };
    },
    {
      name: "lunara-player",
      version: 1,
      skipHydration: true,
      partialize: (s) => ({
        queue: s.queue.map(syncSafe).slice(0, 300),
        index: s.index,
        volume: s.volume,
        shuffle: s.shuffle,
        repeat: s.repeat,
        unshuffled: s.unshuffled?.map(syncSafe).slice(0, 300) ?? null,
      }),
    },
  ),
);

/* ---------------- engine → store wiring (client only, once) ---------------- */
let wired = false;
export function wirePlayer() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  const e = getEngine();
  const st = usePlayer.getState();
  // handles for QA scripts / devtools
  (window as unknown as { __lunara: object }).__lunara = { player: usePlayer, library: useLibrary, settings: useSettings };
  e.setVolume(st.volume);
  e.fade = useSettings.getState().fade;
  e.setRate(useSettings.getState().playbackRate);
  const yt = getYouTube();
  yt.fade = useSettings.getState().fade;
  yt.setVolume(st.volume);
  useSettings.subscribe((s) => {
    e.fade = s.fade;
    yt.fade = s.fade;
  });

  const handle = async (ev: EngineEvent, from: "audio" | "yt") => {
    if (from !== backend) return; // ignore the idle player
    const s = usePlayer.getState();
    if (ev.type === "time") {
      usePlayer.setState({ position: ev.position, duration: ev.duration || s.duration });
      const t = s.current();
      if (t && Date.now() - lastResumeSave > 5000 && ev.position > 1) {
        lastResumeSave = Date.now();
        useLibrary.getState().setResume(t, ev.position, ev.duration);
      }
      if ("mediaSession" in navigator && ev.duration && Number.isFinite(ev.duration)) {
        try {
          navigator.mediaSession.setPositionState({ duration: ev.duration, position: Math.min(ev.position, ev.duration), playbackRate: e.element.playbackRate });
        } catch {
          /* ignore */
        }
      }
      // Crossfade: start the next song on the second deck before this one ends
      const f = useSettings.getState().fade;
      const remaining = ev.duration - ev.position;
      if (backend === "audio" && f.crossfade && s.playing && ev.duration > f.crossfadeSec * 2 && remaining > 0 && remaining <= f.crossfadeSec && s.repeat !== "one" && t && xfadeFor !== t.id && !e.crossfading) {
        const nextIdx = s.index < s.queue.length - 1 ? s.index + 1 : s.repeat === "all" ? 0 : -1;
        const nt = s.queue[nextIdx];
        if (nextIdx >= 0 && nt?.playable) {
          xfadeFor = t.id;
          try {
            const url = await resolveUrl(nt);
            if (await e.crossfadeTo(url)) {
              loadSeq++;
              usePlayer.setState({ index: nextIdx });
              if (useSettings.getState().keepHistory) useLibrary.getState().addRecent(nt);
              updateMediaSession(nt);
            }
          } catch {
            /* fall back to normal transition on 'ended' */
          }
        }
      }
    } else if (ev.type === "state") usePlayer.setState({ playing: ev.playing });
    if (ev.type === "state" && ev.playing) ytFails = 0;
    else if (ev.type === "buffering") usePlayer.setState({ buffering: ev.buffering });
    else if (ev.type === "ended") {
      const done = usePlayer.getState().current();
      if (done) useLibrary.getState().clearProgress(done.id); // finished: next time starts from the beginning
      void usePlayer.getState().next(true);
    }
    else if (ev.type === "error" && from === "yt") {
      // This video can't be embedded (owner blocked it): try the next candidate, then fall back silently
      const cur = usePlayer.getState().current();
      const yt = getYouTube();
      if (cur?.provider === "youtube") {
        // a song whose owner blocked playback outside YouTube: skip it, but never race through a whole list
        yt.stop();
        ytFails++;
        if (ytFails >= 3) {
          ytFails = 0;
          usePlayer.setState({ playing: false, buffering: false });
          toast("Beberapa lagu berturut-turut tidak dibenarkan dimainkan oleh pemiliknya. Pilih lagu lain.");
          return;
        }
        toast(`"${cur.title}" tidak dibenarkan dimainkan oleh pemiliknya.`);
        void usePlayer.getState().next(true);
        return;
      }
      if (cur && yt.videoId) {
        const bad = yt.videoId;
        markBadVideo(cur, bad);
        const next = (await findVideos(cur)).find((v) => v !== bad);
        if (next && yt.active) {
          void yt.load(next, { autoplay: true, startAt: 0 });
          return;
        }
        yt.stop();
        backend = "audio";
        void usePlayer.getState().jumpTo(usePlayer.getState().index);
      }
    } else if (ev.type === "error") {
      usePlayer.setState({ buffering: false });
      toast(ev.message);
      logPlaybackError(usePlayer.getState().current()?.id, ev.message);
    }
    if (ev.type === "state" && "mediaSession" in navigator) navigator.mediaSession.playbackState = ev.playing ? "playing" : "paused";
  };
  // Safety net: keep every Play/Pause button in sync with what is really audible.
  // A mismatch must last 6 s (longer than the longest fade) before it is corrected.
  let mismatch = 0;
  setInterval(() => {
    const st = usePlayer.getState();
    if (!st.queue.length) return;
    const real = backend === "yt" ? yt.busy : e.playing;
    mismatch = real !== st.playing ? mismatch + 1 : 0;
    if (mismatch >= 6) {
      mismatch = 0;
      usePlayer.setState({ playing: real });
    }
  }, 1000);
  e.on((ev) => void handle(ev, "audio"));
  yt.on((ev) => void handle(ev, "yt"));


  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const h: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => usePlayer.getState().play()],
      ["pause", () => usePlayer.getState().pause()],
      ["nexttrack", () => void usePlayer.getState().next()],
      ["previoustrack", () => void usePlayer.getState().prev()],
      ["seekto", (d) => d.seekTime != null && usePlayer.getState().seek(d.seekTime)],
      ["seekbackward", (d) => usePlayer.getState().seek(Math.max(0, usePlayer.getState().position - (d.seekOffset ?? 10)))],
      ["seekforward", (d) => usePlayer.getState().seek(usePlayer.getState().position + (d.seekOffset ?? 10))],
    ];
    for (const [a, fn] of h) {
      try {
        ms.setActionHandler(a, fn);
      } catch {
        /* unsupported action */
      }
    }
  }

  // Keyboard: Space = play/pause, Shift+→/← = next/prev (desktop & TV remotes with media keys)
  window.addEventListener("keydown", (ev) => {
    const tag = (ev.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (ev.target as HTMLElement)?.isContentEditable) return;
    if (ev.code === "Space" && !(ev.target as HTMLElement)?.closest("button,a,[role=slider]")) {
      ev.preventDefault();
      usePlayer.getState().toggle();
    } else if (ev.key === "MediaPlayPause") usePlayer.getState().toggle();
    else if (ev.shiftKey && ev.key === "ArrowRight") void usePlayer.getState().next();
    else if (ev.shiftKey && ev.key === "ArrowLeft") void usePlayer.getState().prev();
  });
}

function updateMediaSession(t: Track) {
  if (!("mediaSession" in navigator)) return;
  const art = t.artwork ? [{ src: t.artwork, sizes: "512x512", type: t.artwork.startsWith("data:") ? "image/jpeg" : "image/jpeg" }] : [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }];
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album ?? "LUNARA MUSIC", artwork: art });
  document.title = `${t.title} · ${t.artist} | LUNARA MUSIC`;
}

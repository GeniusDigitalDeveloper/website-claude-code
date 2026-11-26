"use client";
import { MusicBackdrop } from "@/components/fx/MusicBackdrop";
import { ChevronDown, Gauge, Heart, ListMusic, Loader2, Maximize2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX, Waves } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLayout } from "@/store/layout";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { useSettings } from "@/store/settings";
import { Artwork, cx, fmt, IconBtn, SourceBadge } from "../ui";
import { QueueList } from "./Queue";

function Seek({ big }: { big?: boolean }) {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const [drag, setDrag] = useState<number | null>(null);
  const v = drag ?? position;
  const pct = duration ? (v / duration) * 100 : 0;
  return (
    <div className={cx("flex w-full items-center gap-2 text-[11px] tabular-nums text-muted", big && "text-xs")}>
      <span className="w-9 text-right">{fmt(v)}</span>
      <input
        type="range"
        className="range flex-1"
        min={0}
        max={duration || 0}
        step={0.1}
        value={v}
        aria-label="Garis masa lagu"
        aria-valuetext={`${fmt(v)} daripada ${fmt(duration)}`}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={() => drag !== null && (usePlayer.getState().seek(drag), setDrag(null))}
        onKeyUp={() => drag !== null && (usePlayer.getState().seek(drag), setDrag(null))}
        onBlur={() => drag !== null && (usePlayer.getState().seek(drag), setDrag(null))}
      />
      <span className="w-9">{fmt(duration)}</span>
    </div>
  );
}

function Volume({ className }: { className?: string }) {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? VolumeX : v < 0.5 ? Volume1 : Volume2;
  return (
    <div className={cx("flex items-center gap-1.5", className)}>
      <IconBtn label={muted ? "Nyahbisu" : "Bisu"} size="sm" onClick={() => usePlayer.getState().toggleMute()}>
        <Icon className="h-4 w-4" />
      </IconBtn>
      <input type="range" className="range w-24" min={0} max={1} step={0.01} value={v} aria-label="Kelantangan" style={{ ["--pct" as string]: `${v * 100}%` }} onChange={(e) => usePlayer.getState().setVolume(Number(e.target.value))} />
    </div>
  );
}

function RateBtn() {
  const rate = useSettings((s) => s.playbackRate);
  const rates = [0.75, 1, 1.25, 1.5];
  return (
    <button type="button" aria-label={`Kelajuan main balik ${rate}x`} title="Kelajuan main balik" onClick={() => usePlayer.getState().setRate(rates[(rates.indexOf(rate) + 1) % rates.length] ?? 1)} className="flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted hover:bg-card-hover hover:text-fg">
      <Gauge className="h-4 w-4" /> {rate}x
    </button>
  );
}

export function Transport({ big }: { big?: boolean }) {
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const has = usePlayer((s) => s.queue.length > 0);
  const p = usePlayer.getState;
  return (
    <div className={cx("flex items-center justify-center", big ? "gap-4 md:gap-6" : "gap-1.5 md:gap-3")}>
      <IconBtn label={shuffle ? "Matikan rawak" : "Main rawak"} active={shuffle} onClick={() => p().toggleShuffle()} size={big ? "md" : "sm"}>
        <Shuffle className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Lagu sebelumnya" onClick={() => p().prev()} disabled={!has} size={big ? "lg" : "md"}>
        <SkipBack className={cx("fill-current", big ? "h-6 w-6" : "h-5 w-5")} />
      </IconBtn>
      <button
        type="button"
        aria-label={playing ? "Jeda" : "Main"}
        onClick={() => p().toggle()}
        disabled={!has}
        className={cx("grid cursor-pointer place-items-center rounded-full bg-fg text-bg shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-40", big ? "h-16 w-16" : "h-11 w-11")}
      >
        {buffering ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className={cx("fill-current", big ? "h-7 w-7" : "h-5 w-5")} /> : <Play className={cx("ml-0.5 fill-current", big ? "h-7 w-7" : "h-5 w-5")} />}
      </button>
      <IconBtn label="Lagu seterusnya" onClick={() => p().next()} disabled={!has} size={big ? "lg" : "md"}>
        <SkipForward className={cx("fill-current", big ? "h-6 w-6" : "h-5 w-5")} />
      </IconBtn>
      <IconBtn label={repeat === "off" ? "Ulang semua" : repeat === "all" ? "Ulang satu" : "Matikan ulang"} active={repeat !== "off"} onClick={() => p().cycleRepeat()} size={big ? "md" : "sm"}>
        {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
      </IconBtn>
    </div>
  );
}

function FadeChip() {
  const f = useSettings((s) => s.fade);
  const on = f.enabled && (f.fadeIn || f.fadeOut);
  return (
    <Link href="/settings#playback" className={cx("hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ring-1 xl:inline-flex", on ? "text-acc ring-[color:var(--acc-via)]/40" : "text-faint ring-line")} title="Tetapan fade">
      <Waves className="h-3 w-3" /> Fade {on ? `${f.fadeInSec}s/${f.fadeOutSec}s` : "off"}
      {f.crossfade && ` · XF ${f.crossfadeSec}s`}
    </Link>
  );
}

/** Persistent mini player. Lives in the shell, so playback continues across page navigation. */
export function PlayerBar() {
  const t = usePlayer((s) => s.queue[s.index]);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const playing = usePlayer((s) => s.playing);
  const fav = useLibrary((s) => (t ? s.favourites.some((f) => f.id === t.id) : false));
  const floating = useLayout((s) => s.playerStyle === "floating");
  if (!t) return null;
  const pct = duration ? (position / duration) * 100 : 0;
  return (
    <div className={cx("pointer-events-none fixed inset-x-0 z-40 bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0", floating ? "md:px-6 md:pb-4" : "")}>
      <div style={{ backgroundColor: "var(--panel-strong)" }} className={cx("glass pointer-events-auto relative mx-2 flex items-center gap-3 rounded-2xl px-2.5 py-2 shadow-[var(--shadow)] ring-1 ring-line md:px-4 md:py-2.5", floating ? "md:mx-auto md:max-w-5xl md:rounded-[var(--radius)]" : "md:mx-0 md:rounded-none md:border-t md:border-line md:ring-0")}>
        {/* mobile progress line */}
        <div className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-line md:hidden">
          <div className="grad-bg h-full" style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => usePlayer.getState().setUi({ fullOpen: true })} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left md:w-[30%] md:flex-none" aria-label="Buka pemain skrin penuh">
          <Artwork src={t.artwork} alt="" className="h-11 w-11 md:h-14 md:w-14" rounded="rounded-xl" />
          <span className="min-w-0">
            <span translate="no" className="block truncate text-sm font-semibold">{t.title}</span>
            <span className="flex items-center gap-2 truncate text-xs text-muted">
              <span translate="no">{t.artist}</span> <SourceBadge t={t} className="hidden sm:inline-flex" />
            </span>
          </span>
        </button>
        <IconBtn label={fav ? "Buang dari kegemaran" : "Suka lagu ini"} active={fav} onClick={() => useLibrary.getState().toggleFav(t)} size="sm" className="hidden md:grid">
          <Heart className={cx("h-4 w-4", fav && "fill-current text-rose-500")} />
        </IconBtn>
        {/* mobile controls */}
        <div className="flex items-center md:hidden">
          <IconBtn label={playing ? "Jeda" : "Main"} onClick={() => usePlayer.getState().toggle()}>
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </IconBtn>
          <IconBtn label="Lagu seterusnya" onClick={() => usePlayer.getState().next()}>
            <SkipForward className="h-5 w-5 fill-current" />
          </IconBtn>
        </div>
        <div className="hidden flex-1 flex-col items-center gap-1 md:flex">
          <Transport />
          <div className="w-full max-w-xl">
            <Seek />
          </div>
        </div>
        <div className="hidden w-[30%] items-center justify-end gap-1 md:flex">
          <FadeChip />
          <RateBtn />
          <IconBtn label="Giliran lagu" size="sm" onClick={() => usePlayer.getState().setUi({ queueOpen: !usePlayer.getState().queueOpen })}>
            <ListMusic className="h-4 w-4" />
          </IconBtn>
          <Volume />
          <IconBtn label="Skrin penuh" size="sm" onClick={() => usePlayer.getState().setUi({ fullOpen: true })}>
            <Maximize2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

export function FullPlayer() {
  const open = usePlayer((s) => s.fullOpen);
  const t = usePlayer((s) => s.queue[s.index]);
  const playing = usePlayer((s) => s.playing);
  const fav = useLibrary((s) => (t ? s.favourites.some((f) => f.id === t.id) : false));
  const [tab, setTab] = useState<"art" | "queue">("art");
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && usePlayer.getState().setUi({ fullOpen: false });
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  return (
    <AnimatePresence>
      {open && t && (
        <motion.div role="dialog" aria-modal="true" aria-label="Pemain skrin penuh" className="fixed inset-0 z-[70] overflow-hidden bg-bg" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 260 }}>
          {/* blurred artwork backdrop */}
          {t.artwork && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.artwork} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-35 blur-3xl" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[color:var(--bg)]/40 via-[color:var(--bg)]/70 to-[color:var(--bg)]" />
          <MusicBackdrop strong className="absolute inset-0" />
          <div className="relative mx-auto flex h-full max-w-6xl flex-col px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <IconBtn label="Tutup pemain" onClick={() => usePlayer.getState().setUi({ fullOpen: false })}>
                <ChevronDown className="h-6 w-6" />
              </IconBtn>
              <div className="flex gap-1 rounded-full bg-card/70 p-1 ring-1 ring-line lg:hidden">
                {(["art", "queue"] as const).map((k) => (
                  <button key={k} onClick={() => setTab(k)} className={cx("cursor-pointer rounded-full px-3 py-1 text-xs font-semibold", tab === k ? "btn-white font-bold" : "text-muted")}>
                    {k === "art" ? "Sedang dimainkan" : "Giliran"}
                  </button>
                ))}
              </div>
              <RateBtn />
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
              <div className={cx("flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-6", tab === "queue" && "hidden lg:flex")}>
                <motion.div key={t.id} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: playing ? 1 : 0.94, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} className="aspect-square w-[min(100%,420px,46vh)] shrink-0">
                  <Artwork src={t.artwork} alt={`${t.title} oleh ${t.artist}`} className="h-full w-full shadow-2xl" rounded="rounded-[calc(var(--radius)*1.3)]" />
                </motion.div>
                <div className="w-full min-w-0 max-w-xl">
                  <div className="flex items-start justify-between gap-3">
                    {/* same width as the heart on the right, so the title is truly centred on phones */}
                    <span aria-hidden className="h-10 w-10 shrink-0 md:hidden" />
                    <div className="min-w-0 flex-1 text-center md:text-left">
                      <h2 translate="no" className="truncate font-display text-2xl font-bold md:text-3xl">{t.title}</h2>
                      <p translate="no" className="mt-1 truncate text-muted">
                        {t.artistId ? (
                          <Link href={`/artist?id=${t.artistId}`} onClick={() => usePlayer.getState().setUi({ fullOpen: false })} className="hover:underline">
                            {t.artist}
                          </Link>
                        ) : (
                          t.artist
                        )}
                        {t.album && ` · ${t.album}`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                        <SourceBadge t={t} />
                      </div>
                    </div>
                    <IconBtn label={fav ? "Buang dari kegemaran" : "Suka lagu ini"} active={fav} onClick={() => useLibrary.getState().toggleFav(t)}>
                      <Heart className={cx("h-6 w-6", fav && "fill-current text-rose-500")} />
                    </IconBtn>
                  </div>
                  <div className="mt-5">
                    <Seek big />
                  </div>
                  <div className="mt-4">
                    <Transport big />
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <FadeChip />
                    <Volume className="ml-auto" />
                  </div>
                  
                </div>
              </div>
              <div className={cx("panel glass min-h-0 flex-col overflow-hidden p-3", tab === "queue" ? "flex" : "hidden lg:flex")}>
                <QueueList />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

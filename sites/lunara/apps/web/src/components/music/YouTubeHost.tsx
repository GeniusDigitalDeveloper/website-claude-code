"use client";
import { ExternalLink, MonitorPlay, GripHorizontal, Maximize2, Minimize2, PanelBottom, PictureInPicture2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/store/player";
import { getYouTube, useYtWindow } from "@/lib/youtube";
import { toast } from "@/store/toast";
import { cx } from "../ui";

/**
 * Hosts the YouTube player used for full-length songs.
 * YouTube's terms require the player to stay visible (at least 200×200 px) while it plays, so it
 * cannot be hidden. Instead the viewer can:
 *  - keep it docked right above the player bar, in line with the song's cover and title (default),
 *  - drag it anywhere on screen (position is remembered),
 *  - pick a size: small (200×200, the minimum allowed), medium or large.
 * When nothing plays from YouTube it stays mounted but invisible (the player is created once).
 */
type Size = "s" | "m" | "l" | "xl";
const SIZES: Record<Size, { w: number; h: number }> = { s: { w: 200, h: 200 }, m: { w: 356, h: 200 }, l: { w: 480, h: 270 }, xl: { w: 854, h: 480 } };
const HEADER = 30;
const KEY = "lunara-yt-host";

function load(): { size: Size; pos: { x: number; y: number } | null } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { size: (["s", "m", "l", "xl"] as Size[]).includes(v.size) ? v.size : "s", pos: v.pos ?? null };
  } catch {
    return { size: "s", pos: null };
  }
}

export function YouTubeHost() {
  const t = usePlayer((s) => s.queue[s.index]);
  const full = usePlayer((s) => s.full);
  const show = Boolean(t && full && t.provider === "youtube");
  const popped = useYtWindow((s) => s.popped);
  const canPop = useYtWindow((s) => s.supported);
  const [size, setSize] = useState<Size>("s");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null); // null = docked above the player bar
  const [isMobile, setIsMobile] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = load();
    setSize(s.size);
    setPos(s.pos);
    const mq = matchMedia("(max-width: 767px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ size, pos }));
    } catch {
      /* ignore */
    }
  }, [size, pos]);

  const [vw, setVw] = useState(1440);
  useEffect(() => {
    const r = () => setVw(window.innerWidth);
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  const want = isMobile ? SIZES.s : SIZES[size];
  const dim = want.w > vw - 32 ? { w: vw - 32, h: Math.round(((vw - 32) * 9) / 16) } : want;
  const clamp = (x: number, y: number) => ({
    x: Math.max(8, Math.min(window.innerWidth - dim.w - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - dim.h - HEADER - 8, y)),
  });

  // keep a dragged card on screen when the window or the size changes
  useEffect(() => {
    if (!pos) return;
    const fix = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, isMobile]);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const r = box.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };
  const onUp = () => (drag.current = null);

  // docked: right above the player bar (phones: bottom-right corner, YouTube's minimum size 200×200).
  // Drag the thin bar on top to move it anywhere; the "dock" button puts it back.
  const docked = isMobile ? { right: 8, bottom: "calc(140px + env(safe-area-inset-bottom))" } : { left: 16, bottom: 104 };
  const style: React.CSSProperties = pos ? { left: pos.x, top: pos.y, width: dim.w } : { ...docked, width: dim.w };

  const btn = "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-fg/80 hover:bg-card-hover hover:text-fg";
  return (
    <div
      ref={box}
      aria-hidden={!show}
      style={style}
      className={cx("fixed z-[45] overflow-hidden rounded-2xl transition-[opacity,scale] duration-500", show ? "panel panel-strong scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0")}
    >
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className="flex h-[30px] cursor-grab touch-none items-center gap-1 px-2 select-none active:cursor-grabbing" title="Seret untuk alih">
        <GripHorizontal className="h-4 w-4 text-faint" aria-hidden />
        <span translate="no" className="min-w-0 flex-1 truncate text-[11px] font-semibold text-muted">
          {t?.title}
        </span>
        {!isMobile && (
          <>
            <button type="button" aria-label="Saiz kecil" title="Kecil" onClick={() => setSize("s")} className={cx(btn, size === "s" && "btn-white")}>
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Saiz sederhana" title="Sederhana" onClick={() => setSize("m")} className={cx(btn, size === "m" && "btn-white")}>
              <Square className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Saiz besar" title="Besar" onClick={() => setSize("l")} className={cx(btn, size === "l" && "btn-white")}>
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Saiz tonton video" title="Tonton video (paling besar)" onClick={() => setSize("xl")} className={cx(btn, size === "xl" && "btn-white")}>
              <MonitorPlay className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {canPop && !popped && (
          <button
            type="button"
            aria-label="Tarik keluar ke tetingkap sendiri"
            title="Tarik keluar ke tetingkap sendiri (boleh dialih ke skrin kedua)"
            onClick={async () => {
              if (!(await getYouTube().popOut())) toast("Tetingkap video tidak dapat dibuka.");
            }}
            className={btn}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" aria-label="Lekat di atas bar pemain" title="Lekat di atas bar pemain" onClick={() => setPos(null)} className={cx(btn, !pos && "btn-white")}>
          <PanelBottom className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative bg-black" style={{ height: popped ? 0 : dim.h }}>
        <div id="yt-player-mount" className="h-full w-full" />
      </div>
      {popped && (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <PictureInPicture2 className="h-4 w-4 shrink-0 text-acc" aria-hidden />
          <span className="min-w-0 flex-1 text-[11px] text-muted">Video dalam tetingkap berasingan</span>
          <button type="button" onClick={() => getYouTube().popIn()} className="btn-luxe shrink-0 cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold">
            Masukkan semula
          </button>
        </div>
      )}
    </div>
  );
}

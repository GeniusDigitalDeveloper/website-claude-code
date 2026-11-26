"use client";
import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { cx } from "../ui";

/**
 * Living background while music plays: a tall equaliser of bars moving to the beat,
 * in the current theme's colours. It "breathes" to a beat (the YouTube player doesn't expose its audio,
 * so the motion follows the song's tempo feel rather than the exact sound). It fades away when paused,
 * stops drawing when the window is hidden, and stays still for people who prefer reduced motion.
 */
export function MusicBackdrop({ className, strong = false }: { className?: string; strong?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const colors = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
      return [v("--acc-from", "#0891b2"), v("--acc-via", "#2563eb"), v("--acc-to", "#7c3aed"), v("--orb-a", "#5ad1f5")];
    };
    let pal = colors();
    const palTimer = setInterval(() => (pal = colors()), 2000); // follows theme changes

    const BARS = 48;
    const bars = Array.from({ length: BARS }, () => 0);
    const seeds = Array.from({ length: BARS }, () => Math.random() * 1000);

    let level = 0; // 0 = silent/paused, 1 = playing (eased)
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const playing = usePlayer.getState().playing;
      level += ((playing ? 1 : 0) - level) * Math.min(1, dt * 2.2);
      if (level < 0.01 && !playing) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        return;
      }
      t += dt * (reduce ? 0 : 1);
      // a soft beat around 100 bpm with a little swing
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * (100 / 60))), 6);
      const pulse = 0.55 + 0.45 * beat;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      const A = level * (strong ? 1.15 : 1);

      // 2) equaliser skyline along the bottom
      const bw = w / BARS;
      for (let i = 0; i < BARS; i++) {
        const n = 0.5 + 0.5 * Math.sin(t * (2.1 + (i % 7) * 0.31) + seeds[i]) * Math.sin(t * 0.9 + seeds[i] * 0.5);
        const centre = 1 - Math.abs(i - BARS / 2) / (BARS / 2);
        const target = (0.15 + 0.85 * n * (0.45 + 0.55 * centre)) * pulse;
        bars[i] += (target - bars[i]) * Math.min(1, dt * 10);
        const bh = bars[i] * h * (strong ? 0.5 : 0.4);
        const x = i * bw + bw * 0.18;
        const g = ctx.createLinearGradient(0, h - bh, 0, h);
        g.addColorStop(0, pal[2]);
        g.addColorStop(1, pal[0]);
        ctx.globalAlpha = A * 0.34;
        ctx.fillStyle = g;
        const r = Math.min(6, bw * 0.3);
        ctx.beginPath();
        ctx.roundRect(x, h - bh, bw * 0.64, bh + r, r);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(palTimer);
      ro.disconnect();
    };
  }, [strong]);

  return <canvas ref={ref} aria-hidden className={cx("pointer-events-none h-full w-full", className)} />;
}

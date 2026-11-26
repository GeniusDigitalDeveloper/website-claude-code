"use client";
import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import { cx } from "../ui";

/**
 * Living background while music plays: flowing light waves, an equaliser skyline and rising sparks,
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
    const sparks = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, s: 0.02 + Math.random() * 0.06, c: Math.floor(Math.random() * 4) }));

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

      // 1) flowing light waves
      for (let k = 0; k < 3; k++) {
        const yBase = h * (0.55 + k * 0.12);
        const amp = (28 + k * 14) * (0.6 + 0.6 * pulse);
        const g = ctx.createLinearGradient(0, yBase - amp, w, yBase + amp);
        g.addColorStop(0, pal[k % 4]);
        g.addColorStop(1, pal[(k + 2) % 4]);
        ctx.globalAlpha = A * (0.3 - k * 0.06);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 16) {
          const y = yBase + Math.sin(x / (160 + k * 60) + t * (0.8 + k * 0.35)) * amp + Math.sin(x / 73 - t * 1.3) * amp * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      // 2) equaliser skyline along the bottom
      const bw = w / BARS;
      for (let i = 0; i < BARS; i++) {
        const n = 0.5 + 0.5 * Math.sin(t * (2.1 + (i % 7) * 0.31) + seeds[i]) * Math.sin(t * 0.9 + seeds[i] * 0.5);
        const centre = 1 - Math.abs(i - BARS / 2) / (BARS / 2);
        const target = (0.15 + 0.85 * n * (0.45 + 0.55 * centre)) * pulse;
        bars[i] += (target - bars[i]) * Math.min(1, dt * 10);
        const bh = bars[i] * h * (strong ? 0.32 : 0.26);
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

      // 3) rising sparks
      for (const p of sparks) {
        p.y -= p.s * dt * (0.6 + pulse);
        if (p.y < -0.05) (p.y = 1.05, (p.x = Math.random()));
        const x = p.x * w + Math.sin(t + p.x * 20) * 12;
        const y = p.y * h;
        ctx.globalAlpha = A * 0.75 * (0.4 + 0.6 * Math.sin(t * 2 + p.x * 10) ** 2);
        ctx.fillStyle = pal[p.c];
        ctx.beginPath();
        ctx.arc(x, y, p.r * (0.8 + 0.5 * pulse), 0, Math.PI * 2);
        ctx.fill();
      }

      // 4) a glow that swells on the beat
      const rg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.6);
      rg.addColorStop(0, pal[1]);
      rg.addColorStop(1, "transparent");
      ctx.globalAlpha = A * 0.16 * pulse;
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
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

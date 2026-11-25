"use client";
import { useEffect } from "react";

/**
 * Water-drop ripple on every tap/click anywhere in the app (songs, cards, borders, background).
 * Drawn in a fixed overlay at the pointer, so it never changes layout or blocks clicks.
 * Animates scale/opacity only; skipped when the user prefers reduced motion.
 */
export function WaterRipple() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let live = 0;
    const onDown = (e: PointerEvent) => {
      if (reduce.matches || e.button !== 0 || live > 6) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input[type=range], input[type=text], input[type=email], input[type=password], input:not([type]), textarea")) return;
      const host = target?.closest<HTMLElement>("button, a, [role=button], [role=option], [role=menuitem], section, .panel, li") ?? null;
      const r = host?.getBoundingClientRect();
      const size = Math.max(110, Math.min(420, r ? Math.max(r.width, r.height) * 1.3 : 260));
      const el = document.createElement("span");
      el.className = "water-drop";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.width = el.style.height = `${size}px`;
      el.innerHTML = "<i></i><i></i><i></i>";
      document.body.appendChild(el);
      live++;
      setTimeout(() => {
        el.remove();
        live--;
      }, 1150);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}

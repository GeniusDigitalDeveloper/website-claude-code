"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { KIND_LABEL, type SlideItem, type TvDoc } from "@/lib/types";

/** Panel slaid 16:9 (nisbah 1920x1080) bersaiz kecil. Teks diskala mengikut lebar panel (cqw). */
export default function SlidePanel({ slides, anim, secs, T, B }: { slides: SlideItem[]; anim: NonNullable<TvDoc["slideAnim"]>; secs: number; T: (k: string) => CSSProperties; B: (k: string) => CSSProperties }) {
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); if (slides.length < 2) return; const t = setInterval(() => setI((x) => (x + 1) % slides.length), Math.max(4, secs) * 1000); return () => clearInterval(t); }, [slides.length, secs]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  const len = s.text.length, size = len > 170 ? 3.6 : len > 110 ? 4.3 : 5.2;
  return (
    <div className="sl-wrap glass overflow-hidden rounded-3xl" style={B("slide-frame")} data-el="slide-frame" data-kind="border" data-label="Bingkai slaid" role="region" aria-label="Slaid" aria-live="off">
      <div className="sl-box" style={{ aspectRatio: "16 / 9" }}>
        <div key={s.id + i} className={`sl-card sl-${anim} flex h-full flex-col justify-between`} style={{ padding: "4cqw 5cqw" }}>
          <div className="sl-head" style={{ fontSize: "3cqw" }}>
            <span className="sl-label">{s.title || KIND_LABEL[s.kind]}{s.kind === "hadis" && <span className="ar sl-saw" lang="ar">ﷺ</span>}</span>
            <span className="sl-count tabular-nums">{(i % slides.length) + 1} / {slides.length}</span>
          </div>
          <p className="font-bold leading-snug text-white" data-el="slide-text" data-kind="text" data-label="Teks slaid" style={{ fontSize: `${size}cqw`, ...T("slide-text") }}>{s.text}</p>
          {s.source && <p className="font-semibold" style={{ fontSize: "2.8cqw", color: "var(--acc, #fde68a)" }}>{s.source}</p>}
        </div>
      </div>
    </div>
  );
}

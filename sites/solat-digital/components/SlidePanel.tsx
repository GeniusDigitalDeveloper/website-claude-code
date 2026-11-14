"use client";
import { useEffect, useState } from "react";
import { KIND_LABEL, type SlideItem, type TvDoc } from "@/lib/types";

/** Panel slaid 16:9 (nisbah 1920x1080) bersaiz kecil. Teks diskala mengikut lebar panel (cqw). */
export default function SlidePanel({ slides, anim, secs }: { slides: SlideItem[]; anim: NonNullable<TvDoc["slideAnim"]>; secs: number }) {
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); if (slides.length < 2) return; const t = setInterval(() => setI((x) => (x + 1) % slides.length), Math.max(4, secs) * 1000); return () => clearInterval(t); }, [slides.length, secs]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  const len = s.text.length, size = len > 170 ? 3.6 : len > 110 ? 4.3 : 5.2;
  return (
    <div className="sl-wrap glass overflow-hidden rounded-3xl" role="region" aria-label="Slaid" aria-live="off">
      <div className="sl-box" style={{ aspectRatio: "16 / 9" }}>
        <div key={s.id + i} className={`sl-card sl-${anim} flex h-full flex-col justify-between`} style={{ padding: "4cqw 5cqw" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="sl-chip">{s.title || KIND_LABEL[s.kind]}{s.kind === "hadis" && <span className="ar" lang="ar" style={{ marginLeft: ".4em", fontSize: "1.3em" }}>ﷺ</span>}</span>
            <span style={{ fontSize: "2.6cqw" }} className="tabular-nums text-white/70">{(i % slides.length) + 1} / {slides.length}</span>
          </div>
          <p className="font-bold leading-snug text-white" style={{ fontSize: `${size}cqw` }}>{s.text}</p>
          {s.source && <p className="font-semibold text-amber-200" style={{ fontSize: "2.8cqw" }}>{s.source}</p>}
        </div>
      </div>
    </div>
  );
}

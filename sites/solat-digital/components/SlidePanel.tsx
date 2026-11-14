"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { KIND_LABEL, type SlideItem, type TvDoc } from "@/lib/types";
import { bgOf } from "@/lib/slideBackgrounds";

/** Panel slaid 16:9 (nisbah 1920x1080) bersaiz kecil. Slaid teks (latar foto sebenar) dan slaid gambar (kekal seperti dimuat naik). */
export default function SlidePanel({ slides, anim, secs, T, B, imgs }: { slides: SlideItem[]; anim: NonNullable<TvDoc["slideAnim"]>; secs: number; T: (k: string) => CSSProperties; B: (k: string) => CSSProperties; imgs: Record<string, string> }) {
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); if (slides.length < 2) return; const t = setInterval(() => setI((x) => (x + 1) % slides.length), Math.max(4, secs) * 1000); return () => clearInterval(t); }, [slides.length, secs]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  const len = s.text.length, size = len > 170 ? 3.6 : len > 110 ? 4.3 : 5.2;
  const bg = bgOf(s.bg);
  const photo = s.kind === "gambar" ? imgs[s.imgId ?? ""] : undefined;
  return (
    <div className="sl-wrap glass overflow-hidden rounded-3xl" style={B("slide-frame")} data-el="slide-frame" data-kind="border" data-label="Bingkai slaid" role="region" aria-label="Slaid" aria-live="off">
      <div className="sl-box" style={{ aspectRatio: "16 / 9", ...(bg ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.50), rgba(2,6,23,.78)), url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
        {s.kind === "gambar" ? (
          <div key={s.id + i} className={`sl-card sl-${anim} h-full w-full`}>{photo ? <img src={photo} alt="Slaid" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-white/70" style={{ fontSize: "3cqw" }}>Memuatkan gambar…</div>}</div>
        ) : (
          <div key={s.id + i} className={`sl-card sl-${anim} flex h-full flex-col justify-between`} style={{ padding: "4cqw 5cqw" }}>
            <div className="sl-head" style={{ fontSize: "3cqw" }}>
              <span className="sl-label">{s.title || KIND_LABEL[s.kind]}{s.kind === "hadis" && <span className="ar sl-saw" lang="ar">ﷺ</span>}</span>
              <span className="sl-count tabular-nums">{(i % slides.length) + 1} / {slides.length}</span>
            </div>
            <p className="font-bold leading-snug text-white sl-text" data-el="slide-text" data-kind="text" data-label="Teks slaid" style={{ fontSize: `${size}cqw`, ...T("slide-text") }}>{s.text}</p>
            <div className="flex items-end justify-between gap-2">
              {s.source ? <p className="font-semibold" style={{ fontSize: "2.8cqw", color: "var(--acc, #fde68a)" }}>{s.source}</p> : <span />}
              {bg && <span className="text-right text-white/70" style={{ fontSize: "1.5cqw", maxWidth: "46%" }}>{bg.credit}</span>}
            </div>
          </div>)}
      </div>
    </div>
  );
}

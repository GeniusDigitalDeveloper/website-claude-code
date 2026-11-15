"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { driveDirect, loadVideoBlob, youtubeId, ytEmbed } from "@/lib/media";
import { KIND_LABEL, type SlideItem, type TvDoc } from "@/lib/types";
import { bgOf } from "@/lib/slideBackgrounds";
import { arCss, loadSlideFonts } from "@/lib/slideFonts";

/** Panel slaid 16:9 (nisbah 1920x1080) bersaiz kecil. Slaid teks (latar foto sebenar) dan slaid gambar (kekal seperti dimuat naik). */
export default function SlidePanel({ slides, anim, secs, T, B, imgs }: { slides: SlideItem[]; anim: NonNullable<TvDoc["slideAnim"]>; secs: number; T: (k: string) => CSSProperties; B: (k: string) => CSSProperties; imgs: Record<string, string> }) {
  const [i, setI] = useState(0);
  useEffect(() => { loadSlideFonts(slides); }, [slides]);
  const ref = useRef(slides); ref.current = slides; const key = slides.map((x) => x.id).join(",");
  useEffect(() => { setI(0); }, [key]);
  // setiap slaid ada tempoh sendiri (video: tempoh video, lain-lain: saat lalai)
  useEffect(() => {
    const l = ref.current; if (l.length < 2) return; const cur = l[i % l.length];
    const ms = (cur.kind === "video" ? Math.min(120, Math.max(5, cur.dur || 15)) : Math.max(4, secs)) * 1000;
    const t = setTimeout(() => setI((x) => (x + 1) % l.length), ms); return () => clearTimeout(t);
  }, [i, key, secs]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  const len = s.text.length, hasAr = !!s.ar?.trim(), alen = s.ar?.length ?? 0;
  const size = (hasAr ? (len > 170 ? 2.4 : len > 110 ? 2.8 : 3.3) : (len > 170 ? 3.6 : len > 110 ? 4.3 : 5.2)) * (s.sz ?? 1);
  const arSize = (alen > 140 ? 4.4 : alen > 80 ? 5.4 : 6.8) * (s.arSz ?? 1);
  const bg = bgOf(s.bg);
  const photo = s.kind === "gambar" ? imgs[s.imgId ?? ""] : undefined;
  const tphoto = s.kind !== "gambar" && s.kind !== "video" && s.imgId ? imgs[s.imgId] : undefined;
  const yt = s.kind === "video" && s.videoUrl ? youtubeId(s.videoUrl) : null;
  return (
    <div className="sl-wrap glass overflow-hidden rounded-3xl" style={B("slide-frame")} data-el="slide-frame" data-kind="slide" data-slide={s.id} data-label="Slaid" role="region" aria-label="Slaid" aria-live="off">
      <div className="sl-box" style={{ aspectRatio: "16 / 9", ...(tphoto ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.45), rgba(2,6,23,.75)), url(${tphoto})`, backgroundSize: "cover", backgroundPosition: "center" } : bg ? { backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.50), rgba(2,6,23,.78)), url(${bg.url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
        {s.kind === "video" ? (
          <div key={s.id + i} className={`sl-card sl-${anim} h-full w-full bg-black`}>
            {yt ? <iframe title="Video slaid" src={ytEmbed(yt)} allow="autoplay; encrypted-media" className="h-full w-full border-0" /> : <VideoEl s={s} />}
          </div>
        ) : s.kind === "gambar" ? (
          <div key={s.id + i} className={`sl-card sl-${anim} h-full w-full`}>{photo ? <img src={photo} alt="Slaid" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-white/70" style={{ fontSize: "3cqw" }}>Memuatkan gambar…</div>}</div>
        ) : (
          <div key={s.id + i} className={`sl-card sl-${anim} flex h-full flex-col justify-between`} style={{ padding: "4cqw 5cqw" }}>
            <div className="sl-head" style={{ fontSize: "3cqw" }}>
              <span className="sl-label">{s.title || KIND_LABEL[s.kind]}{s.kind === "hadis" && <span className="ar sl-saw" lang="ar">ﷺ</span>}</span>
              <span className="sl-count tabular-nums">{(i % slides.length) + 1} / {slides.length}</span>
            </div>
            <div className="flex min-h-0 flex-col justify-center" style={{ gap: "1.6cqw" }}>
              {hasAr && <p lang="ar" dir="rtl" className="text-center font-bold text-white" style={{ fontFamily: arCss(s.arFont), fontSize: `${arSize}cqw`, lineHeight: 1.75, textShadow: "0 2px 12px rgba(0,0,0,.55)" }}>{s.ar}</p>}
              {s.text.trim() && <p className={`font-bold leading-snug text-white sl-text ${hasAr ? "text-center" : ""}`} style={{ fontSize: `${size}cqw`, ...(s.font ? { fontFamily: `"${s.font}", var(--font-sans, sans-serif)` } : {}) }}>{s.text}</p>}
            </div>
            <div className="flex items-end justify-between gap-2">
              {s.source ? <p className="font-semibold" style={{ fontSize: "2.8cqw", color: "var(--acc, #fde68a)" }}>{s.source}</p> : <span />}
              {bg && !tphoto && <span className="text-right text-white/70" style={{ fontSize: "1.5cqw", maxWidth: "46%" }}>{bg.credit}</span>}
            </div>
          </div>)}
      </div>
    </div>
  );
}

function VideoEl({ s }: { s: SlideItem }) {
  const [src, setSrc] = useState<string | null>(s.vidPath ? null : s.videoUrl ? driveDirect(s.videoUrl) : null);
  const [err, setErr] = useState(false);
  useEffect(() => { if (s.vidPath) { let ok = true; loadVideoBlob(s.vidPath, s.mime || "video/mp4").then((u) => ok && setSrc(u)).catch(() => ok && setErr(true)); return () => { ok = false; }; } }, [s.vidPath, s.mime]);
  if (err) return <div className="grid h-full place-items-center text-white/70" style={{ fontSize: "3cqw" }}>Video tidak dapat dimuatkan</div>;
  if (!src) return <div className="grid h-full place-items-center text-white/70" style={{ fontSize: "3cqw" }}>Memuatkan video…</div>;
  return <video src={src} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover" onError={() => setErr(true)} />;
}

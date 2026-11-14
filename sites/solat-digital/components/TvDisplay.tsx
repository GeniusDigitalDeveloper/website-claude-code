"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePwaInstall } from "@/lib/usePwa";
import type { TvDoc } from "@/lib/types";
import { ref, set, serverTimestamp, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { AzanItem } from "@/lib/useAzan";
import { type Times, buildItems, clk, detectZone, fmtHijri, hms, isFriday, klDay, klNow, klSec, loadTimes, prayIdx, syncClock, to12 } from "@/lib/prayer";
import SlidePanel from "@/components/SlidePanel";
import { DEFAULT_SLIDES } from "@/lib/defaultSlides";
import { ensureArabicFont } from "@/lib/arabicFont";
import type { Defaults } from "@/lib/types";
import { zInfo } from "@/lib/zones";
import { playRing } from "@/lib/ringtone";

const reduce = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function Slides({ imgs, anim, secs }: { imgs: string[]; anim: TvDoc["anim"]; secs: number }) {
  const list = (imgs.length ? imgs : ["/assets/mosque.jpg"]).slice(0, 10);
  const [i, setI] = useState(0);
  useEffect(() => { if (list.length < 2) return; const t = setInterval(() => setI((x) => (x + 1) % list.length), Math.max(4, secs) * 1000); return () => clearInterval(t); }, [list.length, secs]);
  const r = reduce();
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {list.map((src, n) => (
        <div key={src + n} className="absolute inset-0 bg-cover bg-center" style={{
          backgroundImage: `url("${src}")`, opacity: n === i ? 1 : 0, transition: `opacity 1.8s ease, transform ${secs + 2.5}s linear`,
          transform: r || anim === "fade" ? "none" : n === i ? (anim === "zoomout" ? "scale(1)" : "scale(1.12)") : (anim === "zoomout" ? "scale(1.12)" : "scale(1)"),
        }} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/85" />
    </div>
  );
}

export default function TvDisplay({ m, mid, azan, extra, defaults }: { m: TvDoc; mid: string; azan: AzanItem | null; extra: string[]; defaults?: Defaults }) {
  const demo = m.plan !== "full";
  usePwaInstall();
  const [times, setTimes] = useState<Times | null>(null);
  const [zone, setZone] = useState(m.zone);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(0);
  const [pop, setPop] = useState<string | null>(null);
  const [ctl, setCtl] = useState(true);
  const [full, setFull] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const day = useRef("");
  const rang = useRef<Set<string>>(new Set());
  const pre = Math.max(0, m.preMin ?? 5), delayS = Math.max(0, m.azanDelayMin ?? 0) * 60, vol = Math.max(5, m.volume ?? 100) / 100;
  const azanOn = !m.azanMute; // senyap azan ditetapkan oleh admin masjid dalam panel (nada masuk waktu kekal berbunyi)
  const font = m.font || defaults?.font || "Plus Jakarta Sans";
  const arChoice = m.arabicFont || defaults?.arabicFont || "honorifics";
  const [arFam, setArFam] = useState("Arabic Honorifics Complete");
  useEffect(() => { setArFam(ensureArabicFont(arChoice, defaults?.customFonts)); }, [arChoice, defaults?.customFonts]);

  useEffect(() => { const id = "sd-font"; let l = document.getElementById(id) as HTMLLinkElement | null; if (!l) { l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; document.head.appendChild(l); } l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@400;600;700;800&display=swap`; }, [font]);
  const fetchTimes = useCallback(async () => {
    try { const z = m.zone || (await detectZone()); setZone(z); setTimes(await loadTimes(z)); day.current = klDay(klNow()); setErr(""); }
    catch { setErr("Waktu solat tidak dapat dimuatkan. Semak sambungan internet."); }
  }, [m.zone]);
  useEffect(() => { if (!mid) return; const r = ref(rtdb, `presence/${mid}`); const beat = () => set(r, { t: serverTimestamp() }).catch(() => {}); beat(); const t = setInterval(beat, 60000); return () => clearInterval(t); }, [mid]);
  useEffect(() => { syncClock().then(fetchTimes); const t = setInterval(syncClock, 30 * 60e3); return () => clearInterval(t); }, [fetchTimes]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); setNow(Date.now()); return () => clearInterval(t); }, []);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch {} };
    get(); const wl = setInterval(get, 5 * 60e3); const v = () => document.visibilityState === "visible" && get(); document.addEventListener("visibilitychange", v);
    let h: ReturnType<typeof setTimeout>; const show = () => { setCtl(true); clearTimeout(h); h = setTimeout(() => setCtl(false), 4000); };
    show(); addEventListener("pointermove", show); addEventListener("keydown", show);
    const fs = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", fs);
    return () => { clearInterval(wl); lock?.release().catch(() => {}); document.removeEventListener("visibilitychange", v); removeEventListener("pointermove", show); removeEventListener("keydown", show); document.removeEventListener("fullscreenchange", fs); clearTimeout(h); };
  }, []);

  const d = klNow(); void now; void clk;
  const fri = isFriday(d);
  const items = times ? buildItems(times, fri, m.jumaatTime) : [];
  const idx = times ? prayIdx(items, klSec(d)) : null;
  const act = idx?.items ?? [];
  if (times && day.current && day.current !== klDay(d)) { day.current = klDay(d); fetchTimes(); }

  const stop = useCallback(() => { const a = audio.current; if (!a) return; audio.current = null; let v = a.volume; const f = setInterval(() => { v -= 0.1; if (v <= 0) { clearInterval(f); a.pause(); } else a.volume = v; }, 70); }, []);
  const closePop = useCallback((key?: string) => { if (key) try { localStorage.setItem(key, "1"); } catch {} stop(); setPop(null); }, [stop]);
  const cur = idx && idx.cur >= 0 ? act[idx.cur] : null;
  const sinceCur = idx && cur ? idx.sec - cur.sec : -1;
  const popKey = cur ? `sd_pd_${mid || "demo"}_${klDay(d)}_${cur.k}` : "";
  useEffect(() => {
    if (demo || !idx || !cur || pop !== null || sinceCur > 1800 + delayS || sinceCur < delayS) return;
    try { if (localStorage.getItem(popKey)) return; } catch {}
    setPop(cur.k);
    if (azanOn) { const a = new Audio(cur.k === "fajr" ? (azan?.fajrUrl || azan?.url || "/assets/azan-subuh.m4a") : (azan?.url || "/assets/azan.m4a")); a.volume = vol; audio.current = a; a.play().catch(() => { const again = () => audio.current === a && a.play().catch(() => {}); addEventListener("pointerdown", again, { once: true }); }); }
  }, [cur?.k, sinceCur, pop, azanOn, popKey, demo, delayS, vol]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (demo || !idx || pre === 0 || (m.ringtone ?? "chime") === "off" || idx.diff > pre * 60 || idx.diff <= 0) return;
    const k = `${klDay(klNow())}_${act[idx.ni]?.k}`; if (rang.current.has(k)) return;
    playRing(m.ringtone ?? "chime", m.ringRepeat ?? 1, vol * 100).then((ok) => { if (ok) rang.current.add(k); });
  }, [idx?.diff, demo, pre, m.ringtone, m.ringRepeat, vol]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pop === null) return; const k = (e: KeyboardEvent) => e.key === "Escape" && closePop(popKey); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [pop, popKey, closePop]);

  useEffect(() => { window.__sdBusy = pop !== null; return () => { window.__sdBusy = false; }; }, [pop]);
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  const z = zInfo(zone) || ["", "", ""];
  const alert = !!idx && idx.diff <= 60;
  const entered = !!cur && sinceCur >= 0 && (pop !== null || sinceCur < delayS + 120);
  const ann = m.announcements.filter((a) => a.on && a.text.trim());
  const clock = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(d);
  const date = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const hijri = fmtHijri(times?.hijri);
  const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const popDone = (() => { try { return !!popKey && !!localStorage.getItem(popKey); } catch { return false; } })();
  const banner = !idx ? null
    : pre > 0 && idx.diff > 0 && idx.diff <= pre * 60 ? { label: `${Math.ceil(idx.diff / 60)} minit sebelum azan ${act[idx.ni].n}`, time: mmss(idx.diff) }
    : !demo && delayS > 0 && cur && sinceCur >= 0 && sinceCur < delayS && !popDone && pop === null ? { label: `Sudah masuk waktu ${cur.n}. Azan dalam`, time: mmss(delayS - sinceCur) }
    : null;
  const pool = (m.slideList ?? DEFAULT_SLIDES).filter((x) => x.on && x.text.trim());
  const slides = fri ? (pool.some((x) => x.jumaat) ? pool.filter((x) => x.jumaat) : pool) : pool.filter((x) => !x.jumaat);
  const popItem = pop ? items.find((x) => x.k === pop) : null;
  const curKey = cur?.k;

  return (
    <main className={`relative min-h-dvh overflow-hidden ${ctl ? "" : "cursor-none"}`} style={{ fontFamily: `"${font}", ui-sans-serif, system-ui, sans-serif`, ["--ar-font" as string]: `"${arFam}"` }}>
      <Slides imgs={[...extra, ...m.slides]} anim={m.anim} secs={m.secs} />
      {entered && <div className="glow-now" aria-hidden="true" />}
      <div className="relative z-10 flex min-h-dvh flex-col gap-4 p-4 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 pt-10">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold uppercase tracking-wide text-white md:text-5xl">{m.name}</h1>
            <p className="mt-1 text-sm font-semibold text-white md:text-xl">{z[1]} · {zone} · {z[2]}</p>
          </div>
          <div className="text-right text-white">
            <div className="text-3xl font-extrabold tabular-nums md:text-6xl" aria-label="Masa sekarang">{clock}</div>
            <p className="text-sm font-semibold md:text-lg">{date}</p>{hijri && <p className="text-sm font-semibold md:text-lg">{hijri}</p>}
          </div>
        </header>

        {demo && <div className="glass rounded-2xl p-3 text-center text-sm font-semibold md:text-lg" role="note">Mod DEMO: pop-up dan azan waktu solat tidak dimainkan. Langgan <b className="text-amber-300">sekali sahaja</b> (bayaran sekali, akses penuh seumur hidup) untuk membuka semua ciri. Tekan Tetapan untuk daftar.</div>}

        {banner && <div className="text-center text-white" role="status">
          <div className="tv-shadow text-lg font-extrabold uppercase tracking-widest md:text-4xl">{banner.label}</div>
          <div className="tv-shadow text-7xl font-extrabold tabular-nums leading-none md:text-[10rem]" aria-label="Masa berbaki sebelum azan">{banner.time}</div></div>}

        <div className="mt-auto grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,34%)] md:items-end">
          <section className={`glass rounded-3xl p-4 md:p-6 ${alert ? "tv-alert" : ""}`} aria-live="off">
            {times && idx ? (<>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4 text-white">
                <div><small className="text-xs font-bold uppercase tracking-widest md:text-base">Waktu semasa</small><div className="text-4xl font-extrabold leading-tight text-amber-300 md:text-6xl">{cur ? cur.n : "Isyak"}</div></div>
                <div className="text-right"><small className="text-xs font-bold uppercase tracking-widest md:text-base">{act[idx.ni].n}{idx.tomorrow ? " (esok)" : ""} dalam</small>
                  <div className="text-4xl font-extrabold tabular-nums leading-tight md:text-6xl" aria-label="Masa berbaki">{hms(idx.diff)}</div></div>
              </div>
              <ul className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 ${fri ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
                {items.map((p) => (
                  <li key={p.k} className={`glass-tile p-2 text-center md:p-3 ${p.k === (curKey ?? "isha") && !p.silent ? "card-now" : ""} ${p.silent ? "opacity-70" : ""}`}>
                    <b className="block text-base text-white md:text-xl">{p.n}</b>
                    <span lang="ar" dir="rtl" className="ar block pt-1 text-xl text-white md:text-3xl">{p.ar}</span>
                    <span className="mt-1 block whitespace-nowrap text-lg font-bold tabular-nums text-white md:text-2xl xl:text-3xl">{to12(p.time)}</span>
                  </li>))}
              </ul>
            </>) : <p className="py-8 text-center text-lg" role={err ? "alert" : undefined}>{err || "Memuatkan waktu solat…"}</p>}
            <p className="mt-3 text-xs text-white/80 md:text-sm">Sumber: JAKIM (e-solat.gov.my) · {m.zone ? "zon pilihan" : "zon dikesan automatik"} · Latar: Muhammad Faqih, CC BY-SA 4.0 · Azan: {azan ? azan.credit : "Ustaz Asri (Rabbani) / Furqan Fawaz"}</p>
          </section>
          {slides.length > 0 && <SlidePanel slides={slides} anim={m.slideAnim ?? "fade"} secs={m.slideSecs ?? 10} />}
        </div>

        {ann.length > 0 && (
          <div className="glass overflow-hidden rounded-2xl py-3 text-lg font-semibold text-white md:text-2xl" role="marquee" aria-label="Pengumuman">
            <div className="marquee px-4" style={{ ["--dur" as string]: `${Math.max(20, ann.map((a) => a.text).join("   •   ").length * 0.35)}s` }}>{ann.map((a) => a.text).join("   •   ")}</div>
          </div>)}
      </div>

      <div className={`fixed right-0 top-0 z-30 flex items-center transition-opacity duration-500 ${ctl ? "opacity-100" : "opacity-40"}`}>
        <button className="tv-ico" aria-label={full ? "Keluar skrin penuh" : "Skrin penuh"} onClick={toggleFull}>{full ? <Minimize size={30} strokeWidth={2.75} /> : <Maximize size={30} strokeWidth={2.75} />}</button>
        <Link className="tv-ico" aria-label="Tetapan" href="/pengurus/"><Settings size={30} strokeWidth={2.5} /></Link>
      </div>

      {popItem && (
        <div className="pp-overlay fixed inset-0 z-40 grid place-items-center bg-slate-950/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="pp-t">
          <div className="pp-card glass relative w-full max-w-xl overflow-hidden rounded-3xl text-center">
            <button className="btn absolute right-3 top-3 z-10" aria-label="Tutup notifikasi waktu solat" onClick={() => closePop(popKey)}><X size={20} /></button>
            <div className="bg-cover bg-center p-8 pt-16 text-white" style={{ backgroundImage: `linear-gradient(rgba(15,23,42,.72),rgba(15,23,42,.88)),url(/assets/pop-${popItem.pop}.jpg)` }}>
              <p>Sekarang sudah masuk waktu solat</p>
              <h2 id="pp-t" className="mt-1 text-5xl font-extrabold md:text-6xl">{popItem.n}</h2>
              <p lang="ar" dir="rtl" className="ar text-5xl">{popItem.ar}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-amber-300">{to12(popItem.time)}</p>
              <p className="mt-3">Bagi negeri {z[1]}, zon {zone}</p>
              <p className="mt-4">{popItem.k === "jumaat" ? "Marilah menuju ke masjid untuk khutbah dan solat Jumaat. Sebaik-baik hari ialah hari Jumaat." : "Jom sama-sama tunaikan solat awal waktu, semoga kita berjaya dunia dan akhirat."}</p>
              <p className="mt-6 text-xs text-white/80">{popItem.place} · Photo: {popItem.credit} · Azan by: {azan ? azan.credit : popItem.k === "fajr" ? "Furqan Fawaz" : "Ustaz Asri (Rabbani)"}</p>
            </div>
          </div>
        </div>)}
    </main>
  );
}

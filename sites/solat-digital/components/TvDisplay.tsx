"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Maximize, Minimize, PhoneOff, Settings, X } from "lucide-react";
import { computePhase, DEF_SCHED } from "@/lib/phase";
import Link from "next/link";
import { usePwaInstall } from "@/lib/usePwa";
import type { SlideItem, TvDoc } from "@/lib/types";
import { ref, set, serverTimestamp, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { AzanItem } from "@/lib/useAzan";
import { type Times, buildItems, clk, detectZone, hms, isFriday, klDay, klNow, klSec, loadTimes, prayIdx, secOf, syncClock, to12 } from "@/lib/prayer";
import { hijriText } from "@/lib/hijri";
import { themeVars } from "@/lib/themes";
import SlidePanel from "@/components/SlidePanel";
import { DEFAULT_SLIDES } from "@/lib/defaultSlides";
import { youtubeId, ytEmbed } from "@/lib/media";
import { watchLive } from "@/lib/liveRtc";
import LowerThird from "@/components/LowerThird";
import { ensureArabicFont } from "@/lib/arabicFont";
import type { Defaults, ElStyle } from "@/lib/types";
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
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--ov1, rgba(2,6,23,.70)), var(--ov2, rgba(2,6,23,.42)) 45%, var(--ov3, rgba(2,6,23,.85)))" }} />
    </div>
  );
}

/** Ikon orang bercakap dipalang (dilarang bercakap). */
function NoTalk({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9.5" cy="7" r="3.2" /><path d="M3.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <path d="M17 5.5c1.3 1 2 2.3 2 3.7s-.7 2.7-2 3.7" /><path d="M19.6 3.4c2 1.5 3 3.5 3 5.8s-1 4.3-3 5.8" />
      <path d="M3 3l18 18" strokeWidth={strokeWidth + .5} />
    </svg>);
}

export default function TvDisplay({ m, mid, azanLib, extra, slideImgs = {}, defs, preview = false }: { m: TvDoc; mid: string; azanLib: AzanItem[]; extra: string[]; slideImgs?: Record<string, string>; defs?: Defaults; preview?: boolean }) {
  const demo = m.plan !== "full";
  usePwaInstall();
  const live = !preview; // pratonton dalam panel: tiada bunyi, pop-up, denyut dalam talian
  const [times, setTimes] = useState<Times | null>(null);
  const [zone, setZone] = useState(m.zone);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(0);
  const [pop, setPop] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null); const liveVid = useRef<HTMLVideoElement>(null);
  const liveOn = !preview && !!m.live?.on;
  useEffect(() => { if (!liveOn || !mid || m.live?.source === "youtube") return; return watchLive(mid, setLiveStream); }, [liveOn, mid]);
  useEffect(() => { const v = liveVid.current; if (v) { v.srcObject = liveStream; v.play().catch(() => {}); } }, [liveStream, liveOn]);
  const [ctl, setCtl] = useState(true);
  const [full, setFull] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const day = useRef("");
  const rang = useRef<Set<string>>(new Set());
  const pre = Math.max(0, m.preMin ?? 5), delayS = Math.max(0, m.azanDelayMin ?? 0) * 60, vol = Math.max(5, m.volume ?? 100) / 100;
  const font = m.font || defs?.font || "Plus Jakarta Sans";
  const arChoice = m.arabicFont || defs?.arabicFont || "honorifics";
  const [arFam, setArFam] = useState("Arabic Honorifics Complete");
  const feat = { slides: true, ticker: true, hijri: true, banner: true, ...(defs?.features ?? {}) };
  const sty: Record<string, ElStyle> = m.styles ?? {};
  const tx = (k: string, d: string) => m.texts?.[k]?.trim() || d;
  const arSty: CSSProperties = m.arabicColor ? { color: m.arabicColor } : {};
  const T = (k: string): CSSProperties => { const e = sty[k]; return e ? { ...(e.color ? { color: e.color } : {}), ...(e.font ? { fontFamily: `"${e.font}", ui-sans-serif, system-ui, sans-serif` } : {}) } : {}; };
  const B = (k: string): CSSProperties => (sty[k]?.border ? ({ ["--bc" as string]: sty[k].border } as CSSProperties) : {});

  useEffect(() => { setArFam(ensureArabicFont(arChoice, defs?.customFonts)); }, [arChoice, defs?.customFonts]);
  useEffect(() => { const fonts = [...new Set([font, ...Object.values(sty).map((x) => x.font).filter(Boolean) as string[]])]; const id = "sd-font"; let l = document.getElementById(id) as HTMLLinkElement | null; if (!l) { l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; document.head.appendChild(l); } l.href = `https://fonts.googleapis.com/css2?${fonts.map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;600;700;800").join("&")}&display=swap`; }, [font, m.styles]); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchTimes = useCallback(async () => {
    try { const z = m.zone || (await detectZone()); setZone(z); setTimes(await loadTimes(z)); day.current = klDay(klNow()); setErr(""); }
    catch { setErr("Waktu solat tidak dapat dimuatkan. Semak sambungan internet."); }
  }, [m.zone]);
  useEffect(() => { if (!mid || !live) return; const r = ref(rtdb, `presence/${mid}`); const beat = () => set(r, { t: serverTimestamp() }).catch(() => {}); beat(); const t = setInterval(beat, 60000); return () => clearInterval(t); }, [mid, live]);
  useEffect(() => { syncClock().then(fetchTimes); const t = setInterval(syncClock, 30 * 60e3); return () => clearInterval(t); }, [fetchTimes]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); setNow(Date.now()); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!live) return;
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch {} };
    get(); const wl = setInterval(get, 5 * 60e3); const v = () => document.visibilityState === "visible" && get(); document.addEventListener("visibilitychange", v);
    let h: ReturnType<typeof setTimeout>; const show = () => { setCtl(true); clearTimeout(h); h = setTimeout(() => setCtl(false), 2000); };
    show(); addEventListener("pointermove", show); addEventListener("keydown", show);
    const fs = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", fs);
    return () => { clearInterval(wl); lock?.release().catch(() => {}); document.removeEventListener("visibilitychange", v); removeEventListener("pointermove", show); removeEventListener("keydown", show); document.removeEventListener("fullscreenchange", fs); clearTimeout(h); };
  }, [live]);

  const d = klNow(); void now; void clk;
  const fri = isFriday(d);
  const items = times ? buildItems(times, fri, m.jumaatTime) : [];
  const idx = times ? prayIdx(items, klSec(d)) : null;
  const act = idx?.items ?? [];
  if (times && day.current && day.current !== klDay(d)) { day.current = klDay(d); fetchTimes(); }

  const azanFor = (k: string): AzanItem | null => { const id = m.azanByPrayer?.[k] || m.azanId; const a = id ? azanLib.find((x) => x.id === id) : null; return a && (!a.prayers?.length || a.prayers.includes(k)) ? a : null; };
  const azanUrl = (k: string) => azanFor(k)?.url || (k === "fajr" ? "/assets/azan-subuh.m4a" : "/assets/azan.m4a");
  const azanCredit = (k: string) => azanFor(k)?.credit || (k === "fajr" ? "Furqan Fawaz" : "Ustaz Asri (Rabbani)");
  const azanOn = !m.azanMute;
  const stop = useCallback(() => { const a = audio.current; if (!a) return; audio.current = null; let v = a.volume; const f = setInterval(() => { v -= 0.1; if (v <= 0) { clearInterval(f); a.pause(); } else a.volume = v; }, 70); }, []);
  const closePop = useCallback((key?: string) => { if (key) try { localStorage.setItem(key, "1"); } catch {} stop(); setPop(null); }, [stop]);
  const cur = idx && idx.cur >= 0 ? act[idx.cur] : null;
  const sinceCur = idx && cur ? idx.sec - cur.sec : -1;
  const popKey = cur ? `sd_pd_${mid || "demo"}_${klDay(d)}_${cur.k}` : "";
  useEffect(() => {
    if (!live || demo || !idx || !cur || pop !== null || sinceCur > (Math.max(1, Math.min(10, m.popupMin ?? 3)) + 1) * 60 + delayS || sinceCur < delayS) return;
    try { if (localStorage.getItem(popKey)) return; } catch {}
    setPop(cur.k);
    if (azanOn) { const a = new Audio(azanUrl(cur.k)); a.volume = vol; audio.current = a; a.play().catch(() => { const again = () => audio.current === a && a.play().catch(() => {}); addEventListener("pointerdown", again, { once: true }); }); }
  }, [cur?.k, sinceCur, pop, azanOn, popKey, demo, delayS, vol, live]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!live || demo || !idx || pre === 0 || (m.ringtone ?? "chime") === "off" || idx.diff > pre * 60 || idx.diff <= 0) return;
    const k = `${klDay(klNow())}_${act[idx.ni]?.k}`; if (rang.current.has(k)) return;
    playRing(m.ringtone ?? "chime", m.ringRepeat ?? 1, vol * 100).then((ok) => { if (ok) rang.current.add(k); });
  }, [idx?.diff, demo, pre, m.ringtone, m.ringRepeat, vol, live]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pop === null) return; const k = (e: KeyboardEvent) => e.key === "Escape" && closePop(popKey); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [pop, popKey, closePop]);
  // Pop-up "waktu solat telah masuk" tutup sendiri selepas beberapa minit (lalai 3). Jika azan masih berbunyi, tunggu sehingga azan habis (maks 8 minit).
  const popRef = useRef({ key: "", close: closePop }); popRef.current = { key: popKey, close: closePop };
  useEffect(() => {
    if (pop === null || !live) return; const t0 = Date.now(), min = Math.max(1, Math.min(10, m.popupMin ?? 3)) * 60e3; let t: ReturnType<typeof setTimeout>;
    const tryClose = () => { const a = audio.current; const playing = !!a && !a.ended && !a.paused; if (playing && Date.now() - t0 < 8 * 60e3) { t = setTimeout(tryClose, 5000); return; } popRef.current.close(popRef.current.key); };
    t = setTimeout(tryClose, min); return () => clearTimeout(t);
  }, [pop, live, m.popupMin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.__sdBusy = pop !== null; return () => { window.__sdBusy = false; }; }, [pop]);

  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  const z = zInfo(zone) || ["", "", ""];
  const alert = !!idx && idx.diff <= 60;
  const entered = live && !!cur && sinceCur >= 0 && (pop !== null || sinceCur < delayS + 120);
  const ann = m.announcements.filter((a) => a.on && a.text.trim());
  const clock = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(d);
  const date = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const hijri = feat.hijri && times ? hijriText(klDay(d), klSec(d), secOf(times.maghrib), defs?.hijriMode ?? "jakim") : "";
  const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const popDone = (() => { try { return !!popKey && !!localStorage.getItem(popKey); } catch { return false; } })();
  const memoSlides: SlideItem[] = (m.memos ?? []).filter((x) => x.on && x.body.trim()).map((x) => ({ id: "memo-" + x.id, kind: "umum", title: x.title, text: x.body, on: true }));
  const pool = [...(m.slideList ?? DEFAULT_SLIDES), ...memoSlides, ...(defs?.platformSlides ?? [])].filter((x) => x.on && (x.kind === "gambar" ? !!x.imgId : x.kind === "video" ? !!(x.videoUrl || x.vidPath) : !!x.text.trim()));
  const slides = !feat.slides ? [] : fri ? (pool.some((x) => x.jumaat) ? pool.filter((x) => x.jumaat) : pool) : pool.filter((x) => !x.jumaat);
  const popItem = pop ? items.find((x) => x.k === pop) : null;
  const curKey = cur?.k;
  const el = (key: string, kind: "text" | "border" | "arabic", label: string) => ({ "data-el": key, "data-kind": kind, "data-label": label });
  const ph = preview || !idx || !times ? { view: "full" as const, remain: 0, label: "" } : computePhase({ sec: klSec(d), day: klDay(d), fri, items: act, cur: idx.cur, ni: idx.ni, diff: idx.diff, hasSlides: slides.length > 0 && !demo, sc: { ...DEF_SCHED, ...(m.sched ?? {}), finalMin: Math.max(1, m.preMin ?? 5) } as typeof DEF_SCHED });
  const nxt = idx ? act[idx.ni] : null;
  const redZone = !!idx && idx.diff > 0 && idx.diff <= 600; const last10 = !!idx && idx.diff > 0 && idx.diff <= 10;
  const cdCls = last10 ? "cd-last" : redZone ? "cd-red" : "";
  const big = (label: string, time: string, sub?: string, k = "cd") => (
    <div className="my-auto text-center text-white" role="status">
      <div className="tv-shadow text-xl font-extrabold uppercase tracking-widest md:text-4xl" style={T("cdl")} {...(k === "cd" ? el("cdl", "text", "Tulisan kiraan detik") : {})}>{label}</div>
      <div className={`tv-shadow text-7xl font-extrabold tabular-nums leading-none md:text-[11rem] ${k === "cd" ? cdCls : ""}`} aria-label="Masa berbaki" style={T("cdn")} {...(k === "cd" ? el("cdn", "text", "Nombor kiraan detik") : {})}>{time}</div>
      {sub && <p className="mx-auto mt-4 max-w-4xl text-base font-semibold text-white/90 md:text-3xl">{sub}</p>}
    </div>);
  const panel = (kicker: string, title: string, status: string, time: string, msg: string) => (
    <div className="glass mx-auto my-auto w-full max-w-5xl rounded-3xl p-6 text-center text-white md:p-12">
      <p className="text-sm font-bold uppercase tracking-[.3em] md:text-xl" style={{ color: "var(--acc, #fcd34d)" }}>{kicker}</p>
      <h2 className="mt-2 text-4xl font-extrabold uppercase md:text-7xl">{title}</h2>
      <p className="mt-1 text-lg font-semibold md:text-3xl">{status}</p>
      {time && <div className="tv-shadow mt-3 text-7xl font-extrabold tabular-nums leading-none md:text-[10rem]" style={{ color: "var(--acc, #fcd34d)" }}>{time}</div>}
      <p className="mx-auto mt-5 max-w-3xl text-base text-white/90 md:text-2xl">{msg}</p>
    </div>);
  const middle = (() => {
    const t = mmss(ph.remain);
    switch (ph.view) {
      case "final": return big(tx("cdl", "{waktu} dalam").replace("{min}", String(Math.ceil(ph.remain / 60))).replace("{waktu}", nxt ? tx("ct-" + nxt.k, nxt.n) : ""), t);
      case "iqamah": return big(`Menunggu iqamah ${ph.label}`, t, tx("msg-iqamah", "Sila bersedia untuk solat berjemaah."), "iq");
      case "jwait": return big("Khutbah Jumaat akan bermula dalam", t, tx("msg-jwait", "Sila duduk dengan tenang dan dengarkan khutbah."), "jw");
      case "jlead": return big("Waktu Jumaat dalam", t, tx("msg-jlead", "Sila hadirkan diri ke masjid dan jaga solat pada hari Jumaat."), "jl");
      case "khutbah": return panel("Waktu Jumaat", "Khutbah Jumaat", "Sedang berlangsung", t, tx("msg-khutbah", "Dengarkan khutbah dengan penuh perhatian, khusyuk dan sempurna. Dimohon senyapkan telefon bimbit."));
      case "raya": return (
        <div className="my-auto"><p lang="ar" dir="rtl" className="ar mb-3 text-center text-5xl text-white md:text-8xl" style={arSty}>{ph.label === "Aidilfitri" ? "صَلَاةُ سُنَّةِ عِيدِ الْفِطْرِ" : "صَلَاةُ سُنَّةِ عِيدِ الْأَضْحَى"}</p>{panel("Hari Raya", `Solat Sunat ${ph.label}`, "Sedang berlangsung", t, tx("msg-raya", "Sila matikan atau senyapkan telefon bimbit. Rapatkan dan luruskan saf."))}</div>);
      case "rkhutbah": return panel("Hari Raya", `Khutbah ${ph.label}`, "Sedang berlangsung", t, tx("msg-rkhutbah", "Dengarkan khutbah dengan penuh perhatian dan khusyuk."));
      case "solat": return (
        <div className="glass mx-auto my-auto w-full max-w-5xl rounded-[2rem] p-5 text-center text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-[.35em] md:text-2xl" style={{ color: "var(--acc, #fcd34d)" }}>{ph.label === "Jumaat" ? "Solat Jumaat" : `Solat ${ph.label}`}</p>
          <h2 className="tv-shadow mt-1 text-4xl font-extrabold uppercase tracking-wide md:text-6xl">Sedang Berlangsung</h2>
          <div className="mx-auto my-4 h-1 w-24 rounded-full md:my-5 md:w-40" style={{ background: "var(--acc, #fcd34d)" }} aria-hidden="true" />
          <p className="mx-auto max-w-4xl text-lg font-semibold leading-snug text-white/95 md:text-3xl">{tx("msg-solat", "Mohon rapatkan dan luruskan saf. Senyapkan telefon bimbit dan tenangkan hati untuk menghadap Allah.")}</p>
          <div className="mt-5 flex flex-wrap items-stretch justify-center gap-5 md:mt-6 md:gap-10">
            {([[PhoneOff, "Senyapkan telefon bimbit"], [NoTalk, "Dilarang bercakap"]] as const).map(([Ic, lb]) => (
              <div key={lb} className="grid h-40 w-40 place-content-center justify-items-center gap-3 rounded-3xl p-4 text-center text-white backdrop-blur-xl md:h-52 md:w-64 md:gap-3" style={{ background: "linear-gradient(160deg, rgba(255,105,105,.96), rgba(255,48,48,.88))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -10px 24px rgba(255,255,255,.08), 0 12px 32px rgba(255,30,30,.35)" }}>
                <Ic className="size-14 text-white md:size-20" strokeWidth={2.25} aria-hidden="true" /><b className="text-sm leading-tight text-white md:text-xl">{lb}</b>
              </div>))}
          </div>
        </div>);
      default: return null;
    }
  })();
  const tvars = { ...themeVars(m.theme || defs?.theme), fontFamily: `"${font}", ui-sans-serif, system-ui, sans-serif`, ["--ar-font" as string]: `"${arFam}"` } as CSSProperties;
  const onPick = (e: React.MouseEvent) => {
    if (!preview) return; const tgt = e.target as HTMLElement; if (tgt.closest("[data-noedit]")) { e.preventDefault(); e.stopPropagation(); return; } const t = tgt.closest("[data-el]") as HTMLElement | null; if (!t) return;
    e.preventDefault(); e.stopPropagation(); window.parent.postMessage({ sd: "pick", key: t.dataset.el, kind: t.dataset.kind, label: t.dataset.label, slide: t.closest("[data-slide]") ? (t.closest("[data-slide]") as HTMLElement).dataset.slide : undefined }, location.origin);
  };

  return (
    <main className={`relative min-h-dvh overflow-hidden ${preview ? "pv" : ""} ${ctl || preview ? "" : "tv-nocursor"}`} style={tvars} onClickCapture={onPick}>
      {(() => { const yid = m.bgVideo?.url ? youtubeId(m.bgVideo.url) : null; return yid && !preview ? (<div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden bg-black" aria-hidden="true"><iframe title="Latar video" src={ytEmbed(yid)} allow="autoplay; encrypted-media" tabIndex={-1} className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0" /><div className="absolute inset-0 bg-slate-950/35" /></div>) : <Slides imgs={[...extra, ...m.slides]} anim={m.anim} secs={m.secs} />; })()}
      {entered && <div className="glow-now" aria-hidden="true" />}
      {liveOn && (
        <div className="fixed inset-0 z-20 bg-black">
          {m.live?.source === "youtube" && m.live?.ytUrl && youtubeId(m.live.ytUrl) ? <iframe title="Siaran kuliah" src={ytEmbed(youtubeId(m.live.ytUrl)!)} allow="autoplay; encrypted-media" className="size-full border-0" /> : <video ref={liveVid} autoPlay playsInline muted className="size-full object-cover" />}
          {!liveStream && !(m.live?.source === "youtube" && m.live?.ytUrl) && <div className="absolute inset-0 grid place-items-center text-center text-white"><div><div className="mx-auto mb-3 size-10 animate-spin rounded-full border-4 border-white/30 border-t-white" /><p className="text-xl font-bold md:text-3xl">Menunggu siaran kuliah…</p></div></div>}
          <div className="absolute right-3 top-3 rounded-xl bg-black/55 px-3 py-1.5 text-right text-white backdrop-blur md:right-6 md:top-5"><div className="text-lg font-extrabold tabular-nums md:text-3xl">{clock}</div><div className="text-[11px] font-semibold md:text-sm">{date}{hijri ? ` · ${hijri}` : ""}</div></div>
          <div className="absolute left-3 top-3 rounded-xl bg-black/55 px-3 py-1.5 text-white backdrop-blur md:left-6 md:top-5"><div className="flex items-center gap-2"><span className="rounded bg-red-600 px-2 py-0.5 text-xs font-extrabold md:text-sm">LIVE</span><b className="text-sm uppercase md:text-xl">{m.name}</b></div></div>
          <LowerThird tpl={m.live?.tpl} session={m.live?.session} speaker={m.live?.speaker} role={m.live?.role} topic={m.live?.topic} ticker={m.live?.ticker || ann.map((x) => x.text).join("   •   ")} />
        </div>)}
      {ph.view === "slides" && !liveOn && <SlidePanel full slides={slides} anim={m.slideAnim ?? "fade"} secs={m.slideSecs ?? 10} T={T} B={B} imgs={slideImgs} />}
      {ph.view !== "slides" && !liveOn && <div className="relative z-10 flex min-h-dvh flex-col gap-4 p-4 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 pt-10">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-extrabold uppercase tracking-wide text-white md:text-5xl" style={T("name")} {...el("name", "text", "Nama masjid")}>{m.name}</h1>
            <p className="mt-1 text-sm font-semibold text-white md:text-xl" style={T("sub")} {...el("sub", "text", "Negeri, zon dan daerah")}>{`${z[1]} · ${zone} · ${z[2]}`}</p>
          </div>
          <div className="text-left text-white lg:text-right">
            <div className="text-3xl font-extrabold tabular-nums md:text-6xl" aria-label="Masa sekarang" style={T("clock")} {...el("clock", "text", "Jam")}>{clock}</div>
            <p className="text-sm font-semibold md:text-lg" style={T("date")} {...el("date", "text", "Tarikh")}>{date}</p>{hijri && <p className="text-sm font-semibold md:text-lg" style={T("hijri")} {...el("hijri", "text", "Tarikh Hijrah")}>{hijri}</p>}
          </div>
        </header>

        {demo && <div className="glass rounded-2xl p-3 text-center text-sm font-semibold md:text-lg" role="note">Mod DEMO: pop-up dan azan waktu solat tidak dimainkan. Langgan <b className="text-amber-300">sekali sahaja</b> (bayaran sekali, akses penuh seumur hidup) untuk membuka semua ciri. Tekan Tetapan untuk daftar.</div>}

        {middle}

        {!["solat", "raya"].includes(ph.view) ? (<div className="mt-auto grid gap-4">
          <section className={`glass rounded-3xl p-4 md:p-6 ${alert ? "tv-alert" : ""}`} style={B("frame")} {...el("frame", "border", "Bingkai waktu solat")} aria-live="off">
            {times && idx ? (<>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 text-white">
                <div><small className="text-xs font-bold uppercase tracking-widest md:text-base" style={T("curl")} {...el("curl", "text", "Label waktu semasa")}>{tx("curl", "Waktu semasa")}</small><div className="text-4xl font-extrabold leading-tight md:text-6xl" style={{ color: "var(--acc, #fcd34d)", ...T("curn") }} {...el("curn", "text", "Nama waktu semasa")}>{cur ? tx("ct-" + cur.k, cur.n) : tx("ct-isha", "Isyak")}</div></div>
                <div className="text-right max-md:ml-auto"><small className="text-xs font-bold uppercase tracking-widest md:text-base" style={T("nextl")} {...el("nextl", "text", "Label waktu seterusnya")}>{tx("nextl", "{waktu} dalam").replace("{waktu}", tx("ct-" + act[idx.ni].k, act[idx.ni].n) + (idx.tomorrow ? " (esok)" : ""))}</small>
                  <div className={`text-4xl font-extrabold tabular-nums leading-tight md:text-6xl ${cdCls}`} aria-label="Masa berbaki" style={T("nextt")} {...el("nextt", "text", "Masa ke waktu seterusnya")}>{hms(idx.diff)}</div></div>
              </div>
              <ul className={`grid grid-cols-1 gap-2 md:gap-3 ${fri ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-5"}`}>
                {items.map((p) => (
                  <li key={p.k} className={`glass-tile flex items-center justify-between gap-3 px-4 py-2 text-center md:block md:p-3 ${p.k === (curKey ?? "isha") && !p.silent ? "card-now" : ""} ${p.silent ? "opacity-70" : ""}`} style={B("card-" + p.k)} {...el("card-" + p.k, "border", "Bingkai " + p.n)}>
                    <b className="block text-base text-white md:text-xl" style={T("ct-" + p.k)} {...el("ct-" + p.k, "text", "Nama " + p.n)}>{tx("ct-" + p.k, p.n)}</b>
                    <span lang="ar" dir="rtl" className="ar block pt-1 text-xl text-white md:text-3xl" data-noedit="1" style={arSty}>{p.ar}</span>
                    <span className="mt-1 block whitespace-nowrap text-lg font-bold tabular-nums text-white md:text-2xl xl:text-3xl" style={T("cm-" + p.k)} {...el("cm-" + p.k, "text", "Masa " + p.n)}>{to12(p.time)}</span>
                  </li>))}
              </ul>
            </>) : <p className="py-8 text-center text-lg" role={err ? "alert" : undefined}>{err || "Memuatkan waktu solat…"}</p>}
          </section>
        </div>) : null}
        {feat.ticker && ann.length > 0 && !["solat", "raya"].includes(ph.view) && (
          <div className="glass overflow-hidden rounded-2xl py-3 text-lg font-semibold text-white md:text-2xl" style={B("ticker")} {...el("ticker", "border", "Bingkai teks bergerak")} role="marquee" aria-label="Pengumuman">
            <div className="marquee px-4" style={{ ["--dur" as string]: `${Math.max(20, ann.map((a) => a.text).join("   •   ").length * 0.35)}s`, ...T("tickert") }} {...el("tickert", "text", "Teks bergerak")}>{ann.map((a) => a.text).join("   •   ")}</div>
          </div>)}
        <p className="pt-1 text-center text-[10px] leading-tight text-white/70 md:text-xs">Sumber: JAKIM (e-solat.gov.my) · {m.zone ? "zon pilihan" : "zon dikesan automatik"} · Latar: Muhammad Faqih, CC BY-SA 4.0 · Azan: {azanCredit(cur?.k ?? "dhuhr")}</p>
      </div>}

      {live && !liveOn && <div className={`fixed right-0 top-0 z-30 flex items-center tv-ctl transition-opacity duration-500`}>
        <button className="tv-ico" aria-label={full ? "Keluar skrin penuh" : "Skrin penuh"} onClick={(e) => { toggleFull(); (e.currentTarget as HTMLElement).blur(); }}>{full ? <Minimize size={30} strokeWidth={2.75} /> : <Maximize size={30} strokeWidth={2.75} />}</button>
        <Link className="tv-ico" aria-label="Tetapan" href="/pengurus/"><Settings size={30} strokeWidth={2.5} /></Link>
      </div>}

      {live && popItem && (
        <div className="pp-overlay fixed inset-0 z-40 grid place-items-center bg-slate-950/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="pp-t">
          <div className="pp-card pp-glass relative w-full max-w-xl overflow-hidden rounded-3xl text-center">
            <button className="btn absolute right-3 top-3 z-10" aria-label="Tutup notifikasi waktu solat" onClick={() => closePop(popKey)}><X size={20} /></button>
            <div className="bg-cover bg-center p-8 pt-16 text-white" style={{ backgroundImage: `linear-gradient(rgba(10,20,45,.38),rgba(10,20,45,.52)),url(/assets/pop-${popItem.pop}.jpg)` }}>
              <p>Sekarang sudah masuk waktu solat</p>
              <h2 id="pp-t" className="mt-1 text-5xl font-extrabold md:text-6xl">{popItem.n}</h2>
              <p lang="ar" dir="rtl" className="ar text-5xl" style={arSty}>{popItem.ar}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums" style={{ color: "var(--acc, #fcd34d)" }}>{to12(popItem.time)}</p>
              <p className="mt-3">Bagi negeri {z[1]}, zon {zone}</p>
              <p className="mt-4">{popItem.k === "jumaat" ? "Marilah menuju ke masjid untuk khutbah dan solat Jumaat. Sebaik-baik hari ialah hari Jumaat." : "Jom sama-sama tunaikan solat awal waktu, semoga kita berjaya dunia dan akhirat."}</p>
              <p className="mt-6 text-xs text-white/80">{popItem.place} · Photo: {popItem.credit} · Azan by: {azanCredit(popItem.k)}</p>
            </div>
          </div>
        </div>)}
    </main>
  );
}

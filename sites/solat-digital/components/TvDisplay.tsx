"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Settings, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/lib/usePwa";
import type { TvDoc } from "@/lib/types";
import { ref, set, serverTimestamp, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { AzanItem } from "@/lib/useAzan";
import { PRAYERS, type Times, clk, detectZone, hms, klDay, klNow, klSec, loadTimes, prayIdx, syncClock, to12 } from "@/lib/prayer";
import { zInfo } from "@/lib/zones";

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

export default function TvDisplay({ m, mid, azan, extra }: { m: TvDoc; mid: string; azan: AzanItem | null; extra: string[] }) {
  const demo = m.plan !== "full";
  const pwa = usePwaInstall();
  const [times, setTimes] = useState<Times | null>(null);
  const [zone, setZone] = useState(m.zone);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(0);
  const [pop, setPop] = useState<number | null>(null);
  const [azanOn, setAzanOn] = useState(true);
  const [ctl, setCtl] = useState(true);
  const [full, setFull] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const day = useRef("");

  const fetchTimes = useCallback(async () => {
    try { const z = m.zone || (await detectZone()); setZone(z); setTimes(await loadTimes(z)); day.current = klDay(klNow()); setErr(""); }
    catch { setErr("Waktu solat tidak dapat dimuatkan. Semak sambungan internet."); }
  }, [m.zone]);
  useEffect(() => { if (!mid) return; const r = ref(rtdb, `presence/${mid}`); const beat = () => set(r, { t: serverTimestamp() }).catch(() => {}); beat(); const t = setInterval(beat, 60000); return () => clearInterval(t); }, [mid]);
  useEffect(() => { syncClock().then(fetchTimes); const t = setInterval(syncClock, 30 * 60e3); return () => clearInterval(t); }, [fetchTimes]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); setNow(Date.now()); return () => clearInterval(t); }, []);
  // wake lock + kursor/kawalan auto-sembunyi
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen"); } catch {} };
    get(); const v = () => document.visibilityState === "visible" && get(); document.addEventListener("visibilitychange", v);
    let h: ReturnType<typeof setTimeout>; const show = () => { setCtl(true); clearTimeout(h); h = setTimeout(() => setCtl(false), 4000); };
    show(); addEventListener("pointermove", show); addEventListener("keydown", show);
    const fs = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", fs);
    return () => { lock?.release().catch(() => {}); document.removeEventListener("visibilitychange", v); removeEventListener("pointermove", show); removeEventListener("keydown", show); document.removeEventListener("fullscreenchange", fs); clearTimeout(h); };
  }, []);

  const d = klNow(); void now;
  const idx = times ? prayIdx(times, klSec(d)) : null;
  // hari bertukar -> muat semula waktu
  if (times && day.current && day.current !== klDay(d)) { day.current = klDay(d); fetchTimes(); }

  const stop = useCallback(() => { const a = audio.current; if (!a) return; audio.current = null; let v = a.volume; const f = setInterval(() => { v -= 0.1; if (v <= 0) { clearInterval(f); a.pause(); } else a.volume = v; }, 70); }, []);
  const closePop = useCallback((key?: string) => { if (key) try { localStorage.setItem(key, "1"); } catch {} stop(); setPop(null); }, [stop]);
  const popKey = idx && idx.cur >= 0 ? `sd_pd_${mid || "demo"}_${klDay(d)}_${PRAYERS[idx.cur].k}` : "";
  useEffect(() => {
    if (demo || !idx || pop !== null || idx.cur < 0 || idx.sec - idx.ts[idx.cur] > 1800) return;
    try { if (localStorage.getItem(popKey)) return; } catch {}
    setPop(idx.cur);
    if (azanOn) { const a = new Audio(idx.cur === 0 ? (azan?.fajrUrl || azan?.url || "/assets/azan-subuh.m4a") : (azan?.url || "/assets/azan.m4a")); audio.current = a; a.play().catch(() => { const again = () => audio.current === a && a.play().catch(() => {}); addEventListener("pointerdown", again, { once: true }); }); }
  }, [idx?.cur, idx?.sec, pop, azanOn, popKey, demo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pop === null) return; const k = (e: KeyboardEvent) => e.key === "Escape" && closePop(popKey); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [pop, popKey, closePop]);

  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  const z = zInfo(zone) || ["", "", ""];
  const c = idx ? (idx.cur < 0 ? 4 : idx.cur) : 0;
  const alert = !!idx && idx.diff <= 60;
  const ann = m.announcements.filter((a) => a.on && a.text.trim());
  const clock = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(d);
  const date = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const hijri = (() => { try { return new Intl.DateTimeFormat("ms-MY-u-ca-islamic-umalqura", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "long", year: "numeric" }).format(d); } catch { return ""; } })();
  void clk;

  return (
    <main className={`relative min-h-dvh overflow-hidden ${ctl ? "" : "cursor-none"}`}>
      <Slides imgs={[...extra, ...m.slides]} anim={m.anim} secs={m.secs} />
      <div className="relative z-10 flex min-h-dvh flex-col gap-4 p-4 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3 pt-14">
          <div>
            <h1 className="text-2xl font-extrabold md:text-4xl">{m.name}</h1>
            <p className="mt-1 text-sm text-sub md:text-lg">{z[1]} · {zone} · {z[2]}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold tabular-nums md:text-6xl" aria-label="Masa sekarang">{clock}</div>
            <p className="text-sm text-sub md:text-lg">{date}{hijri ? ` · ${hijri}` : ""}</p>
          </div>
        </header>

        {demo && <div className="glass rounded-2xl p-3 text-center text-sm font-semibold md:text-lg" role="note">Mod DEMO: pop-up dan azan waktu solat tidak dimainkan. Langgan <b className="text-accent">sekali sahaja</b> (bayaran sekali, akses penuh seumur hidup) untuk membuka semua ciri. Tekan Tetapan untuk daftar.</div>}
        <section className={`glass mt-auto rounded-3xl p-4 md:p-8 ${alert ? (idx!.diff <= 10 ? "tv-alert tv-alert10" : "tv-alert") : ""}`} aria-live="off">
          {times && idx ? (<>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><small className="text-sub md:text-lg">Waktu semasa</small><div className="text-3xl font-extrabold text-accent md:text-6xl">{PRAYERS[c].n}</div></div>
              <div className="text-right"><small className="text-sub md:text-lg">{PRAYERS[idx.ni].n}{idx.tomorrow ? " (esok)" : ""} dalam</small>
                <div className="text-4xl font-extrabold tabular-nums md:text-7xl" aria-label="Masa berbaki">{hms(idx.diff)}</div></div>
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-5">
              {PRAYERS.map((p, i) => (
                <li key={p.k} className={`rounded-2xl border p-3 text-center md:p-5 ${i === c ? "border-accent bg-accent/20" : "border-white/20 bg-white/5"}`}>
                  <b className="block text-lg md:text-2xl">{p.n}</b>
                  <span lang="ar" dir="rtl" className="block text-xl text-sub md:text-3xl">{p.ar}</span>
                  <span className="mt-1 block text-xl font-bold tabular-nums md:text-4xl">{to12(times[p.k])}</span>
                </li>))}
            </ul>
          </>) : <p className="py-8 text-center text-lg" role={err ? "alert" : undefined}>{err || "Memuatkan waktu solat…"}</p>}
          <p className="mt-4 text-xs text-sub md:text-sm">Sumber: JAKIM (e-solat.gov.my) · {m.zone ? "zon pilihan" : "zon dikesan automatik"} · Latar: Muhammad Faqih, CC BY-SA 4.0 · Azan: {azan ? azan.credit : "Ustaz Asri (Rabbani) / Furqan Fawaz"}</p>
        </section>

        {ann.length > 0 && (
          <div className="glass overflow-hidden rounded-2xl py-3 text-lg font-semibold md:text-2xl" role="marquee" aria-label="Pengumuman">
            <div className="marquee px-4" style={{ ["--dur" as string]: `${Math.max(20, ann.map((a) => a.text).join("   •   ").length * 0.35)}s` }}>
              {ann.map((a) => a.text).join("   •   ")}
            </div>
          </div>)}
      </div>

      <div className={`fixed right-4 top-4 z-20 flex gap-2 transition-opacity duration-300 ${ctl ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {pwa.canInstall && <button className="btn glass" aria-label="Pasang aplikasi TV" onClick={pwa.install}><Download size={20} /><span className="hidden md:inline">Pasang aplikasi TV</span></button>}
        <button className="btn glass" aria-label={azanOn ? "Matikan azan" : "Hidupkan azan"} onClick={() => setAzanOn((v) => !v)}>{azanOn ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
        <button className="btn glass" aria-label={full ? "Keluar skrin penuh" : "Skrin penuh"} onClick={toggleFull}>{full ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        <Link className="btn glass" aria-label="Tetapan admin" href="/pengurus/"><Settings size={20} /><span className="hidden md:inline">Tetapan</span></Link>
      </div>

      {pop !== null && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="pp-t">
          <div className="glass relative w-full max-w-xl overflow-hidden rounded-3xl text-center">
            <button className="btn absolute right-3 top-3 z-10" aria-label="Tutup notifikasi waktu solat" onClick={() => closePop(popKey)}><X size={20} /></button>
            <div className="bg-cover bg-center p-8 pt-16" style={{ backgroundImage: `linear-gradient(rgba(15,23,42,.72),rgba(15,23,42,.88)),url(/assets/pop-${PRAYERS[pop].pop}.jpg)` }}>
              <p className="text-sub">Sekarang sudah masuk waktu solat</p>
              <h2 id="pp-t" className="mt-1 text-5xl font-extrabold md:text-6xl">{PRAYERS[pop].n}</h2>
              <p lang="ar" dir="rtl" className="text-4xl text-sub">{PRAYERS[pop].ar}</p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-accent">{times && to12(times[PRAYERS[pop].k])}</p>
              <p className="mt-3">Bagi negeri {z[1]}, zon {zone}</p>
              <p className="mt-4 text-sub">Jom sama-sama tunaikan solat awal waktu, semoga kita berjaya dunia dan akhirat.</p>
              <p className="mt-6 text-xs text-sub">{PRAYERS[pop].place} · Photo: {PRAYERS[pop].credit} · Azan by: {azan ? azan.credit : pop === 0 ? "Furqan Fawaz" : "Ustaz Asri (Rabbani)"}</p>
            </div>
          </div>
        </div>)}
    </main>
  );
}

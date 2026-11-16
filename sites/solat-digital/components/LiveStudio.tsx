"use client";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AlertTriangle, Camera, Eye, EyeOff, Info, Mic, Radio, Save, Square, Video } from "lucide-react";
import { db } from "@/lib/firebase";
import { startBroadcast, type RtcState } from "@/lib/liveRtc";
import type { TvDoc } from "@/lib/types";

type Live = NonNullable<TvDoc["live"]>;
type Plat = { server: string; key: string; on: boolean; quality: string; account: string };
const PLATS = [
  { id: "fb", name: "Facebook Live", servers: [["Default (Facebook Live)", "rtmps://live-api-s.facebook.com:443/rtmp/"]], hint: "Ambil Stream Key daripada Facebook Live Producer (Streaming software)." },
  { id: "yt", name: "YouTube Live", servers: [["Primary YouTube ingest server (Cadangan)", "rtmp://a.rtmp.youtube.com/live2"], ["Backup YouTube ingest server", "rtmp://b.rtmp.youtube.com/live2?backup=1"]], hint: "Ambil Stream Key daripada YouTube Studio > Go Live > Stream. Akaun perlu disahkan dan diaktifkan untuk siaran langsung." },
  { id: "tt", name: "TikTok Live", servers: [["Custom (daripada TikTok Live Studio)", ""]], hint: "TikTok memberi URL server dan Stream Key melalui TikTok Live Studio. Salin kedua-duanya ke sini." },
] as const;
const QUAL: Record<string, MediaTrackConstraints> = { "1080": { width: { ideal: 1920 }, height: { ideal: 1080 } }, "720": { width: { ideal: 1280 }, height: { ideal: 720 } }, "480": { width: { ideal: 854 }, height: { ideal: 480 } } };
const Lb = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;

export default function LiveStudio({ mid, live, setLive, flash }: { mid: string; live: Live; setLive: (l: Live) => void; flash: (m: string) => void }) {
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]); const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState(""); const [mic, setMic] = useState(""); const [q, setQ] = useState("1080");
  const [stream, setStream] = useState<MediaStream | null>(null); const [rtc, setRtc] = useState<RtcState>("idle"); const [err, setErr] = useState("");
  const vid = useRef<HTMLVideoElement>(null); const stop = useRef<(() => void) | null>(null);
  const ready = !!live.speaker?.trim();
  useEffect(() => { if (vid.current) vid.current.srcObject = stream; }, [stream]);
  useEffect(() => () => { stop.current?.(); }, []);
  const open = async (camId = cam, micId = mic) => {
    setErr("");
    try {
      stream?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: { ...(camId ? { deviceId: { exact: camId } } : {}), ...QUAL[q] }, audio: micId ? { deviceId: { exact: micId } } : true });
      setStream(s); const d = await navigator.mediaDevices.enumerateDevices(); setCams(d.filter((x) => x.kind === "videoinput")); setMics(d.filter((x) => x.kind === "audioinput"));
      setCam(s.getVideoTracks()[0]?.getSettings().deviceId ?? camId); setMic(s.getAudioTracks()[0]?.getSettings().deviceId ?? micId);
    } catch (x) { const n = (x as { name?: string }).name; setErr(n === "NotAllowedError" ? "Akses kamera ditolak. Benarkan kamera pada pelayar (ikon mangga di bar alamat) kemudian cuba lagi." : n === "NotFoundError" ? "Tiada kamera dijumpai. Sambungkan kamera ke peranti ini." : "Kamera tidak dapat dibuka. Pastikan tiada aplikasi lain sedang menggunakannya."); }
  };
  const start = () => {
    if (!stream) return; if (!ready) return flash("Isi nama penceramah dahulu.");
    stop.current?.(); stop.current = startBroadcast(mid, stream, setRtc); setLive({ ...live, on: true }); flash("Siaran dimulakan ke skrin TV.");
  };
  const end = () => { stop.current?.(); stop.current = null; setLive({ ...live, on: false }); flash("Siaran dihentikan. TV kembali ke paparan biasa."); };
  const broadcasting = !!stop.current && rtc !== "idle";
  // ---- Platform sosial
  const [pl, setPl] = useState<Record<string, Plat>>({}); const [show, setShow] = useState<Record<string, boolean>>({});
  useEffect(() => { getDoc(doc(db, "tv", mid, "private", "live")).then((s) => setPl((s.data() as Record<string, Plat>) ?? {})).catch(() => {}); }, [mid]);
  const P = (id: string): Plat => pl[id] ?? { server: PLATS.find((p) => p.id === id)!.servers[0][1], key: "", on: false, quality: "1080", account: "" };
  const setP = (id: string, v: Partial<Plat>) => setPl({ ...pl, [id]: { ...P(id), ...v } });
  const applyP = async (id: string) => { try { await setDoc(doc(db, "tv", mid, "private", "live"), pl); flash("Tetapan disimpan dengan selamat (hanya anda boleh membacanya)."); } catch { flash("Gagal menyimpan."); } };
  return (
    <>
      <div className="sticky top-[57px] z-20 -mx-1 rounded-2xl border border-line bg-card/95 p-3 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${live.on ? "bg-red-500 text-white" : "bg-muted text-sub"}`}><Radio size={20} /></span><div><b className="block">Mod Kuliah (Live): {live.on ? "HIDUP" : "MATI"}</b><span className="text-xs text-sub">{live.on ? "Skrin TV sedang memaparkan siaran kuliah." : "Skrin TV sedang memaparkan waktu solat biasa."}</span></div></div>
          <button type="button" className="switch" role="switch" aria-checked={!!live.on} aria-label="Mod Kuliah (Live)" onClick={() => { if (!live.on && !ready) { flash("Sila setup maklumat penceramah dahulu."); return; } if (live.on) end(); else setLive({ ...live, on: true }); }} />
        </div>
        {!ready && <p role="alert" className="mt-2 flex items-start gap-2 text-sm font-bold text-red-600"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Sila setup siaran live dahulu di bahagian bawah (maklumat penceramah dan kamera) sebelum menghidupkan Mod Kuliah (Live). Kemudian hidupkan butang ini untuk dipaparkan pada TV.</p>}
      </div>

      <section className="card"><h2 className="flex items-center gap-2 text-lg font-bold"><Camera size={20} className="text-accent" /> Kamera siaran</h2><p className="text-sm text-sub">Akses kamera dibuat di sini, melalui pelayar peranti yang anda gunakan sekarang. Pada komputer: kamera web atau kamera DSLR (sambung melalui kad tangkap HDMI atau USB, ia muncul sebagai kamera). Pada telefon: log masuk panel ini di telefon, pilih kamera depan atau belakang.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
            <video ref={vid} autoPlay playsInline muted className="size-full object-cover" />
            {!stream && <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/80"><span><Video className="mx-auto mb-2" />Tekan &quot;Buka kamera&quot; untuk melihat pratonton.</span></div>}
            {broadcasting && <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-xs font-extrabold text-white">{rtc === "live" ? "LIVE KE TV" : rtc === "failed" ? "GAGAL SAMBUNG" : "MENYAMBUNG…"}</span>}
          </div>
          <div>
            <button type="button" className="btn btn-primary w-full justify-center" onClick={() => open()}><Camera size={18} /> {stream ? "Muat semula kamera" : "Buka kamera"}</button>
            {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
            {stream && (<>
              <Lb id="lcam">Kamera</Lb><select id="lcam" className="inp" value={cam} onChange={(e) => { setCam(e.target.value); open(e.target.value, mic); }}>{cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Kamera ${i + 1}`}</option>)}</select>
              <Lb id="lmic">Mikrofon</Lb><div className="flex items-center gap-2"><Mic size={16} className="shrink-0 text-sub" /><select id="lmic" className="inp" value={mic} onChange={(e) => { setMic(e.target.value); open(cam, e.target.value); }}>{mics.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Mikrofon ${i + 1}`}</option>)}</select></div>
              <Lb id="lq">Kualiti</Lb><select id="lq" className="inp" value={q} onChange={(e) => setQ(e.target.value)}><option value="1080">1080p (paling tinggi)</option><option value="720">720p</option><option value="480">480p (jimat data)</option></select>
              <p className="mt-1 text-xs text-sub">Tukar kualiti kemudian tekan &quot;Muat semula kamera&quot;.</p>
              {!broadcasting ? <button type="button" className="btn btn-primary mt-3 w-full justify-center" onClick={start}><Radio size={18} /> Mulakan siaran ke skrin TV</button> : <button type="button" className="btn btn-red mt-3 w-full justify-center" onClick={end}><Square size={16} /> Hentikan siaran</button>}
            </>)}
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-sub"><Info size={14} className="mt-0.5 shrink-0" /> Siaran ke TV berjalan terus antara peranti anda dan TV (WebRTC), jadi halaman panel ini mesti kekal terbuka semasa siaran. Pada rangkaian yang menyekat sambungan terus (contoh data mudah alih tertentu), siaran mungkin tidak bersambung.</p>
      </section>

      <section className="card"><h2 className="text-lg font-bold">Maklumat Penceramah & Paparan Bawah (Lower-Third)</h2><p className="text-sm text-sub">Dipaparkan di bahagian bawah skrin semasa mod Kuliah (Live).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["speaker", "Nama penceramah / ustaz", "Ustaz Dr. Ahmad Firdaus"], ["role", "Gelaran / jawatan", "Penceramah Bertauliah JAKIM"], ["topic", "Tajuk ceramah / kitab pengajian", "Syarah Kitab Riyadhus Salihin"], ["session", "Nama sesi / majlis", "Kuliah Maghrib Perdana"]] as [keyof Live, string, string][]).map(([k, lb, ph]) => (
            <div key={k}><Lb id={"lv" + k}>{lb}</Lb><input id={"lv" + k} className="inp" maxLength={120} placeholder={ph} defaultValue={(live[k] as string) ?? ""} onBlur={(e) => setLive({ ...live, [k]: e.target.value.trim() })} /></div>))}</div>
        <Lb id="lvmsg">Teks hebahan berjalan (bar merah di bawah skrin)</Lb><textarea id="lvmsg" rows={2} maxLength={300} className="inp" placeholder="Sila rapatkan saf dan matikan telefon bimbit." defaultValue={live.ticker ?? ""} onBlur={(e) => setLive({ ...live, ticker: e.target.value.trim() })} /></section>

      <section className="card"><h2 className="text-lg font-bold">Setup Siaran Sosial Media</h2><p className="text-sm text-sub">Facebook, YouTube dan TikTok: masukkan server dan Stream Key seperti dalam OBS. Kunci disimpan secara peribadi dan hanya boleh dibaca oleh akaun anda.</p>
        <p className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> Penghantaran video terus ke Facebook, YouTube dan TikTok memerlukan pelayan relay RTMP khas (pelayar tidak boleh menghantar RTMP). Pelayan itu belum diaktifkan pada sistem ini, jadi tetapan di bawah tersimpan dan sedia, tetapi siaran ke platform belum bermula. Siaran ke skrin TV di atas sudah berfungsi.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {PLATS.map((p) => { const v = P(p.id); return (
            <div key={p.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between gap-2"><b>{p.name}</b><button type="button" className="switch" role="switch" aria-checked={v.on} aria-label={`${p.name} hidup atau mati`} onClick={() => setP(p.id, { on: !v.on })} /></div>
              <p className="mt-1 text-xs text-sub">{p.hint}</p>
              <Lb id={p.id + "ac"}>Akaun / halaman (pengesahan)</Lb><input id={p.id + "ac"} className="inp" maxLength={80} placeholder={p.id === "tt" ? "Nama pengguna TikTok" : "Nama akaun atau pautan halaman"} value={v.account} onChange={(e) => setP(p.id, { account: e.target.value })} />
              <Lb id={p.id + "sv"}>Server</Lb>
              {p.servers.length > 1 || p.servers[0][1] ? <select id={p.id + "sv"} className="inp" value={v.server} onChange={(e) => setP(p.id, { server: e.target.value })}>{p.servers.map(([n, u]) => <option key={u} value={u}>{n}</option>)}</select> : <input id={p.id + "sv"} className="inp" placeholder="rtmp://…" value={v.server} onChange={(e) => setP(p.id, { server: e.target.value })} />}
              <Lb id={p.id + "ky"}>Stream Key</Lb><div className="relative"><input id={p.id + "ky"} className="inp !pr-11" type={show[p.id] ? "text" : "password"} autoComplete="off" value={v.key} onChange={(e) => setP(p.id, { key: e.target.value })} /><button type="button" className="eye" aria-label={show[p.id] ? "Sembunyikan kunci" : "Tunjukkan kunci"} onClick={() => setShow({ ...show, [p.id]: !show[p.id] })}>{show[p.id] ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <Lb id={p.id + "ql"}>Kualiti</Lb><select id={p.id + "ql"} className="inp" value={v.quality} onChange={(e) => setP(p.id, { quality: e.target.value })}><option value="1080">1080p</option><option value="720">720p</option><option value="480">480p</option></select>
              <button type="button" className="btn btn-primary mt-3 w-full justify-center" onClick={() => applyP(p.id)}><Save size={16} /> Apply / OK</button>
            </div>); })}
        </div></section>
    </>);
}

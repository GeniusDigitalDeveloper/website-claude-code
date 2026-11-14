"use client";
import { useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { Bell, Building2, CheckCircle2, Copy, Download, ImagePlus, Info, Layers, LayoutDashboard, LogOut, MonitorPlay, Palette, Plus, Save, Trash2, Volume2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { ZONES } from "@/lib/zones";
import ZonePicker from "@/components/ZonePicker";
import PasswordInput from "@/components/PasswordInput";
import Shell, { type NavItem } from "@/components/Shell";
import Chat from "@/components/Chat";
import PreviewEditor from "@/components/PreviewEditor";
import { ARABIC_FONTS, DEMO_TV, FONTS, KIND_LABEL, PRAYER_OPTS, SLIDE_ANIMS, type SlideItem, type TvDoc, uid } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { DEFAULT_SLIDES } from "@/lib/defaultSlides";
import { ensureArabicFont } from "@/lib/arabicFont";
import { useDefaults } from "@/lib/useDefaults";
import { authMsg, useUser } from "@/lib/useUser";
import { useAzanLibrary } from "@/lib/useAzan";
import { usePwaInstall } from "@/lib/usePwa";
import { RINGS, playRing, type Ring } from "@/lib/ringtone";
import DateBadge from "@/components/DateBadge";

const L = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;

function resize(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.72)); };
    img.onerror = () => rej(new Error("img")); img.src = u;
  });
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ name: "", address: "", city: "", postcode: "", managerName: "", country: "Malaysia", state: "Selangor", zone: "", email: "", pw: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [info, setInfo] = useState("");
  useEffect(() => { try { const e = localStorage.getItem("sd_email_m"); if (e) setF((x) => ({ ...x, email: e })); } catch {} }, []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, f.email.trim(), f.pw);
      else {
        if (f.name.trim().length < 3 || f.address.trim().length < 5 || f.managerName.trim().length < 2) throw Object.assign(new Error(), { code: "x-name" });
        const c = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pw);
        if (!f.zone) throw Object.assign(new Error(), { code: "x-zone" });
        const zone = f.zone;
        await setDoc(doc(db, "registry", c.user.uid), { name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), postcode: f.postcode.trim(), state: f.state, zone, country: f.country, managerName: f.managerName.trim(), email: c.user.email, createdAt: Date.now() });
        await setDoc(doc(db, "tv", c.user.uid), { ...DEMO_TV, name: f.name.trim(), state: f.state, zone, country: f.country, ownerUid: c.user.uid });
      }
      try { localStorage.setItem("sd_email_m", f.email.trim()); } catch {}
    } catch (x) { const cd = (x as { code?: string }).code; setErr(cd === "x-name" ? "Sila lengkapkan nama masjid, alamat dan nama pengurus." : cd === "x-zone" ? "Sila pilih zon (atau tekan Kesan lokasi)." : authMsg(x)); }
    setBusy(false);
  };
  const reset = async () => { if (!f.email) return setErr("Isi emel dahulu."); try { await sendPasswordResetEmail(auth, f.email.trim()); setInfo("Pautan tetapan semula kata laluan telah dihantar."); } catch (x) { setErr(authMsg(x)); } };
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 py-10">
      <img src="/logo.png" alt="Solat Digital" className="mx-auto mb-4 h-24 w-auto" />
      <form className="card" onSubmit={submit}>
        <h1 className="text-2xl font-extrabold">Solat Digital (Pengurus Masjid)</h1><p className="mt-1 font-semibold">{mode === "in" ? "Log masuk" : "Daftar akaun masjid"}</p>
        <p className="mt-1 text-sm text-sub">{mode === "in" ? "Urus paparan TV masjid anda." : "Setiap masjid hanya daftar sekali. Selepas daftar, anda terus masuk ke panel."}</p>
        {mode === "up" && (<>
          <L id="nm">Nama masjid / surau</L><input id="nm" className="inp" value={f.name} onChange={(e) => set({ name: e.target.value })} required />
          <L id="ad">Alamat masjid</L><textarea id="ad" rows={2} className="inp" value={f.address} onChange={(e) => set({ address: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2"><div><L id="ci">Bandar / mukim</L><input id="ci" className="inp" value={f.city} onChange={(e) => set({ city: e.target.value })} required /></div><div><L id="pc">Poskod</L><input id="pc" className="inp" inputMode="numeric" maxLength={10} value={f.postcode} onChange={(e) => set({ postcode: e.target.value })} required /></div></div>
          <L id="mn">Nama pengurus / pegawai masjid</L><input id="mn" className="inp" value={f.managerName} onChange={(e) => set({ managerName: e.target.value })} required />
          <ZonePicker zone={f.zone} onChange={(z) => set({ zone: z, state: ZONES.find((x) => x[0] === z)![1] })} idp="reg" />
        </>)}
        <L id="em">Emel masjid / pengurus (untuk log masuk)</L><input id="em" type="email" autoComplete="username" name="email" className="inp" value={f.email} onChange={(e) => set({ email: e.target.value })} required />
        <L id="pw">Kata laluan</L><PasswordInput id="pw" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} value={f.pw} onChange={(v) => set({ pw: v })} />
        {err && <p role="alert" className="mt-3 text-danger">{err}</p>}{info && <p role="status" className="mt-3 text-accent">{info}</p>}
        <button className="btn btn-primary mt-5 w-full justify-center" disabled={busy}>{busy ? "Sila tunggu…" : mode === "in" ? "Log masuk" : "Daftar"}</button>
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
          <button type="button" className="underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>{mode === "in" ? "Belum ada akaun? Daftar masjid" : "Sudah ada akaun? Log masuk"}</button>
          {mode === "in" && <button type="button" className="underline" onClick={reset}>Lupa kata laluan</button>}
        </div>
      </form>
    </main>
  );
}

const REL = "https://github.com/GeniusDigitalDeveloper/website-claude-code/releases/download/solat-digital-latest/";
const KINDS = Object.entries(KIND_LABEL) as [SlideItem["kind"], string][];
type Sec = "dash" | "tema" | "azan" | "kandungan" | "masjid" | "notif" | "muat";

function Panel({ uidv }: { uidv: string }) {
  const [tv, setTv] = useState<TvDoc | null>(null); const [draft, setDraft] = useState<TvDoc | null>(null);
  const [imgs, setImgs] = useState<{ id: string; data: string }[]>([]);
  const [toast, setToast] = useState(""); const [txt, setTxt] = useState(""); const [dirty, setDirty] = useState(false);
  const [sec, setSec] = useState<Sec>("dash"); const [unread, setUnread] = useState(0);
  const lib = useAzanLibrary(); const pwa = usePwaInstall(); const file = useRef<HTMLInputElement>(null);
  const { raw, eff } = useDefaults(uidv); const pf = { styleEditor: true, slides: true, announcements: true, images: true, theme: true, ...(eff.panel ?? {}) };
  useEffect(() => {
    const u1 = onSnapshot(doc(db, "tv", uidv), (s) => { const d = s.data() as TvDoc | undefined; if (d) { setTv(d); setDraft((x) => x ?? d); } });
    const u2 = onSnapshot(query(collection(db, "tv", uidv, "img"), orderBy("order")), (s) => setImgs(s.docs.map((d) => ({ id: d.id, data: d.data().data }))));
    const u3 = onSnapshot(doc(db, "chats", uidv), (s) => setUnread((s.data()?.unreadMasjid as number) || 0), () => {});
    return () => { u1(); u2(); u3(); };
  }, [uidv]);
  useEffect(() => { try { localStorage.setItem("sd_last_m", uidv); } catch {} }, [uidv]);
  useEffect(() => { window.__sdBusy = dirty; return () => { window.__sdBusy = false; }; }, [dirty]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  if (!tv || !draft) return <p className="p-8">Memuatkan…</p>;
  const up = (p: Partial<TvDoc>) => { setDraft({ ...draft, ...p }); setDirty(true); };
  const live = (p: Partial<TvDoc>) => { setDraft((d) => (d ? { ...d, ...p } : d)); updateDoc(doc(db, "tv", uidv), { ...p, updatedAt: Date.now() }).catch(() => flash("Gagal kemas kini.")); };
  const slides = draft.slideList;
  const setSlides = (l: SlideItem[]) => up({ slideList: l.slice(0, 15) });
  const save = async () => {
    const data: Record<string, unknown> = { updatedAt: Date.now(), name: draft.name, state: draft.state, zone: draft.zone, azanId: draft.azanId ?? "", azanByPrayer: draft.azanByPrayer ?? {}, announcements: draft.announcements, slides: draft.slides, anim: draft.anim, secs: draft.secs, preMin: draft.preMin ?? 5, ringtone: draft.ringtone ?? "chime", ringRepeat: draft.ringRepeat ?? 1, azanDelayMin: draft.azanDelayMin ?? 0, volume: draft.volume ?? 100, font: draft.font ?? "", azanMute: !!draft.azanMute, jumaatTime: draft.jumaatTime ?? "", slideAnim: draft.slideAnim ?? "fade", slideSecs: draft.slideSecs ?? 10 };
    if (draft.slideList) data.slideList = draft.slideList;
    try { await updateDoc(doc(db, "tv", uidv), data); await updateDoc(doc(db, "registry", uidv), { name: draft.name, state: draft.state, zone: draft.zone }); setDirty(false); flash("Disimpan. TV dikemas kini serta-merta."); }
    catch { flash("Gagal simpan. Semak sambungan."); }
  };
  const addImg = async (fl?: FileList | null) => {
    if (!fl) return; for (const f of Array.from(fl)) { if (imgs.length >= 5) { flash("Maksimum 5 gambar muat naik."); break; } try { const data = await resize(f); if (data.length > 900000) { flash("Gambar terlalu besar."); continue; } await addDoc(collection(db, "tv", uidv, "img"), { data, order: Date.now() }); } catch { flash("Gambar tidak sah."); } }
    if (file.current) file.current.value = "";
  };
  const tvUrl = `${location.origin}/?m=${uidv}`;
  const updSlide = (id: string, p: Partial<SlideItem>) => setSlides((slides ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)));
  const items: NavItem[] = [
    { id: "dash", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "tema", label: "Tema dan font", icon: <Palette size={20} /> },
    { id: "azan", label: "Azan dan pemberitahuan", icon: <Volume2 size={20} /> },
    { id: "kandungan", label: "Slaid dan pengumuman", icon: <Layers size={20} /> },
    { id: "masjid", label: "Maklumat masjid", icon: <Building2 size={20} /> },
    { id: "notif", label: "Notifikasi", icon: <Bell size={20} />, badge: unread },
    { id: "muat", label: "Muat turun dan panduan", icon: <Download size={20} /> },
  ];
  const ArabicSel = (
    <><L id="af">Font tulisan Arab (khat Thuluth)</L>
      <select id="af" className="inp" value={draft.arabicFont ?? ""} onChange={(e) => live({ arabicFont: e.target.value })}>
        <option value="">Ikut lalai sistem (Thuluth)</option>{ARABIC_FONTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        {!!raw.customFonts?.length && <optgroup label="Thuluth dan font tersuai">{raw.customFonts.map((c) => <option key={c.id} value={"custom:" + c.id}>{c.name}</option>)}</optgroup>}
      </select>
      <p lang="ar" dir="rtl" className="mt-3 rounded-xl bg-muted p-4 text-center text-4xl" style={{ fontFamily: `"${ensureArabicFont(draft.arabicFont || eff.arabicFont || "honorifics", raw.customFonts)}", "Aref Ruqaa", serif`, lineHeight: 1.8 }}>الْفَجْرُ الظُّهْرُ الْجُمُعَةُ ﷺ</p>
      <p className="mt-2 text-xs text-sub">Khat Thuluth: Arabic Honorifics Complete oleh eraduz, berdasarkan karya BaAlwi Heritage (ID), lesen CC BY 4.0 (ligatur ungkapan hormat seperti ﷺ). Huruf lain guna sandaran berkaligrafi sehingga Owner menambah font Thuluth huruf penuh.</p></>
  );
  return (
    <div>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 pt-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3"><img src="/logo.png" alt="Solat Digital" className="h-12 w-auto" /><div className="min-w-0"><h1 className="break-words text-lg font-extrabold md:text-2xl">{tv.name}</h1><span className="text-xs font-semibold text-sub">Solat Digital (Pengurus Masjid)</span> <DateBadge mode={eff.hijriMode ?? "jakim"} /> <span className={`chip ${tv.plan === "full" ? "chip-ok" : "chip-demo"}`}>{tv.plan === "full" ? <><CheckCircle2 size={14} /> Akses penuh (seumur hidup)</> : "Mod demo"}</span></div></div>
        <div className="flex gap-2"><a className="btn btn-primary" href={tvUrl} target="_blank" rel="noreferrer"><MonitorPlay size={18} /> Buka TV</a><button className="btn btn-danger" onClick={() => signOut(auth)}><LogOut size={18} /> Log keluar</button></div>
      </header>
      <Shell brand={<div className="text-sm font-bold text-sub">Menu pengurusan</div>} items={items} active={sec} onSelect={(id) => setSec(id as Sec)}>
        <div key={sec} className="grid gap-5">
        {sec === "dash" && (<>
          {eff.panel?.notice && <div className="card border-green-600/40" role="note"><Info size={18} className="mr-2 inline text-accent" />{eff.panel.notice}</div>}
          {tv.plan !== "full" && <div className="card border-yellow-500/50" role="note"><b>Akaun anda masih mod demo.</b> Pop-up dan azan waktu solat belum aktif. Langgan sekali sahaja (bayaran sekali, akses penuh seumur hidup) dan Owner Solat Digital akan aktifkan akaun anda.</div>}
          <section className="card"><h2 className="text-lg font-bold">Paparan live TV masjid anda</h2><p className="text-sm text-sub">Paparan TV terkini anda ({tv.name}).</p>
            <div className="mt-3"><PreviewEditor mid={uidv} tv={tv} customFonts={raw.customFonts} canEdit={pf.styleEditor} /></div></section>
          <section className="card"><h2 className="text-lg font-bold">Pautan TV</h2><p className="mt-1 text-sm text-sub">Buka pautan ini pada TV. Ia terus memaparkan waktu solat masjid anda dan tidak tidur sehingga TV dimatikan.</p>
            <div className="mt-3 flex gap-2"><input readOnly className="inp" aria-label="Pautan TV" value={tvUrl} /><button className="btn" aria-label="Salin pautan" onClick={() => { navigator.clipboard?.writeText(tvUrl); flash("Pautan disalin."); }}><Copy size={18} /></button></div></section>
        </>)}

        {sec === "tema" && (<>
          {pf.theme && <section className="card"><h2 className="text-lg font-bold">Tema TV</h2><p className="text-sm text-sub">Pilih tema warna paparan. Terus berubah pada TV.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">{THEMES.map((t) => (<button key={t.id} type="button" className="sw-theme" data-on={(draft.theme || eff.theme || "ios") === t.id} onClick={() => live({ theme: t.id })}><span className="h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${t.swatch[1]}, ${t.swatch[0]})` }} /><b>{t.label}</b></button>))}</div></section>}
          <section className="card"><h2 className="text-lg font-bold">Font</h2>
            <L id="ft">Font paparan TV (huruf Latin)</L><select id="ft" className="inp" value={draft.font ?? ""} onChange={(e) => up({ font: e.target.value })}><option value="">Ikut lalai sistem</option>{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
            {ArabicSel}
            {pf.styleEditor && <p className="mt-3 text-sm text-sub">Untuk ubah font dan warna elemen tertentu, buka <b>Dashboard</b> dan klik terus pada paparan TV.</p>}</section>
          {pf.images && <section className="card"><h2 className="text-lg font-bold">Gambar latar masjid</h2><p className="text-sm text-sub">Muat naik gambar masjid anda (maksimum 5) atau letak URL gambar. Kosong = gambar lalai.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{imgs.map((im) => (<div key={im.id} className="relative overflow-hidden rounded-xl border border-line"><img src={im.data} alt="Gambar latar" className="aspect-video w-full object-cover" /><button className="btn absolute right-1 top-1 !min-h-9 !px-2" aria-label="Padam gambar" onClick={() => deleteDoc(doc(db, "tv", uidv, "img", im.id))}><Trash2 size={16} /></button></div>))}
              {imgs.length < 5 && <button className="grid aspect-video place-items-center rounded-xl border border-dashed border-line text-sub hover:bg-muted" onClick={() => file.current?.click()} aria-label="Muat naik gambar"><span className="grid place-items-center gap-1"><ImagePlus /> Muat naik</span></button>}</div>
            <input ref={file} type="file" accept="image/*" multiple className="hidden" aria-label="Pilih gambar" onChange={(e) => addImg(e.target.files)} />
            <L id="sl">URL gambar tambahan (satu setiap baris)</L><textarea id="sl" rows={3} className="inp" value={draft.slides.join("\n")} onChange={(e) => up({ slides: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10) })} />
            <div className="grid gap-3 sm:grid-cols-2"><div><L id="an">Animasi latar</L><select id="an" className="inp" value={draft.anim} onChange={(e) => up({ anim: e.target.value as TvDoc["anim"] })}><option value="kenburns">Zum masuk</option><option value="zoomout">Zum keluar</option><option value="fade">Pudar sahaja</option></select></div>
              <div><L id="sc">Saat setiap gambar</L><input id="sc" type="number" min={4} max={30} className="inp" value={draft.secs} onChange={(e) => up({ secs: Math.max(4, Math.min(30, +e.target.value || 10)) })} /></div></div></section>}
        </>)}

        {sec === "azan" && (<>
          <section className="card"><h2 className="text-lg font-bold">Azan untuk setiap waktu</h2><p className="text-sm text-sub">Pilih azan daripada perpustakaan Owner. Kredit azan dipaparkan di TV.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">{PRAYER_OPTS.map(([k, n]) => { const opts = lib.filter((a) => !a.prayers?.length || a.prayers.includes(k)); const val = draft.azanByPrayer?.[k] ?? ""; const sel = lib.find((a) => a.id === val); return (
              <div key={k}><L id={"az" + k}>{n}</L><select id={"az" + k} className="inp" value={val} onChange={(e) => up({ azanByPrayer: { ...(draft.azanByPrayer ?? {}), [k]: e.target.value } })}><option value="">Lalai</option>{opts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.credit}</option>)}</select>
                {sel && <audio className="mt-2 h-9 w-full" controls preload="none" src={sel.url} />}</div>); })}</div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><div><b>Bunyi azan: {draft.azanMute ? "Senyap" : "Hidup"}</b><p className="text-xs text-sub">Senyap hanya mematikan laungan azan. Nada masuk waktu dan pop-up tetap berfungsi.</p></div>
              <button type="button" className="switch" role="switch" aria-checked={!draft.azanMute} aria-label="Bunyi azan" onClick={() => up({ azanMute: !draft.azanMute })} /></div></section>
          <section className="card"><h2 className="text-lg font-bold">Pemberitahuan sebelum azan dan Jumaat</h2><p className="text-sm text-sub">Kiraan detik, nada dan masa menunggu sebelum azan.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><L id="pm">Mula kiraan detik (minit sebelum azan)</L><input id="pm" type="number" min={0} max={30} className="inp" value={draft.preMin ?? 5} onChange={(e) => up({ preMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">Lalai 5 minit. 0 = matikan.</p></div>
              <div><L id="ad">Tunggu selepas masuk waktu, baru azan (minit)</L><input id="ad" type="number" min={0} max={30} className="inp" value={draft.azanDelayMin ?? 0} onChange={(e) => up({ azanDelayMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">0 = azan terus.</p></div>
              <div><L id="rt">Nada masuk waktu</L><select id="rt" className="inp" value={draft.ringtone ?? "chime"} onChange={(e) => up({ ringtone: e.target.value as Ring })}>{RINGS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
              <div><L id="rr">Berapa kali nada diulang</L><input id="rr" type="number" min={1} max={5} className="inp" value={draft.ringRepeat ?? 1} onChange={(e) => up({ ringRepeat: Math.max(1, Math.min(5, Math.round(+e.target.value) || 1)) })} /></div>
              <div><L id="jt">Waktu Jumaat (pilihan, cth 13:15)</L><input id="jt" type="time" className="inp" value={(draft.jumaatTime ?? "").slice(0, 5)} onChange={(e) => up({ jumaatTime: e.target.value })} /><p className="mt-1 text-xs text-sub">Kosong = ikut waktu Zuhur JAKIM. Pada hari Jumaat, waktu Jumaat berkelip dan ada pop-up khas; Zuhur tidak berkelip.</p></div>
            </div>
            <L id="vl">Kelantangan: {draft.volume ?? 100}%</L><input id="vl" type="range" min={5} max={100} step={5} className="w-full accent-green-700" value={draft.volume ?? 100} onChange={(e) => up({ volume: +e.target.value })} />
            <button type="button" className="btn mt-3" onClick={async () => { const ok = await playRing((draft.ringtone ?? "chime") as Ring, draft.ringRepeat ?? 1, draft.volume ?? 100); if (!ok) flash("Pelayar menyekat bunyi. Ketik skrin sekali dan cuba lagi."); }}>Cuba nada</button>
            <p className="mt-2 text-xs text-sub">Bunyi hanya bermula selepas skrin TV diketik sekali (peraturan pelayar), kecuali aplikasi .exe. Hanya untuk akaun akses penuh.</p></section>
        </>)}

        {sec === "kandungan" && (<>
          {pf.slides && <section className="card"><h2 className="text-lg font-bold">Slaid kandungan ({(slides ?? DEFAULT_SLIDES).length} / 15)</h2>
            <p className="text-sm text-sub">Slaid kecil di sebelah kanan TV (nisbah 1920 x 1080). Maksimum 15 slaid. Slaid bertanda Jumaat hanya keluar pada hari Jumaat.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><L id="sa">Animasi (5 jenis)</L><select id="sa" className="inp" value={draft.slideAnim ?? "fade"} onChange={(e) => up({ slideAnim: e.target.value as TvDoc["slideAnim"] })}>{SLIDE_ANIMS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
              <div><L id="ss">Saat setiap slaid</L><input id="ss" type="number" min={4} max={60} className="inp" value={draft.slideSecs ?? 10} onChange={(e) => up({ slideSecs: Math.max(4, Math.min(60, Math.round(+e.target.value) || 10)) })} /></div></div>
            {!slides && <div className="mt-3 rounded-xl bg-muted p-3 text-sm">Anda sedang guna <b>pek slaid asas</b> (hadis, ayat dan kata peringatan berserta rujukan). <button className="btn mt-2" onClick={() => setSlides(DEFAULT_SLIDES)}>Salin pek asas untuk disunting</button></div>}
            {slides && <>
              <ul className="mt-3 grid gap-3">{slides.map((sl) => (
                <li key={sl.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2"><select aria-label="Jenis slaid" className="inp !w-auto" value={sl.kind} onChange={(e) => updSlide(sl.id, { kind: e.target.value as SlideItem["kind"] })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                    <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={sl.on} onChange={(e) => updSlide(sl.id, { on: e.target.checked })} /> Aktif</label>
                    <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!sl.jumaat} onChange={(e) => updSlide(sl.id, { jumaat: e.target.checked })} /> Jumaat sahaja</label>
                    <button className="btn ml-auto" aria-label="Padam slaid" onClick={() => setSlides(slides.filter((x) => x.id !== sl.id))}><Trash2 size={16} /></button></div>
                  <textarea aria-label="Teks slaid" rows={3} maxLength={400} className="inp mt-2" value={sl.text} onChange={(e) => updSlide(sl.id, { text: e.target.value })} />
                  <input aria-label="Rujukan slaid" className="inp mt-2" placeholder="Rujukan (cth: HR. al-Bukhari no. 1)" value={sl.source ?? ""} onChange={(e) => updSlide(sl.id, { source: e.target.value })} />
                </li>))}</ul>
              <div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={slides.length >= 15} onClick={() => setSlides([...slides, { id: uid(), kind: "umum", text: "", source: "", on: true }])}><Plus size={18} /> Tambah slaid</button>
                <button className="btn" onClick={() => confirm("Gantikan semua slaid dengan pek asas?") && setSlides(DEFAULT_SLIDES)}>Set semula ke pek asas</button></div></>}
          </section>}
          {pf.announcements && <section className="card"><h2 className="text-lg font-bold">Pengumuman (teks bergerak di footer)</h2>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; up({ announcements: [...draft.announcements, { id: uid(), text: txt.trim().slice(0, 200), on: true }] }); setTxt(""); }}>
              <input className="inp" aria-label="Teks pengumuman" placeholder="cth: Kuliah Maghrib bersama Ustaz, malam ini" value={txt} onChange={(e) => setTxt(e.target.value)} /><button className="btn btn-primary" aria-label="Tambah pengumuman"><Plus size={18} /></button></form>
            <ul className="mt-3 grid gap-2">{draft.announcements.map((a) => (<li key={a.id} className="flex items-center gap-3 rounded-xl bg-muted p-3"><input type="checkbox" className="size-5 accent-green-700" aria-label="Aktif" checked={a.on} onChange={(e) => up({ announcements: draft.announcements.map((x) => x.id === a.id ? { ...x, on: e.target.checked } : x) })} /><span className="min-w-0 flex-1 break-words">{a.text}</span><button className="btn" aria-label="Padam pengumuman" onClick={() => up({ announcements: draft.announcements.filter((x) => x.id !== a.id) })}><Trash2 size={18} /></button></li>))}
              {!draft.announcements.length && <li className="text-sm text-sub">Belum ada pengumuman.</li>}</ul></section>}
        </>)}

        {sec === "masjid" && (
          <section className="card"><h2 className="text-lg font-bold">Maklumat masjid dan zon</h2>
            <L id="nm">Nama masjid (dipaparkan HURUF BESAR)</L><input id="nm" className="inp" value={draft.name} onChange={(e) => up({ name: e.target.value })} />
            <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-green-700" checked={!draft.zone} onChange={(e) => up({ zone: e.target.checked ? "" : "SGR01" })} /> Kesan zon secara automatik (ikut lokasi peranti TV)</label>
            {draft.zone && <ZonePicker zone={draft.zone} onChange={(z) => up({ zone: z, state: ZONES.find((x) => x[0] === z)![1] })} idp="set" />}
          </section>)}

        {sec === "notif" && (
          <section className="card"><h2 className="text-lg font-bold">Notifikasi</h2><p className="mb-3 text-sm text-sub">Hantar cadangan, masalah atau soalan kepada Owner Solat Digital. Anda juga menerima mesej dan siaran daripada Owner di sini.</p>
            <Chat mid={uidv} me="masjid" mosqueName={tv.name} /></section>)}

        {sec === "muat" && (
          <section className="card"><h2 className="text-lg font-bold">Muat turun aplikasi</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <a className="btn btn-dl justify-center" href={REL + "SolatDigital-TV-Setup.exe"}><Download size={18} /> Solat Digital (TV) .exe</a>
              <a className="btn btn-dl justify-center" href={REL + "SolatDigital-Pengurus-Setup.exe"}><Download size={18} /> Solat Digital (Pengurus Masjid) .exe</a>
            </div>
            {pwa.canInstall && <button className="btn mt-3" onClick={pwa.install}><Download size={18} /> Pasang Solat Digital (Pengurus Masjid) pada peranti ini</button>}
            {pwa.installed && <p className="mt-3 text-sm text-accent">Aplikasi sudah dipasang pada peranti ini.</p>}
            <p className="mt-3 text-sm text-sub">Android, iPhone, iPad dan Mac: buka pautan TV di pelayar, pilih Share atau menu pelayar, kemudian Add to Home Screen / Install app. Aplikasi TV .exe terus dibuka berskrin penuh dan bermula sendiri bila Windows dihidupkan.</p>
            <h3 className="mt-5 font-bold">Di mana butang pada skrin TV?</h3>
            <img src="/guide-tv.png" alt="Gambar panduan: ikon skrin penuh dan ikon tetapan di bucu kanan atas paparan TV" className="mt-2 w-full rounded-xl border border-line" />
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li><b>Ikon skrin penuh</b> (empat sudut, bucu kanan atas): tekan untuk besarkan skrin. Tekan lagi untuk keluar.</li>
              <li><b>Ikon tetapan</b> (roda gigi, paling hujung kanan atas): tekan untuk masuk ke panel ini.</li>
              <li>Hanya dua ikon itu; ia pudar bila tiada sentuhan dan muncul semula bila tetikus/alat kawalan digerakkan.</li>
              <li>Paparan tidak akan tidur atau tertutup sendiri. Ia berhenti hanya bila TV dimatikan.</li>
            </ul></section>)}
        </div>
      </Shell>
      <div className="bar-frost fixed inset-x-0 bottom-0 z-40 border-t border-white/60 p-3"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-2"><span className="text-sm text-sub">{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan disimpan"}</span><button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={18} /> Simpan</button></div></div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function Page() {
  const user = useUser();
  if (user === undefined) return <p className="p-8">Memuatkan…</p>;
  if (!user) return <AuthForm />;
  return <Panel uidv={user.uid} />;
}

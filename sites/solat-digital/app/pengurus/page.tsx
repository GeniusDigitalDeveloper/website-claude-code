"use client";
import { useEffect, useRef, useState } from "react";
import { EmailAuthProvider, GoogleAuthProvider, createUserWithEmailAndPassword, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, updateProfile, verifyBeforeUpdateEmail, type User } from "firebase/auth";
import { onValue, ref as dbRef } from "firebase/database";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { Bell, Building2, CheckCircle2, Copy, Download, Eye, Heart, ImagePlus, Info, LayoutDashboard, Layers, LogOut, Mail, Megaphone, MonitorPlay, Palette, Plus, Radio, Save, Settings, StickyNote, Trash2, User as UserIc, Wallpaper, Lock, Wifi } from "lucide-react";
import { auth, db, rtdb } from "@/lib/firebase";
import { ZONES } from "@/lib/zones";
import ZonePicker from "@/components/ZonePicker";
import PasswordInput from "@/components/PasswordInput";
import PanelShell, { type PGroup } from "@/components/PanelShell";
import { ModeToggle } from "@/components/ModeWrap";
import { detectZone, loadTimes, to12, type Times, PRAYERS } from "@/lib/prayer";
import Chat from "@/components/Chat";
import PreviewEditor from "@/components/PreviewEditor";
import SlideManager from "@/components/SlideManager";
import AddressPicker from "@/components/AddressPicker";
import SlideLibrary from "@/components/SlideLibrary";
import { useQuickBg } from "@/components/OwnerEditors";
import { youtubeId } from "@/lib/media";
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
import { chatSfx } from "@/lib/sfx";

const L = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;

function resize(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k; c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", 0.72)); };
    img.onerror = () => rej(new Error("img")); img.src = u;
  });
}

type Don = { enabled?: boolean; title?: string; bankName?: string; accName?: string; accNo?: string; note?: string; qr?: string; method?: string };
function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [info, setInfo] = useState("");
  useEffect(() => {
    (async () => {
      try { const e = localStorage.getItem("sd_email_m"); if (e) setF((x) => ({ ...x, email: e })); } catch {}
      try { if (localStorage.getItem("sd_owner_device") !== "1") return; const c = await (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ id?: string; password?: string } | null> }).get({ password: true, mediation: "optional" }); if (c?.id && c.password) setF((x) => ({ ...x, email: c.id!, pw: c.password! })); } catch {}
    })();
  }, []);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, f.email.trim(), f.pw);
      else {
        if (f.name.trim().length < 3) throw Object.assign(new Error(), { code: "x-name" });
        if (f.pw.length < 6) throw Object.assign(new Error(), { code: "auth/weak-password" });
        if (f.pw !== f.pw2) throw Object.assign(new Error(), { code: "x-pw" });
        const c = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pw);
        await updateProfile(c.user, { displayName: f.name.trim() }).catch(() => {});
        await createMosqueDocs(c.user, f.name.trim());
        sendEmailVerification(c.user).catch(() => {});
      }
      try { localStorage.setItem("sd_email_m", f.email.trim()); } catch {}
      if (mode === "in") { try { const u = auth.currentUser; if (u && (await getDoc(doc(db, "admins", u.uid))).exists()) { localStorage.setItem("sd_owner_device", "1"); const PC = (window as unknown as { PasswordCredential?: new (o: unknown) => unknown }).PasswordCredential; if (PC) await (navigator.credentials as unknown as { store: (c: unknown) => Promise<unknown> }).store(new PC({ id: f.email.trim(), password: f.pw, name: "Owner Solat Digital" })); } } catch {} }
    } catch (x) { const cd = (x as { code?: string }).code; setErr(cd === "x-name" ? "Sila isi nama penuh pentadbir." : cd === "x-pw" ? "Kata laluan dan pengesahan tidak sama." : authMsg(x)); }
    setBusy(false);
  };
  const google = async () => { setErr(""); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (x) { const c = (x as { code?: string }).code ?? ""; if (!c.includes("popup-closed") && !c.includes("cancelled")) setErr(c.includes("operation-not-allowed") ? "Log masuk Google belum diaktifkan oleh pentadbir sistem." : authMsg(x)); } };
  const reset = async () => { if (!f.email) return setErr("Isi emel dahulu."); try { await sendPasswordResetEmail(auth, f.email.trim()); setInfo("Pautan tetapan semula kata laluan telah dihantar ke emel anda."); } catch (x) { setErr(authMsg(x)); } };
  const Fld = ({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) => (<div><L id={id}>{label}</L><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sub">{icon}</span>{children}</div></div>);
  return (
    <main className="relative mx-auto grid min-h-dvh max-w-md content-center px-4 py-10">
      <div className="absolute right-3 top-3"><ModeToggle /></div>
      <div className="text-center"><img src="/logo.png" alt="Solat Digital" className="mx-auto mb-2 h-24 w-auto" /><h1 className="text-3xl font-extrabold">Solat Digital</h1><p className="mx-auto mt-1 max-w-xs text-sm text-sub">Sistem Paparan Waktu Solat dan Hebahan Digital Pintar</p></div>
      <form className="card mt-5 !p-6" onSubmit={submit}>
        <h2 className="text-center text-2xl font-extrabold text-accent">{mode === "in" ? "Selamat Kembali" : "Daftar Akaun Baharu"}</h2>
        <p className="mt-1 text-center text-sm text-sub">{mode === "in" ? "Sila masukkan emel dan kata laluan akaun pentadbir masjid anda." : "Cipta akaun pentadbir masjid / surau anda."}</p>
        {mode === "up" && <Fld id="nm" label="Nama Penuh Pentadbir" icon={<UserIc size={18} />}><input id="nm" className="inp !pl-10" placeholder="Contoh: Ustaz Ahmad bin Abdullah" value={f.name} onChange={(e) => set({ name: e.target.value })} required /></Fld>}
        <Fld id="em" label="Alamat Emel" icon={<Mail size={18} />}><input id="em" type="email" autoComplete="off" name="mosque-email" className="inp !pl-10" placeholder="nama@emel.com" value={f.email} onChange={(e) => set({ email: e.target.value })} required /></Fld>
        <Fld id="pw" label="Kata Laluan" icon={<Lock size={18} />}><PasswordInput id="pw" autoComplete="new-password" minLength={6} value={f.pw} onChange={(v) => set({ pw: v })} className="!pl-10" /></Fld>
        {mode === "up" && <Fld id="pw2" label="Sahkan Kata Laluan" icon={<Lock size={18} />}><PasswordInput id="pw2" autoComplete="new-password" minLength={6} value={f.pw2} onChange={(v) => set({ pw2: v })} className="!pl-10" /></Fld>}
        {mode === "in" && <div className="mt-2 text-right"><button type="button" className="text-sm font-semibold text-accent underline" onClick={reset}>Lupa kata laluan?</button></div>}
        {err && <p role="alert" className="mt-3 text-danger">{err}</p>}{info && <p role="status" className="mt-3 text-accent">{info}</p>}
        <button className="btn btn-primary mt-5 w-full justify-center" disabled={busy}>{busy ? "Sila tunggu…" : mode === "in" ? "Log Masuk" : "Daftar Akaun"}</button>
        <div className="my-4 flex items-center gap-3 text-xs text-sub"><span className="h-px flex-1 bg-line" />atau<span className="h-px flex-1 bg-line" /></div>
        <button type="button" className="btn w-full justify-center" onClick={google}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7.3 5.7c4.3-4 6.9-9.8 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> {mode === "in" ? "Log masuk dengan Google" : "Daftar dengan Google"}</button>
        <p className="mt-4 text-center text-sm text-sub">{mode === "in" ? "Belum ada akaun? " : "Sudah mempunyai akaun? "}<button type="button" className="font-bold text-accent underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}>{mode === "in" ? "Daftar di sini" : "Log masuk di sini"}</button></p>
      </form>
      <p className="mt-5 text-center text-xs text-sub">© 2026 Solat Digital. Hak Cipta Terpelihara.</p>
    </main>
  );
}

/** Cipta rekod masjid asas (nama dan zon boleh diubah kemudian di Tetapan Waktu Solat). */
async function createMosqueDocs(u: User, name: string) {
  const nm = "Masjid / Surau Anda";
  await setDoc(doc(db, "registry", u.uid), { name: nm, address: "", city: "", postcode: "", state: "", zone: "", country: "Malaysia", managerName: name, email: u.email ?? "", createdAt: Date.now() });
  await setDoc(doc(db, "tv", u.uid), { ...DEMO_TV, name: nm, state: "", zone: "", country: "Malaysia", ownerUid: u.uid });
}
const REL = "https://github.com/GeniusDigitalDeveloper/website-claude-code/releases/download/solat-digital-latest/";
const KINDS = Object.entries(KIND_LABEL) as [SlideItem["kind"], string][];
type Sec = "dash" | "live" | "slaid" | "tiker" | "memo" | "latar" | "tetapan" | "warna" | "profil" | "sumbangan" | "notif" | "muat";

function Panel({ uidv, user }: { uidv: string; user: User }) {
  const [tv, setTv] = useState<TvDoc | null>(null); const tvRef = useRef<TvDoc | null>(null); tvRef.current = tv; const [draft, setDraft] = useState<TvDoc | null>(null);
  const [imgs, setImgs] = useState<{ id: string; data: string }[]>([]);
  const [toast, setToast] = useState(""); const [txt, setTxt] = useState(""); const [dirty, setDirty] = useState(false);
  const [noDoc, setNoDoc] = useState(false); const [sec, setSec] = useState<Sec>("dash"); const [unread, setUnread] = useState(0); const [ntoast, setNtoast] = useState(false); const prevUnread = useRef(0); const secRef = useRef<Sec>("dash");
  useEffect(() => { if (noDoc) createMosqueDocs(user, user.displayName || user.email || "Pentadbir").catch(() => {}); }, [noDoc]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = useQuickBg(); const [yt, setYt] = useState("");
  const [memoT, setMemoT] = useState(""); const [memoB, setMemoB] = useState("");
  const [online, setOnline] = useState(false); const [times, setTimes] = useState<Times | null>(null); const [profile, setProfile] = useState<{ managerName?: string } | null>(null); const [don, setDon] = useState<Don | null>(null);
  useEffect(() => onValue(dbRef(rtdb, `presence/${uidv}/t`), (s) => { const t = Number(s.val() || 0); setOnline(!!t && Date.now() - t < 180000); }, () => {}), [uidv]);
  useEffect(() => onSnapshot(doc(db, "registry", uidv), (s) => setProfile((s.data() as { managerName?: string }) ?? null), () => {}), [uidv]);
  useEffect(() => onSnapshot(doc(db, "config", "donation"), (s) => setDon((s.data() as Don) ?? null), () => {}), []);
  useEffect(() => { let ok = true; (async () => { try { const z = tvRef.current?.zone || (await detectZone()); const t = await loadTimes(z); if (ok) setTimes(t); } catch {} })(); return () => { ok = false; }; }, [tv?.zone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { secRef.current = sec; if (sec === "notif") setNtoast(false); }, [sec]);
  const lib = useAzanLibrary(); const pwa = usePwaInstall(); const file = useRef<HTMLInputElement>(null);
  const { raw, eff } = useDefaults(uidv); const pf = { styleEditor: true, slides: true, announcements: true, images: true, theme: true, ...(eff.panel ?? {}) };
  useEffect(() => {
    const u1 = onSnapshot(doc(db, "tv", uidv), (s) => { const d = s.data() as TvDoc | undefined; if (d) { setNoDoc(false); setTv(d); setDraft((x) => x ?? d); try { localStorage.setItem("sd_last_m", uidv); } catch {} } else setNoDoc(true); });
    const u2 = onSnapshot(query(collection(db, "tv", uidv, "img"), orderBy("order")), (s) => setImgs(s.docs.map((d) => ({ id: d.id, data: d.data().data }))));
    const u3 = onSnapshot(doc(db, "chats", uidv), (s) => { const n = (s.data()?.unreadMasjid as number) || 0; setUnread(n); if (n > prevUnread.current && secRef.current !== "notif") { setNtoast(true); chatSfx("recv"); } prevUnread.current = n; }, () => {});
    return () => { u1(); u2(); u3(); };
  }, [uidv]);
  useEffect(() => { window.__sdBusy = dirty; return () => { window.__sdBusy = false; }; }, [dirty]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  if (noDoc) return <p className="p-8">Menyediakan akaun masjid anda…</p>;
  if (!tv || !draft) return <p className="p-8">Memuatkan…</p>;
  const up = (p: Partial<TvDoc>) => { setDraft({ ...draft, ...p }); setDirty(true); };
  const live = (p: Partial<TvDoc>) => { setDraft((d) => (d ? { ...d, ...p } : d)); updateDoc(doc(db, "tv", uidv), { ...p, updatedAt: Date.now() }).catch(() => flash("Gagal kemas kini.")); };
  const slides = draft.slideList;
  const setSlides = (l: SlideItem[]) => up({ slideList: l.slice(0, 15) });
  const save = async () => {
    const data: Record<string, unknown> = { updatedAt: Date.now(), name: draft.name, state: draft.state, zone: draft.zone, azanId: draft.azanId ?? "", azanByPrayer: draft.azanByPrayer ?? {}, announcements: draft.announcements, slides: draft.slides, anim: draft.anim, secs: draft.secs, preMin: draft.preMin ?? 5, ringtone: draft.ringtone ?? "chime", ringRepeat: draft.ringRepeat ?? 1, azanDelayMin: draft.azanDelayMin ?? 0, popupMin: draft.popupMin ?? 3, volume: draft.volume ?? 100, font: draft.font ?? "", azanMute: !!draft.azanMute, jumaatTime: draft.jumaatTime ?? "", slideAnim: draft.slideAnim ?? "fade", slideSecs: draft.slideSecs ?? 10, sched: draft.sched ?? {} };
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
  const ArabicSel = (
    <><L id="af">Font tulisan Arab (khat Thuluth)</L>
      <select id="af" className="inp" value={draft.arabicFont ?? ""} onChange={(e) => live({ arabicFont: e.target.value })}>
        <option value="">Ikut lalai sistem (Thuluth)</option>{ARABIC_FONTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        {!!raw.customFonts?.length && <optgroup label="Thuluth dan font tersuai">{raw.customFonts.map((c) => <option key={c.id} value={"custom:" + c.id}>{c.name}</option>)}</optgroup>}
      </select>
      <p lang="ar" dir="rtl" className="mt-3 rounded-xl bg-muted p-4 text-center text-4xl" style={{ fontFamily: `"${ensureArabicFont(draft.arabicFont || eff.arabicFont || "honorifics", raw.customFonts)}", "Aref Ruqaa", serif`, lineHeight: 1.8, ...(draft.arabicColor ? { color: draft.arabicColor } : {}) }}>الْفَجْرُ الظُّهْرُ الْجُمُعَةُ ﷺ</p>
      <p className="mt-2 text-xs text-sub">Khat Thuluth: Arabic Honorifics Complete oleh eraduz, berdasarkan karya BaAlwi Heritage (ID), lesen CC BY 4.0 (ligatur ungkapan hormat seperti ﷺ). Huruf lain guna sandaran berkaligrafi sehingga Owner menambah font Thuluth huruf penuh.</p></>
  );
  const reg = (profile ?? {}) as { address?: string; postcode?: string; city?: string; managerName?: string };
  const groups: PGroup[] = [
    { title: "Utama", items: [{ id: "dash", label: "Dashboard", icon: <LayoutDashboard size={19} /> }] },
    { title: "Kandungan paparan", items: [
      { id: "live", label: "Siaran Kuliah (Live)", icon: <Radio size={19} /> }, { id: "slaid", label: "Slider & Hadis", icon: <Layers size={19} /> },
      { id: "tiker", label: "Ticker Hebahan", icon: <Megaphone size={19} /> }, { id: "memo", label: "Memo Masjid", icon: <StickyNote size={19} /> }, { id: "latar", label: "Latar Belakang", icon: <Wallpaper size={19} /> }] },
    { title: "Konfigurasi", items: [{ id: "tetapan", label: "Tetapan Waktu Solat", icon: <Settings size={19} /> }, { id: "warna", label: "Warna & Tipografi", icon: <Palette size={19} /> }] },
    { title: "Pentadbiran", items: [{ id: "profil", label: "Profil & Akaun", icon: <UserIc size={19} /> }, { id: "sumbangan", label: "Sumbangan", icon: <Heart size={19} /> }, { id: "notif", label: "Notifikasi", icon: <Bell size={19} />, badge: unread }, { id: "muat", label: "Muat turun & Panduan", icon: <Download size={19} /> }] },
  ];
  const titles: Record<Sec, string> = { dash: "Dashboard", live: "Siaran Kuliah (Live)", slaid: "Slider & Hadis", tiker: "Ticker Hebahan", memo: "Memo Masjid", latar: "Latar Belakang", tetapan: "Tetapan Waktu Solat & Paparan", warna: "Warna & Tipografi", profil: "Profil & Keselamatan Akaun", sumbangan: "Sumbangan", notif: "Notifikasi", muat: "Muat turun & Panduan" };
  const hName = reg.managerName || user.displayName || user.email || "Pentadbir";
  const nSlides = (draft.slideList ?? DEFAULT_SLIDES).length;
  const zi = ZONES.find((z) => z[0] === draft.zone);
  const sendVerify = async () => { try { await sendEmailVerification(user); flash("Emel pengesahan dihantar. Semak peti masuk anda."); } catch { flash("Tidak dapat hantar emel sekarang. Cuba lagi sebentar."); } };
  return (
    <div>
      <PanelShell groups={groups} active={sec} onSelect={(id) => setSec(id as Sec)} user={{ name: hName, email: user.email ?? "" }} onLogout={() => signOut(auth)} title={titles[sec]} tag="TV OS"
        right={<><button type="button" className="btn !min-h-10 !px-3 !border-yellow-500 !bg-yellow-400 !text-black hover:!bg-yellow-300" onClick={() => setSec("sumbangan")}><Heart size={16} /> <span className="hidden sm:inline">Sumbangan</span></button><a className="btn !min-h-10 !px-3" href={tvUrl} target="_blank" rel="noreferrer" aria-label="Buka TV" title="Buka TV"><MonitorPlay size={18} /></a><ModeToggle /></>}>
        <div key={sec} className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {sec === "dash" && (<>
          {!user.emailVerified && <div className="card flex flex-wrap items-center gap-3 border-amber-400 bg-amber-50 text-amber-900" role="alert"><Mail size={18} /><span className="min-w-0 flex-1">Emel akaun anda belum disahkan. Dapatkan pautan pengesahan melalui emel yang didaftarkan.</span><button type="button" className="btn !min-h-9 !border-yellow-500 !bg-yellow-400 !text-black hover:!bg-yellow-300" onClick={sendVerify}>Sahkan emel sekarang</button></div>}
          {eff.panel?.notice && <div className="card border-green-600/40" role="note"><Info size={18} className="mr-2 inline text-accent" />{eff.panel.notice}</div>}
          <section className="rounded-3xl p-6 text-white md:p-8" style={{ background: "linear-gradient(135deg,#166534 0%,#064e3b 55%,#022c22 100%)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Sistem Paparan Pintar Masjid</span>
              <h2 className="mt-3 break-words text-2xl font-extrabold md:text-4xl">Assalamu&apos;alaikum, {hName}</h2>
              <p className="mt-2 text-sm text-white/85 md:text-base">Selamat datang ke sistem pengurusan paparan digital {tv.name !== "Masjid / Surau Anda" ? tv.name : "masjid"} anda.</p></div>
              <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900"><DateBadge /></div></div>
          </section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([["Zon solat JAKIM", draft.zone || "Automatik", draft.zone && zi ? zi[1] : "Mengikut lokasi peranti TV", Building2], ["Status paparan", online ? "Aktif" : "Tidak aktif", `Tema semasa: ${(THEMES.find((t) => t.id === (draft.theme || eff.theme || "ios"))?.label) ?? "Lalai"}`, Wifi], ["Slider & hadis", `${nSlides} item`, `${imgs.length} gambar latar dimuat naik`, Layers], ["Hebahan & memo", draft.announcements.filter((a) => a.on).length ? `${draft.announcements.filter((a) => a.on).length} ticker` : "Tiada ticker", `${(draft.memos ?? []).length} memo pengumuman berdaftar`, Megaphone]] as [string, string, string, typeof Layers][]).map(([a, b, c, Ic]) => (
              <div key={a} className="card !p-4"><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider text-sub">{a}</span><Ic size={18} className="text-accent" aria-hidden="true" /></div><b className="mt-3 block text-xl md:text-2xl">{b}</b><span className="mt-1 block text-xs text-sub">{c}</span></div>))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="card"><h2 className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 size={20} className="text-accent" /> Jadual Waktu Solat Hari Ini</h2>
              {times ? (<ul className="mt-3 grid gap-2">{PRAYERS.map((p) => (<li key={p.k} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"><b>{p.n}</b><span lang="ar" dir="rtl" className="ar text-xl">{p.ar}</span><b className="tabular-nums">{to12(times[p.k])}</b></li>))}</ul>)
                : (<div className="mt-4 rounded-xl bg-muted p-6 text-center text-sm text-sub"><Info className="mx-auto mb-2" />Data waktu solat belum dimuatkan. Pastikan zon solat telah dipilih di Tetapan.<div className="mt-3"><button type="button" className="btn" onClick={() => setSec("tetapan")}>Pergi ke Tetapan</button></div></div>)}</section>
            <section className="card"><h2 className="flex items-center gap-2 text-lg font-bold"><MonitorPlay size={20} className="text-accent" /> Pautan Paparan TV</h2><p className="mt-1 text-sm text-sub">Buka URL ini pada Smart TV, Android Box atau pelayar web skrin masjid.</p>
              <div className="mt-3 flex gap-2"><input readOnly className="inp" aria-label="Pautan TV" value={tvUrl} /><button className="btn" aria-label="Salin pautan" onClick={() => { navigator.clipboard?.writeText(tvUrl); flash("Pautan disalin."); }}><Copy size={18} /></button></div>
              <div className="mt-3 flex flex-wrap gap-2"><a className="btn btn-primary" href={tvUrl} target="_blank" rel="noreferrer"><MonitorPlay size={18} /> Buka TV</a><a className="btn btn-dl" href={REL + "SolatDigital-TV.zip"}><Download size={18} /> Muat turun aplikasi TV</a></div>
              <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-sub"><CheckCircle2 size={14} className="text-accent" /> Paparan menyokong mod skrin penuh dan tidak tidur.</p></section>
          </div>
          {tv.plan !== "full" && <div className="card border-yellow-500/50" role="note"><b>Akaun anda masih mod demo.</b> Pop-up dan azan waktu solat belum aktif. Langgan sekali sahaja (bayaran sekali, akses penuh seumur hidup) dan Owner Solat Digital akan aktifkan akaun anda.</div>}
          <h2 className="mt-2 text-lg font-bold">Tindakan Pantas Pengurusan</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{([["slaid", "Slider & Hadis", "Susun slaid dan hadis", Layers], ["tiker", "Ticker Hebahan", "Teks bergerak di bawah", Megaphone], ["memo", "Memo Masjid", "Pengumuman masjid", StickyNote], ["tetapan", "Tetapan Waktu Solat", "Zon, iqamah, Jumaat", Settings]] as [Sec, string, string, typeof Layers][]).map(([id, a, b, Ic]) => (
            <button key={id} type="button" className="card !p-4 text-left transition hover:shadow-lg" onClick={() => setSec(id)}><Ic size={22} className="text-accent" /><b className="mt-2 block">{a}</b><span className="text-xs text-sub">{b}</span></button>))}</div>
        </>)}

        {sec === "live" && (<>
          <section className="card"><h2 className="text-lg font-bold">Maklumat Penceramah & Paparan Bawah (Lower-Third)</h2><p className="text-sm text-sub">Maklumat ini dipaparkan di bahagian bawah skrin semasa mod Kuliah (Live).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["speaker", "Nama penceramah / ustaz", "Ustaz Dr. Ahmad Firdaus"], ["role", "Gelaran / jawatan", "Penceramah Bertauliah JAKIM"], ["topic", "Tajuk ceramah / kitab pengajian", "Syarah Kitab Riyadhus Salihin"], ["session", "Nama sesi / majlis", "Kuliah Maghrib Perdana"]] as [string, string, string][]).map(([k, lb, ph]) => (
                <div key={k}><L id={"lv" + k}>{lb}</L><input id={"lv" + k} className="inp" maxLength={120} placeholder={ph} defaultValue={draft.live?.[k as "speaker"] ?? ""} onBlur={(e) => live({ live: { ...(draft.live ?? {}), [k]: e.target.value.trim() } })} /></div>))}</div>
            <L id="lvmsg">Teks hebahan berjalan (di bawah skrin)</L><textarea id="lvmsg" rows={2} maxLength={300} className="inp" placeholder="Sila rapatkan saf dan matikan telefon bimbit." defaultValue={draft.live?.ticker ?? ""} onBlur={(e) => live({ live: { ...(draft.live ?? {}), ticker: e.target.value.trim() } })} /></section>
          <section className="card"><h2 className="text-lg font-bold">Siaran kamera ke skrin TV</h2><p className="mt-1 text-sm text-sub">Sambungan kamera (kamera web, DSLR melalui kad tangkap, atau kamera telefon petugas) ke skrin TV sedang dibina. Maklumat penceramah di atas akan terus digunakan apabila siaran kamera dibuka.</p></section>
        </>)}

        {sec === "slaid" && (<>
          <section className="card"><h2 className="text-lg font-bold">Kelajuan Slide</h2><p className="text-sm text-sub">Tetapkan berapa lama setiap poster atau hadis dipaparkan sebelum bertukar.</p>
            <L id="ss">Tempoh setiap slide (saat)</L><input id="ss" type="number" min={1} max={300} className="inp max-w-40" value={draft.slideSecs ?? 10} onChange={(e) => up({ slideSecs: Math.max(1, Math.min(300, Math.round(+e.target.value) || 10)) })} />
            <p className="mt-2 text-xs text-sub">1 hingga 300 saat. Peralihan antara slide sentiasa lancar. Tekan Simpan selepas mengubah.</p></section>
          {pf.slides && <SlideLibrary list={draft.slideList ?? DEFAULT_SLIDES} onAdd={(it) => { const cur = draft.slideList ?? DEFAULT_SLIDES; if (cur.length >= 15) { flash("Maksimum 15 slaid. Padam satu slaid dahulu."); return; } live({ slideList: [...cur, { ...it, id: uid() }] }); flash("Ditambah ke slaid TV."); }} />}
          {pf.slides && <section className="card"><h2 className="text-lg font-bold">Poster, Gambar dan Slaid TV</h2><p className="mb-3 text-sm text-sub">Slaid ditayangkan skrin penuh mengikut kitaran di Tetapan Waktu Solat.</p>
            <SlideManager mid={uidv} slides={draft.slideList} onLive={(l) => live({ slideList: l })} flash={flash} /></section>}
        </>)}

        {sec === "tiker" && (<>
          {pf.announcements && <section className="card"><h2 className="text-lg font-bold">Ticker Hebahan (teks bergerak di bawah skrin)</h2>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; up({ announcements: [...draft.announcements, { id: uid(), text: txt.trim().slice(0, 200), on: true }] }); setTxt(""); }}>
              <input className="inp" aria-label="Teks pengumuman" placeholder="cth: Kuliah Maghrib bersama Ustaz, malam ini" value={txt} onChange={(e) => setTxt(e.target.value)} /><button className="btn btn-primary" aria-label="Tambah pengumuman"><Plus size={18} /></button></form>
            <ul className="mt-3 grid gap-2">{draft.announcements.map((a) => (<li key={a.id} className="flex items-center gap-3 rounded-xl bg-muted p-3"><input type="checkbox" className="size-5 accent-green-700" aria-label="Aktif" checked={a.on} onChange={(e) => up({ announcements: draft.announcements.map((x) => x.id === a.id ? { ...x, on: e.target.checked } : x) })} /><span className="min-w-0 flex-1 break-words">{a.text}</span><button className="btn" aria-label="Padam pengumuman" onClick={() => up({ announcements: draft.announcements.filter((x) => x.id !== a.id) })}><Trash2 size={18} /></button></li>))}
              {!draft.announcements.length && <li className="text-sm text-sub">Belum ada pengumuman.</li>}</ul></section>}
        </>)}

        {sec === "memo" && (<>
          <section className="card"><h2 className="text-lg font-bold">Pengurusan Memo Masjid</h2><p className="text-sm text-sub">Memo dipaparkan sebagai slaid dalam kitaran slider. Contoh: jumlah kutipan tabung, jadual kuliah atau notis penting.</p>
            <form className="mt-2 grid gap-2" onSubmit={(e) => { e.preventDefault(); if (!memoT.trim() || !memoB.trim()) return; live({ memos: [...(draft.memos ?? []), { id: uid(), title: memoT.trim().slice(0, 80), body: memoB.trim().slice(0, 400), on: true }].slice(0, 20) }); setMemoT(""); setMemoB(""); }}>
              <L id="mt">Tajuk memo</L><input id="mt" className="inp" maxLength={80} value={memoT} onChange={(e) => setMemoT(e.target.value)} placeholder="Cth: Kutipan Tabung Masjid" />
              <L id="mb">Kandungan memo</L><textarea id="mb" rows={3} maxLength={400} className="inp" value={memoB} onChange={(e) => setMemoB(e.target.value)} placeholder="Masukkan maklumat memo di sini (isi, tarikh, perincian)" />
              <div><button className="btn btn-primary"><Plus size={18} /> Tambah memo</button></div></form></section>
          <section className="card"><h2 className="text-lg font-bold">Senarai Memo ({(draft.memos ?? []).length})</h2>
            <ul className="mt-3 grid gap-2">{(draft.memos ?? []).map((m) => (<li key={m.id} className="flex items-start gap-3 rounded-xl bg-muted p-3"><input type="checkbox" className="mt-1 size-5 accent-green-700" aria-label="Aktif" checked={m.on} onChange={(e) => live({ memos: (draft.memos ?? []).map((x) => (x.id === m.id ? { ...x, on: e.target.checked } : x)) })} /><div className="min-w-0 flex-1"><b className="block break-words">{m.title}</b><span className="block break-words text-sm text-sub">{m.body}</span></div><button className="btn" aria-label="Padam memo" onClick={() => live({ memos: (draft.memos ?? []).filter((x) => x.id !== m.id) })}><Trash2 size={16} /></button></li>))}
              {!(draft.memos ?? []).length && <li className="text-sm text-sub">Belum ada memo.</li>}</ul></section>
        </>)}

        {sec === "latar" && (<>
          <section className="card"><h2 className="flex items-center gap-2 text-lg font-bold">Video YouTube latar (senyap)</h2><p className="text-sm text-sub">Contoh: Makkah Live atau Madinah Live. Video dimainkan penuh skrin, 100% senyap. Perubahan terus ke TV tanpa lengah.</p>
            {draft.bgVideo?.url && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3 text-sm"><span className="chip chip-ok">Aktif</span><span className="min-w-0 flex-1 truncate">{draft.bgVideo.label || draft.bgVideo.url}</span><button type="button" className="btn" onClick={() => live({ bgVideo: { url: "" } })}>Matikan video latar</button></div>}
            <L id="yt">Pautan video YouTube atau kod embed</L><div className="flex gap-2"><input id="yt" className="inp" placeholder="https://www.youtube.com/watch?v=… atau https://www.youtube.com/embed/…" value={yt} onChange={(e) => setYt(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={() => { const m = yt.match(/(?:src=["'])?(https?:\/\/[^"'\s>]+)/); const u = m ? m[1] : yt.trim(); if (!youtubeId(u)) return flash("Pautan YouTube tidak sah."); live({ bgVideo: { url: u } }); setYt(""); flash("Video latar dihidupkan."); }}>Terapkan</button></div>
            {quick.length > 0 && <><span className="lbl">Pilihan pantas</span><div className="flex flex-wrap gap-2">{quick.map((q) => (<button key={q.id} type="button" className="btn" onClick={() => { if (q.kind === "youtube") { live({ bgVideo: { url: q.url, label: q.label } }); flash(`${q.label} dihidupkan sebagai latar.`); } else { up({ slides: [...draft.slides, q.url].slice(0, 10), }); live({ bgVideo: { url: "" } }); flash("Imej ditambah. Tekan Simpan."); } }}>{q.label}</button>))}</div></>}</section>
          {pf.images && <section className="card"><h2 className="text-lg font-bold">Gambar latar</h2><p className="text-sm text-sub">Muat naik gambar masjid anda (maksimum 5) atau letak URL gambar. Kosong = gambar lalai.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{imgs.map((im) => (<div key={im.id} className="relative overflow-hidden rounded-xl border border-line"><img src={im.data} alt="Gambar latar" className="aspect-video w-full object-cover" /><button className="btn absolute right-1 top-1 !min-h-9 !px-2" aria-label="Padam gambar" onClick={() => deleteDoc(doc(db, "tv", uidv, "img", im.id))}><Trash2 size={16} /></button></div>))}
              {imgs.length < 5 && <button className="grid aspect-video place-items-center rounded-xl border border-dashed border-line text-sub hover:bg-muted" onClick={() => file.current?.click()} aria-label="Muat naik gambar"><span className="grid place-items-center gap-1"><ImagePlus /> Muat naik</span></button>}</div>
            <input ref={file} type="file" accept="image/*" multiple className="hidden" aria-label="Pilih gambar" onChange={(e) => addImg(e.target.files)} />
            <L id="sl">URL gambar tambahan (satu setiap baris)</L><textarea id="sl" rows={3} className="inp" value={draft.slides.join("\n")} onChange={(e) => up({ slides: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10) })} />
            <div className="grid gap-3 sm:grid-cols-2"><div><L id="an">Animasi latar</L><select id="an" className="inp" value={draft.anim} onChange={(e) => up({ anim: e.target.value as TvDoc["anim"] })}><option value="kenburns">Zum masuk</option><option value="zoomout">Zum keluar</option><option value="fade">Pudar sahaja</option></select></div>
              <div><L id="sc">Saat setiap gambar</L><input id="sc" type="number" min={4} max={30} className="inp" value={draft.secs} onChange={(e) => up({ secs: Math.max(4, Math.min(30, +e.target.value || 10)) })} /></div></div></section>}
        </>)}

        {sec === "tetapan" && (<>
          <section className="card"><h2 className="text-lg font-bold">Maklumat Masjid dan Zon Solat</h2><p className="text-sm text-sub">Nama, alamat dan zon solat rasmi JAKIM.</p>
            <L id="nm">Nama masjid / surau (dipaparkan HURUF BESAR)</L><input id="nm" className="inp" value={draft.name} onChange={(e) => up({ name: e.target.value })} />
            <L id="ad">Alamat penuh</L><input id="ad" className="inp" placeholder="Jalan, kampung atau taman" defaultValue={reg.address ?? ""} onBlur={(e) => updateDoc(doc(db, "registry", uidv), { address: e.target.value.trim().slice(0, 200) }).catch(() => {})} />
            <AddressPicker idp="reg" state={(reg as { state?: string }).state ?? draft.state ?? ""} city={reg.city ?? ""} postcode={reg.postcode ?? ""} onChange={(v) => { up({ state: v.state }); updateDoc(doc(db, "registry", uidv), { state: v.state, city: v.city, postcode: v.postcode }).catch(() => flash("Gagal simpan alamat.")); }} />
            <p className="mt-1 text-xs text-sub">Pilih negeri dahulu, kemudian bandar, kemudian poskod. Senarai mengikut data Pos Malaysia.</p>
            <h3 className="mt-5 font-bold">Zon waktu solat (JAKIM)</h3>
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-green-700" checked={!draft.zone} onChange={(e) => up({ zone: e.target.checked ? "" : "SGR01" })} /> Kesan zon secara automatik (ikut lokasi peranti TV)</label>
            {draft.zone && <ZonePicker zone={draft.zone} onChange={(z) => up({ zone: z, state: ZONES.find((x) => x[0] === z)![1] })} idp="set" />}
            <p className="mt-3 rounded-xl bg-muted p-3 text-sm"><Wifi size={16} className="mr-1 inline text-accent" />Disegerakkan terus secara langsung daripada API rasmi <b>e-Solat JAKIM</b> (e-solat.gov.my).</p>
          </section>
          <section className="card"><h2 className="text-lg font-bold">Azan untuk setiap waktu</h2><p className="text-sm text-sub">Pilih azan daripada perpustakaan Owner. Kredit azan dipaparkan di TV.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">{PRAYER_OPTS.map(([k, n]) => { const opts = lib.filter((a) => !a.prayers?.length || a.prayers.includes(k)); const val = draft.azanByPrayer?.[k] ?? ""; const sel = lib.find((a) => a.id === val); return (
              <div key={k}><L id={"az" + k}>{n}</L><select id={"az" + k} className="inp" value={val} onChange={(e) => up({ azanByPrayer: { ...(draft.azanByPrayer ?? {}), [k]: e.target.value } })}><option value="">Lalai</option>{opts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.credit}</option>)}</select>
                {sel && <audio className="mt-2 h-9 w-full" controls preload="none" src={sel.url} />}</div>); })}</div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><div><b>Bunyi azan: {draft.azanMute ? "Senyap" : "Hidup"}</b><p className="text-xs text-sub">Senyap hanya mematikan laungan azan. Nada masuk waktu dan pop-up tetap berfungsi.</p></div>
              <button type="button" className="switch" role="switch" aria-checked={!draft.azanMute} aria-label="Bunyi azan" onClick={() => live({ azanMute: !draft.azanMute })} /></div></section>
          <section className="card"><h2 className="text-lg font-bold">Jadual paparan TV</h2><p className="text-sm text-sub">Kitaran automatik: paparan waktu solat dan slaid bergilir; 10 minit sebelum azan hanya waktu solat; 5 minit terakhir hanya kiraan detik; selepas azan: menunggu iqamah, solat berlangsung, kemudian kembali ke kitaran. Semua masa dalam minit.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {([["slideMin", "Slaid ditayangkan selama", 10, 1, 120], ["prayerMin", "Paparan waktu solat penuh selama", 5, 1, 120], ["leadMin", "Hanya waktu solat bermula (minit sebelum azan)", 10, 6, 60], ["iqamahMin", "Masa menunggu iqamah selepas azan", 10, 1, 60], ["solatMin", "Paparan solat berlangsung selama", 10, 1, 60], ["khutbahMin", "Khutbah Jumaat berlangsung selama", 30, 1, 120], ["jSolatMin", "Solat Jumaat berlangsung selama", 10, 1, 60]] as [keyof NonNullable<TvDoc["sched"]>, string, number, number, number][]).map(([k, lb, df, lo, hi]) => (
                <div key={k}><L id={"sc" + k}>{lb}</L><input id={"sc" + k} type="number" min={lo} max={hi} className="inp" value={(draft.sched?.[k] as number | undefined) ?? df} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), [k]: Math.max(lo, Math.min(hi, Math.round(+e.target.value) || df)) } })} /></div>))}
            </div>
            <p className="mt-2 text-xs text-sub">Lima minit terakhir ikut tetapan "Mula kiraan detik" di bawah. Slaid disusun di bahagian Slaid dan hadis.</p>
            <h3 className="mt-5 font-bold">Mesej pada skrin</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["msg-iqamah", "Menunggu iqamah", "Sila bersedia untuk solat berjemaah."], ["msg-solat", "Solat berlangsung", "Mohon rapatkan dan luruskan saf. Senyapkan telefon bimbit dan tenangkan hati untuk menghadap Allah."], ["msg-jlead", "10 minit sebelum Jumaat", "Sila hadirkan diri ke masjid dan jaga solat pada hari Jumaat."], ["msg-khutbah", "Khutbah Jumaat", "Dengarkan khutbah dengan penuh perhatian, khusyuk dan sempurna. Dimohon senyapkan telefon bimbit."], ["msg-raya", "Solat sunat hari raya", "Sila matikan atau senyapkan telefon bimbit. Rapatkan dan luruskan saf."], ["msg-rkhutbah", "Khutbah hari raya", "Dengarkan khutbah dengan penuh perhatian dan khusyuk."]] as [string, string, string][]).map(([k, lb, df]) => (
                <div key={k}><L id={k}>{lb}</L><textarea id={k} rows={2} maxLength={200} className="inp" defaultValue={tv.texts?.[k] ?? ""} placeholder={df} onBlur={(e) => { const v = e.target.value.trim(); const t = { ...(tv.texts ?? {}) }; if (v) t[k] = v; else delete t[k]; live({ texts: t }); }} /></div>))}
            </div>
            <p className="mt-1 text-xs text-sub">Kosongkan untuk guna mesej asal. Terus berubah pada TV.</p>
            <h3 className="mt-5 font-bold">Mod hari raya (automatik)</h3>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><div><b>Mod hari raya: {draft.sched?.raya?.on ? "Hidup" : "Mati"}</b><p className="text-xs text-sub">Pada tarikh raya, TV bertukar sendiri ke skrin solat sunat dan khutbah hari raya.</p></div>
              <button type="button" className="switch" role="switch" aria-checked={!!draft.sched?.raya?.on} aria-label="Mod hari raya" onClick={() => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), on: !draft.sched?.raya?.on } } })} /></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><L id="rf">Tarikh 1 Syawal (Aidilfitri)</L><input id="rf" type="date" className="inp" value={draft.sched?.raya?.fitri ?? ""} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), fitri: e.target.value } } })} /></div>
              <div><L id="rh">Tarikh 10 Zulhijjah (Aidiladha)</L><input id="rh" type="date" className="inp" value={draft.sched?.raya?.haji ?? ""} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), haji: e.target.value } } })} /></div>
              <div><L id="rtm">Waktu solat sunat raya bermula</L><input id="rtm" type="time" className="inp" value={draft.sched?.raya?.time ?? "08:30"} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), time: e.target.value } } })} /></div>
              <div><L id="rsm">Solat sunat raya selama (minit)</L><input id="rsm" type="number" min={1} max={60} className="inp" value={draft.sched?.raya?.solatMin ?? 10} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), solatMin: Math.max(1, Math.min(60, Math.round(+e.target.value) || 10)) } } })} /></div>
              <div><L id="rkm">Khutbah raya selama (minit)</L><input id="rkm" type="number" min={1} max={120} className="inp" value={draft.sched?.raya?.khutbahMin ?? 30} onChange={(e) => up({ sched: { ...(draft.sched ?? {}), raya: { ...(draft.sched?.raya ?? {}), khutbahMin: Math.max(1, Math.min(120, Math.round(+e.target.value) || 30)) } } })} /></div>
            </div>
            <p className="mt-2 text-xs text-sub">Tarikh raya mesti ditetapkan sendiri mengikut pengumuman rasmi (Penyimpan Mohor Besar Raja-Raja). Tekan Simpan selepas mengubah jadual.</p></section>
          <section className="card"><h2 className="text-lg font-bold">Pemberitahuan sebelum azan dan Jumaat</h2><p className="text-sm text-sub">Kiraan detik, nada dan masa menunggu sebelum azan.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><L id="pm">Mula kiraan detik (minit sebelum azan)</L><input id="pm" type="number" min={0} max={30} className="inp" value={draft.preMin ?? 5} onChange={(e) => up({ preMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">Lalai 5 minit. 0 = matikan.</p></div>
              <div><L id="ad">Tunggu selepas masuk waktu, baru azan (minit)</L><input id="ad" type="number" min={0} max={30} className="inp" value={draft.azanDelayMin ?? 0} onChange={(e) => up({ azanDelayMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">0 = azan terus.</p></div>
              <div><L id="pu">Paparan "waktu solat telah masuk" tutup sendiri selepas (minit)</L><input id="pu" type="number" min={1} max={10} className="inp" value={draft.popupMin ?? 3} onChange={(e) => up({ popupMin: Math.max(1, Math.min(10, Math.round(+e.target.value) || 3)) })} /><p className="mt-1 text-xs text-sub">Lalai 3 minit. Jika azan masih berbunyi, paparan menunggu azan habis.</p></div>
              <div><L id="rt">Nada masuk waktu</L><select id="rt" className="inp" value={draft.ringtone ?? "chime"} onChange={(e) => up({ ringtone: e.target.value as Ring })}>{RINGS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
              <div><L id="rr">Berapa kali nada diulang</L><input id="rr" type="number" min={1} max={5} className="inp" value={draft.ringRepeat ?? 1} onChange={(e) => up({ ringRepeat: Math.max(1, Math.min(5, Math.round(+e.target.value) || 1)) })} /></div>
              <div><L id="jt">Waktu Jumaat (pilihan, cth 13:15)</L><input id="jt" type="time" className="inp" value={(draft.jumaatTime ?? "").slice(0, 5)} onChange={(e) => up({ jumaatTime: e.target.value })} /><p className="mt-1 text-xs text-sub">Kosong = ikut waktu Zuhur JAKIM. Pada hari Jumaat, waktu Jumaat berkelip dan ada pop-up khas; Zuhur tidak berkelip.</p></div>
            </div>
            <L id="vl">Kelantangan: {draft.volume ?? 100}%</L><input id="vl" type="range" min={5} max={100} step={5} className="w-full accent-green-700" value={draft.volume ?? 100} onChange={(e) => up({ volume: +e.target.value })} />
            <button type="button" className="btn mt-3" onClick={async () => { const ok = await playRing((draft.ringtone ?? "chime") as Ring, draft.ringRepeat ?? 1, draft.volume ?? 100); if (!ok) flash("Pelayar menyekat bunyi. Ketik skrin sekali dan cuba lagi."); }}>Cuba nada</button>
            <p className="mt-2 text-xs text-sub">Bunyi hanya bermula selepas skrin TV diketik sekali (peraturan pelayar), kecuali aplikasi .exe. Hanya untuk akaun akses penuh.</p></section>
        </>)}

        {sec === "warna" && (<>
          <section className="card"><h2 className="text-lg font-bold">Paparan live TV masjid anda</h2><p className="text-sm text-sub">Paparan TV terkini anda ({tv.name}).</p>
            <div className="mt-3"><PreviewEditor onSlide={(id) => { const el = document.getElementById("sl-" + id); if (!el) { flash("Slaid ini dikongsi oleh sistem dan tidak boleh disunting di sini."); return; } el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("sl-flash"); void el.offsetWidth; el.classList.add("sl-flash"); }} mid={uidv} tv={tv} customFonts={raw.customFonts} canEdit={pf.styleEditor} onZone={(z) => { const st = ZONES.find((x) => x[0] === z)?.[1] ?? tv.state; live({ zone: z, state: st }); updateDoc(doc(db, "registry", uidv), { zone: z, state: st }).catch(() => {}); }} onRename={(n) => { live({ name: n }); updateDoc(doc(db, "registry", uidv), { name: n }).catch(() => {}); }} /></div></section>
          {pf.theme && <section className="card"><h2 className="text-lg font-bold">Tema TV</h2><p className="text-sm text-sub">Pilih tema warna paparan. Terus berubah pada TV.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">{THEMES.map((t) => (<button key={t.id} type="button" className="sw-theme" data-on={(draft.theme || eff.theme || "ios") === t.id} onClick={() => live({ theme: t.id })}><span className="h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${t.swatch[1]}, ${t.swatch[0]})` }} /><b>{t.label}</b></button>))}</div></section>}
          <section className="card"><h2 className="text-lg font-bold">Font</h2>
            <L id="ft">Font paparan TV (huruf Latin)</L><select id="ft" className="inp" value={draft.font ?? ""} onChange={(e) => up({ font: e.target.value })}><option value="">Ikut lalai sistem</option>{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
            {ArabicSel}
            {pf.styleEditor && <p className="mt-3 text-sm text-sub">Untuk ubah font dan warna elemen tertentu, buka <b>Dashboard</b> dan klik terus pada paparan TV.</p>}</section>
          <section className="card"><h2 className="text-lg font-bold">Tulisan Arab (waktu solat)</h2><p className="text-sm text-sub">Font dan warna di sini terpakai pada <b>semua</b> tulisan Arab di TV (nama waktu solat dan pop-up). Tulisan Arab tidak boleh diklik pada paparan; ubah di sini sahaja.</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2"><div>{ArabicSel}</div>
              <div><span className="lbl">Warna tulisan Arab</span><div className="flex flex-wrap items-center gap-2">
                <input type="color" aria-label="Pilih warna tulisan Arab" className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1" value={/^#[0-9a-f]{6}$/i.test(draft.arabicColor ?? "") ? draft.arabicColor : "#ffffff"} onChange={(e) => live({ arabicColor: e.target.value })} />
                {["#ffffff", "#fde047", "#fbbf24", "#86efac", "#67e8f9", "#f0abfc", "#fca5a5", "#0f172a"].map((c) => <button key={c} type="button" aria-label={`Warna ${c}`} className="swatch" style={{ background: c }} data-on={(draft.arabicColor ?? "").toLowerCase() === c} onClick={() => live({ arabicColor: c })} />)}</div>
                <button type="button" className="btn mt-3" onClick={() => live({ arabicColor: "" })}>Set semula warna</button></div></div></section>
        </>)}

        {sec === "profil" && (<ProfileSection user={user} managerName={reg.managerName ?? ""} flash={flash} />)}

        {sec === "sumbangan" && (<DonationSection don={don} />)}
        {sec === "notif" && (
          <section className="card !p-3"><Chat mid={uidv} me="masjid" mosqueName={tv.name} title="Owner Solat Digital" subtitle="Hantar cadangan, masalah atau soalan. Siaran Owner juga diterima di sini." /></section>)}

        {sec === "muat" && (
          <section className="card"><h2 className="text-lg font-bold">Muat turun aplikasi</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <a className="btn btn-dl justify-center" href={REL + "SolatDigital-TV.zip"}><Download size={18} /> Solat Digital (TV) .zip</a>
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
      </PanelShell>
      <div className="bar-frost fixed inset-x-0 bottom-0 z-40 border-t border-white/60 p-3 lg:left-[264px]"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-2"><span className="text-sm text-sub">{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan disimpan"}</span><button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={18} /> Simpan</button></div></div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {ntoast && <button type="button" className="notif-toast" onClick={() => { setSec("notif"); setNtoast(false); }}><Bell size={22} className="shrink-0 text-accent" /><span><b className="block">Mesej baharu</b><span className="text-sm text-sub">daripada Owner Solat Digital. Tekan untuk buka.</span></span></button>}
    </div>
  );
}

function ProfileSection({ user, managerName, flash }: { user: User; managerName: string; flash: (m: string) => void }) {
  const [name, setName] = useState(managerName || user.displayName || ""); const [email, setEmail] = useState(user.email ?? "");
  const [cur, setCur] = useState(""); const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => { if (managerName) setName(managerName); }, [managerName]);
  const saveProfile = async () => {
    try {
      if (name.trim().length < 3) return flash("Nama terlalu pendek.");
      await updateProfile(user, { displayName: name.trim() }); await updateDoc(doc(db, "registry", user.uid), { managerName: name.trim() });
      if (email.trim() && email.trim() !== user.email) { await verifyBeforeUpdateEmail(user, email.trim()); flash("Pautan pengesahan dihantar ke emel baharu. Sahkan di emel itu untuk menukar emel log masuk."); } else flash("Profil disimpan.");
    } catch (x) { const c = (x as { code?: string }).code ?? ""; flash(c.includes("requires-recent-login") ? "Sila log keluar dan log masuk semula, kemudian cuba lagi." : c.includes("email-already") ? "Emel itu sudah digunakan." : "Gagal menyimpan profil."); }
  };
  const savePw = async () => {
    setMsg("");
    if (p1.length < 8) return setMsg("Kata laluan baharu sekurang-kurangnya 8 aksara.");
    if (p1 !== p2) return setMsg("Kata laluan baharu dan pengesahan tidak sama.");
    try { if (user.email) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, cur)); await updatePassword(user, p1); setCur(""); setP1(""); setP2(""); flash("Kata laluan ditukar."); }
    catch (x) { const c = (x as { code?: string }).code ?? ""; setMsg(c.includes("invalid-credential") || c.includes("wrong-password") ? "Kata laluan semasa salah." : c.includes("requires-recent") ? "Sila log masuk semula dahulu." : "Gagal menukar kata laluan."); }
  };
  const social = user.providerData.every((p) => p.providerId !== "password");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card !p-0"><div className="flex items-center gap-3 border-b border-line p-4"><span className="grid size-10 place-items-center rounded-xl bg-muted text-accent"><UserIc size={20} /></span><div><h2 className="font-bold">Maklumat Profil Pentadbir</h2><p className="text-xs text-sub">Kemaskini nama akaun dan alamat emel pentadbir.</p></div></div>
        <div className="p-4">
          <div className="flex items-center gap-4 rounded-2xl bg-muted p-4"><span className="grid size-16 place-items-center rounded-full bg-card text-xl font-extrabold text-accent">{(name || user.email || "?").slice(0, 2).toUpperCase()}</span><div className="min-w-0"><b className="block truncate">{name || "Pentadbir"}</b><span className="block truncate text-sm text-sub">{user.email}</span>{user.emailVerified ? <span className="chip chip-ok mt-1">Emel disahkan</span> : <span className="chip chip-demo mt-1">Emel belum disahkan</span>}</div></div>
          <L id="pn">Nama Penuh</L><input id="pn" className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          <L id="pe">Alamat Emel</L><input id="pe" type="email" className="inp" value={email} onChange={(e) => setEmail(e.target.value)} disabled={social} />
          <p className="mt-1 text-xs text-sub">Jika emel diubah, pautan pengesahan dihantar ke emel baharu. Emel log masuk hanya bertukar selepas anda mengesahkannya.</p>
        </div>
        <div className="flex justify-end border-t border-line p-3"><button type="button" className="btn btn-primary" onClick={saveProfile}><Save size={18} /> Simpan Profil</button></div></section>
      <section className="card !p-0"><div className="flex items-center gap-3 border-b border-line p-4"><span className="grid size-10 place-items-center rounded-xl bg-muted text-amber-600"><Lock size={20} /></span><div><h2 className="font-bold">Keselamatan & Kata Laluan</h2><p className="text-xs text-sub">Pastikan kata laluan akaun anda kukuh dan selamat.</p></div></div>
        <div className="p-4">
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Gunakan sekurang-kurangnya 8 aksara dengan gabungan huruf besar, huruf kecil, nombor dan simbol.</p>
          {social ? <p className="mt-3 text-sm text-sub">Akaun ini log masuk melalui Google. Kata laluan diurus oleh akaun Google anda.</p> : (<>
            <L id="pc0">Kata Laluan Semasa</L><PasswordInput id="pc0" autoComplete="current-password" value={cur} onChange={setCur} />
            <L id="pc1">Kata Laluan Baharu</L><PasswordInput id="pc1" autoComplete="new-password" minLength={8} value={p1} onChange={setP1} />
            <L id="pc2">Sahkan Kata Laluan Baharu</L><PasswordInput id="pc2" autoComplete="new-password" minLength={8} value={p2} onChange={setP2} />
            {msg && <p role="alert" className="mt-2 text-danger">{msg}</p>}</>)}
        </div>
        {!social && <div className="flex justify-end border-t border-line p-3"><button type="button" className="btn btn-primary" onClick={savePw}><Lock size={18} /> Tukar Kata Laluan</button></div>}</section>
    </div>);
}

function DonationSection({ don }: { don: Don | null }) {
  const cp = (t: string) => navigator.clipboard?.writeText(t).catch(() => {});
  if (!don || don.enabled === false || (!don.accNo && !don.qr)) return <section className="card"><h2 className="text-lg font-bold">Sumbangan</h2><p className="mt-1 text-sm text-sub">Maklumat sumbangan belum dimasukkan oleh Owner sistem.</p></section>;
  return (
    <div className="grid gap-5">
      <section className="rounded-3xl p-6 text-white md:p-8" style={{ background: "linear-gradient(135deg,#166534,#052e16)" }}><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Infaq Jariah &amp; Sumbangan Operasi</span>
        <h2 className="mt-3 text-2xl font-extrabold md:text-3xl">{don.title || "Sumbangan Pembangunan Solat Digital"}</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/90 md:text-base">Sistem ini dijalankan secara persendirian. Tiada syarikat atau agensi mana-mana yang menaja atau menyumbangkan sistem ini. Segalanya adalah idea kreatif dan binaan sendiri. Sumbangan ikhlas anda membantu menyokong kos pelayan awan, sambungan data, isu API JAKIM dan pembangunan sistem ini.</p></section>
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {don.qr && <section className="card text-center"><b className="block text-sm uppercase tracking-wide text-sub">Kod QR Sumbangan</b><img src={don.qr} alt="Kod QR sumbangan" className="mx-auto mt-3 w-full max-w-[280px] rounded-xl border border-line" /><a className="btn mt-3 w-full justify-center" href={don.qr} download="qr-sumbangan-solat-digital.png"><Download size={16} /> Simpan imej QR</a></section>}
        <section className="card"><h3 className="text-lg font-bold">Perincian Akaun Bank</h3>
          <dl className="mt-3 grid gap-3">
            {([["Nama akaun / penerima", don.accName], ["Nama bank", don.bankName], ["Nombor akaun", don.accNo]] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><div className="min-w-0"><dt className="text-xs text-sub">{k}</dt><dd className="break-words text-lg font-extrabold">{v}</dd></div><button type="button" className="btn !min-h-9" aria-label={`Salin ${k}`} onClick={() => cp(v!)}><Copy size={16} /> Salin</button></div>))}
          </dl>
          {don.method && <p className="mt-3 text-sm text-sub">{don.method}</p>}
          {don.note && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{don.note}</p>}</section>
      </div>
    </div>);
}

export default function Page() {
  const user = useUser();
  if (user === undefined) return <p className="p-8">Memuatkan…</p>;
  if (!user) return <AuthForm />;
  return <Panel uidv={user.uid} user={user} />;
}

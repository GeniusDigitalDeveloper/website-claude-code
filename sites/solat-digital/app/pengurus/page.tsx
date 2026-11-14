"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, Copy, Download, ImagePlus, LogOut, MonitorPlay, Plus, Save, Trash2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { ZONES } from "@/lib/zones";
import { DEMO_TV, type TvDoc, uid } from "@/lib/types";
import { authMsg, useUser } from "@/lib/useUser";
import { useAzanLibrary } from "@/lib/useAzan";
import { usePwaInstall } from "@/lib/usePwa";
import { RINGS, playRing, type Ring } from "@/lib/ringtone";

const states = [...new Set(ZONES.map((z) => z[1]))];
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
  const [f, setF] = useState({ name: "", address: "", city: "", postcode: "", managerName: "", country: "Malaysia", state: "Selangor", zone: "SGR01", email: "", pw: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [info, setInfo] = useState("");
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, f.email.trim(), f.pw);
      else {
        if (f.name.trim().length < 3 || f.address.trim().length < 5 || f.managerName.trim().length < 2) throw Object.assign(new Error(), { code: "x-name" });
        const c = await createUserWithEmailAndPassword(auth, f.email.trim(), f.pw);
        const zone = f.country === "Malaysia" ? f.zone : "";
        await setDoc(doc(db, "registry", c.user.uid), { name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), postcode: f.postcode.trim(), state: f.state, zone, country: f.country, managerName: f.managerName.trim(), email: c.user.email, createdAt: Date.now() });
        await setDoc(doc(db, "tv", c.user.uid), { ...DEMO_TV, name: f.name.trim(), state: f.state, zone, country: f.country, ownerUid: c.user.uid });
      }
    } catch (x) { setErr((x as { code?: string }).code === "x-name" ? "Sila lengkapkan nama masjid, alamat dan nama pengurus." : authMsg(x)); }
    setBusy(false);
  };
  const reset = async () => { if (!f.email) return setErr("Isi emel dahulu."); try { await sendPasswordResetEmail(auth, f.email.trim()); setInfo("Pautan tetapan semula kata laluan telah dihantar."); } catch (x) { setErr(authMsg(x)); } };
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 py-10">
      <Link href="/" className="btn mb-6 w-fit"><ArrowLeft size={18} /> Kembali ke paparan TV</Link>
      <form className="card" onSubmit={submit}>
        <h1 className="text-2xl font-extrabold">{mode === "in" ? "Log masuk Pengurus Masjid" : "Daftar akaun masjid"}</h1>
        <p className="mt-1 text-sm text-sub">{mode === "in" ? "Urus paparan TV masjid anda." : "Setiap masjid hanya daftar sekali. Selepas daftar, anda terus masuk ke panel."}</p>
        {mode === "up" && (<>
          <L id="nm">Nama masjid / surau</L><input id="nm" className="inp" value={f.name} onChange={(e) => set({ name: e.target.value })} required />
          <L id="ad">Alamat masjid</L><textarea id="ad" rows={2} className="inp" value={f.address} onChange={(e) => set({ address: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2"><div><L id="ci">Bandar / mukim</L><input id="ci" className="inp" value={f.city} onChange={(e) => set({ city: e.target.value })} required /></div><div><L id="pc">Poskod</L><input id="pc" className="inp" inputMode="numeric" maxLength={10} value={f.postcode} onChange={(e) => set({ postcode: e.target.value })} required /></div></div>
          <L id="mn">Nama pengurus / pegawai masjid</L><input id="mn" className="inp" value={f.managerName} onChange={(e) => set({ managerName: e.target.value })} required />
          <L id="ct">Negara</L><select id="ct" className="inp" value={f.country} onChange={(e) => set({ country: e.target.value })}><option>Malaysia</option><option>Lain-lain (waktu JAKIM belum disokong)</option></select>
          {f.country === "Malaysia" && (<div className="grid gap-3 sm:grid-cols-2">
            <div><L id="st">Negeri</L><select id="st" className="inp" value={f.state} onChange={(e) => set({ state: e.target.value, zone: ZONES.find((z) => z[1] === e.target.value)![0] })}>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><L id="zn">Zon</L><select id="zn" className="inp" value={f.zone} onChange={(e) => set({ zone: e.target.value })}>{ZONES.filter((z) => z[1] === f.state).map((z) => <option key={z[0]} value={z[0]}>{z[0]} · {z[2].slice(0, 40)}</option>)}</select></div>
          </div>)}
        </>)}
        <L id="em">Emel masjid / pengurus (untuk log masuk)</L><input id="em" type="email" autoComplete="email" className="inp" value={f.email} onChange={(e) => set({ email: e.target.value })} required />
        <L id="pw">Kata laluan</L><input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={6} className="inp" value={f.pw} onChange={(e) => set({ pw: e.target.value })} required />
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

function Panel({ uidv }: { uidv: string }) {
  const [tv, setTv] = useState<TvDoc | null>(null); const [draft, setDraft] = useState<TvDoc | null>(null);
  const [imgs, setImgs] = useState<{ id: string; data: string }[]>([]);
  const [toast, setToast] = useState(""); const [txt, setTxt] = useState(""); const [dirty, setDirty] = useState(false);
  const lib = useAzanLibrary(); const pwa = usePwaInstall(); const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const u1 = onSnapshot(doc(db, "tv", uidv), (s) => { const d = s.data() as TvDoc | undefined; if (d) { setTv(d); setDraft((x) => x ?? d); } });
    const u2 = onSnapshot(query(collection(db, "tv", uidv, "img"), orderBy("order")), (s) => setImgs(s.docs.map((d) => ({ id: d.id, data: d.data().data }))));
    return () => { u1(); u2(); };
  }, [uidv]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  if (!tv || !draft) return <p className="p-8">Memuatkan…</p>;
  const up = (p: Partial<TvDoc>) => { setDraft({ ...draft, ...p }); setDirty(true); };
  const save = async () => {
    try { await updateDoc(doc(db, "tv", uidv), { updatedAt: Date.now(), name: draft.name, state: draft.state, zone: draft.zone, azanId: draft.azanId, announcements: draft.announcements, slides: draft.slides, anim: draft.anim, secs: draft.secs, preMin: draft.preMin ?? 5, ringtone: draft.ringtone ?? "chime", ringRepeat: draft.ringRepeat ?? 1, azanDelayMin: draft.azanDelayMin ?? 0, volume: draft.volume ?? 100 }); await updateDoc(doc(db, "registry", uidv), { name: draft.name, state: draft.state, zone: draft.zone }); setDirty(false); flash("Disimpan. TV dikemas kini serta-merta."); }
    catch { flash("Gagal simpan. Semak sambungan."); }
  };
  const addImg = async (fl?: FileList | null) => {
    if (!fl) return; for (const f of Array.from(fl)) { if (imgs.length >= 5) { flash("Maksimum 5 gambar muat naik."); break; } try { const data = await resize(f); if (data.length > 900000) { flash("Gambar terlalu besar."); continue; } await addDoc(collection(db, "tv", uidv, "img"), { data, order: Date.now() }); } catch { flash("Gambar tidak sah."); } }
    if (file.current) file.current.value = "";
  };
  const tvUrl = `${location.origin}/?m=${uidv}`;
  const st = ZONES.find((z) => z[0] === draft.zone)?.[1] ?? draft.state;
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-28">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold md:text-3xl">{tv.name}</h1><span className={`chip ${tv.plan === "full" ? "chip-ok" : "chip-demo"}`}>{tv.plan === "full" ? <><CheckCircle2 size={14} /> Akses penuh (seumur hidup)</> : "Mod demo"}</span></div>
        <div className="flex gap-2"><a className="btn btn-primary" href={tvUrl} target="_blank" rel="noreferrer"><MonitorPlay size={18} /> Buka TV</a><button className="btn" aria-label="Log keluar" onClick={() => signOut(auth)}><LogOut size={18} /></button></div>
      </header>
      {tv.plan !== "full" && <div className="card mt-5 border-yellow-400/40" role="note"><b>Akaun anda masih mod demo.</b> Pop-up dan azan waktu solat belum aktif. Langgan sekali sahaja (bayaran sekali, akses penuh seumur hidup) dan admin Solat Digital akan aktifkan akaun anda.</div>}

      <section className="card mt-5"><h2 className="text-lg font-bold">Pautan TV</h2><p className="mt-1 text-sm text-sub">Aplikasi TV: buka pautan ini pada TV (atau butang Buka TV), kemudian tekan butang Pasang aplikasi TV di bahagian atas skrin TV, dan skrin penuh.</p>
        <div className="mt-3 flex gap-2"><input readOnly className="inp" aria-label="Pautan TV" value={tvUrl} /><button className="btn" aria-label="Salin pautan" onClick={() => { navigator.clipboard?.writeText(tvUrl); flash("Pautan disalin."); }}><Copy size={18} /></button></div>
        {pwa.canInstall && <button className="btn btn-primary mt-4" onClick={pwa.install}><Download size={18} /> Pasang aplikasi Pengurus (admin masjid)</button>}
        {pwa.installed && <p className="mt-3 text-sm text-accent">Aplikasi pengurus sudah dipasang pada peranti ini.</p>}
        {!pwa.canInstall && !pwa.installed && <p className="mt-3 text-sm text-sub">Untuk pasang aplikasi: iPhone/iPad pilih Share → Add to Home Screen; Android/Chrome pilih menu → Install app.</p>}
      </section>

      <section className="card mt-5"><h2 className="text-lg font-bold">Maklumat masjid</h2>
        <L id="nm">Nama masjid</L><input id="nm" className="inp" value={draft.name} onChange={(e) => up({ name: e.target.value })} />
        {draft.country === "Malaysia" && (<>
          <L id="zm">Zon waktu solat</L>
          <select id="zm" className="inp" value={draft.zone ? "manual" : "auto"} onChange={(e) => up({ zone: e.target.value === "auto" ? "" : ZONES.find((z) => z[1] === draft.state)?.[0] ?? "SGR01" })}><option value="auto">Automatik (lokasi / IP)</option><option value="manual">Pilih sendiri</option></select>
          {draft.zone && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><L id="st">Negeri</L><select id="st" className="inp" value={st} onChange={(e) => up({ state: e.target.value, zone: ZONES.find((z) => z[1] === e.target.value)![0] })}>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><L id="zn">Zon</L><select id="zn" className="inp" value={draft.zone} onChange={(e) => up({ zone: e.target.value })}>{ZONES.filter((z) => z[1] === st).map((z) => <option key={z[0]} value={z[0]}>{z[0]} · {z[2].slice(0, 40)}</option>)}</select></div></div>}
        </>)}
      </section>

      <section className="card mt-5"><h2 className="text-lg font-bold">Azan</h2><p className="text-sm text-sub">Pilih azan daripada senarai yang disediakan admin Solat Digital. Kredit azan dipaparkan di TV.</p>
        <L id="az">Pilihan azan</L>
        <select id="az" className="inp" value={draft.azanId} onChange={(e) => up({ azanId: e.target.value })}><option value="">Lalai (Ustaz Asri / Furqan Fawaz)</option>{lib.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.credit}</option>)}</select>
        {draft.azanId && lib.find((a) => a.id === draft.azanId) && <audio className="mt-3 w-full" controls preload="none" src={lib.find((a) => a.id === draft.azanId)!.url} />}
      </section>

      <section className="card mt-5"><h2 className="text-lg font-bold">Pemberitahuan sebelum azan</h2><p className="text-sm text-sub">Tetapkan bila TV mula mengira detik, bila nada dimainkan, dan berapa lama menunggu sebelum azan dilaungkan.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><L id="pm">Mula kiraan detik (minit sebelum azan)</L><input id="pm" type="number" min={0} max={30} className="inp" value={draft.preMin ?? 5} onChange={(e) => up({ preMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">0 = matikan.</p></div>
          <div><L id="ad">Tunggu selepas masuk waktu, baru azan (minit)</L><input id="ad" type="number" min={0} max={30} className="inp" value={draft.azanDelayMin ?? 0} onChange={(e) => up({ azanDelayMin: Math.max(0, Math.min(30, Math.round(+e.target.value) || 0)) })} /><p className="mt-1 text-xs text-sub">0 = azan terus bila masuk waktu.</p></div>
          <div><L id="rt">Nada sebelum azan</L><select id="rt" className="inp" value={draft.ringtone ?? "chime"} onChange={(e) => up({ ringtone: e.target.value as Ring })}>{RINGS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
          <div><L id="rr">Berapa kali nada diulang</L><input id="rr" type="number" min={1} max={5} className="inp" value={draft.ringRepeat ?? 1} onChange={(e) => up({ ringRepeat: Math.max(1, Math.min(5, Math.round(+e.target.value) || 1)) })} /></div>
        </div>
        <L id="vl">Kelantangan: {draft.volume ?? 100}%</L><input id="vl" type="range" min={5} max={100} step={5} className="w-full accent-green-700" value={draft.volume ?? 100} onChange={(e) => up({ volume: +e.target.value })} />
        <button type="button" className="btn mt-3" onClick={async () => { const ok = await playRing((draft.ringtone ?? "chime") as Ring, draft.ringRepeat ?? 1, draft.volume ?? 100); if (!ok) flash("Pelayar menyekat bunyi. Ketik skrin sekali dan cuba lagi."); }}>Cuba nada</button>
        <p className="mt-2 text-xs text-sub">Pada TV, bunyi hanya bermula selepas skrin diketik/ditekan sekali (peraturan pelayar), dan hanya untuk akaun akses penuh.</p>
      </section>

      <section className="card mt-5"><h2 className="text-lg font-bold">Pengumuman (ticker di TV)</h2>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; up({ announcements: [...draft.announcements, { id: uid(), text: txt.trim().slice(0, 200), on: true }] }); setTxt(""); }}>
          <input className="inp" aria-label="Teks pengumuman" placeholder="cth: Kuliah Maghrib bersama Ustaz, malam ini" value={txt} onChange={(e) => setTxt(e.target.value)} /><button className="btn btn-primary" aria-label="Tambah pengumuman"><Plus size={18} /></button></form>
        <ul className="mt-3 grid gap-2">{draft.announcements.map((a) => (<li key={a.id} className="flex items-center gap-3 rounded-xl bg-muted p-3"><input type="checkbox" className="size-5 accent-green-500" aria-label="Aktif" checked={a.on} onChange={(e) => up({ announcements: draft.announcements.map((x) => x.id === a.id ? { ...x, on: e.target.checked } : x) })} /><span className="min-w-0 flex-1 break-words">{a.text}</span><button className="btn" aria-label="Padam pengumuman" onClick={() => up({ announcements: draft.announcements.filter((x) => x.id !== a.id) })}><Trash2 size={18} /></button></li>))}
          {!draft.announcements.length && <li className="text-sm text-sub">Belum ada pengumuman.</li>}</ul>
      </section>

      <section className="card mt-5"><h2 className="text-lg font-bold">Gambar latar masjid</h2><p className="text-sm text-sub">Muat naik gambar masjid anda (maksimum 5) atau letak URL gambar. Kosong = gambar lalai.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{imgs.map((im) => (<div key={im.id} className="relative overflow-hidden rounded-xl border border-line"><img src={im.data} alt="Gambar latar" className="aspect-video w-full object-cover" /><button className="btn absolute right-1 top-1 !min-h-9 !px-2" aria-label="Padam gambar" onClick={() => deleteDoc(doc(db, "tv", uidv, "img", im.id))}><Trash2 size={16} /></button></div>))}
          {imgs.length < 5 && <button className="grid aspect-video place-items-center rounded-xl border border-dashed border-line text-sub hover:bg-muted" onClick={() => file.current?.click()} aria-label="Muat naik gambar"><span className="grid place-items-center gap-1"><ImagePlus /> Muat naik</span></button>}</div>
        <input ref={file} type="file" accept="image/*" multiple className="hidden" aria-label="Pilih gambar" onChange={(e) => addImg(e.target.files)} />
        <L id="sl">URL gambar tambahan (satu setiap baris)</L><textarea id="sl" rows={3} className="inp" value={draft.slides.join("\n")} onChange={(e) => up({ slides: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10) })} />
        <div className="grid gap-3 sm:grid-cols-2"><div><L id="an">Animasi</L><select id="an" className="inp" value={draft.anim} onChange={(e) => up({ anim: e.target.value as TvDoc["anim"] })}><option value="kenburns">Zum masuk</option><option value="zoomout">Zum keluar</option><option value="fade">Pudar sahaja</option></select></div>
          <div><L id="sc">Saat setiap gambar</L><input id="sc" type="number" min={4} max={30} className="inp" value={draft.secs} onChange={(e) => up({ secs: Math.max(4, Math.min(30, +e.target.value || 10)) })} /></div></div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><span className="text-sm text-sub">{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan disimpan"}</span><button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={18} /> Simpan</button></div></div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

export default function Page() {
  const user = useUser();
  if (user === undefined) return <p className="p-8">Memuatkan…</p>;
  if (!user) return <AuthForm />;
  return <Panel uidv={user.uid} />;
}

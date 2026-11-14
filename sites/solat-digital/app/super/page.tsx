"use client";
import { useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { Building2, Copy, Download, LogOut, Pencil, Plus, Radio, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { auth, db, rtdb } from "@/lib/firebase";
import { ARABIC_FONTS, FONTS, type AzanDoc, type CustomFont, type Registry, type TvDoc } from "@/lib/types";
import { authMsg, useUser } from "@/lib/useUser";
import { usePwaInstall } from "@/lib/usePwa";
import PasswordInput from "@/components/PasswordInput";

type Row = Registry & { id: string; plan: "demo" | "full" };
const L = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;
const Stat = ({ icon, label, v }: { icon: React.ReactNode; label: string; v: number | string }) => <div className="card"><div className="flex items-center gap-2 text-sm text-sub">{icon}{label}</div><div className="mt-2 text-3xl font-extrabold tabular-nums">{v}</div></div>;

function Login({ denied }: { denied: boolean }) {
  const [e, setE] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(denied ? "Akaun ini bukan admin Solat Digital." : "");
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center px-4">
      <form className="card" onSubmit={async (ev) => { ev.preventDefault(); setErr(""); try { await signInWithEmailAndPassword(auth, e.trim(), p); } catch (x) { setErr(authMsg(x)); } }}>
        <img src="/logo.png" alt="Solat Digital" className="mx-auto mb-2 h-24 w-auto" /><h1 className="mt-2 text-2xl font-extrabold">Admin Solat Digital</h1><p className="text-sm text-sub">Log masuk admin utama sahaja.</p>
        <L id="e">Emel</L><input id="e" type="email" className="inp" value={e} onChange={(x) => setE(x.target.value)} required />
        <L id="p">Kata laluan</L><PasswordInput id="p" autoComplete="current-password" value={p} onChange={setP} />
        {err && <p role="alert" className="mt-3 text-danger">{err}</p>}
        <button className="btn btn-primary mt-5 w-full justify-center">Log masuk</button>
      </form>
    </main>
  );
}

function Defaults() {
  const [font, setFont] = useState(""); const [ar, setAr] = useState(""); const [custom, setCustom] = useState<CustomFont[]>([]); const [ok, setOk] = useState("");
  const [nf, setNf] = useState({ name: "", url: "", credit: "" });
  useEffect(() => onSnapshot(doc(db, "config", "defaults"), (s) => { const d = s.data() ?? {}; setFont(d.font || ""); setAr(d.arabicFont || ""); setCustom(d.customFonts || []); }, () => {}), []);
  const persist = async (p: { font?: string; arabicFont?: string; customFonts?: CustomFont[] }) => { try { await setDoc(doc(db, "config", "defaults"), { font: p.font ?? (font || FONTS[0]), arabicFont: p.arabicFont ?? ar, customFonts: p.customFonts ?? custom }); setOk("Disimpan."); } catch { setOk("Gagal simpan."); } setTimeout(() => setOk(""), 2000); };
  const addFont = (e: React.FormEvent) => { e.preventDefault(); if (!/^(https:\/\/|\/)/.test(nf.url)) return setOk("URL font mesti bermula https:// atau /."); const id = Math.random().toString(36).slice(2, 8); const l = [...custom, { id, name: nf.name.trim(), url: nf.url.trim(), credit: nf.credit.trim() }]; setCustom(l); setNf({ name: "", url: "", credit: "" }); persist({ customFonts: l }); };
  return (
    <section className="card"><h2 className="text-lg font-bold">Tetapan lalai sistem dan pustaka font</h2><p className="text-sm text-sub">Lalai untuk semua TV masjid. Masjid boleh menukar fontnya sendiri; ini tidak kekal untuk mereka.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><L id="df">Font lalai (huruf Latin)</L><select id="df" className="inp" value={font || FONTS[0]} onChange={(e) => setFont(e.target.value)}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
        <div><L id="da">Font lalai tulisan Arab (Thuluth)</L><select id="da" className="inp" value={ar || "honorifics"} onChange={(e) => setAr(e.target.value)}>
          {[...new Set(ARABIC_FONTS.map((a) => a.group))].map((g) => <optgroup key={g} label={g}>{ARABIC_FONTS.filter((a) => a.group === g).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>)}
          {custom.length > 0 && <optgroup label="Font tersuai (Thuluth dll.)">{custom.map((c) => <option key={c.id} value={"custom:" + c.id}>{c.name}</option>)}</optgroup>}</select></div>
      </div>
      <button className="btn btn-primary mt-3" onClick={() => persist({})}>Simpan lalai</button>
      <h3 className="mt-6 font-bold">Pustaka font Arab tersuai (Thuluth dll.)</h3>
      <p className="text-sm text-sub">Tambah font berlesen anda (woff2/ttf/otf). Letak URL https:// atau fail di /fonts/. Semua masjid boleh memilihnya. Tulis kredit/lesen.</p>
      <form className="mt-2 grid gap-2 md:grid-cols-4" onSubmit={addFont}>
        <input className="inp" aria-label="Nama font" placeholder="Nama (cth: Thuluth Jali)" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} required />
        <input className="inp" aria-label="URL font" placeholder="https://... atau /fonts/thuluth.woff2" value={nf.url} onChange={(e) => setNf({ ...nf, url: e.target.value })} required />
        <input className="inp" aria-label="Kredit atau lesen" placeholder="Kredit / lesen" value={nf.credit} onChange={(e) => setNf({ ...nf, credit: e.target.value })} required />
        <button className="btn btn-primary justify-center"><Plus size={18} /> Tambah</button></form>
      <ul className="mt-3 grid gap-2">{custom.map((c) => (<li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted p-3"><div className="min-w-0 flex-1"><b>{c.name}</b><div className="break-all text-xs text-sub">{c.credit} · {c.url}</div></div><button className="btn" aria-label="Padam font" onClick={() => { const l = custom.filter((x) => x.id !== c.id); setCustom(l); persist({ customFonts: l, arabicFont: ar === "custom:" + c.id ? "" : ar }); }}><Trash2 size={16} /></button></li>))}
        {!custom.length && <li className="text-sm text-sub">Belum ada font tersuai.</li>}</ul>
      {ok && <p role="status" className="mt-2 text-sm text-accent">{ok}</p>}
    </section>
  );
}

function AzanManager() {
  const [items, setItems] = useState<(AzanDoc & { id: string })[]>([]);
  const empty = { name: "", credit: "", url: "", fajrUrl: "", active: true };
  const [f, setF] = useState(empty); const [edit, setEdit] = useState(""); const [err, setErr] = useState("");
  useEffect(() => onSnapshot(collection(db, "azan"), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...(d.data() as AzanDoc) }))), () => {}), []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!/^(https:\/\/|\/)/.test(f.url) || (f.fajrUrl && !/^(https:\/\/|\/)/.test(f.fajrUrl))) return setErr("URL azan mesti bermula https:// atau /.");
    const data = { name: f.name.trim(), credit: f.credit.trim(), url: f.url.trim(), fajrUrl: f.fajrUrl.trim(), active: f.active };
    try { if (edit) await updateDoc(doc(db, "azan", edit), data); else await addDoc(collection(db, "azan"), data); setF(empty); setEdit(""); } catch { setErr("Gagal simpan."); }
  };
  return (
    <section className="card">
      <h2 className="text-lg font-bold">Perpustakaan azan</h2><p className="text-sm text-sub">Semua panel masjid boleh pilih azan daripada senarai ini. Letak kredit/lesen pada ruang kredit; ia dipaparkan di TV.</p>
      <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={save}>
        <div><L id="an">Nama azan</L><input id="an" className="inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div><L id="ak">Kredit / lesen</L><input id="ak" className="inp" placeholder="cth: Ustaz Asri (Rabbani)" value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} required /></div>
        <div><L id="au">URL fail audio (https:// atau /azan/..)</L><input id="au" className="inp" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required /></div>
        <div><L id="af">URL azan Subuh (pilihan)</L><input id="af" className="inp" value={f.fajrUrl} onChange={(e) => setF({ ...f, fajrUrl: e.target.value })} /></div>
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="size-5 accent-green-500" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktif (boleh dipilih masjid)</label>
        <div className="flex gap-2 md:justify-end"><button className="btn btn-primary"><Plus size={18} /> {edit ? "Kemas kini" : "Tambah azan"}</button>{edit && <button type="button" className="btn" onClick={() => { setEdit(""); setF(empty); }}>Batal</button>}</div>
      </form>
      {err && <p role="alert" className="mt-2 text-danger">{err}</p>}
      <ul className="mt-4 grid gap-2">{items.map((a) => (<li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted p-3"><div className="min-w-0 flex-1"><b>{a.name}</b> {!a.active && <span className="chip chip-demo">Tidak aktif</span>}<div className="break-words text-sm text-sub">{a.credit}</div></div>
        <audio controls preload="none" src={a.url} className="h-9 max-w-full" />
        <button className="btn" aria-label="Sunting azan" onClick={() => { setEdit(a.id); setF({ name: a.name, credit: a.credit, url: a.url, fajrUrl: a.fajrUrl ?? "", active: a.active }); }}><Pencil size={16} /></button>
        <button className="btn" aria-label="Padam azan" onClick={() => confirm(`Padam ${a.name}?`) && deleteDoc(doc(db, "azan", a.id))}><Trash2 size={16} /></button></li>))}
        {!items.length && <li className="text-sm text-sub">Belum ada azan. Azan lalai (Ustaz Asri / Furqan Fawaz) digunakan jika masjid tak pilih.</li>}</ul>
    </section>
  );
}

function Dashboard() {
  const [reg, setReg] = useState<Record<string, Registry>>({}); const [tv, setTv] = useState<Record<string, TvDoc>>({});
  const [pres, setPres] = useState<Record<string, { t: number }>>({}); const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [now, setNow] = useState(Date.now());
  const pwa = usePwaInstall();
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "registry"), orderBy("createdAt", "desc")), (s) => setReg(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as Registry]))));
    const u2 = onSnapshot(collection(db, "tv"), (s) => setTv(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as TvDoc]))));
    const u3 = onValue(ref(rtdb, "presence"), (s) => setPres(s.val() ?? {}), () => {});
    const t = setInterval(() => setNow(Date.now()), 30000); return () => { u1(); u2(); u3(); clearInterval(t); };
  }, []);
  const rows: Row[] = useMemo(() => Object.entries(reg).map(([id, r]) => ({ ...r, id, plan: tv[id]?.plan ?? "demo" })), [reg, tv]);
  const online = (id: string) => pres[id] && now - pres[id].t < 180000;
  const shown = rows.filter((r) => `${r.name} ${r.state} ${r.email} ${r.zone} ${r.city} ${r.managerName}`.toLowerCase().includes(q.toLowerCase()));
  const byState = Object.entries(rows.reduce<Record<string, number>>((a, r) => ((a[r.state || r.country] = (a[r.state || r.country] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const week = rows.filter((r) => now - r.createdAt < 7 * 864e5).length;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><img src="/logo.png" alt="Solat Digital" className="h-12 w-auto" /><div><h1 className="text-2xl font-extrabold md:text-3xl">Admin Solat Digital</h1><p className="text-sm text-sub">Admin utama. Hanya data pendaftaran dipaparkan; tiada akses ke akaun masjid.</p></div></div>
        <div className="flex gap-2"><a className="btn" href="https://github.com/GeniusDigitalDeveloper/website-claude-code/releases/download/solat-digital-latest/SolatDigital-Admin-Setup.exe"><Download size={18} /> Aplikasi (.exe)</a>{pwa.canInstall && <button className="btn btn-primary" onClick={pwa.install}><Download size={18} /> Pasang aplikasi</button>}<button className="btn" aria-label="Log keluar" onClick={() => signOut(auth)}><LogOut size={18} /></button></div></header>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Building2 size={16} />} label="Masjid berdaftar" v={rows.length} /><Stat icon={<Users size={16} />} label="Akaun admin masjid" v={rows.length} />
        <Stat icon={<ShieldCheck size={16} />} label="Akses penuh / demo" v={`${rows.filter((r) => r.plan === "full").length} / ${rows.filter((r) => r.plan !== "full").length}`} /><Stat icon={<Radio size={16} />} label="TV dalam talian" v={rows.filter((r) => online(r.id)).length} />
      </div>
      <p className="mt-2 text-sm text-sub">Pendaftaran 7 hari terakhir: <b className="text-fg">{week}</b></p>

      <section className="card mt-5"><h2 className="text-lg font-bold">Mengikut negeri</h2>
        <ul className="mt-3 grid gap-2">{byState.map(([s, n]) => (<li key={s} className="flex items-center gap-3 text-sm"><span className="w-36 shrink-0 truncate">{s}</span><div className="h-3 flex-1 overflow-hidden rounded bg-muted"><div className="h-full bg-accent" style={{ width: `${(n / rows.length) * 100}%` }} /></div><b className="w-8 text-right tabular-nums">{n}</b></li>))}{!byState.length && <li className="text-sm text-sub">Belum ada pendaftaran.</li>}</ul></section>

      <section className="card mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Senarai masjid</h2>
        <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-3.5 text-sub" /><input className="inp !pl-9" aria-label="Cari masjid" placeholder="Cari nama, negeri, emel" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <ul className="mt-4 grid gap-3">{shown.map((r) => (
          <li key={r.id} className="rounded-xl bg-muted p-4"><div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-lg">{r.name}</b><span className={`chip ${r.plan === "full" ? "chip-ok" : "chip-demo"}`}>{r.plan === "full" ? "Akses penuh" : "Demo"}</span>{online(r.id) && <span className="chip chip-ok"><Radio size={12} /> Dalam talian</span>}</div>
              <p className="mt-1 break-words text-sm text-sub">{[r.address, r.city, r.postcode, r.state, r.country].filter(Boolean).join(", ")}</p><p className="break-words text-sm text-sub">Pengurus: {r.managerName || "-"} · {r.email} · Zon {r.zone || "auto"}</p><p className="text-xs text-sub">Daftar {new Date(r.createdAt).toLocaleDateString("ms-MY")} · Kemas kini tetapan: {tv[r.id]?.updatedAt ? new Date(tv[r.id].updatedAt!).toLocaleString("ms-MY") : "belum"} · TV terakhir dilihat: {pres[r.id] ? new Date(pres[r.id].t).toLocaleString("ms-MY") : "belum pernah"}</p></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/?m=${r.id}`); flash("Pautan TV disalin."); }}><Copy size={16} /> Pautan TV</button>
              <button className={`btn ${r.plan === "full" ? "" : "btn-primary"}`} onClick={async () => { try { await updateDoc(doc(db, "tv", r.id), { plan: r.plan === "full" ? "demo" : "full" }); } catch { flash("Gagal kemas kini."); } }}>{r.plan === "full" ? "Tukar ke demo" : "Aktifkan akses penuh"}</button></div></div></li>))}
          {!shown.length && <li className="text-sm text-sub">Tiada masjid dijumpai.</li>}</ul></section>
      <div className="mt-5"><Defaults /></div>
      <div className="mt-5"><AzanManager /></div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

export default function Page() {
  const user = useUser(); const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { setOk(null); if (!user) return; getDoc(doc(db, "admins", user.uid)).then((s) => { if (s.exists()) setOk(true); else { setOk(false); signOut(auth); } }).catch(() => { setOk(false); signOut(auth); }); }, [user]);
  if (user === undefined || (user && ok === null)) return <p className="p-8">Memuatkan…</p>;
  if (!user) return <Login denied={ok === false} />;
  return <Dashboard />;
}

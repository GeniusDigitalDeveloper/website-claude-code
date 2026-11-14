"use client";
import { useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import { Bell, Building2, Copy, Download, LayoutDashboard, LogOut, MapPin, Megaphone, Music, Pencil, Plus, Radio, Search, Settings, ShieldCheck, Trash2, Users } from "lucide-react";
import { auth, db, rtdb } from "@/lib/firebase";
import { ZONES } from "@/lib/zones";
import { ARABIC_FONTS, FONTS, KIND_LABEL, PRAYER_OPTS, uid, type AzanDoc, type ChatMeta, type CustomFont, type Defaults, type PanelSettings, type Registry, type SlideItem, type TvDoc, type TvSettings } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { authMsg, useUser } from "@/lib/useUser";
import { usePwaInstall } from "@/lib/usePwa";
import PasswordInput from "@/components/PasswordInput";
import Shell, { type NavItem } from "@/components/Shell";
import Chat, { Broadcast } from "@/components/Chat";
import DateBadge from "@/components/DateBadge";
import { useDefaults } from "@/lib/useDefaults";

type Row = Registry & { id: string; plan: "demo" | "full" };
type Sec = "dash" | "negeri" | "senarai" | "notif" | "azan" | "tetapan";
const L = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;
const Stat = ({ icon, label, v }: { icon: React.ReactNode; label: string; v: number | string }) => <div className="card"><div className="flex items-center gap-2 text-sm text-sub">{icon}{label}</div><div className="mt-2 text-3xl font-extrabold tabular-nums">{v}</div></div>;
const Switch = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><span className="font-semibold">{label}</span><button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} /></div>;
const driveDirect = (u: string) => { const m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/); return m && /drive\.google\.com/.test(u) ? `https://drive.google.com/uc?export=download&id=${m[1]}` : u.trim(); };

/* ---------------- Log masuk ---------------- */
declare global { interface Window { sdVault?: { get: () => Promise<{ e: string; p: string } | null>; set: (e: string, p: string) => Promise<void> } } }
function Login({ denied }: { denied: boolean }) {
  const [e, setE] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(denied ? "Akaun ini bukan Owner Solat Digital." : "");
  useEffect(() => {
    (async () => {
      try { const v = await window.sdVault?.get(); if (v) { setE(v.e); setP(v.p); return; } } catch {}
      try { const em = localStorage.getItem("sd_email_o"); if (em) setE(em); } catch {}
      try { const c = await (navigator.credentials as unknown as { get: (o: unknown) => Promise<{ id?: string; password?: string } | null> }).get({ password: true, mediation: "optional" }); if (c?.id && c.password) { setE(c.id); setP(c.password); } } catch {}
    })();
  }, []);
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setErr("");
    try {
      await signInWithEmailAndPassword(auth, e.trim(), p);
      try { localStorage.setItem("sd_email_o", e.trim()); } catch {}
      try { await window.sdVault?.set(e.trim(), p); } catch {}
      try { const PC = (window as unknown as { PasswordCredential?: new (o: unknown) => unknown }).PasswordCredential; if (PC) await (navigator.credentials as unknown as { store: (c: unknown) => Promise<unknown> }).store(new PC({ id: e.trim(), password: p, name: "Owner Solat Digital" })); } catch {}
    } catch (x) { setErr(authMsg(x)); }
  };
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center px-4">
      <form className="card" onSubmit={submit}>
        <img src="/logo.png" alt="Solat Digital" className="mx-auto mb-2 h-24 w-auto" /><h1 className="mt-2 text-2xl font-extrabold">Solat Digital (Admin Owner)</h1><p className="text-sm text-sub">Log masuk Owner sahaja.</p>
        <L id="e">Emel</L><input id="e" name="email" type="email" autoComplete="username" className="inp" value={e} onChange={(x) => setE(x.target.value)} required />
        <L id="p">Kata laluan</L><PasswordInput id="p" autoComplete="current-password" value={p} onChange={setP} />
        {err && <p role="alert" className="mt-3 text-danger">{err}</p>}
        <button className="btn btn-primary mt-5 w-full justify-center">Log masuk</button>
      </form>
    </main>
  );
}

/* ---------------- Perpustakaan azan ---------------- */
function AzanManager() {
  const [items, setItems] = useState<(AzanDoc & { id: string })[]>([]);
  const empty = { name: "", credit: "", url: "", active: true, prayers: PRAYER_OPTS.map((x) => x[0]) as string[] };
  const [f, setF] = useState(empty); const [edit, setEdit] = useState(""); const [err, setErr] = useState("");
  useEffect(() => onSnapshot(collection(db, "azan"), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...(d.data() as AzanDoc) }))), () => {}), []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); const url = driveDirect(f.url);
    if (!/^(https:\/\/|\/)/.test(url)) return setErr("URL azan mesti bermula https:// atau /. Pautan Google Drive juga boleh.");
    if (!f.prayers.length) return setErr("Pilih sekurang-kurangnya satu waktu solat.");
    const data = { name: f.name.trim(), credit: f.credit.trim(), url, active: f.active, prayers: f.prayers };
    try { if (edit) await updateDoc(doc(db, "azan", edit), data); else await addDoc(collection(db, "azan"), data); setF(empty); setEdit(""); } catch { setErr("Gagal simpan."); }
  };
  const tog = (k: string) => setF({ ...f, prayers: f.prayers.includes(k) ? f.prayers.filter((x) => x !== k) : [...f.prayers, k] });
  return (
    <div className="grid gap-5">
      <section className="card">
        <h2 className="text-lg font-bold">{edit ? "Sunting azan" : "Tambah azan"}</h2><p className="text-sm text-sub">Letak pautan MP3 (https://...) atau pautan kongsi Google Drive (tetapkan "Anyone with the link"). Fail MP3 dalam komputer: hantar kepada pembangun untuk diletakkan dalam sistem.</p>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={save}>
          <div><L id="an">Nama azan</L><input id="an" className="inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
          <div><L id="ak">Kredit / lesen</L><input id="ak" className="inp" placeholder="cth: Ustaz Asri (Rabbani)" value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} required /></div>
          <div className="md:col-span-2"><L id="au">Pautan MP3 atau Google Drive</L><input id="au" className="inp" placeholder="https://drive.google.com/file/d/.../view atau https://.../azan.mp3" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required />
            {f.url && <audio controls preload="none" className="mt-2 h-9 w-full" src={driveDirect(f.url)} />}</div>
          <fieldset className="md:col-span-2"><legend className="lbl">Untuk waktu solat</legend><div className="flex flex-wrap gap-2">{PRAYER_OPTS.map(([k, n]) => <label key={k} className={`tag-pill ${f.prayers.includes(k) ? "on" : ""}`}><input type="checkbox" className="sr-only" checked={f.prayers.includes(k)} onChange={() => tog(k)} />{n}</label>)}</div></fieldset>
          <div className="md:col-span-2"><Switch on={f.active} set={(v) => setF({ ...f, active: v })} label="Aktif (boleh dipilih masjid)" /></div>
          <div className="flex gap-2 md:col-span-2"><button className="btn btn-primary"><Plus size={18} /> {edit ? "Kemas kini" : "Tambah azan"}</button>{edit && <button type="button" className="btn" onClick={() => { setEdit(""); setF(empty); }}>Batal</button>}</div>
        </form>
        {err && <p role="alert" className="mt-2 text-danger">{err}</p>}
      </section>
      <section className="card"><h2 className="text-lg font-bold">Senarai azan ({items.length})</h2>
        <ul className="mt-3 grid gap-3">{items.map((a) => (<li key={a.id} className="rounded-xl bg-muted p-3"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><b>{a.name}</b> <span className={`chip ${a.active ? "chip-ok" : "chip-demo"}`}>{a.active ? "Aktif" : "Tidak aktif"}</span><div className="break-words text-sm text-sub">{a.credit}</div>
          <div className="mt-1 flex flex-wrap gap-1">{(a.prayers?.length ? a.prayers : PRAYER_OPTS.map((x) => x[0] as string)).map((k) => <span key={k} className="chip chip-ok !text-[.7rem]">{PRAYER_OPTS.find((x) => x[0] === k)?.[1] ?? k}</span>)}</div></div>
          <button type="button" className="switch" role="switch" aria-checked={a.active} aria-label={`Aktifkan ${a.name}`} onClick={() => updateDoc(doc(db, "azan", a.id), { active: !a.active })} />
          <button className="btn" aria-label="Sunting azan" onClick={() => { setEdit(a.id); setF({ name: a.name, credit: a.credit, url: a.url, active: a.active, prayers: a.prayers?.length ? a.prayers : PRAYER_OPTS.map((x) => x[0] as string) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil size={16} /></button>
          <button className="btn" aria-label="Padam azan" onClick={() => confirm(`Padam ${a.name}?`) && deleteDoc(doc(db, "azan", a.id))}><Trash2 size={16} /></button></div>
          <audio controls preload="none" src={a.url} className="mt-2 h-9 w-full" /></li>))}
          {!items.length && <li className="text-sm text-sub">Belum ada azan.</li>}</ul></section>
    </div>
  );
}

/* ---------------- Tetapan sistem ---------------- */
function SlidesEdit({ list, set }: { list: SlideItem[]; set: (l: SlideItem[]) => void }) {
  const upd = (id: string, p: Partial<SlideItem>) => set(list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <div>
      <ul className="grid gap-3">{list.map((s) => (<li key={s.id} className="rounded-xl border border-line p-3">
        <div className="flex flex-wrap items-center gap-2"><select aria-label="Jenis slaid" className="inp !w-auto" value={s.kind} onChange={(e) => upd(s.id, { kind: e.target.value as SlideItem["kind"] })}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={s.on} onChange={(e) => upd(s.id, { on: e.target.checked })} /> Aktif</label>
          <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" className="size-5 accent-green-700" checked={!!s.jumaat} onChange={(e) => upd(s.id, { jumaat: e.target.checked })} /> Jumaat sahaja</label>
          <button className="btn ml-auto" aria-label="Padam slaid" onClick={() => set(list.filter((x) => x.id !== s.id))}><Trash2 size={16} /></button></div>
        <textarea aria-label="Teks slaid" rows={2} maxLength={400} className="inp mt-2" value={s.text} onChange={(e) => upd(s.id, { text: e.target.value })} />
        <input aria-label="Rujukan" className="inp mt-2" placeholder="Rujukan" value={s.source ?? ""} onChange={(e) => upd(s.id, { source: e.target.value })} /></li>))}
        {!list.length && <li className="text-sm text-sub">Tiada slaid platform.</li>}</ul>
      <button className="btn btn-primary mt-3" disabled={list.length >= 15} onClick={() => set([...list, { id: uid(), kind: "umum", text: "", source: "", on: true }])}><Plus size={18} /> Tambah slaid ({list.length} / 15)</button>
    </div>
  );
}
function TvForm({ v, set, custom }: { v: TvSettings; set: (v: TvSettings) => void; custom: CustomFont[] }) {
  const f = { slides: true, ticker: true, hijri: true, banner: true, ...(v.features ?? {}) };
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><L id="tf">Font lalai (huruf Latin)</L><select id="tf" className="inp" value={v.font || FONTS[0]} onChange={(e) => set({ ...v, font: e.target.value })}>{FONTS.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div><L id="ta">Font lalai tulisan Arab (Thuluth)</L><select id="ta" className="inp" value={v.arabicFont || "honorifics"} onChange={(e) => set({ ...v, arabicFont: e.target.value })}>{ARABIC_FONTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}{custom.map((c) => <option key={c.id} value={"custom:" + c.id}>{c.name}</option>)}</select></div>
        <div><L id="th">Kaedah tarikh Hijrah</L><select id="th" className="inp" value={v.hijriMode ?? "jakim"} onChange={(e) => set({ ...v, hijriMode: e.target.value as "maghrib" | "jakim" })}><option value="jakim">Ikut Kalkulator JAKIM (bertukar tengah malam, lalai)</option><option value="maghrib">Bertukar pada waktu Maghrib</option></select></div>
      </div>
      <div><span className="lbl">Tema warna lalai TV</span><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{THEMES.map((t) => <button key={t.id} type="button" className="sw-theme" data-on={(v.theme || "ios") === t.id} onClick={() => set({ ...v, theme: t.id })}><span className="h-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${t.swatch[1]}, ${t.swatch[0]})` }} /><b>{t.label}</b></button>)}</div></div>
      <div><span className="lbl">Ciri pada paparan TV</span><div className="grid gap-2 sm:grid-cols-2">
        <Switch on={f.slides} set={(x) => set({ ...v, features: { ...f, slides: x } })} label="Panel slaid" /><Switch on={f.ticker} set={(x) => set({ ...v, features: { ...f, ticker: x } })} label="Teks bergerak (footer)" />
        <Switch on={f.hijri} set={(x) => set({ ...v, features: { ...f, hijri: x } })} label="Tarikh Hijrah" /><Switch on={f.banner} set={(x) => set({ ...v, features: { ...f, banner: x } })} label="Kiraan detik sebelum azan" /></div></div>
      <div><span className="lbl">Slaid daripada platform Solat Digital (keluar di semua TV)</span><SlidesEdit list={v.platformSlides ?? []} set={(l) => set({ ...v, platformSlides: l })} /></div>
    </div>
  );
}
function PanelForm({ v, set }: { v: PanelSettings; set: (v: PanelSettings) => void }) {
  const g = (k: keyof PanelSettings) => v[k] !== false; const s = (k: keyof PanelSettings, x: boolean) => set({ ...v, [k]: x });
  return (
    <div className="grid gap-3">
      <div><L id="pn">Notis kepada semua Pengurus Masjid (dipaparkan di dashboard mereka)</L><textarea id="pn" rows={2} maxLength={300} className="inp" value={v.notice ?? ""} onChange={(e) => set({ ...v, notice: e.target.value })} /></div>
      <div className="grid gap-2 sm:grid-cols-2"><Switch on={g("styleEditor")} set={(x) => s("styleEditor", x)} label="Editor font dan warna (klik pada pratonton)" /><Switch on={g("theme")} set={(x) => s("theme", x)} label="Pilihan tema TV" />
        <Switch on={g("slides")} set={(x) => s("slides", x)} label="Slaid kandungan" /><Switch on={g("announcements")} set={(x) => s("announcements", x)} label="Pengumuman" /><Switch on={g("images")} set={(x) => s("images", x)} label="Gambar latar" /></div>
    </div>
  );
}
function Tetapan({ rows, sub }: { rows: Row[]; sub: string }) {
  const [ed, setEd] = useState<Defaults | null>(null); const [msg, setMsg] = useState(""); const [betaOn, setBetaOn] = useState(false);
  const [nf, setNf] = useState({ name: "", url: "", credit: "" });
  useEffect(() => onSnapshot(doc(db, "config", "defaults"), (s) => setEd((x) => x ?? ((s.data() as Defaults) || {})), () => {}), []);
  if (!ed) return <p>Memuatkan…</p>;
  const save = async () => { try { await setDoc(doc(db, "config", "defaults"), JSON.parse(JSON.stringify(ed))); setMsg("Disimpan. Semua TV dan panel dikemas kini."); } catch { setMsg("Gagal simpan."); } setTimeout(() => setMsg(""), 2500); };
  const custom = ed.customFonts ?? []; const ids = ed.betaIds ?? [];
  const addFont = (e: React.FormEvent) => { e.preventDefault(); if (!/^(https:\/\/|\/)/.test(nf.url)) return setMsg("URL font mesti bermula https:// atau /."); setEd({ ...ed, customFonts: [...custom, { id: uid(), name: nf.name.trim(), url: nf.url.trim(), credit: nf.credit.trim() }] }); setNf({ name: "", url: "", credit: "" }); };
  const toggleBeta = (id: string) => setEd({ ...ed, betaIds: ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 2 ? ids : [...ids, id] });
  return (
    <div className="grid gap-5">
      {sub === "tv" && <>
        <section className="card"><h2 className="text-lg font-bold">Tetapan TV (semua masjid)</h2><p className="text-sm text-sub">Tetapan lalai paparan TV di semua masjid. Masjid boleh menukar font dan warna mereka sendiri; ia tidak kekal untuk mereka.</p><div className="mt-3"><TvForm v={ed} set={(v) => setEd({ ...ed, ...v })} custom={custom} /></div></section>
        <section className="card"><h2 className="text-lg font-bold">Pustaka font Arab tersuai (Thuluth dll.)</h2><p className="text-sm text-sub">Tambah font berlesen anda (woff2/ttf/otf) melalui URL https:// atau fail di /fonts/. Semua masjid boleh memilihnya.</p>
          <form className="mt-2 grid gap-2 md:grid-cols-4" onSubmit={addFont}><input className="inp" aria-label="Nama font" placeholder="Nama font" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} required /><input className="inp" aria-label="URL font" placeholder="https://... atau /fonts/x.woff2" value={nf.url} onChange={(e) => setNf({ ...nf, url: e.target.value })} required /><input className="inp" aria-label="Kredit" placeholder="Kredit / lesen" value={nf.credit} onChange={(e) => setNf({ ...nf, credit: e.target.value })} required /><button className="btn btn-primary justify-center"><Plus size={18} /> Tambah</button></form>
          <ul className="mt-3 grid gap-2">{custom.map((c) => <li key={c.id} className="flex items-center gap-3 rounded-xl bg-muted p-3"><div className="min-w-0 flex-1"><b>{c.name}</b><div className="break-all text-xs text-sub">{c.credit} · {c.url}</div></div><button className="btn" aria-label="Padam font" onClick={() => setEd({ ...ed, customFonts: custom.filter((x) => x.id !== c.id) })}><Trash2 size={16} /></button></li>)}{!custom.length && <li className="text-sm text-sub">Belum ada font tersuai.</li>}</ul></section>
      </>}
      {sub === "panel" && <section className="card"><h2 className="text-lg font-bold">Tetapan Panel Pengurus Masjid</h2><p className="text-sm text-sub">Kawal apa yang masjid boleh lihat dan ubah dalam panel mereka.</p><div className="mt-3"><PanelForm v={ed.panel ?? {}} set={(p) => setEd({ ...ed, panel: p })} /></div></section>}
      <section className="card"><h2 className="text-lg font-bold">Kemas kini terkini (Beta) untuk dua masjid</h2><p className="text-sm text-sub">Cuba perubahan baharu pada TV dan panel hanya untuk maksimum dua masjid dahulu. Masjid lain kekal dengan tetapan di atas.</p>
        <div className="mt-3 flex flex-wrap gap-2">{ids.map((id) => <span key={id} className="chip chip-ok">{rows.find((r) => r.id === id)?.name ?? id}</span>)}{!ids.length && <span className="text-sm text-sub">Belum ada masjid Beta.</span>}</div>
        <L id="bs">Pilih masjid Beta ({ids.length} / 2)</L>
        <div className="flex flex-wrap gap-2">{rows.map((r) => <button key={r.id} type="button" className={`tag-pill ${ids.includes(r.id) ? "on" : ""}`} aria-pressed={ids.includes(r.id)} onClick={() => toggleBeta(r.id)}>{r.name}</button>)}{!rows.length && <span className="text-sm text-sub">Belum ada masjid berdaftar.</span>}</div>
        <button className="btn mt-4" onClick={() => setBetaOn((x) => !x)}>{betaOn ? "Tutup" : "Edit"} tetapan Beta</button>
        {betaOn && <div className="mt-4 grid gap-5 border-t border-line pt-4"><div><h3 className="mb-2 font-bold">Beta: TV</h3><TvForm v={ed.beta ?? {}} set={(v) => setEd({ ...ed, beta: { ...ed.beta, ...v } })} custom={custom} /></div><div><h3 className="mb-2 font-bold">Beta: Panel Pengurus Masjid</h3><PanelForm v={ed.beta?.panel ?? {}} set={(p) => setEd({ ...ed, beta: { ...ed.beta, panel: p } })} /></div></div>}
      </section>
      <div className="flex items-center gap-3"><button className="btn btn-primary" onClick={save}>Simpan tetapan</button>{msg && <span role="status" className="text-sm font-semibold text-accent">{msg}</span>}</div>
    </div>
  );
}

/* ---------------- Notifikasi ---------------- */
function Notif({ rows }: { rows: Row[] }) {
  const [metas, setMetas] = useState<Record<string, ChatMeta>>({}); const [sel, setSel] = useState(""); const [bc, setBc] = useState(false); const [flash, setFlash] = useState("");
  useEffect(() => onSnapshot(collection(db, "chats"), (s) => setMetas(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as ChatMeta]))), () => {}), []);
  const list = rows.map((r) => ({ id: r.id, name: r.name, m: metas[r.id] })).sort((a, b) => (b.m?.lastAt ?? 0) - (a.m?.lastAt ?? 0));
  const cur = rows.find((r) => r.id === sel);
  return (
    <div className="grid gap-5">
      <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Notifikasi</h2><p className="text-sm text-sub">Mesej daripada masjid dan siaran kepada semua masjid.</p></div><button className="btn btn-primary" onClick={() => setBc((v) => !v)}><Megaphone size={18} /> Siaran kepada semua masjid</button></div>
        {bc && <div className="pop-card mt-4 rounded-xl border border-line p-3"><Broadcast targets={rows.map((r) => ({ id: r.id, name: r.name }))} onDone={(n) => { setFlash(`Dihantar kepada ${n} masjid.`); setBc(false); setTimeout(() => setFlash(""), 3000); }} /></div>}
        {flash && <p role="status" className="mt-3 font-semibold text-accent">{flash}</p>}</section>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="card !p-3"><ul className="grid gap-1">{list.map((c) => (<li key={c.id}><button type="button" className="nav-item !items-start" data-active={sel === c.id} onClick={() => setSel(c.id)}><span className="min-w-0 flex-1"><b className="block truncate">{c.name}</b><span className="block truncate text-xs font-medium text-sub">{c.m?.lastText ?? "Belum ada mesej"}</span></span>{!!c.m?.unreadOwner && <span className="nav-badge">{c.m.unreadOwner}</span>}</button></li>))}{!list.length && <li className="p-3 text-sm text-sub">Belum ada masjid berdaftar.</li>}</ul></section>
        <section className="card">{cur ? <><h3 className="mb-3 font-bold">{cur.name}</h3><Chat key={cur.id} mid={cur.id} me="owner" mosqueName={cur.name} /></> : <p className="py-10 text-center text-sm text-sub">Pilih masjid untuk melihat dan membalas mesej.</p>}</section>
      </div>
    </div>
  );
}

/* ---------------- Dashboard utama ---------------- */
function Dashboard() {
  const [reg, setReg] = useState<Record<string, Registry>>({}); const [tv, setTv] = useState<Record<string, TvDoc>>({});
  const [pres, setPres] = useState<Record<string, { t: number }>>({}); const [metas, setMetas] = useState<Record<string, ChatMeta>>({});
  const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [now, setNow] = useState(Date.now());
  const [sec, setSec] = useState<Sec>("dash"); const [sub, setSub] = useState("tv"); const [selSt, setSelSt] = useState(""); const [selZone, setSelZone] = useState(""); const [picked, setPicked] = useState<string[]>([]);
  const pwa = usePwaInstall();
  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "registry"), orderBy("createdAt", "desc")), (s) => setReg(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as Registry]))));
    const u2 = onSnapshot(collection(db, "tv"), (s) => setTv(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as TvDoc]))));
    const u3 = onValue(ref(rtdb, "presence"), (s) => setPres(s.val() ?? {}), () => {});
    const u4 = onSnapshot(collection(db, "chats"), (s) => setMetas(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as ChatMeta]))), () => {});
    const t = setInterval(() => setNow(Date.now()), 30000); return () => { u1(); u2(); u3(); u4(); clearInterval(t); };
  }, []);
  const rows: Row[] = useMemo(() => Object.entries(reg).map(([id, r]) => ({ ...r, id, plan: tv[id]?.plan ?? "demo" })), [reg, tv]);
  const online = (id: string) => pres[id] && now - pres[id].t < 180000;
  const shown = rows.filter((r) => `${r.name} ${r.state} ${r.email} ${r.zone} ${r.city} ${r.managerName}`.toLowerCase().includes(q.toLowerCase()));
  const states = [...new Set(ZONES.map((z) => z[1]))];
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const unread = Object.values(metas).reduce((n, m) => n + (m.unreadOwner || 0), 0);
  const setPlan = async (ids: string[], plan: "demo" | "full") => { try { await Promise.all(ids.map((id) => updateDoc(doc(db, "tv", id), { plan }))); setPicked([]); flash(`${ids.length} masjid dikemas kini.`); } catch { flash("Gagal kemas kini."); } };
  const items: NavItem[] = [
    { id: "dash", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "negeri", label: "Mengikut negeri", icon: <MapPin size={20} /> },
    { id: "senarai", label: "Senarai masjid", icon: <Building2 size={20} /> },
    { id: "notif", label: "Notifikasi", icon: <Bell size={20} />, badge: unread },
    { id: "azan", label: "Perpustakaan azan", icon: <Music size={20} /> },
    { id: "tetapan", label: "Tetapan sistem dan font", icon: <Settings size={20} />, subs: [{ id: "tv", label: "TV" }, { id: "panel", label: "Panel Admin Masjid" }] },
  ];
  const stRows = (st: string) => rows.filter((r) => r.state === st);
  const zones = ZONES.filter((z) => z[1] === selSt);
  return (
    <div>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 pt-4 lg:px-5">
        <div className="flex items-center gap-3"><img src="/logo.png" alt="Solat Digital" className="h-12 w-auto" /><div><h1 className="text-xl font-extrabold md:text-2xl">Solat Digital (Admin Owner)</h1><p className="text-xs text-sub md:text-sm">Owner sistem. Hanya data pendaftaran dipaparkan; tiada akses ke akaun masjid.</p><div className="mt-1"><DateBadge mode={useDefaults("").raw.hijriMode ?? "jakim"} /></div></div></div>
        <div className="flex gap-2"><a className="btn btn-dl" href="https://github.com/GeniusDigitalDeveloper/website-claude-code/releases/download/solat-digital-latest/SolatDigital-Admin-Setup.exe"><Download size={18} /> Muat turun (.exe)</a>{pwa.canInstall && <button className="btn" onClick={pwa.install}><Download size={18} /> Pasang aplikasi</button>}<button className="btn btn-danger" onClick={() => signOut(auth)}><LogOut size={18} /> Log keluar</button></div>
      </header>
      <Shell brand={<div className="text-sm font-bold text-sub">Menu Owner</div>} items={items} active={sec} sub={sub} onSelect={(id, s) => { setSec(id as Sec); if (s) setSub(s); }}>
        <div key={sec + sub} className="grid gap-5">
          {sec === "dash" && <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat icon={<Building2 size={16} />} label="Masjid berdaftar" v={rows.length} /><Stat icon={<Users size={16} />} label="Akaun admin masjid" v={rows.length} />
            <Stat icon={<ShieldCheck size={16} />} label="Akses penuh / demo" v={`${rows.filter((r) => r.plan === "full").length} / ${rows.filter((r) => r.plan !== "full").length}`} /><Stat icon={<Radio size={16} />} label="TV dalam talian" v={rows.filter((r) => online(r.id)).length} /></div>}

          {sec === "negeri" && <section className="card"><h2 className="text-lg font-bold">Mengikut negeri dan daerah</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-2 text-sm font-bold text-sub">Negeri</h3><ul className="grid gap-1">{states.map((s) => (<li key={s}><button type="button" className="nav-item" data-active={selSt === s} onClick={() => { setSelSt(s); setSelZone(""); }}><span className="flex-1">{s}</span><span className="chip chip-ok">{stRows(s).length}</span></button></li>))}</ul></div>
              <div><h3 className="mb-2 text-sm font-bold text-sub">Daerah {selSt && `(${selSt})`}</h3>
                {!selSt ? <p className="text-sm text-sub">Pilih negeri di sebelah kiri.</p> : <ul className="grid gap-1">{zones.map((z) => { const n = rows.filter((r) => r.zone === z[0]).length; return (<li key={z[0]}><button type="button" className="nav-item !items-start" data-active={selZone === z[0]} onClick={() => setSelZone(selZone === z[0] ? "" : z[0])}><span className="min-w-0 flex-1"><b>{z[0]}</b><span className="block text-xs font-medium text-sub">{z[2]}</span></span><span className="chip chip-ok">{n}</span></button></li>); })}</ul>}
                {selZone && <div className="pop-card mt-3 rounded-xl bg-muted p-3"><h4 className="mb-1 text-sm font-bold">Masjid dalam zon {selZone}</h4><ul className="grid gap-1 text-sm">{rows.filter((r) => r.zone === selZone).map((r) => <li key={r.id}>{r.name} · {r.city}</li>)}{!rows.some((r) => r.zone === selZone) && <li className="text-sub">Tiada masjid berdaftar.</li>}</ul></div>}
              </div></div></section>}

          {sec === "senarai" && <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Senarai masjid</h2>
            <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-3.5 text-sub" /><input className="inp !pl-9" aria-label="Cari masjid" placeholder="Cari nama, negeri, emel" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 accent-green-700" checked={shown.length > 0 && picked.length === shown.length} onChange={(e) => setPicked(e.target.checked ? shown.map((r) => r.id) : [])} /> Pilih semua ({picked.length} dipilih)</label>
              {picked.length > 0 && <><button className="btn btn-primary" onClick={() => setPlan(picked, "full")}>Aktifkan akses penuh</button><button className="btn" onClick={() => setPlan(picked, "demo")}>Tukar ke demo</button><button className="btn" onClick={() => { setSec("notif"); }}><Megaphone size={16} /> Mesej</button></>}</div>
            <ul className="mt-4 grid gap-3">{shown.map((r) => (
              <li key={r.id} className="rounded-xl bg-muted p-4"><div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3"><input type="checkbox" className="mt-1 size-5 accent-green-700" aria-label={`Pilih ${r.name}`} checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-lg">{r.name}</b><span className={`chip ${r.plan === "full" ? "chip-ok" : "chip-demo"}`}>{r.plan === "full" ? "Akses penuh" : "Demo"}</span>{online(r.id) && <span className="chip chip-ok"><Radio size={12} /> Dalam talian</span>}</div>
                    <p className="mt-1 break-words text-sm text-sub">{[r.address, r.city, r.postcode, r.state, r.country].filter(Boolean).join(", ")}</p><p className="break-words text-sm text-sub">Pengurus: {r.managerName || "-"} · {r.email} · Zon {r.zone || "auto"}</p>
                    <p className="text-xs text-sub">Daftar {new Date(r.createdAt).toLocaleDateString("ms-MY")} · Kemas kini tetapan: {tv[r.id]?.updatedAt ? new Date(tv[r.id].updatedAt!).toLocaleString("ms-MY") : "belum"} · TV terakhir dilihat: {pres[r.id] ? new Date(pres[r.id].t).toLocaleString("ms-MY") : "belum pernah"}</p></div></div>
                <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/?m=${r.id}`); flash("Pautan TV disalin."); }}><Copy size={16} /> Pautan TV</button>
                  <button className={`btn ${r.plan === "full" ? "" : "btn-primary"}`} onClick={() => setPlan([r.id], r.plan === "full" ? "demo" : "full")}>{r.plan === "full" ? "Tukar ke demo" : "Aktifkan akses penuh"}</button></div></div></li>))}
              {!shown.length && <li className="text-sm text-sub">Tiada masjid dijumpai.</li>}</ul></section>}

          {sec === "notif" && <Notif rows={rows} />}
          {sec === "azan" && <AzanManager />}
          {sec === "tetapan" && <Tetapan rows={rows} sub={sub} />}
        </div>
      </Shell>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function Page() {
  const user = useUser(); const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => { setOk(null); if (!user) return; getDoc(doc(db, "admins", user.uid)).then((s) => { if (s.exists()) setOk(true); else { setOk(false); signOut(auth); } }).catch(() => { setOk(false); signOut(auth); }); }, [user]);
  if (user === undefined || (user && ok === null)) return <p className="p-8">Memuatkan…</p>;
  if (!user) return <Login denied={ok === false} />;
  return <Dashboard />;
}

"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, MonitorPlay, Plus, Trash2 } from "lucide-react";
import { type Masjid, uid, useMasjids } from "@/lib/store";
import { ZONES } from "@/lib/zones";

const states = [...new Set(ZONES.map((z) => z[1]))];
const Lbl = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="mb-1 mt-4 block text-sm font-semibold text-sub">{children}</label>;

function Editor({ m, upd, del }: { m: Masjid; upd: (p: Partial<Masjid>) => void; del: () => void }) {
  const st = ZONES.find((z) => z[0] === m.zone)?.[1] ?? "";
  const [state, setState] = useState(st);
  const [txt, setTxt] = useState("");
  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">Asas</h2>
        <Lbl id="nm">Nama masjid</Lbl><input id="nm" className="inp" value={m.name} onChange={(e) => upd({ name: e.target.value })} />
        <Lbl id="mode">Zon waktu solat</Lbl>
        <select id="mode" className="inp" value={m.zone ? "manual" : "auto"} onChange={(e) => upd({ zone: e.target.value === "auto" ? "" : "SGR01" })}>
          <option value="auto">Automatik (lokasi / IP)</option><option value="manual">Pilih sendiri</option>
        </select>
        {m.zone && (<div className="mt-3 grid gap-3 md:grid-cols-2">
          <div><Lbl id="st">Negeri</Lbl><select id="st" className="inp" value={state || st} onChange={(e) => { setState(e.target.value); upd({ zone: ZONES.find((z) => z[1] === e.target.value)![0] }); }}>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><Lbl id="zn">Zon dan daerah</Lbl><select id="zn" className="inp" value={m.zone} onChange={(e) => upd({ zone: e.target.value })}>{ZONES.filter((z) => z[1] === (state || st)).map((z) => <option key={z[0]} value={z[0]}>{z[0]} · {z[2]}</option>)}</select></div>
        </div>)}
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-green-500" checked={m.azan} onChange={(e) => upd({ azan: e.target.checked })} /> Bunyikan azan bersama pop-up</label>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">Pengumuman (ticker di TV)</h2>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; upd({ announcements: [...m.announcements, { id: uid(), text: txt.trim(), on: true }] }); setTxt(""); }}>
          <input className="inp" aria-label="Teks pengumuman" placeholder="cth: Kuliah Maghrib bersama Ustaz, malam ini" value={txt} onChange={(e) => setTxt(e.target.value)} />
          <button className="btn btn-primary" type="submit" aria-label="Tambah pengumuman"><Plus size={18} /></button>
        </form>
        <ul className="mt-3 grid gap-2">
          {m.announcements.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <input type="checkbox" className="size-5 accent-green-500" aria-label="Aktif" checked={a.on} onChange={(e) => upd({ announcements: m.announcements.map((x) => x.id === a.id ? { ...x, on: e.target.checked } : x) })} />
              <span className="flex-1">{a.text}</span>
              <button className="btn" aria-label="Padam pengumuman" onClick={() => upd({ announcements: m.announcements.filter((x) => x.id !== a.id) })}><Trash2 size={18} /></button>
            </li>))}
          {!m.announcements.length && <li className="text-sm text-sub">Belum ada pengumuman.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">Latar slideshow</h2>
        <p className="text-sm text-sub">Maksimum 10 URL gambar. Kosong = latar masjid asal.</p>
        <Lbl id="sl">URL gambar (satu setiap baris)</Lbl>
        <textarea id="sl" rows={5} className="inp" value={m.slides.join("\n")} onChange={(e) => upd({ slides: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10) })} />
        <div className="grid gap-3 md:grid-cols-2">
          <div><Lbl id="an">Animasi</Lbl><select id="an" className="inp" value={m.anim} onChange={(e) => upd({ anim: e.target.value as Masjid["anim"] })}><option value="kenburns">Zum masuk</option><option value="zoomout">Zum keluar</option><option value="fade">Pudar sahaja</option></select></div>
          <div><Lbl id="sc">Saat setiap gambar</Lbl><input id="sc" type="number" min={4} max={30} className="inp" value={m.secs} onChange={(e) => upd({ secs: Math.max(4, Math.min(30, +e.target.value || 10)) })} /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">Keselamatan</h2>
        <Lbl id="pin">PIN admin (kosong = tanpa PIN)</Lbl><input id="pin" className="inp" inputMode="numeric" maxLength={8} value={m.pin} onChange={(e) => upd({ pin: e.target.value.replace(/\D/g, "") })} />
        <p className="mt-2 text-sm text-sub">PIN hanya halang tetapan secara kasual pada peranti ini; bukan keselamatan sebenar (belum ada backend).</p>
        <button className="btn mt-4 text-danger" onClick={() => confirm(`Padam ${m.name}?`) && del()}><Trash2 size={18} /> Padam masjid ini</button>
      </section>
    </div>
  );
}

function Inner() {
  const id = useSearchParams().get("m"); const router = useRouter();
  const { list, ready, save } = useMasjids();
  const [ok, setOk] = useState(false); const [pin, setPin] = useState(""); const [bad, setBad] = useState(false);
  const m = list.find((x) => x.id === id) ?? (id ? undefined : list[0]);
  useEffect(() => { try { if (m && sessionStorage.getItem("ss_ok_" + m.id)) setOk(true); } catch {} }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <p className="p-8">Memuatkan…</p>;
  if (!m) return <div className="p-8"><p>Masjid tidak dijumpai.</p><Link className="btn mt-4" href="/">Kembali</Link></div>;
  if (m.pin && !ok) return (
    <form className="mx-auto mt-24 max-w-xs px-4" onSubmit={(e) => { e.preventDefault(); if (pin === m.pin) { try { sessionStorage.setItem("ss_ok_" + m.id, "1"); } catch {} setOk(true); } else setBad(true); }}>
      <h1 className="text-2xl font-bold">PIN admin</h1>
      <label htmlFor="p" className="mt-4 block text-sm text-sub">Masukkan PIN untuk {m.name}</label>
      <input id="p" className="inp mt-1" type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => { setPin(e.target.value); setBad(false); }} />
      {bad && <p role="alert" className="mt-2 text-danger">PIN salah.</p>}
      <button className="btn btn-primary mt-4 w-full justify-center" type="submit">Masuk</button>
    </form>);
  const upd = (p: Partial<Masjid>) => save(list.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="btn" href="/"><ArrowLeft size={18} /> Semua masjid</Link>
        <Link className="btn btn-primary" href={`/tv?m=${m.id}`}><MonitorPlay size={18} /> Buka TV</Link>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold">Tetapan: {m.name}</h1>
      <p className="text-sm text-sub">Perubahan disimpan serta-merta dan TV yang terbuka pada peranti ini dikemas kini.</p>
      <Editor m={m} upd={upd} del={() => { save(list.filter((x) => x.id !== m.id)); router.push("/"); }} />
    </main>
  );
}
export default function Page() { return <Suspense fallback={<p className="p-8">Memuatkan…</p>}><Inner /></Suspense>; }

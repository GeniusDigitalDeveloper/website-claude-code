"use client";
import Link from "next/link";
import { useRef } from "react";
import { Download, MonitorPlay, Plus, Settings, Upload } from "lucide-react";
import { newMasjid, parseImport, useMasjids } from "@/lib/store";

export default function Home() {
  const { list, ready, save } = useMasjids();
  const file = useRef<HTMLInputElement>(null);
  const exportAll = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" })); a.download = "smart-solat-masjid.json"; a.click(); };
  const onImport = async (f?: File) => { if (!f) return; try { save([...list, ...parseImport(await f.text())]); } catch { alert("Fail JSON tidak sah."); } if (file.current) file.current.value = ""; };
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold md:text-5xl">Smart Solat</h1>
      <p className="mt-2 max-w-2xl text-sub">Paparan waktu solat pintar untuk TV masjid dan surau. Waktu rasmi JAKIM, azan, pop-up dan pengumuman. Setiap masjid ada profil sendiri.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => save([...list, newMasjid()])}><Plus size={18} /> Tambah masjid</button>
        <button className="btn" onClick={exportAll}><Download size={18} /> Eksport JSON</button>
        <button className="btn" onClick={() => file.current?.click()}><Upload size={18} /> Import JSON</button>
        <input ref={file} type="file" accept="application/json" className="hidden" aria-label="Import fail JSON" onChange={(e) => onImport(e.target.files?.[0])} />
      </div>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {ready && list.map((m) => (
          <li key={m.id} className="rounded-2xl border border-line bg-card p-5">
            <h2 className="text-xl font-bold">{m.name}</h2>
            <p className="mt-1 text-sm text-sub">{m.zone ? `Zon ${m.zone}` : "Zon automatik"} · {m.announcements.filter((a) => a.on).length} pengumuman aktif</p>
            <div className="mt-4 flex gap-3">
              <Link className="btn btn-primary" href={`/tv?m=${m.id}`}><MonitorPlay size={18} /> Buka TV</Link>
              <Link className="btn" href={`/admin?m=${m.id}`}><Settings size={18} /> Tetapan</Link>
            </div>
          </li>))}
      </ul>
      <p className="mt-8 text-sm text-sub">Nota: profil disimpan dalam pelayar peranti ini. Guna Eksport/Import untuk pindah ke TV lain.</p>
    </main>
  );
}

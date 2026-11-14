"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { ZONES } from "@/lib/zones";
import { geoDetectZone } from "@/lib/prayer";

const states = [...new Set(ZONES.map((z) => z[1]))];
const Lb = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;

/** Negeri → zon JAKIM → senarai daerah dalam zon itu. Boleh kesan lokasi automatik. Malaysia sahaja. */
export default function ZonePicker({ zone, onChange, idp = "zp" }: { zone: string; onChange: (z: string) => void; idp?: string }) {
  const cur = ZONES.find((z) => z[0] === zone);
  const [state, setState] = useState(cur?.[1] ?? "Selangor");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const list = ZONES.filter((z) => z[1] === state);
  const detect = async () => {
    setBusy(true); setMsg("");
    try { const z = await geoDetectZone(); const info = ZONES.find((x) => x[0] === z)!; setState(info[1]); onChange(z); setMsg(`Dikesan: ${info[1]}, zon ${z}.`); }
    catch { setMsg("Lokasi tidak dapat dikesan. Benarkan akses lokasi pada pelayar atau pilih sendiri di bawah."); }
    setBusy(false);
  };
  return (
    <div>
      <button type="button" className="btn mt-3" onClick={detect} disabled={busy}><MapPin size={18} /> {busy ? "Mengesan…" : "Kesan lokasi peranti ini"}</button>
      {msg && <p role="status" className="mt-2 text-sm text-sub">{msg}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Lb id={idp + "s"}>Negeri</Lb><select id={idp + "s"} className="inp" value={state} onChange={(e) => { setState(e.target.value); onChange(ZONES.find((z) => z[1] === e.target.value)![0]); }}>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><Lb id={idp + "z"}>Zon JAKIM</Lb><select id={idp + "z"} className="inp" value={list.some((z) => z[0] === zone) ? zone : ""} onChange={(e) => onChange(e.target.value)}>{!list.some((z) => z[0] === zone) && <option value="">Pilih zon</option>}{list.map((z) => <option key={z[0]} value={z[0]}>{z[0]}</option>)}</select></div>
      </div>
      {cur && <p className="mt-2 rounded-xl bg-muted p-3 text-sm"><b>Daerah dalam zon {cur[0]}:</b> {cur[2]}</p>}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
type Data = Record<string, Record<string, string[]>>;
let cache: Data | null = null;
/** Negeri → Bandar → Poskod (pilihan sahaja, tiada taip). Data: github.com/AsyrafHussin/malaysia-postcodes (MIT), berdasarkan Pos Malaysia. */
export default function AddressPicker({ state, city, postcode, onChange, idp = "ad" }: { state: string; city: string; postcode: string; onChange: (v: { state: string; city: string; postcode: string }) => void; idp?: string }) {
  const [d, setD] = useState<Data | null>(cache);
  useEffect(() => { if (cache) return; fetch("/data/postcodes.json").then((r) => r.json()).then((j: Data) => { cache = j; setD(j); }).catch(() => {}); }, []);
  const states = d ? Object.keys(d) : [];
  const cities = d && d[state] ? Object.keys(d[state]) : [];
  const codes = d && d[state] && d[state][city] ? d[state][city] : [];
  const Lb = ({ id, children }: { id: string; children: React.ReactNode }) => <label htmlFor={id} className="lbl">{children}</label>;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div><Lb id={idp + "s"}>Negeri</Lb><select id={idp + "s"} className="inp" value={state} onChange={(e) => onChange({ state: e.target.value, city: "", postcode: "" })}><option value="">Pilih negeri</option>{states.map((s) => <option key={s}>{s}</option>)}{state && !states.includes(state) && <option>{state}</option>}</select></div>
      <div><Lb id={idp + "c"}>Bandar</Lb><select id={idp + "c"} className="inp" value={city} disabled={!state} onChange={(e) => onChange({ state, city: e.target.value, postcode: "" })}><option value="">{state ? "Pilih bandar" : "Pilih negeri dahulu"}</option>{cities.map((c) => <option key={c}>{c}</option>)}{city && !cities.includes(city) && <option>{city}</option>}</select></div>
      <div><Lb id={idp + "p"}>Poskod</Lb><select id={idp + "p"} className="inp" value={postcode} disabled={!city} onChange={(e) => onChange({ state, city, postcode: e.target.value })}><option value="">{city ? "Pilih poskod" : "Pilih bandar dahulu"}</option>{codes.map((p) => <option key={p}>{p}</option>)}{postcode && !codes.includes(postcode) && <option>{postcode}</option>}</select></div>
    </div>);
}

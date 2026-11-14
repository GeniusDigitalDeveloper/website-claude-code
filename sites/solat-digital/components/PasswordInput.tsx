"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Medan kata laluan dengan ikon mata (tunjuk/sembunyi). */
export default function PasswordInput({ id, value, onChange, autoComplete, minLength, required = true }: { id: string; value: string; onChange: (v: string) => void; autoComplete?: string; minLength?: number; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} className="inp !pr-12" type={show ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} required={required} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="eye" aria-label={show ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
        <Eye size={20} className="eye-ico" data-on={!show} aria-hidden="true" /><EyeOff size={20} className="eye-ico" data-on={show} aria-hidden="true" />
      </button>
    </div>
  );
}

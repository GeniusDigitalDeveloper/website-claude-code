"use client";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cx, inputCls } from "../ui";

export function PasswordInput({ value, onChange, autoComplete, required, id, placeholder }: { value: string; onChange: (v: string) => void; autoComplete: string; required?: boolean; id?: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required={required} placeholder={placeholder} className={cx(inputCls, "pr-11")} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sorok kata laluan" : "Tunjuk kata laluan"} aria-pressed={show} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:text-fg">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function scorePassword(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, p.length < 8 ? Math.min(s, 1) : s);
}

export function StrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const s = scorePassword(value);
  const label = ["Terlalu lemah", "Lemah", "Sederhana", "Kuat", "Sangat kuat"][s];
  const color = ["bg-rose-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-400"][s];
  return (
    <div aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx("h-1.5 flex-1 rounded-full", i < Math.max(1, s) ? color : "bg-line")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        Kekuatan: <b className="text-fg">{label}</b>
        {value.length < 8 && " · minimum 8 aksara"}
      </p>
    </div>
  );
}

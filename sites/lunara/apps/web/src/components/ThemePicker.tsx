"use client";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { useSettings } from "@/store/settings";
import { cx } from "./ui";

/** Mode (Cerah / Night / Sistem) + colour theme swatches. Every colour theme is light; Night keeps the hue with white text. */
export function ThemePicker() {
  const mode = useSettings((s) => s.theme);
  const current = useSettings((s) => s.colorTheme);
  const set = useSettings((s) => s.set);
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Mod paparan" className="flex flex-wrap gap-2">
        {(
          [
            ["light", "Cerah", Sun],
            ["night", "Night mode", Moon],
            ["system", "Ikut sistem", Monitor],
          ] as const
        ).map(([v, l, I]) => (
          <button key={v} role="radio" aria-checked={mode === v} onClick={() => set({ theme: v })} className={cx("flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition", mode === v ? "btn-white font-bold ring-transparent" : "chip-glass ring-transparent")}>
            <I className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Tema warna" className="grid grid-cols-5 gap-3 sm:grid-cols-10">
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={current === t.id} aria-label={`Tema ${t.name}`} onClick={() => set({ colorTheme: t.id })} className="group flex cursor-pointer flex-col items-center gap-1.5">
            <span className={cx("relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl shadow-md ring-2 transition", current === t.id ? "ring-fg" : "ring-transparent group-hover:ring-line")} style={{ background: `linear-gradient(135deg, hsl(${t.hue} ${t.sat}% 94%), hsl(${t.hue} ${t.sat}% 86%))` }}>
              <span className="h-6 w-6 rounded-full shadow" style={{ background: `linear-gradient(135deg, ${t.acc[0]}, ${t.acc[2]})` }} />
              {current === t.id && <Check className="absolute h-4 w-4 text-white drop-shadow" />}
            </span>
            <span className={cx("text-[11px]", current === t.id ? "font-bold text-fg" : "font-medium text-muted")}>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

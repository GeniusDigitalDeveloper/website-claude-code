"use client";
import { Check, Languages } from "lucide-react";
import { useSettings } from "@/store/settings";
import { cx } from "./ui";

const OPTIONS = [
  { value: "en", code: "EN", label: "English", note: "Default" },
  { value: "ms", code: "BM", label: "Bahasa Melayu", note: "Malaysia" },
] as const;

/** BI/BM switch. Saved in settings (synced to the account), so it survives sign-out/sign-in. */
export function LanguagePicker({ compact }: { compact?: boolean }) {
  const lang = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center gap-2">
          <span className="grad-bg grid h-8 w-8 place-items-center rounded-lg text-white">
            <Languages className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Bahasa / Language</p>
            <p className="text-xs text-muted">Pilih bahasa aplikasi. Pilihan anda disimpan pada akaun dan kekal selepas log keluar/masuk.</p>
          </div>
        </div>
      )}
      <div role="radiogroup" aria-label="Bahasa" className="grid grid-cols-2 gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={lang === o.value}
            onClick={() => set({ language: o.value, languageChosen: true })}
            translate="no"
            className={cx("relative flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition", lang === o.value ? "btn-white" : "chip-glass hover:bg-card-hover")}
          >
            <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold", lang === o.value ? "btn-luxe" : "chip-glass text-fg")}>{o.code}</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{o.label}</span>
              <span className="block text-xs text-muted">{o.note}</span>
            </span>
            {lang === o.value && <Check className="absolute top-2 right-2 h-4 w-4 text-acc" />}
          </button>
        ))}
      </div>
    </div>
  );
}

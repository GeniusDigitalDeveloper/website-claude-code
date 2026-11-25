"use client";
import { ChevronLeft, ChevronRight, Disc3, HardDrive, Loader2, Radio, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Track } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
export function fmtLong(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} j ${m} min` : `${m} min`;
}

export function Artwork({ src, alt, className, rounded = "rounded-[calc(var(--radius)*0.6)]", icon }: { src?: string; alt: string; className?: string; rounded?: string; icon?: ReactNode }) {
  const [err, setErr] = useState(false);
  return (
    <div className={cx("relative overflow-hidden bg-card shrink-0", rounded, className)}>
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="grad-bg grid h-full w-full place-items-center text-white/90">{icon ?? <Disc3 className="h-1/3 w-1/3" aria-hidden />}</div>
      )}
    </div>
  );
}

/** Every track shows where it comes from and what playback the provider allows. */
export function SourceBadge({ t, className }: { t: Track; className?: string }) {
  const base = "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1";
  if (t.source === "local")
    return (
      <span className={cx(base, "text-emerald-700 ring-emerald-600/30 dark:text-emerald-300 dark:ring-emerald-400/30", className)} title="Fail muzik pada peranti ini">
        <HardDrive className="h-3 w-3" aria-hidden /> Peranti
      </span>
    );
  if (t.source === "imported")
    return (
      <span className={cx(base, "text-sky-700 ring-sky-600/30 dark:text-sky-300 dark:ring-sky-400/30", className)} title="Diimport oleh anda">
        <Upload className="h-3 w-3" aria-hidden /> Import
      </span>
    );
  if (!t.playable)
    return (
      <span className={cx(base, "text-faint ring-line", className)} title="Pembekal tidak membenarkan main balik di rantau ini">
        Tidak tersedia
      </span>
    );
  return (
    <span className={cx(base, "text-acc ring-[color:var(--acc-via)]/30", className)} title="Penstriman berlesen Deezer: pratonton 30 saat">
      <Radio className="h-3 w-3" aria-hidden /> Pratonton 30s
    </span>
  );
}

export function IconBtn({ label, onClick, children, className, active, size = "md", disabled }: { label: string; onClick?: (e: React.MouseEvent) => void; children: ReactNode; className?: string; active?: boolean; size?: "sm" | "md" | "lg"; disabled?: boolean }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx("grid cursor-pointer place-items-center rounded-full transition-colors duration-200 hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-40", s, active ? "text-acc" : "text-fg", className)}
    >
      {children}
    </button>
  );
}

export function Btn({ children, onClick, variant = "primary", className, type = "button", disabled, href }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "soft" | "danger"; className?: string; type?: "button" | "submit"; disabled?: boolean; href?: string }) {
  const v = {
    primary: "grad-bg text-white shadow-[0_8px_24px_-10px_var(--acc-via)] hover:brightness-110",
    ghost: "ring-1 ring-line hover:bg-card-hover text-fg",
    soft: "bg-card hover:bg-card-hover text-fg",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
  }[variant];
  const cls = cx("inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50", v, className);
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("animate-spin", className ?? "h-5 w-5")} aria-label="Memuatkan" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-card", className)} />;
}

export function SectionHead({ title, href, action, sub }: { title: string; href?: string; action?: ReactNode; sub?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href && (
          <Link href={href} className="rounded-full px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line transition hover:text-fg">
            Lihat semua
          </Link>
        )}
      </div>
    </div>
  );
}

export function HScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: true });
  const update = () => {
    const el = ref.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(update, [children]);
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="group/h relative">
      <div ref={ref} onScroll={update} className={cx("no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:gap-4", className)}>
        {children}
      </div>
      {edge.l && (
        <button aria-label="Tatal kiri" onClick={() => by(-1)} className="glass absolute top-1/3 left-0 hidden h-9 w-9 -translate-x-1/3 cursor-pointer place-items-center rounded-full shadow-lg ring-1 ring-line md:grid md:opacity-0 md:group-hover/h:opacity-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {edge.r && (
        <button aria-label="Tatal kanan" onClick={() => by(1)} className="glass absolute top-1/3 right-0 hidden h-9 w-9 translate-x-1/3 cursor-pointer place-items-center rounded-full shadow-lg ring-1 ring-line md:grid md:opacity-0 md:group-hover/h:opacity-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="grad-bg grid h-12 w-12 place-items-center rounded-2xl text-white">{icon}</div>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-end bg-black/55 p-0 sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className={cx("panel thin-scroll max-h-[92dvh] w-full overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-b-[var(--radius)]", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold">{title}</h2>
              <IconBtn label="Tutup" onClick={onClose} size="sm">
                <X className="h-4 w-4" />
              </IconBtn>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Switch({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) {
  return (
    <label className={cx("flex cursor-pointer items-center justify-between gap-4 py-3", disabled && "cursor-not-allowed opacity-55")}>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-muted">{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200", checked ? "grad-bg" : "bg-card-hover ring-1 ring-line")}
      >
        <span className={cx("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200", checked && "translate-x-5")} />
      </button>
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-card p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx("cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition", o.value === value ? "grad-bg text-white shadow" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-xl bg-card px-3.5 py-2.5 text-sm text-fg ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-[color:var(--acc-via)] transition";

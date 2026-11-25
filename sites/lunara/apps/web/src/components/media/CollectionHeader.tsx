"use client";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Artwork } from "../ui";

export function CollectionHeader({ cover, kicker, title, meta, children, round }: { cover?: string; kicker: string; title: string; meta: ReactNode; children?: ReactNode; round?: boolean }) {
  return (
    <div className="relative isolate overflow-hidden px-4 pt-8 pb-6 md:px-8 md:pt-12">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-40 blur-3xl" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-[color:var(--bg)]" />
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 20 }}>
          <Artwork src={cover} alt={title} className="h-48 w-48 shadow-2xl md:h-56 md:w-56" rounded={round ? "rounded-full" : "rounded-[var(--radius)]"} />
        </motion.div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">{kicker}</p>
          <h1 translate="no" className="mt-1 font-display text-3xl leading-tight font-extrabold tracking-tight break-words md:text-5xl">{title}</h1>
          <div className="mt-3 text-sm text-muted">{meta}</div>
        </div>
      </div>
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:justify-start">{children}</div>}
    </div>
  );
}

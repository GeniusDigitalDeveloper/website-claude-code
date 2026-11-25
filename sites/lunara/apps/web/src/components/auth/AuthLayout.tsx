"use client";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import { Mark, Wordmark } from "../shell/Logo";

export function AuthLayout({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="aurora" aria-hidden style={{ top: "10%" }}>
        <span className="top-0 left-[10%] h-80 w-80" style={{ background: "var(--acc-from)" }} />
        <span className="top-20 right-[10%] h-96 w-96" style={{ background: "var(--acc-to)", animationDelay: "-8s" }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="panel glass relative w-full max-w-md p-7 shadow-2xl">
        <Link href="/" className="mx-auto flex w-fit flex-col items-center gap-2" aria-label="LUNARA MUSIC laman utama">
          <Mark size={64} />
          <Wordmark big className="items-center" />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-center text-sm text-muted">{sub}</p>
        {!firebaseEnabled && (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300">
            Firebase belum disambungkan pada pelayan ini. Borang dipaparkan tetapi log masuk belum aktif. Anda masih boleh guna LUNARA MUSIC dalam mod peranti.
          </p>
        )}
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}

export function GoogleButton({ onClick, busy, label = "Teruskan dengan Google" }: { onClick: () => void; busy?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f1f1f] shadow ring-1 ring-black/10 transition hover:bg-gray-50 disabled:opacity-60">
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {label}
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-faint">
      <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
      {msg}
    </p>
  );
}

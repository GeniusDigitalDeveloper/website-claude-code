"use client";
import { ChevronsLeft, ChevronsRight, Cloud, CloudOff, LogIn, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ACCENTS, useLayout } from "@/store/layout";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useLocalProfile } from "@/store/profile";
import { useLibrary } from "@/store/library";
import { usePlayer, wirePlayer } from "@/store/player";
import { useToasts } from "@/store/toast";
import { onSyncStatus, startSync, stopSync, type SyncStatus } from "@/lib/sync";
import { FullPlayer, PlayerBar } from "../music/Player";
import { QueueDrawer } from "../music/Queue";
import { cx, IconBtn } from "../ui";
import { Logo } from "./Logo";
import { ADMIN, NAV, NAV_2 } from "./nav";
import { RightPanel } from "./RightPanel";
import { AnimatePresence, motion } from "motion/react";

function useApplyTheme() {
  const theme = useSettings((s) => s.theme);
  const accent = useLayout((s) => s.accent);
  const radius = useLayout((s) => s.radius);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => (document.documentElement.dataset.theme = theme === "dark" || (theme === "system" && mq.matches) ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    const a = ACCENTS[accent] ?? ACCENTS.aurora;
    const r = document.documentElement.style;
    r.setProperty("--acc-from", a.from);
    r.setProperty("--acc-via", a.via);
    r.setProperty("--acc-to", a.to);
    r.setProperty("--radius", `${radius}px`);
  }, [accent, radius]);
}

function NavLink({ href, label, Icon, collapsed, active }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }>; collapsed?: boolean; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={cx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors", active ? "bg-card text-fg" : "text-muted hover:bg-card hover:text-fg", collapsed && "justify-center px-0")}>
      <span className={cx("grid h-5 w-5 place-items-center", active && "text-acc")}>
        <Icon className="h-5 w-5" />
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SyncPill() {
  const user = useAuth((s) => s.user);
  const [st, setSt] = useState<SyncStatus>("off");
  useEffect(() => void onSyncStatus(setSt), []);
  if (!user)
    return (
      <Link href="/login" aria-label="Log masuk" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ring-1 ring-line hover:bg-card">
        <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Log masuk</span>
      </Link>
    );
  const label = { off: "Sync off", syncing: "Menyegerak…", synced: "Disegerak", offline: "Luar talian", error: "Ralat sync" }[st];
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-line" title="Penyegerakan antara peranti">
      {st === "offline" || st === "error" ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />} {label}
    </span>
  );
}

function Avatar() {
  const profile = useAuth((s) => s.profile);
  const localAvatar = useLocalProfile((s) => s.avatar);
  const localName = useLocalProfile((s) => s.name);
  const photo = profile ? profile.photoURL : localAvatar;
  return (
    <Link href="/profile" aria-label="Profil" className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-card ring-2 ring-line">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grad-bg grid h-full w-full place-items-center text-sm font-bold text-white">{(profile?.displayName || localName || "A")[0]?.toUpperCase()}</span>
      )}
    </Link>
  );
}

function TopSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={cx("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-faint" />
      <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => router.prefetch("/search")} placeholder="Cari artis, lagu atau album" aria-label="Cari muzik" className="w-full rounded-full bg-card py-2.5 pr-4 pl-10 text-sm ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-[color:var(--acc-via)]" />
    </form>
  );
}

function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[150px] z-[95] flex flex-col items-center gap-2 px-4 md:bottom-28">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} className="glass max-w-md rounded-full px-4 py-2 text-center text-sm font-medium shadow-xl ring-1 ring-line">
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const preset = useLayout((s) => s.preset);
  const side = useLayout((s) => s.sidebarSide);
  const collapsed = useLayout((s) => s.sidebarCollapsed);
  const rightPanel = useLayout((s) => s.showRightPanel);
  const hasTrack = usePlayer((s) => s.queue.length > 0);
  const user = useAuth((s) => s.user);
  const isAdmin = useAuth((s) => s.profile?.isAdmin);
  useApplyTheme();

  useEffect(() => {
    // Restore persisted stores after hydration so server and first client render match.
    void useLibrary.persist.rehydrate();
    void useLocalProfile.persist.rehydrate();
    void Promise.all([useSettings.persist.rehydrate(), useLayout.persist.rehydrate(), usePlayer.persist.rehydrate()]).then(() => {
      wirePlayer();
      useAuth.getState().init();
    });
  }, []);
  useEffect(() => {
    if (user) startSync(user.uid);
    else stopSync();
  }, [user]);

  const bare = path === "/tv" || path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/forgot-password") || path.startsWith("/reset-password");
  const isActive = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const links = [...NAV, ...NAV_2, ...(isAdmin ? [ADMIN] : [])];

  if (bare)
    return (
      <>
        {children}
        <FullPlayer />
        <Toaster />
      </>
    );

  const top = preset === "cinematic" || preset === "compact";
  const rail = preset === "bento";

  const sidebar = !top && (
    <aside aria-label="Navigasi utama" className={cx("sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 py-4 md:flex", rail ? "w-[76px] items-center px-2" : collapsed ? "w-[84px] px-3" : "w-[248px] px-3", side === "right" && "order-last")}>
      <div className={cx("mb-4 flex items-center", rail || collapsed ? "justify-center" : "justify-between px-2")}>
        <Logo compact={rail || collapsed} size={rail || collapsed ? 26 : 30} />
        {!rail && !collapsed && (
          <IconBtn label="Kecilkan sidebar" size="sm" onClick={() => useLayout.getState().set({ sidebarCollapsed: true })}>
            {side === "left" ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </IconBtn>
        )}
      </div>
      {!rail && collapsed && (
        <IconBtn label="Besarkan sidebar" size="sm" className="mx-auto mb-2" onClick={() => useLayout.getState().set({ sidebarCollapsed: false })}>
          {side === "left" ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </IconBtn>
      )}
      <nav className={cx("flex flex-col gap-1", rail && "panel w-full items-center py-2")}>
        {NAV.map((n) => (
          <NavLink key={n.href} href={n.href} label={n.label} Icon={n.icon} collapsed={rail || collapsed} active={isActive(n.href)} />
        ))}
      </nav>
      <div className={cx("my-2 h-px bg-line", rail ? "w-8" : "w-full")} />
      <nav className={cx("flex flex-col gap-1", rail && "panel w-full items-center py-2")}>
        {[...NAV_2, ...(isAdmin ? [ADMIN] : [])].map((n) => (
          <NavLink key={n.href} href={n.href} label={n.label} Icon={n.icon} collapsed={rail || collapsed} active={isActive(n.href)} />
        ))}
      </nav>
      {!rail && !collapsed && (
        <div className="mt-auto px-2">
          <p className="text-[11px] leading-relaxed text-faint">Tanpa iklan. Selamanya.</p>
          <p className="grad-text font-display text-xs font-bold">Your Music. Your Universe.</p>
        </div>
      )}
    </aside>
  );

  return (
    <div className={cx("relative min-h-dvh", preset === "bento" && "md:p-3")}>
      <div className={cx("flex min-h-dvh", preset === "bento" && "gap-3")}>
        {sidebar}
        <div className={cx("flex min-w-0 flex-1 flex-col", preset === "bento" && "md:gap-3")}>
          {/* top bar */}
          <header className={cx("glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 py-3 md:px-6", preset === "bento" && "md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none")}>
            <div className="md:hidden">
              <Logo size={26} />
            </div>
            {top && (
              <div className="hidden items-center gap-4 md:flex xl:gap-6">
                <Logo size={28} />
                <nav aria-label="Navigasi utama" className="hidden items-center gap-0.5 lg:flex">
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={cx("rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition xl:px-3.5", isActive(n.href) ? "bg-fg text-bg" : "text-muted hover:text-fg")}>
                      {n.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
            <TopSearch className={cx("hidden flex-1 md:block", top ? "min-w-[160px] max-w-xs" : "max-w-md")} />
            <div className="ml-auto flex items-center gap-2">
              {top && (
                <Link href="/studio" className="hidden rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted hover:text-fg xl:block">
                  Layout Studio
                </Link>
              )}
              <SyncPill />
              <Avatar />
            </div>
          </header>
          <div className="flex min-w-0 flex-1 gap-3">
            <main id="main" className={cx("relative min-w-0 flex-1 overflow-x-clip", preset === "bento" && "md:panel md:overflow-hidden", hasTrack ? "pb-44 md:pb-28" : "pb-24 md:pb-8")}>
              {children}
            </main>
            {preset === "bento" && rightPanel && <RightPanel />}
          </div>
        </div>
      </div>
      {/* mobile bottom navigation */}
      <nav aria-label="Navigasi bawah" className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.filter((n) => "mobile" in n && n.mobile).map((n) => (
          <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined} className={cx("flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold", isActive(n.href) ? "text-acc" : "text-muted")}>
            <n.icon className="h-5 w-5" />
            <span className="truncate">{n.label}</span>
          </Link>
        ))}
      </nav>
      <PlayerBar />
      <QueueDrawer />
      <FullPlayer />
      <Toaster />
    </div>
  );
}

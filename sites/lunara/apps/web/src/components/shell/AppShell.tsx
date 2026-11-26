"use client";
import { MusicBackdrop } from "@/components/fx/MusicBackdrop";
import { ChevronsLeft, ChevronsRight, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useLayout } from "@/store/layout";
import { getTheme, themeVars } from "@/lib/themes";
import { useSettings } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useLocalProfile } from "@/store/profile";
import { useLibrary } from "@/store/library";
import { setLang } from "@/i18n";
import { usePlayer, wirePlayer } from "@/store/player";
import { useToasts } from "@/store/toast";
import { startSync, stopSync } from "@/lib/sync";
import { FullPlayer, PlayerBar } from "../music/Player";
import { QueueDrawer } from "../music/Queue";
import { YouTubeHost } from "../music/YouTubeHost";
import { cx, IconBtn } from "../ui";
import { Logo } from "./Logo";
import { TopSearch } from "./TopSearch";
import { BackButton, useNavDepth } from "./BackButton";
import { WaterRipple } from "../fx/WaterRipple";
import { AutoUpdate } from "../fx/AutoUpdate";
import { ADMIN, NAV, NAV_2 } from "./nav";
import { RightPanel } from "./RightPanel";
import { AnimatePresence, motion } from "motion/react";

function useApplyTheme() {
  const theme = useSettings((s) => s.theme);
  const colorTheme = useSettings((s) => s.colorTheme);
  const radius = useLayout((s) => s.radius);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const night = theme === "night" || (theme === "system" && mq.matches);
      const root = document.documentElement;
      root.dataset.theme = night ? "dark" : "light";
      for (const [k, v] of Object.entries(
        themeVars(getTheme(colorTheme), night),
      ))
        root.style.setProperty(k, v);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          getComputedStyle(root).getPropertyValue("--bg"),
        );
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, colorTheme]);
  useEffect(() => {
    document.documentElement.style.setProperty("--radius", `${radius}px`);
  }, [radius]);
}

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  collapsed?: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cx(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "btn-white" : "text-muted hover:bg-card hover:text-fg",
        collapsed && "justify-center px-0",
      )}
    >
      <span
        className={cx("grid h-5 w-5 place-items-center", active && "text-acc")}
      >
        <Icon className="h-5 w-5" />
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

/** Signed-out users get a Sign in shortcut. No online/offline/sync status is shown. */
function SyncPill() {
  const user = useAuth((s) => s.user);
  if (user) return null;
  return (
    <Link
      href="/login"
      aria-label="Log masuk"
      className="chip-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
    >
      <LogIn className="h-3.5 w-3.5" />{" "}
      <span className="hidden sm:inline">Log masuk</span>
    </Link>
  );
}

function Avatar() {
  const profile = useAuth((s) => s.profile);
  const localAvatar = useLocalProfile((s) => s.avatar);
  const localName = useLocalProfile((s) => s.name);
  const photo = profile ? profile.photoURL : localAvatar;
  return (
    <Link
      href="/profile"
      aria-label="Profil"
      className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-card ring-2 ring-line"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grad-bg grid h-full w-full place-items-center text-sm font-bold text-white">
          {(profile?.displayName || localName || "A")[0]?.toUpperCase()}
        </span>
      )}
    </Link>
  );
}

function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[150px] z-[95] flex flex-col items-center gap-2 px-4 md:bottom-28"
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="glass max-w-md rounded-full px-4 py-2 text-center text-sm font-medium shadow-xl ring-1 ring-line"
          >
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
  useNavDepth();
  const language = useSettings((s) => s.language);
  useEffect(() => {
    if (useSettings.persist.hasHydrated()) setLang(language);
  }, [language]);

  useEffect(() => {
    // Restore persisted stores after hydration so server and first client render match.
    void useLibrary.persist.rehydrate();
    void useLocalProfile.persist.rehydrate();
    void Promise.all([
      useSettings.persist.rehydrate(),
      useLayout.persist.rehydrate(),
      Promise.resolve(usePlayer.persist.rehydrate()).then(() => {
        // old Deezer songs in the saved queue are dropped (YouTube only now)
        const p = usePlayer.getState();
        if (p.queue.some((t) => t.id.startsWith("dz:"))) {
          const cur = p.queue[p.index];
          const q = p.queue.filter((t) => !t.id.startsWith("dz:"));
          usePlayer.setState({ queue: q, index: Math.max(0, cur ? q.findIndex((t) => t.id === cur.id) : 0) });
        }
      }),
    ]).then(() => {
      wirePlayer();
      useAuth.getState().init();
      setLang(useSettings.getState().language);
    });
  }, []);
  useEffect(() => {
    if (user) startSync(user.uid);
    else stopSync();
  }, [user]);

  const bare =
    path === "/tv" ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password");
  const isActive = (h: string) =>
    h === "/" ? path === "/" : path.startsWith(h);
  const links = [...NAV, ...NAV_2, ...(isAdmin ? [ADMIN] : [])];

  const top = preset === "cinematic" || preset === "compact";
  const rail = preset === "bento";

  const sidebar = !top && (
    <aside
      aria-label="Navigasi utama"
      className={cx(
        "sticky hidden shrink-0 flex-col gap-1 md:flex",
        rail
          ? "top-3 h-[calc(100dvh-24px)] w-[76px] items-center"
          : collapsed
            ? "top-0 h-dvh w-[84px] px-3 py-3"
            : "top-0 h-dvh w-[248px] px-3 py-3",
        side === "right" && "order-last",
      )}
    >
      {/* same height as the top bar (h-14) so the nav panel lines up with the main panel */}
      <div
        className={cx(
          "mb-2 flex h-14 shrink-0 items-center",
          rail || collapsed ? "justify-center" : "justify-between px-2",
        )}
      >
        <Logo compact={rail || collapsed} size={rail || collapsed ? 46 : 44} />
        {!rail && !collapsed && (
          <IconBtn
            label="Kecilkan sidebar"
            size="sm"
            onClick={() => useLayout.getState().set({ sidebarCollapsed: true })}
          >
            {side === "left" ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </IconBtn>
        )}
      </div>
      {!rail && collapsed && (
        <IconBtn
          label="Besarkan sidebar"
          size="sm"
          className="mx-auto mb-2"
          onClick={() => useLayout.getState().set({ sidebarCollapsed: false })}
        >
          {side === "left" ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </IconBtn>
      )}
      <nav
        className={cx(
          "flex flex-col gap-1",
          rail && "panel w-full items-center px-1.5 py-2",
        )}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.href}
            href={n.href}
            label={n.label}
            Icon={n.icon}
            collapsed={rail || collapsed}
            active={isActive(n.href)}
          />
        ))}
      </nav>
      <div className={cx("my-2 h-px bg-line", rail ? "w-8" : "w-full")} />
      <nav
        className={cx(
          "flex flex-col gap-1",
          rail && "panel w-full items-center px-1.5 py-2",
        )}
      >
        {[...NAV_2, ...(isAdmin ? [ADMIN] : [])].map((n) => (
          <NavLink
            key={n.href}
            href={n.href}
            label={n.label}
            Icon={n.icon}
            collapsed={rail || collapsed}
            active={isActive(n.href)}
          />
        ))}
      </nav>
      {!rail && !collapsed && (
        <div className="mt-auto px-2">
          <p className="text-[11px] leading-relaxed text-faint">
            Tanpa iklan. Selamanya.
          </p>
          <p className="grad-text font-display text-xs font-bold">
            Your Music. Your Universe.
          </p>
        </div>
      )}
    </aside>
  );

  // The persistent pieces (players, video, bars) are rendered in the SAME place for every page,
  // so navigating anywhere (TV mode and sign-in pages included) never re-creates them: music keeps playing.
  const persistent = (
    <>
      <MusicBackdrop className="fixed inset-0 z-0" />
      <div className="bg-orbs" aria-hidden>
        <span
          style={{
            width: 520,
            height: 520,
            left: "-8%",
            top: "-10%",
            background: "var(--orb-a)",
          }}
        />
        <span
          style={{
            width: 620,
            height: 620,
            right: "-12%",
            bottom: "-18%",
            background: "var(--orb-b)",
            animationDelay: "-9s",
          }}
        />
        <span
          style={{
            width: 380,
            height: 380,
            left: "38%",
            top: "35%",
            background: "var(--orb-b)",
            opacity: 0.3,
            animationDelay: "-17s",
          }}
        />
      </div>
      <YouTubeHost />
      <PlayerBar />
      <QueueDrawer />
      <FullPlayer />
      <Toaster />
      <WaterRipple />
      <AutoUpdate />
    </>
  );

  return (
    <>
      {bare ? (
        <div key="page" className="relative z-[1]">{children}</div>
      ) : (
        <div
          key="page"
          className={cx("relative z-[1] min-h-dvh", preset === "bento" && "md:p-3")}
        >
          <div className={cx("flex min-h-dvh", preset === "bento" && "gap-3")}>
            {sidebar}
            <div
              className={cx(
                "flex min-w-0 flex-1 flex-col",
                preset === "bento" && "md:gap-3",
              )}
            >
              {/* top bar: logo/nav left · the ONE search box centred · account right */}
              <header
                className={cx(
                  "glass sticky top-0 z-30 border-b border-line px-3 py-2.5 md:px-6 md:py-3",
                  preset === "bento" &&
                    "md:static md:flex md:h-14 md:flex-col md:justify-center md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none",
                )}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[1fr_minmax(0,520px)_1fr] md:gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="md:hidden">
                      <Logo size={40} compact />
                    </div>
                    {top && (
                      <div className="hidden md:block">
                        <Logo size={42} />
                      </div>
                    )}
                    <BackButton />
                  </div>
                  <TopSearch className="w-full" />
                  <div className="flex items-center justify-end gap-2">
                    {top && (
                      <Link
                        href="/studio"
                        className="hidden rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted hover:text-fg xl:block"
                      >
                        Layout Studio
                      </Link>
                    )}
                    <span className="hidden sm:block">
                      <SyncPill />
                    </span>
                    <Avatar />
                  </div>
                </div>
                {top && (
                  <nav
                    aria-label="Navigasi utama"
                    className="no-scrollbar mt-2.5 hidden items-center gap-1 overflow-x-auto md:flex"
                  >
                    {NAV.map((n) => (
                      <Link
                        key={n.href}
                        href={n.href}
                        aria-current={isActive(n.href) ? "page" : undefined}
                        className={cx(
                          "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition",
                          isActive(n.href)
                            ? "btn-white"
                            : "text-muted hover:bg-card hover:text-fg",
                        )}
                      >
                        <n.icon className="h-4 w-4" />
                        {n.label}
                      </Link>
                    ))}
                  </nav>
                )}
              </header>
              <div className="flex min-w-0 flex-1 gap-3">
                <main
                  id="main"
                  className={cx(
                    "relative min-w-0 flex-1 overflow-x-clip",
                    preset === "bento" && "md:panel md:overflow-hidden",
                    hasTrack ? "pb-44 md:pb-28" : "pb-24 md:pb-8",
                  )}
                >
                  {/* music animation inside the glass panel too, pinned to the visible area while scrolling */}
                  <div aria-hidden className="pointer-events-none sticky top-0 z-0 -mb-[100dvh] h-[100dvh] overflow-hidden">
                    <MusicBackdrop />
                  </div>
                  <div className="relative z-[1]">{children}</div>
                </main>
                {preset === "bento" && rightPanel && <RightPanel />}
              </div>
            </div>
          </div>
          {/* mobile bottom navigation */}
          <nav
            aria-label="Navigasi bawah"
            style={{ backgroundColor: "var(--panel-strong)" }}
            className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
          >
            {links
              .filter((n) => "mobile" in n && n.mobile)
              .map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cx(
                    "flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                    isActive(n.href) ? "text-acc" : "text-muted",
                  )}
                >
                  <n.icon className="h-5 w-5" />
                  <span className="truncate">{n.label}</span>
                </Link>
              ))}
          </nav>
        </div>
      )}
      {persistent}
    </>
  );
}

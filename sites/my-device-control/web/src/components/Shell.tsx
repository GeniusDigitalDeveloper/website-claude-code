'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, MonitorSmartphone, Layers, AppWindow, Globe, Eye, Terminal, ScrollText, Users, Settings, Menu, LogOut, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Loading } from './ui';
import { ROLE_LABEL } from '@/lib/types';
import { OnboardingGate } from './Onboarding';

const NAV = [
  { href: '/dashboard/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/devices/', label: 'All Devices', icon: MonitorSmartphone },
  { href: '/groups/', label: 'Device Groups', icon: Layers },
  { href: '/apps/', label: 'App Management', icon: AppWindow },
  { href: '/web-filtering/', label: 'Web Filtering', icon: Globe },
  { href: '/monitoring/', label: 'Live Monitoring', icon: Eye },
  { href: '/commands/', label: 'Device Commands', icon: Terminal },
  { href: '/logs/', label: 'Activity Logs', icon: ScrollText },
  { href: '/users/', label: 'Users & Roles', icon: Users },
  { href: '/settings/', label: 'Settings', icon: Settings },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, loading, orgId, role, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace('/login/'); }, [loading, user, router]);
  useEffect(() => setOpen(false), [path]);

  if (loading || !user) return <Loading />;
  if (!orgId || !role) return <OnboardingGate />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Langkau ke kandungan</a>
      <aside className={`fixed inset-y-0 left-0 z-30 w-[250px] border-r border-line bg-white p-3 transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Navigasi utama">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white"><ShieldCheck className="h-5 w-5" /></span>
          <span className="text-sm font-extrabold leading-tight">MY DEVICE<br />CONTROL</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || path === href.slice(0, -1);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 text-sm font-semibold ${active ? 'bg-primary text-white' : 'text-slate-700 hover:bg-muted'}`}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-3 border-t border-line pt-3">
          <p className="truncate px-2 text-xs font-semibold">{user.email ?? user.displayName ?? user.uid}</p>
          <p className="px-2 pb-2 text-xs text-mutedfg">{ROLE_LABEL[role]}</p>
          <button className="btn-ghost w-full" onClick={() => void logout()}><LogOut className="h-4 w-4" />Log keluar</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
          <button className="btn-ghost !px-2" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="text-sm font-extrabold">MY DEVICE CONTROL</span>
        </header>
        <main id="main" className="mx-auto max-w-7xl p-4 lg:p-8">
          <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            Peranti dalam organisasi ini diurus dan dipantau oleh pentadbir. Hanya data pengurusan yang dibenarkan dikumpul; mesej peribadi, kata laluan dan ketukan kekunci tidak dikumpul.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}

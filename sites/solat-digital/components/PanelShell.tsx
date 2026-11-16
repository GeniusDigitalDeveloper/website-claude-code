"use client";
import { useState, type ReactNode } from "react";
import { LogOut, X } from "lucide-react";
export type PItem = { id: string; label: string; icon: ReactNode; badge?: number };
export type PGroup = { title: string; items: PItem[] };
/** Susun atur panel: bar sisi berkumpulan (UTAMA / KANDUNGAN PAPARAN / KONFIGURASI / PENTADBIRAN), bar atas dan kandungan. */
export default function PanelShell({ groups, active, onSelect, user, onLogout, right, title, children, tag }: { groups: PGroup[]; active: string; onSelect: (id: string) => void; user: { name: string; email: string }; onLogout: () => void; right?: ReactNode; title: string; children: ReactNode; tag?: string }) {
  const [open, setOpen] = useState(false);
  const ini = (user.name || user.email || "?").trim().slice(0, 2).toUpperCase();
  const side = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-4"><img src="/logo.png" alt="" className="h-10 w-auto" /><div className="min-w-0"><b className="block truncate text-base leading-tight">Solat Digital</b><span className="block truncate text-xs text-sub">{tag ?? user.email}</span></div></div>
      <nav aria-label="Menu" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((g) => (<div key={g.title} className="mt-3"><p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-sub">{g.title}</p>
          {g.items.map((it) => (<button key={it.id} type="button" className="nav-item w-full" data-active={active === it.id} aria-current={active === it.id ? "page" : undefined} onClick={() => { onSelect(it.id); setOpen(false); }}>
            <span className="nav-ico">{it.icon}</span><span className="text-left">{it.label}</span>{!!it.badge && <span className="nav-badge" aria-label={`${it.badge} belum dibaca`}>{it.badge > 99 ? "99+" : it.badge}</span>}</button>))}</div>))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-extrabold text-accent" aria-hidden="true">{ini}</span><div className="min-w-0"><b className="block truncate text-sm">{user.name || "Pentadbir"}</b><span className="block truncate text-xs text-sub">{user.email}</span></div></div>
        <button type="button" className="btn mt-2 w-full justify-center" onClick={onLogout}><LogOut size={16} /> Log keluar</button>
      </div>
    </div>);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-card md:block">{side}</aside>
      <div className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}><button type="button" tabIndex={open ? 0 : -1} className={`ios-fade absolute inset-0 bg-black/45 ${open ? "opacity-100" : "opacity-0"}`} aria-label="Tutup menu" onClick={() => setOpen(false)} /><aside className={`ios-sheet absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-2xl ${open ? "translate-x-0" : "-translate-x-full"}`}>{side}</aside></div>
      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-card/90 px-3 py-2 backdrop-blur lg:px-6">
          <button type="button" key={title} className="ios-title min-w-0 flex-1 truncate text-left text-base font-bold md:cursor-default md:text-lg" onClick={() => setOpen(true)} aria-label={`${title}. Tekan untuk buka menu`}>{title}</button>
          <div className="flex shrink-0 items-center gap-2">{right}</div>
        </div>
        <main key={active} className="ios-page mx-auto w-full max-w-6xl px-3 pb-28 pt-5 lg:px-6">{children}</main>
      </div>
    </div>);
}
export { X };

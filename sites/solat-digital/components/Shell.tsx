"use client";
import type { ReactNode } from "react";

export type NavItem = { id: string; label: string; icon: ReactNode; badge?: number; subs?: { id: string; label: string }[] };
/** Susun atur panel: bar sisi kiri (desktop) / tab mendatar (telefon), kandungan di sebelah kanan. */
export default function Shell({ brand, items, active, sub, onSelect, top, children }: { brand: ReactNode; items: NavItem[]; active: string; sub?: string; onSelect: (id: string, sub?: string) => void; top?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-3 py-4 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-5 lg:py-6">
      <aside className="lg:sticky lg:top-5 lg:self-start">
        <div className="card !p-3 lg:!p-4">
          <div className="hidden lg:block">{brand}</div>
          <nav aria-label="Menu" className="nav-scroll flex gap-1 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
            {items.map((it) => (
              <div key={it.id} className="shrink-0 lg:shrink">
                <button type="button" className="nav-item" data-active={active === it.id} aria-current={active === it.id ? "page" : undefined} onClick={() => onSelect(it.id, it.subs?.[0]?.id)}>
                  <span className="nav-ico">{it.icon}</span><span className="whitespace-nowrap lg:whitespace-normal lg:text-left">{it.label}</span>
                  {!!it.badge && <span className="nav-badge" aria-label={`${it.badge} belum dibaca`}>{it.badge > 99 ? "99+" : it.badge}</span>}
                </button>
                {it.subs && active === it.id && <div className="nav-subs">{it.subs.map((s) => <button key={s.id} type="button" className="nav-sub" data-active={sub === s.id} onClick={() => onSelect(it.id, s.id)}>{s.label}</button>)}</div>}
              </div>))}
          </nav>
          {top && <div className="mt-3 hidden border-t border-line pt-3 lg:block">{top}</div>}
        </div>
      </aside>
      <section className="min-w-0 pb-24">{children}</section>
    </div>
  );
}

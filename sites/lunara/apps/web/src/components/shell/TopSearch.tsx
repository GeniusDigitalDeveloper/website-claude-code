"use client";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { catalog } from "@/lib/catalog";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { Artwork, cx } from "../ui";

/**
 * The single search box of the app (top, centred). Typing shows instant suggestions;
 * Enter (or "Lihat semua hasil") opens /search?q=… with full results.
 */
function TopSearchInner({ className }: { className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const urlQ = path === "/search" ? (params.get("q") ?? "") : "";
  const [q, setQ] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [sugg, setSugg] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLFormElement>(null);

  // keep the box in sync with the URL (back/forward, trending chips, history clicks)
  useEffect(() => setQ(urlQ), [urlQ]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || term === urlQ) {
      setSugg([]);
      return;
    }
    let live = true;
    setLoading(true);
    const id = setTimeout(() => {
      catalog
        .suggest(term)
        .then((r) => live && setSugg(r))
        .catch(() => live && setSugg([]))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [q, urlQ]);

  useEffect(() => {
    const h = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", h);
    window.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("keydown", k);
    };
  }, []);

  const go = (term: string) => {
    const v = term.trim();
    if (!v) return;
    useLibrary.getState().addSearch(v);
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const showDrop = open && q.trim().length >= 2 && q.trim() !== urlQ;

  return (
    <form
      ref={boxRef}
      role="search"
      className={cx("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          router.prefetch("/search");
        }}
        onKeyDown={(e) => e.key === "Escape" && (setOpen(false), inputRef.current?.blur())}
        placeholder="Cari lagu, artis atau album"
        aria-label="Cari muzik"
        enterKeyHint="search"
        className="w-full rounded-full bg-card py-2.5 pr-10 pl-10 text-sm ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-[color:var(--acc-via)]"
      />
      {q && (
        <button
          type="button"
          aria-label="Kosongkan carian"
          onClick={() => {
            setQ("");
            setSugg([]);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-card-hover hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {showDrop && (
        <div role="listbox" aria-label="Cadangan carian" className="panel absolute inset-x-0 top-full z-50 mt-2 overflow-hidden p-1.5 shadow-2xl">
          {loading && !sugg.length && <p className="px-3 py-2 text-sm text-muted">Mencari…</p>}
          {!loading && !sugg.length && <p className="px-3 py-2 text-sm text-muted">Tiada cadangan. Tekan Enter untuk cari.</p>}
          {sugg.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                useLibrary.getState().addSearch(q.trim());
                void usePlayer.getState().playTrack(t);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-card-hover"
            >
              <Artwork src={t.artwork} alt="" className="h-9 w-9" rounded="rounded-md" />
              <span className="min-w-0">
                <span translate="no" className="block truncate text-sm font-medium">{t.title}</span>
                <span className="block truncate text-xs text-muted">Lagu · {t.artist}</span>
              </span>
            </button>
          ))}
          <button type="submit" className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left text-sm font-semibold text-acc hover:bg-card-hover">
            <Search className="h-4 w-4" /> Lihat semua hasil untuk &quot;{q.trim()}&quot;
          </button>
        </div>
      )}
    </form>
  );
}

export function TopSearch({ className }: { className?: string }) {
  return (
    <Suspense fallback={<div className={cx("h-10 rounded-full bg-card ring-1 ring-line", className)} />}>
      <TopSearchInner className={className} />
    </Suspense>
  );
}

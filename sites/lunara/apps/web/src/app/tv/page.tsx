"use client";
import { ArrowLeft, Compass, Heart, Library, Pause, Play, Search, SkipBack, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { catalog } from "@/lib/catalog";
import { albumsFrom, MALAY, mixFrom } from "@/lib/malay";
import { useAsync } from "@/lib/useAsync";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { Artwork, cx, fmt } from "@/components/ui";
import { Mark, Wordmark } from "@/components/shell/Logo";

/**
 * 10-foot TV interface (Android TV / Google TV browsers, or the TV wrapper in apps/tv).
 * Spatial navigation: arrow keys / D-pad move focus to the nearest item in that direction,
 * Enter/OK activates, Back/Escape returns. No mouse needed.
 */
function useSpatialNav(root: React.RefObject<HTMLElement | null>, onBack: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "GoBack") {
        if ((e.target as HTMLElement).tagName === "INPUT" && e.key === "Backspace") return;
        e.preventDefault();
        return onBack();
      }
      const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!dir || !root.current) return;
      if ((e.target as HTMLElement).tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      const items = Array.from(root.current.querySelectorAll<HTMLElement>("[data-tv]"));
      const cur = document.activeElement as HTMLElement;
      if (!items.includes(cur)) {
        items[0]?.focus();
        return e.preventDefault();
      }
      const a = cur.getBoundingClientRect();
      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      let best: HTMLElement | null = null;
      let bestScore = Infinity;
      for (const el of items) {
        if (el === cur) continue;
        const b = el.getBoundingClientRect();
        const dx = b.left + b.width / 2 - ax;
        const dy = b.top + b.height / 2 - ay;
        const along = dx * dir[0] + dy * dir[1];
        if (along <= 4) continue;
        const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
        const score = along + across * 2.2;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      if (best) {
        e.preventDefault();
        best.focus();
        best.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [root, onBack]);
}

function Row({ title, tracks }: { title: string; tracks: Track[] }) {
  if (!tracks.length) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      <div className="no-scrollbar -m-3 flex gap-6 overflow-x-auto p-3">
        {tracks.map((t, i) => (
          <button key={`${t.id}-${i}`} data-tv onClick={() => usePlayer.getState().playList(tracks, i, { shuffle: false })} className="group w-52 shrink-0 cursor-pointer rounded-2xl p-2 text-left transition focus:scale-105 focus:bg-card">
            <Artwork src={t.artwork} alt="" className="aspect-square w-full shadow-xl" rounded="rounded-xl" />
            <p translate="no" className="mt-3 truncate text-lg font-semibold">{t.title}</p>
            <p translate="no" className="truncate text-base text-muted">{t.artist}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function TV() {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"discover" | "library" | "search">("discover");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const nasyid = useAsync("my:nasyid", () => mixFrom(MALAY.nasyid, 4));
  const jiwang = useAsync("my:jiwang", () => mixFrom(MALAY.jiwang, 3));
  const rel = useAsync("my:rockAlbums", () => albumsFrom(MALAY.rock, 2));
  const res = useAsync(term ? `search:${term}` : null, () => catalog.searchAll(term));
  const favs = useLibrary((s) => s.favourites);
  const recent = useLibrary((s) => s.recent);
  const cur = usePlayer((s) => s.queue[s.index]);
  const playing = usePlayer((s) => s.playing);
  const pos = usePlayer((s) => s.position);
  const dur = usePlayer((s) => s.duration);
  useSpatialNav(root, () => (tab !== "discover" ? setTab("discover") : router.push("/")));
  useEffect(() => {
    document.documentElement.dataset.tv = "1";
    root.current?.querySelector<HTMLElement>("[data-tv]")?.focus();
    return () => void delete document.documentElement.dataset.tv;
  }, []);
  const hero = rel.data?.[0];
  return (
    <div ref={root} className="min-h-dvh px-[5vw] py-[4vh] text-lg">
      <header className="flex items-center gap-6">
        <button data-tv onClick={() => router.push("/")} aria-label="Keluar mod TV" className="grid h-12 w-12 cursor-pointer place-items-center rounded-full ring-1 ring-line focus:bg-card">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Mark size={48} />
        <Wordmark big />
        <nav className="ml-6 flex gap-3">
          {(
            [
              ["discover", "Teroka", Compass],
              ["library", "Pustaka", Library],
              ["search", "Cari", Search],
            ] as const
          ).map(([k, l, I]) => (
            <button key={k} data-tv onClick={() => setTab(k)} className={cx("flex cursor-pointer items-center gap-2 rounded-full px-6 py-3 font-semibold ring-1 transition", tab === k ? "bg-fg text-bg ring-transparent" : "ring-line focus:bg-card")}>
              <I className="h-5 w-5" /> {l}
            </button>
          ))}
        </nav>
        {cur && (
          <div className="ml-auto flex items-center gap-3 rounded-2xl bg-card p-2 pr-3 ring-1 ring-line">
            <Artwork src={cur.artwork} alt="" className="h-14 w-14" rounded="rounded-lg" />
            <div className="w-56 min-w-0">
              <p translate="no" className="truncate font-semibold">{cur.title}</p>
              <p className="truncate text-sm text-muted">
                {cur.artist} · {fmt(pos)}/{fmt(dur)}
              </p>
            </div>
            <button data-tv aria-label="Sebelumnya" onClick={() => usePlayer.getState().prev()} className="grid h-12 w-12 cursor-pointer place-items-center rounded-full focus:bg-card-hover">
              <SkipBack className="h-6 w-6 fill-current" />
            </button>
            <button data-tv aria-label={playing ? "Jeda" : "Main"} onClick={() => usePlayer.getState().toggle()} className="grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-fg text-bg">
              {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
            </button>
            <button data-tv aria-label="Seterusnya" onClick={() => usePlayer.getState().next()} className="grid h-12 w-12 cursor-pointer place-items-center rounded-full focus:bg-card-hover">
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
          </div>
        )}
      </header>

      {tab === "discover" && (
        <>
          {hero && (
            <div className="relative mt-10 flex items-end gap-10 overflow-hidden rounded-3xl p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.cover} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50 blur-2xl" />
              <Artwork src={hero.cover} alt="" className="h-64 w-64 shadow-2xl" rounded="rounded-2xl" />
              <div>
                <p className="text-base font-semibold text-muted uppercase">Album pilihan</p>
                <h1 className="mt-2 font-display text-6xl font-extrabold">{hero.title}</h1>
                <p className="mt-2 text-2xl text-muted">{hero.artist}</p>
                <button
                  data-tv
                  onClick={async () => {
                    const a = await catalog.album(hero.id);
                    if (a.tracks) void usePlayer.getState().playList(a.tracks, 0, { shuffle: false });
                  }}
                  className="btn-luxe mt-6 flex cursor-pointer items-center gap-3 rounded-full px-8 py-4 text-xl font-bold focus:scale-105"
                >
                  <Play className="h-6 w-6 fill-current" /> Main sekarang
                </button>
              </div>
            </div>
          )}
          <Row title="Nasyid Pilihan" tracks={nasyid.data ?? []} />
          <Row title="Rock Jiwang & Balada Melayu" tracks={jiwang.data ?? []} />
          {recent.length > 0 && <Row title="Baru Dimainkan" tracks={recent} />}
        </>
      )}
      {tab === "library" && (
        <>
          <Row title="Lagu Kegemaran" tracks={favs} />
          <Row title="Baru Dimainkan" tracks={recent} />
          {!favs.length && !recent.length && (
            <p className="mt-16 flex items-center gap-3 text-2xl text-muted">
              <Heart className="h-7 w-7" /> Pustaka kosong. Log masuk untuk sync dari telefon anda.
            </p>
          )}
        </>
      )}
      {tab === "search" && (
        <div className="mt-10">
          <form onSubmit={(e) => (e.preventDefault(), setTerm(q.trim()))}>
            <input data-tv autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari lagu atau artis, tekan OK" aria-label="Cari" className="w-full max-w-3xl rounded-2xl bg-card px-6 py-5 text-2xl ring-1 ring-line outline-none focus:ring-4 focus:ring-[color:var(--acc-to)]" />
          </form>
          {res.data && <Row title={`Hasil untuk "${term}"`} tracks={res.data.tracks} />}
        </div>
      )}
      <p className="mt-12 text-sm text-faint">Navigasi: anak panah / D-pad · OK untuk main · Back untuk kembali</p>
    </div>
  );
}

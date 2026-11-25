"use client";
import { History, Search, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { AlbumCard, ArtistCircle } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Artwork, cx, Empty, HScroll, SectionHead, Segmented, Skeleton } from "@/components/ui";

type Tab = "all" | "tracks" | "artists" | "albums" | "device";

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useLibrary((s) => s.searchHistory);
  const local = useLibrary((s) => s.localTracks);

  useEffect(() => {
    setQ(initial);
    setSubmitted(initial);
    if (initial) useLibrary.getState().addSearch(initial);
  }, [initial]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  useEffect(() => {
    if (!initial) inputRef.current?.focus();
  }, [initial]);

  const sugg = useAsync(debounced.length >= 2 && debounced !== submitted ? `sugg:${debounced}` : null, () => catalog.suggest(debounced));
  const res = useAsync(submitted ? `search:${submitted}` : null, () => catalog.searchAll(submitted));
  const chart = useAsync("chart", () => catalog.chart());
  const trending = useMemo(() => {
    const c = chart.data;
    if (!c) return [];
    return [...c.artists.slice(0, 5).map((a) => a.name), ...c.tracks.slice(0, 5).map((t) => t.title)];
  }, [chart.data]);

  const localHits = useMemo(() => {
    const s = submitted.toLowerCase();
    if (!s) return [] as Track[];
    return local.filter((t) => [t.title, t.artist, t.album, t.genre].some((x) => x?.toLowerCase().includes(s)));
  }, [local, submitted]);

  const go = (term: string) => {
    const v = term.trim();
    if (!v) return;
    setQ(v);
    setFocus(false);
    router.replace(`/search?q=${encodeURIComponent(v)}`);
  };

  const showDrop = focus && q.trim().length >= 2 && debounced !== submitted;

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-7">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Cari</h1>
      <form
        role="search"
        className="relative mt-4 max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 180)}
          placeholder="Lagu, artis, album: antarabangsa atau tempatan"
          aria-label="Cari muzik"
          aria-autocomplete="list"
          className="w-full rounded-2xl bg-card py-4 pr-12 pl-12 text-base ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-[color:var(--acc-via)]"
        />
        {q && (
          <button type="button" aria-label="Kosongkan carian" onClick={() => (setQ(""), inputRef.current?.focus())} className="absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full hover:bg-card-hover">
            <X className="h-4 w-4" />
          </button>
        )}
        {showDrop && (
          <div role="listbox" className="panel absolute inset-x-0 top-full z-20 mt-2 overflow-hidden p-1.5 shadow-2xl">
            {sugg.loading && <p className="px-3 py-2 text-sm text-muted">Mencari…</p>}
            {sugg.data?.map((t) => (
              <button
                key={t.id}
                role="option"
                aria-selected={false}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  useLibrary.getState().addSearch(`${t.title} ${t.artist}`);
                  void usePlayer.getState().playTrack(t);
                  setFocus(false);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-card-hover"
              >
                <Artwork src={t.artwork} alt="" className="h-9 w-9" rounded="rounded-md" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-muted">Lagu · {t.artist}</span>
                </span>
              </button>
            ))}
            <button type="submit" onMouseDown={(e) => e.preventDefault()} className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left text-sm font-semibold text-acc hover:bg-card-hover">
              <Search className="h-4 w-4" /> Lihat semua hasil untuk &quot;{q}&quot;
            </button>
          </div>
        )}
      </form>

      {!submitted ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <SectionHead
              title="Carian terkini"
              action={
                history.length ? (
                  <button onClick={() => useLibrary.getState().clearSearch()} className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
                    Padam semua
                  </button>
                ) : null
              }
            />
            {history.length ? (
              <ul className="flex flex-col">
                {history.map((h) => (
                  <li key={h} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-card-hover">
                    <History className="h-4 w-4 text-faint" />
                    <button className="flex-1 cursor-pointer truncate text-left text-sm" onClick={() => go(h)}>
                      {h}
                    </button>
                    <button aria-label={`Buang "${h}" dari sejarah`} onClick={() => useLibrary.getState().removeSearch(h)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-faint opacity-60 group-hover:opacity-100 hover:text-fg">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Belum ada carian.</p>
            )}
          </section>
          <section>
            <SectionHead title="Trending sekarang" sub="Dari carta global Deezer, dikemas kini setiap hari" />
            <div className="flex flex-wrap gap-2">
              {trending.length
                ? trending.map((t) => (
                    <button key={t} onClick={() => go(t)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm ring-1 ring-line hover:bg-card-hover">
                      <TrendingUp className="h-3.5 w-3.5 text-acc" /> {t}
                    </button>
                  ))
                : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Siti Nurhaliza", "Dato' Sri Siti", "Hindia", "Faizal Tahir", "Nadhif Basalamah", "Yonnyboii", "Aina Abdul", "Dolla"].map((t) => (
                <button key={t} onClick={() => go(t)} className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-muted ring-1 ring-line hover:text-fg">
                  {t}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-6">
          <Segmented
            label="Tapis hasil"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "Semua" },
              { value: "tracks", label: "Lagu" },
              { value: "artists", label: "Artis" },
              { value: "albums", label: "Album" },
              { value: "device", label: `Peranti (${localHits.length})` },
            ]}
          />
          {res.error && <p className="mt-6 rounded-xl bg-card p-4 text-sm text-muted">Carian katalog gagal: {res.error}. Cuba lagi sebentar.</p>}
          {res.loading && (
            <div className="mt-6 space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          )}
          {res.data && (
            <div className="mt-6 space-y-9">
              {(tab === "all" || tab === "device") && localHits.length > 0 && (
                <section>
                  <SectionHead title="Dalam peranti anda" />
                  <TrackList tracks={localHits} limit={tab === "all" ? 5 : undefined} />
                </section>
              )}
              {tab === "device" && !localHits.length && <Empty icon={<Search className="h-5 w-5" />} title="Tiada padanan dalam muzik peranti" />}
              {(tab === "all" || tab === "tracks") && (
                <section>
                  {tab === "all" && <SectionHead title="Lagu" />}
                  {res.data.tracks.length ? <TrackList tracks={res.data.tracks} limit={tab === "all" ? 8 : undefined} /> : <p className="text-sm text-muted">Tiada lagu dijumpai dalam katalog untuk &quot;{submitted}&quot;.</p>}
                </section>
              )}
              {(tab === "all" || tab === "artists") && res.data.artists.length > 0 && (
                <section>
                  {tab === "all" && <SectionHead title="Artis" />}
                  {tab === "all" ? (
                    <HScroll>
                      {res.data.artists.map((a) => (
                        <ArtistCircle key={a.id} a={a} />
                      ))}
                    </HScroll>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                      {res.data.artists.map((a) => (
                        <ArtistCircle key={a.id} a={a} grid />
                      ))}
                    </div>
                  )}
                </section>
              )}
              {(tab === "all" || tab === "albums") && res.data.albums.length > 0 && (
                <section>
                  {tab === "all" && <SectionHead title="Album" />}
                  <div className={cx(tab === "all" ? "" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5")}>
                    {tab === "all" ? (
                      <HScroll>
                        {res.data.albums.map((a) => (
                          <AlbumCard key={a.id} a={a} />
                        ))}
                      </HScroll>
                    ) : (
                      res.data.albums.map((a) => <AlbumCard key={a.id} a={a} grid />)
                    )}
                  </div>
                </section>
              )}
              <p className="text-[11px] text-faint">
                Hasil katalog sebenar dari Deezer API. Lagu bertanda &quot;Pratonton 30s&quot; boleh dimainkan 30 saat seperti yang dibenarkan pembekal. <Link href="/settings#about" className="underline">Ketahui lebih lanjut</Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

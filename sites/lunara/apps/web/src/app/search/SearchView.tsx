"use client";
import { History, Search, TrendingUp, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { catalog } from "@/lib/catalog";
import { MALAY_SEARCH_CHIPS } from "@/lib/malay";
import { useAsync } from "@/lib/useAsync";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { AlbumCard, ArtistCircle } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { cx, Empty, HScroll, SectionHead, Segmented, Skeleton } from "@/components/ui";

type Tab = "all" | "tracks" | "artists" | "albums" | "device";

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const submitted = (params.get("q") ?? "").trim();
  const [tab, setTab] = useState<Tab>("all");
  const history = useLibrary((s) => s.searchHistory);
  const local = useLibrary((s) => s.localTracks);

  useEffect(() => setTab("all"), [submitted]);

  const res = useAsync(submitted ? `search:${submitted}` : null, () => catalog.searchAll(submitted));
  const trending = MALAY_SEARCH_CHIPS;

  const localHits = useMemo(() => {
    const s = submitted.toLowerCase();
    if (!s) return [] as Track[];
    return local.filter((t) => [t.title, t.artist, t.album, t.genre].some((x) => x?.toLowerCase().includes(s)));
  }, [local, submitted]);

  const go = (term: string) => {
    const v = term.trim();
    if (!v) return;
    useLibrary.getState().addSearch(v);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-7">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{submitted ? <>Hasil untuk &quot;{submitted}&quot;</> : "Cari"}</h1>
      {!submitted && <p className="mt-1 text-sm text-muted">Taip di kotak carian di atas: lagu, artis atau album, antarabangsa atau tempatan.</p>}

      {!submitted ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
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
            <SectionHead title="Carian popular" sub="Nasyid, zikir, rock jiwang & rock kapak" />
            <div className="flex flex-wrap gap-2">
              {trending.length
                ? trending.map((t) => (
                    <button key={t} onClick={() => go(t)} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-sm ring-1 ring-line hover:bg-card-hover">
                      <TrendingUp className="h-3.5 w-3.5 text-acc" /> {t}
                    </button>
                  ))
                : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

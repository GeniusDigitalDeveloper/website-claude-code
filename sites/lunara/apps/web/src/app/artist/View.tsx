"use client";
import { Play, Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAsync } from "@/lib/useAsync";
import { channelPlaylists, uploadsPage, youtubeChannel } from "@/lib/yt-search";
import type { Track } from "@/lib/types";
import { toast } from "@/store/toast";
import { usePlayer } from "@/store/player";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { PlaylistCard } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, HScroll, SectionHead, Skeleton } from "@/components/ui";

export function View() {
  const id = useSearchParams().get("id") ?? "";
  if (id.startsWith("ytc:")) return <ChannelView id={id} />;
  return <LegacyArtist />;
}

/** A YouTube channel shown as an artist page: all its songs (50 at a time), playable in full. */
function ChannelView({ id, children }: { id: string; children?: React.ReactNode }) {
  const { data, loading, error } = useAsync(`ytc:${id}`, () => youtubeChannel(id), 30 * 60_000);
  const pls = useAsync(`ytcp:${id}`, () => channelPlaylists(id), 30 * 60_000);
  const [extra, setExtra] = useState<Track[]>([]);
  const [next, setNext] = useState<string | undefined | null>(null); // null = use the first page's token
  const [busy, setBusy] = useState(false);
  if (error) return <p className="p-8 text-muted">Artis tidak dapat dimuatkan: {error}</p>;
  if (loading || !data) return <Skeleton className="m-8 h-72" />;
  const { artist } = data;
  const tracks = [...data.tracks, ...extra];
  const token = next === null ? data.next : next;
  const loadMore = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const pg = await uploadsPage(data.uploads, token);
      setExtra((e) => [...e, ...pg.tracks]);
      setNext(pg.next);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <CollectionHeader
        round
        cover={artist.picture}
        kicker="Artis"
        title={artist.name}
        meta={
          <>
            {artist.fans != null && `${Intl.NumberFormat("ms").format(artist.fans)} peminat`}
            {artist.nbAlbums ? ` · ${artist.nbAlbums} lagu` : ""}
          </>
        }
      >
        <Btn onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: false })} disabled={!tracks.length}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: true })} disabled={!tracks.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
      </CollectionHeader>
      <div className="space-y-10 px-4 md:px-8">
        <section>
          <SectionHead title="Lagu" />
          {tracks.length ? <TrackList tracks={tracks} numbered /> : <p className="text-sm text-muted">Artis ini belum ada lagu.</p>}
          {token && (
            <div className="mt-4 flex justify-center">
              <Btn variant="ghost" onClick={loadMore} disabled={busy}>
                {busy ? "Memuatkan…" : "Muat lagi lagu"}
              </Btn>
            </div>
          )}
        </section>
        {pls.data && pls.data.length > 0 && (
          <section>
            <SectionHead title="Playlist" />
            <HScroll>
              {pls.data.map((p) => (
                <PlaylistCard key={p.id} p={p} href={`/playlist?id=${p.id}`} />
              ))}
            </HScroll>
          </section>
        )}
        {children}
      </div>
    </div>
  );
}

/** Links from older versions of the app: no longer available. */
function LegacyArtist() {
  return (
    <div className="p-8">
      <p className="text-muted">Artis ini dari sumber lama dan tidak lagi tersedia. Cari nama artis untuk buka channelnya.</p>
      <Btn href="/search" className="mt-4">
        Cari artis
      </Btn>
    </div>
  );
}

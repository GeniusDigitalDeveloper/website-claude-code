"use client";
import { Play, Radio, Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import { channelForName, channelPlaylists, uploadsPage, youtubeChannel } from "@/lib/yt-search";
import type { Track } from "@/lib/types";
import { toast } from "@/store/toast";
import { usePlayer } from "@/store/player";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { AlbumCard, ArtistCircle, PlaylistCard } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, HScroll, SectionHead, Skeleton } from "@/components/ui";

export function View() {
  const id = useSearchParams().get("id") ?? "";
  if (id.startsWith("ytc:")) return <ChannelView id={id} />;
  return <DeezerArtist id={id} />;
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

function DeezerArtist({ id }: { id: string }) {
  const { data, loading, error } = useAsync(`artist:${id}`, () => catalog.artist(id));
  const [more, setMore] = useState(false);
  const [channel, setChannel] = useState<string | null | undefined>(undefined); // undefined = still looking
  const name = data?.artist.name;
  useEffect(() => {
    if (!name) return;
    let live = true;
    channelForName(name)
      .then((c) => live && setChannel(c))
      .catch(() => live && setChannel(null));
    return () => {
      live = false;
    };
  }, [name]);
  if (data && channel === undefined) return <Skeleton className="m-8 h-72" />;
  if (data && channel) {
    // The artist's own YouTube channel leads (all their songs); catalogue albums follow below
    const all = [...data.albums, ...data.singles];
    return (
      <ChannelView id={channel}>
        {all.length > 0 && (
          <section>
            <SectionHead title="Album" />
            <HScroll>
              {all.map((a) => (
                <AlbumCard key={a.id} a={{ ...a, artist: data.artist.name }} />
              ))}
            </HScroll>
          </section>
        )}
      </ChannelView>
    );
  }
  if (error) return <p className="p-8 text-muted">Artis tidak dapat dimuatkan: {error}</p>;
  if (loading || !data) return <Skeleton className="m-8 h-72" />;
  const { artist, top, albums, singles, related } = data;
  const radio = async () => {
    const t = (await catalog.artistRadio(id)).filter((x) => x.playable);
    if (t.length) void usePlayer.getState().playList(t, 0, { shuffle: false });
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
            {artist.nbAlbums ? ` · ${artist.nbAlbums} album` : ""}
            <span className="mt-1 block text-xs text-faint">Biografi tidak disediakan oleh pembekal metadata semasa.</span>
          </>
        }
      >
        <Btn onClick={() => usePlayer.getState().playList(top.filter((t) => t.playable), 0, { shuffle: false })}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(top.filter((t) => t.playable), 0, { shuffle: true })}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
        <Btn variant="ghost" onClick={radio}>
          <Radio className="h-4 w-4" /> Radio artis
        </Btn>
      </CollectionHeader>
      <div className="space-y-10 px-4 md:px-8">
        <section>
          <SectionHead title="Lagu popular" />
          <TrackList tracks={top} numbered limit={more ? 10 : 5} />
          {top.length > 5 && (
            <button onClick={() => setMore((m) => !m)} className="mt-2 cursor-pointer px-2 text-sm font-semibold text-muted hover:text-fg">
              {more ? "Tunjuk kurang" : "Lihat lagi"}
            </button>
          )}
        </section>
        {albums.length > 0 && (
          <section>
            <SectionHead title="Album" />
            <HScroll>
              {albums.map((a) => (
                <AlbumCard key={a.id} a={{ ...a, artist: artist.name }} />
              ))}
            </HScroll>
          </section>
        )}
        {singles.length > 0 && (
          <section>
            <SectionHead title="Single & EP" />
            <HScroll>
              {singles.map((a) => (
                <AlbumCard key={a.id} a={{ ...a, artist: artist.name }} />
              ))}
            </HScroll>
          </section>
        )}
        {related.length > 0 && (
          <section>
            <SectionHead title="Artis berkaitan" />
            <HScroll>
              {related.map((a) => (
                <ArtistCircle key={a.id} a={a} />
              ))}
            </HScroll>
          </section>
        )}
      </div>
    </div>
  );
}

"use client";
import { Play, Radio, Shuffle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import { youtubeChannel } from "@/lib/yt-search";
import { usePlayer } from "@/store/player";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { AlbumCard, ArtistCircle } from "@/components/music/Cards";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, HScroll, SectionHead, Skeleton } from "@/components/ui";

export function View() {
  const id = useSearchParams().get("id") ?? "";
  if (id.startsWith("ytc:")) return <ChannelView id={id} />;
  return <DeezerArtist id={id} />;
}

/** A YouTube channel shown as an artist page (its latest uploads, all playable in full). */
function ChannelView({ id }: { id: string }) {
  const { data, loading, error } = useAsync(`ytc:${id}`, () => youtubeChannel(id));
  if (error) return <p className="p-8 text-muted">Artis tidak dapat dimuatkan: {error}</p>;
  if (loading || !data) return <Skeleton className="m-8 h-72" />;
  const { artist, tracks } = data;
  return (
    <div>
      <CollectionHeader
        round
        cover={artist.picture}
        kicker="Artis"
        title={artist.name}
        meta={<>{artist.fans != null && `${Intl.NumberFormat("ms").format(artist.fans)} peminat · `}{tracks.length} lagu terkini</>}
      >
        <Btn onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: false })} disabled={!tracks.length}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(tracks, 0, { shuffle: true })} disabled={!tracks.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
      </CollectionHeader>
      <div className="px-4 md:px-8">
        <SectionHead title="Lagu terkini" />
        {tracks.length ? <TrackList tracks={tracks} numbered /> : <p className="text-sm text-muted">Artis ini belum ada lagu.</p>}
      </div>
    </div>
  );
}

function DeezerArtist({ id }: { id: string }) {
  const { data, loading, error } = useAsync(`artist:${id}`, () => catalog.artist(id));
  const [more, setMore] = useState(false);
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

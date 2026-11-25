"use client";
import { Bookmark, BookmarkCheck, ListEnd, Play, Shuffle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, fmtLong, Skeleton } from "@/components/ui";

export function View() {
  const id = useSearchParams().get("id") ?? "";
  const { data: a, loading, error } = useAsync(`album:${id}`, () => catalog.album(id));
  const saved = useLibrary((s) => s.savedAlbums.some((x) => x.id === id));
  if (error) return <p className="p-8 text-muted">Album tidak dapat dimuatkan: {error}</p>;
  if (loading || !a) return <Skeleton className="m-8 h-72" />;
  const tracks = a.tracks ?? [];
  const playable = tracks.filter((t) => t.playable);
  return (
    <div>
      <CollectionHeader
        cover={a.cover}
        kicker={a.recordType === "single" ? "Single" : a.recordType === "ep" ? "EP" : "Album"}
        title={a.title}
        meta={
          <>
            {a.artistId ? (
              <Link href={`/artist?id=${a.artistId}`} className="font-semibold text-fg hover:underline">
                {a.artist}
              </Link>
            ) : (
              a.artist
            )}
            {a.releaseDate && ` · Dikeluarkan ${new Date(a.releaseDate).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" })}`}
            {a.genre && ` · ${a.genre}`}
            {` · ${tracks.length} lagu, ${fmtLong(a.duration ?? 0)}`}
          </>
        }
      >
        <Btn onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: false })} disabled={!playable.length}>
          <Play className="h-4 w-4 fill-current" /> Main album
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: true })} disabled={!playable.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().addToQueue(playable)} disabled={!playable.length}>
          <ListEnd className="h-4 w-4" /> Giliran
        </Btn>
        <Btn variant="ghost" onClick={() => (useLibrary.getState().toggleSavedAlbum(a), toast(saved ? "Album dibuang dari pustaka" : "Album disimpan ke pustaka"))}>
          {saved ? <BookmarkCheck className="h-4 w-4 text-acc" /> : <Bookmark className="h-4 w-4" />} {saved ? "Disimpan" : "Simpan"}
        </Btn>
      </CollectionHeader>
      <div className="px-2 md:px-6">
        <TrackList tracks={tracks} numbered showAlbum={false} />
      </div>
    </div>
  );
}

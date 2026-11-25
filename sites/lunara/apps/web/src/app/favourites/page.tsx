"use client";
import { Heart, ListPlus, Play, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, Empty, fmtLong } from "@/components/ui";

export default function Favourites() {
  const favs = useLibrary((s) => s.favourites);
  const router = useRouter();
  const playable = favs.filter((t) => t.playable);
  return (
    <div>
      <CollectionHeader cover={favs[0]?.artwork} kicker="Playlist" title="Lagu Kegemaran" meta={`${favs.length} lagu · ${fmtLong(favs.reduce((a, t) => a + t.duration, 0))} · disegerak ke akaun anda`}>
        <Btn onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: false })} disabled={!playable.length}>
          <Play className="h-4 w-4 fill-current" /> Main semua
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: true })} disabled={!playable.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
        <Btn
          variant="ghost"
          disabled={!favs.length}
          onClick={() => {
            const id = useLibrary.getState().createPlaylist({ name: "Kegemaran saya", tracks: favs });
            toast("Kegemaran disalin ke playlist baharu");
            router.push(`/playlist?id=${id}`);
          }}
        >
          <ListPlus className="h-4 w-4" /> Jadikan playlist
        </Btn>
      </CollectionHeader>
      <div className="px-2 md:px-6">
        {favs.length ? (
          <TrackList tracks={favs} numbered onRemove={(i) => useLibrary.getState().toggleFav(favs[i])} removeLabel="Buang dari kegemaran" />
        ) : (
          <Empty icon={<Heart className="h-6 w-6" />} title="Belum ada lagu kegemaran">
            Tekan ikon hati pada mana-mana lagu.
          </Empty>
        )}
      </div>
    </div>
  );
}

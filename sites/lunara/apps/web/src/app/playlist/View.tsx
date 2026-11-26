"use client";
import { Copy, Globe, ImagePlus, ListEnd, Lock, Pencil, Play, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { catalog } from "@/lib/catalog";
import { useAsync } from "@/lib/useAsync";
import { youtubePlaylist } from "@/lib/yt-search";
import type { Track } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { tr } from "@/i18n";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { CollectionHeader } from "@/components/media/CollectionHeader";
import { ImageCropper, normalizeImage } from "@/components/media/ImageCropper";
import { SortableItem, SortableList } from "@/components/music/Sortable";
import { TrackList, TrackRow } from "@/components/music/TrackRow";
import { Artwork, Btn, Empty, Field, fmtLong, inputCls, Modal, Skeleton, Switch } from "@/components/ui";

function YouTubePlaylist({ id }: { id: string }) {
  const { data, loading, error } = useAsync(`ytp:${id}`, () => youtubePlaylist(id));
  if (error) return <p className="p-8 text-muted">Playlist tidak dapat dimuatkan: {error}</p>;
  if (loading || !data) return <Skeleton className="m-8 h-72" />;
  return (
    <div>
      <CollectionHeader cover={data.cover} kicker="Playlist" title={data.title} meta={`${data.creator ?? "LUNARA"} · ${data.tracks.length} lagu`}>
        <Btn onClick={() => usePlayer.getState().playList(data.tracks, 0, { shuffle: false })} disabled={!data.tracks.length}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(data.tracks, 0, { shuffle: true })} disabled={!data.tracks.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
      </CollectionHeader>
      <div className="px-4 md:px-8">
        {data.tracks.length ? <TrackList tracks={data.tracks} numbered /> : <p className="text-sm text-muted">Playlist ini kosong.</p>}
      </div>
    </div>
  );
}

function DeezerPlaylist({ id }: { id: string }) {
  const { data, loading, error } = useAsync(`pl:${id}`, () => catalog.playlist(id));
  if (error) return <p className="p-8 text-muted">Playlist tidak dapat dimuatkan: {error}</p>;
  if (loading || !data) return <Skeleton className="m-8 h-72" />;
  const playable = data.tracks.filter((t) => t.playable);
  return (
    <div>
      <CollectionHeader cover={data.cover} kicker="Playlist editorial" title={data.title} meta={`${data.creator ?? "Deezer"} · ${data.tracks.length} lagu`}>
        <Btn onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: false })}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: true })}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            useLibrary.getState().createPlaylist({ name: data.title, description: data.description ?? "", cover: data.cover, tracks: data.tracks });
            toast("Disalin ke playlist anda");
          }}
        >
          <Copy className="h-4 w-4" /> Salin ke pustaka
        </Btn>
      </CollectionHeader>
      <div className="px-2 md:px-6">
        <TrackList tracks={data.tracks} numbered />
      </div>
    </div>
  );
}

function AddSongs({ onAdd }: { onAdd: (t: Track) => void }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const local = useLibrary((s) => s.localTracks);
  const { data, loading } = useAsync(term ? `search:${term}` : null, () => catalog.searchAll(term));
  const lh = term ? local.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(term.toLowerCase())) : local.slice(0, 8);
  const row = (t: Track) => (
    <div key={t.id} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-card-hover">
      <Artwork src={t.artwork} alt="" className="h-10 w-10" rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.title}</p>
        <p className="truncate text-xs text-muted">{t.artist}</p>
      </div>
      <button aria-label={`Tambah ${t.title}`} onClick={() => onAdd(t)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full ring-1 ring-line hover:bg-card">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
        className="relative"
      >
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} pl-9`} placeholder="Cari lagu katalog atau muzik peranti" aria-label="Cari lagu untuk ditambah" />
      </form>
      <div className="thin-scroll mt-3 max-h-[50vh] overflow-y-auto">
        {lh.length > 0 && <p className="px-1 py-1 text-[11px] font-semibold text-faint uppercase">Muzik peranti</p>}
        {lh.map(row)}
        {term && <p className="px-1 py-1 text-[11px] font-semibold text-faint uppercase">Katalog</p>}
        {loading && <Skeleton className="h-40" />}
        {data?.tracks.map(row)}
      </div>
    </div>
  );
}

function UserPlaylistView({ id }: { id: string }) {
  const router = useRouter();
  const pl = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const hydrated = useLibrary((s) => s.hydrated);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isPublic: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const L = useLibrary.getState;
  if (!hydrated) return <Skeleton className="m-8 h-72" />;
  if (!pl) return <p className="p-8 text-muted">Playlist ini tidak wujud atau telah dipadam.</p>;
  const playable = pl.tracks.filter((t) => t.playable);
  const total = pl.tracks.reduce((a, t) => a + (t.duration || 0), 0);
  const ids = pl.tracks.map((t, i) => `${t.id}#${i}`);
  return (
    <div>
      <CollectionHeader
        cover={pl.cover ?? pl.tracks[0]?.artwork}
        kicker={pl.isPublic ? "Playlist awam" : "Playlist peribadi"}
        title={pl.name}
        meta={
          <>
            {pl.description && <span className="mb-1 block">{pl.description}</span>}
            {pl.tracks.length} lagu · {fmtLong(total)}
          </>
        }
      >
        <Btn onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: false })} disabled={!playable.length}>
          <Play className="h-4 w-4 fill-current" /> Main
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().playList(playable, 0, { shuffle: true })} disabled={!playable.length}>
          <Shuffle className="h-4 w-4" /> Rawak
        </Btn>
        <Btn variant="ghost" onClick={() => usePlayer.getState().addToQueue(playable)} disabled={!playable.length}>
          <ListEnd className="h-4 w-4" /> Giliran
        </Btn>
        <Btn variant="ghost" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Tambah lagu
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            setForm({ name: pl.name, description: pl.description, isPublic: pl.isPublic });
            setEdit(true);
          }}
        >
          <Pencil className="h-4 w-4" /> Edit
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => {
            const nid = L().duplicatePlaylist(pl.id);
            toast("Playlist diduplikasi");
            if (nid) router.push(`/playlist?id=${nid}`);
          }}
        >
          <Copy className="h-4 w-4" /> Duplikasi
        </Btn>
      </CollectionHeader>

      <div className="px-2 md:px-6">
        {pl.tracks.length ? (
          <>
            <p className="px-2 pb-2 text-xs text-faint">Seret ikon ⋮⋮ untuk susun semula lagu.</p>
            <SortableList ids={ids} onMove={(a, b) => L().movePlaylistTrack(pl.id, a, b)}>
              {pl.tracks.map((t, i) => (
                <SortableItem key={ids[i]} id={ids[i]} label={t.title}>
                  {(h) => <TrackRow t={t} i={i} list={pl.tracks} dragHandle={h} onRemove={() => L().removeFromPlaylist(pl.id, i)} removeLabel="Buang dari playlist" />}
                </SortableItem>
              ))}
            </SortableList>
          </>
        ) : (
          <Empty icon={<Plus className="h-5 w-5" />} title="Playlist ini masih kosong">
            Tambah lagu dari carian, album, atau muzik peranti anda.
            <div className="mt-4">
              <Btn onClick={() => setAdding(true)}>Tambah lagu</Btn>
            </div>
          </Empty>
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title={`Tambah ke "${pl.name}"`}>
        <AddSongs onAdd={(t) => toast(L().addToPlaylist(pl.id, [t]) ? `Ditambah: ${t.title}` : "Sudah ada dalam playlist")} />
      </Modal>

      <Modal open={edit} onClose={() => (setEdit(false), setCropSrc(null))} title="Edit playlist">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setCropSrc(await normalizeImage(f));
            e.target.value = "";
          }}
        />
        {cropSrc ? (
          <ImageCropper
            src={cropSrc}
            outputSize={600}
            onCancel={() => setCropSrc(null)}
            onPickNew={() => fileRef.current?.click()}
            onSave={(c) => {
              L().updatePlaylist(pl.id, { cover: c });
              setCropSrc(null);
              toast("Kulit playlist dikemas kini");
            }}
          />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              L().updatePlaylist(pl.id, { name: form.name.trim() || pl.name, description: form.description.trim(), isPublic: form.isPublic });
              setEdit(false);
              toast("Playlist disimpan");
            }}
          >
            <div className="flex items-center gap-4">
              <Artwork src={pl.cover ?? pl.tracks[0]?.artwork} alt="Kulit playlist" className="h-24 w-24" rounded="rounded-xl" />
              <div className="flex flex-col gap-2">
                <Btn variant="soft" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> Muat naik kulit
                </Btn>
                {pl.cover && (
                  <button type="button" onClick={() => L().updatePlaylist(pl.id, { cover: undefined })} className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
                    Guna kulit automatik
                  </button>
                )}
              </div>
            </div>
            <Field label="Nama">
              <input className={inputCls} value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Penerangan">
              <textarea className={`${inputCls} min-h-20`} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Switch checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} label={form.isPublic ? "Awam" : "Peribadi"} desc={form.isPublic ? "Pengguna lain boleh lihat bila dikongsi" : "Hanya anda boleh lihat"} />
            <div className="flex items-center justify-between gap-2 pt-2">
              <Btn
                variant="danger"
                onClick={() => {
                  if (confirm(tr(`Padam playlist "${pl.name}"? Tindakan ini tidak boleh dibatalkan.`))) {
                    L().deletePlaylist(pl.id);
                    router.push("/library");
                    toast("Playlist dipadam");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Padam
              </Btn>
              <Btn type="submit">{form.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Simpan</Btn>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function View() {
  const id = useSearchParams().get("id") ?? "";
  if (id.startsWith("ytp-")) return <YouTubePlaylist id={id} />;
  return id.startsWith("dz-") ? <DeezerPlaylist id={id.slice(3)} /> : <UserPlaylistView id={id} />;
}

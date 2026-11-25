"use client";
import { CheckSquare, FolderOpen, FolderSync, HardDrive, ImagePlus, Info, ListPlus, Pencil, Play, RefreshCw, Shuffle, Square, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCEPT, addFolder, folderScanSupported, forgetFolder, importFiles, listFolders, removeFromLibrary, rescanFolders, storageEstimate, SUPPORTED_EXT, type LocalTrack } from "@/lib/local-music";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { ImageCropper, normalizeImage } from "@/components/media/ImageCropper";
import { TrackRow } from "@/components/music/TrackRow";
import { Artwork, Btn, cx, Empty, Field, inputCls, Modal, Segmented } from "@/components/ui";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 1e9 ? 0 : 1)} MB`;

function MetaEditor({ t, onClose }: { t: LocalTrack; onClose: () => void }) {
  const [f, setF] = useState({ title: t.title, artist: t.artist, album: t.album ?? "", genre: t.genre ?? "", artwork: t.artwork });
  const [crop, setCrop] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setCrop(await normalizeImage(file));
          e.target.value = "";
        }}
      />
      {crop ? (
        <ImageCropper src={crop} outputSize={400} onCancel={() => setCrop(null)} onPickNew={() => ref.current?.click()} onSave={(c) => (setF({ ...f, artwork: c }), setCrop(null))} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            useLibrary.getState().editLocal(t.id, { title: f.title.trim() || t.title, artist: f.artist.trim() || t.artist, album: f.album.trim() || undefined, genre: f.genre.trim() || undefined, artwork: f.artwork });
            toast("Metadata disimpan (dalam AURALYQO sahaja, fail asal tidak diubah)");
            onClose();
          }}
        >
          <div className="flex items-center gap-4">
            <Artwork src={f.artwork} alt="Kulit lagu" className="h-24 w-24" rounded="rounded-xl" />
            <div className="flex flex-col items-start gap-2">
              <Btn variant="soft" onClick={() => ref.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Tukar kulit
              </Btn>
              {f.artwork && (
                <button type="button" className="cursor-pointer text-xs font-semibold text-muted hover:text-fg" onClick={() => setF({ ...f, artwork: undefined })}>
                  Buang kulit
                </button>
              )}
            </div>
          </div>
          <Field label="Tajuk lagu">
            <input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
          </Field>
          <Field label="Artis">
            <input className={inputCls} value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Album">
              <input className={inputCls} value={f.album} onChange={(e) => setF({ ...f, album: e.target.value })} />
            </Field>
            <Field label="Genre">
              <input className={inputCls} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-muted">
            Fail: {t.local.path ?? t.local.fileName} · {t.local.format.toUpperCase()} · {mb(t.local.size)}
          </p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>
              Batal
            </Btn>
            <Btn type="submit">Simpan</Btn>
          </div>
        </form>
      )}
    </>
  );
}

export default function LocalMusic() {
  const router = useRouter();
  const all = useLibrary((s) => s.localTracks);
  const [tab, setTab] = useState<"all" | "local" | "imported">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<LocalTrack | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [canScan, setCanScan] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const L = useLibrary.getState;

  useEffect(() => {
    setCanScan(folderScanSupported());
    void listFolders().then(setFolders);
    void storageEstimate().then(setUsage);
  }, [all.length]);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return all.filter((t) => (tab === "all" || t.source === tab) && (!s || `${t.title} ${t.artist} ${t.album ?? ""} ${t.genre ?? ""}`.toLowerCase().includes(s)));
  }, [all, tab, q]);

  const progress = (label: string) => (d: number, n: number) => setBusy(`${label} ${d}/${n}`);

  const onImport = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      setBusy("Mengimport…");
      const tracks = await importFiles(files, progress("Mengimport"));
      L().upsertLocal(tracks);
      const bad = tracks.filter((t) => !t.local.canPlayHere).length;
      toast(`${tracks.length} lagu diimport${bad ? ` (${bad} format tidak disokong oleh pelayar ini)` : ""}`);
    } catch (e) {
      toast(`Import gagal: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onFolder = async () => {
    try {
      setBusy("Mengimbas folder…");
      const r = await addFolder(progress("Mengimbas"));
      L().upsertLocal(r.tracks, r.folderId);
      toast(`${r.tracks.length} lagu dikesan dalam "${r.name}"`);
      setFolders(await listFolders());
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast(`Imbasan gagal: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const onRescan = async () => {
    try {
      setBusy("Mengimbas semula…");
      const res = await rescanFolders(progress("Mengimbas"));
      let n = 0;
      for (const r of res) {
        if (r.denied) toast(`Akses ke "${r.name}" ditolak. Benarkan semula untuk imbas.`);
        else {
          L().upsertLocal(r.tracks, r.folderId);
          n += r.tracks.length;
        }
      }
      toast(res.length ? `Pustaka disegar semula: ${n} lagu dalam ${res.length} folder` : "Tiada folder diingati. Pilih folder dahulu.");
    } finally {
      setBusy(null);
    }
  };

  const removeSel = async (ids: string[]) => {
    const tracks = all.filter((t) => ids.includes(t.id));
    if (!confirm(`Buang ${tracks.length} lagu dari pustaka AURALYQO?\n\nFail asal pada peranti TIDAK akan dipadam.`)) return;
    for (const t of tracks) await removeFromLibrary(t);
    L().removeLocal(ids);
    setSel(new Set());
    toast(`${tracks.length} lagu dibuang dari pustaka (fail asal kekal)`);
  };

  const toggleSel = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Muzik Peranti</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Fail muzik anda kekal pada peranti ini dan tidak dimuat naik ke awan. Membuang lagu dari AURALYQO tidak memadam fail asal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (void onImport(e.target.files), (e.target.value = ""))} />
          <Btn onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <Upload className="h-4 w-4" /> Import fail
          </Btn>
          {canScan && (
            <Btn variant="ghost" onClick={onFolder} disabled={!!busy}>
              <FolderOpen className="h-4 w-4" /> Imbas folder
            </Btn>
          )}
          {canScan && folders.length > 0 && (
            <Btn variant="ghost" onClick={onRescan} disabled={!!busy}>
              <RefreshCw className={cx("h-4 w-4", busy && "animate-spin")} /> Imbas semula
            </Btn>
          )}
        </div>
      </div>

      {busy && <p className="mt-4 rounded-xl bg-card px-4 py-3 text-sm font-medium ring-1 ring-line">{busy}</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--radius)] bg-card p-4 ring-1 ring-line md:col-span-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4 text-acc" /> Cara muzik peranti dikesan
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li>
              <b className="text-fg">Android (app native):</b> imbasan automatik seluruh peranti melalui MediaStore selepas anda beri kebenaran &quot;Muzik dan audio&quot;.
            </li>
            <li>
              <b className="text-fg">iPhone/iPad:</b> iOS tidak membenarkan app membaca fail app lain. Guna &quot;Import fail&quot; dan pilih dari app Files.
            </li>
            <li>
              <b className="text-fg">Pelayar ini:</b> {canScan ? "boleh imbas folder pilihan anda dan imbas semula bila ada lagu baharu." : "guna \"Import fail\" (pilih banyak fail sekali gus). Imbasan folder tersedia pada Chrome/Edge desktop."}
            </li>
            <li>Format: {SUPPORTED_EXT.filter((x) => x !== "oga").map((x) => x.toUpperCase()).join(", ")}. Sokongan main balik bergantung pada pelayar/peranti.</li>
          </ul>
        </div>
        <div className="rounded-[var(--radius)] bg-card p-4 ring-1 ring-line">
          <p className="text-sm font-semibold">Storan peranti</p>
          <p className="mt-1 text-2xl font-bold">{all.length} lagu</p>
          {usage && <p className="text-xs text-muted">Diguna oleh app: {mb(usage.used)} daripada {mb(usage.quota)}</p>}
          {folders.length > 0 && (
            <div className="mt-3 space-y-1">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-xs">
                  <FolderSync className="h-3.5 w-3.5 text-acc" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    aria-label={`Lupakan folder ${f.name}`}
                    onClick={async () => {
                      await forgetFolder(f.id);
                      L().removeLocal(all.filter((t) => t.local.folderId === f.id).map((t) => t.id));
                      setFolders(await listFolders());
                      toast(`Folder "${f.name}" dilupakan (fail asal kekal)`);
                    }}
                    className="cursor-pointer text-faint hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {all.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Segmented
              label="Sumber"
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: `Semua (${all.length})` },
                { value: "local", label: `Folder peranti (${all.filter((t) => t.source === "local").length})` },
                { value: "imported", label: `Diimport (${all.filter((t) => t.source === "imported").length})` },
              ]}
            />
            <input className={cx(inputCls, "max-w-xs")} placeholder="Tapis tajuk, artis, album…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tapis muzik peranti" />
            <div className="ml-auto flex gap-2">
              <Btn variant="soft" onClick={() => usePlayer.getState().playList(list.filter((t) => t.playable), 0, { shuffle: false })} disabled={!list.length}>
                <Play className="h-4 w-4 fill-current" /> Main
              </Btn>
              <Btn variant="soft" onClick={() => usePlayer.getState().playList(list.filter((t) => t.playable), 0, { shuffle: true })} disabled={!list.length}>
                <Shuffle className="h-4 w-4" />
              </Btn>
            </div>
          </div>
          {sel.size > 0 && (
            <div className="glass sticky top-[72px] z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl p-2 ring-1 ring-line md:top-3">
              <span className="px-2 text-sm font-semibold">{sel.size} dipilih</span>
              <Btn
                variant="soft"
                onClick={() => {
                  const id = L().createPlaylist({ name: "Playlist tempatan", tracks: all.filter((t) => sel.has(t.id)) });
                  setSel(new Set());
                  router.push(`/playlist/${id}`);
                }}
              >
                <ListPlus className="h-4 w-4" /> Cipta playlist
              </Btn>
              <Btn variant="soft" onClick={() => usePlayer.getState().addToQueue(all.filter((t) => sel.has(t.id)))}>
                Tambah ke giliran
              </Btn>
              <Btn variant="danger" onClick={() => removeSel([...sel])}>
                <Trash2 className="h-4 w-4" /> Buang dari pustaka
              </Btn>
              <button onClick={() => setSel(new Set())} className="ml-auto cursor-pointer px-3 text-xs font-semibold text-muted">
                Batal
              </button>
            </div>
          )}
          <div className="mt-3">
            {list.map((t, i) => (
              <div key={t.id} className="flex items-center gap-1">
                <button aria-label={sel.has(t.id) ? `Nyahpilih ${t.title}` : `Pilih ${t.title}`} onClick={() => toggleSel(t.id)} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center text-faint hover:text-fg">
                  {sel.has(t.id) ? <CheckSquare className="h-4 w-4 text-acc" /> : <Square className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <TrackRow t={t} i={i} list={list} onRemove={() => removeSel([t.id])} removeLabel="Buang dari pustaka (fail kekal)" />
                </div>
                <button aria-label={`Edit metadata ${t.title}`} onClick={() => setEditing(t)} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-card-hover hover:text-fg">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!list.length && <p className="py-6 text-center text-sm text-muted">Tiada padanan.</p>}
          </div>
        </>
      ) : (
        <div className="mt-8">
          <Empty icon={<HardDrive className="h-6 w-6" />} title="Belum ada muzik peranti">
            Import lagu MP3, M4A, AAC, FLAC, WAV, OGG atau OPUS dari peranti anda. Ia akan dimainkan terus dari peranti, tanpa internet.
            <div className="mt-4 flex justify-center gap-2">
              <Btn onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> Import fail
              </Btn>
              {canScan && (
                <Btn variant="ghost" onClick={onFolder}>
                  <FolderOpen className="h-4 w-4" /> Imbas folder
                </Btn>
              )}
            </div>
          </Empty>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit metadata lagu">
        {editing && <MetaEditor t={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

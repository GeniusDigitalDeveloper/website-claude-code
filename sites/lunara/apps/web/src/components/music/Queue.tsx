"use client";
import { ListMusic, Save, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { usePlayer } from "@/store/player";
import { toast } from "@/store/toast";
import { Artwork, cx, Empty, fmt, IconBtn, inputCls, SourceBadge } from "../ui";
import { NowEq } from "./TrackRow";
import { SortableItem, SortableList } from "./Sortable";

export function QueueList() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const p = usePlayer.getState;
  const cur = queue[index];
  const upcoming = queue.slice(index + 1);
  const ids = upcoming.map((t, i) => `${t.id}#${index + 1 + i}`);

  if (!queue.length)
    return (
      <Empty icon={<ListMusic className="h-6 w-6" />} title="Giliran kosong">
        Main mana-mana lagu, atau guna &quot;Tambah ke giliran&quot; dari menu lagu.
      </Empty>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <h2 className="font-display text-base font-bold">Giliran</h2>
        <div className="flex gap-1">
          <IconBtn label="Simpan giliran sebagai playlist" size="sm" onClick={() => setSaving((s) => !s)}>
            <Save className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Kosongkan giliran" size="sm" onClick={() => (p().clearQueue(), toast("Giliran dikosongkan"))}>
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>
      {saving && (
        <form
          className="mb-3 flex gap-2 px-1"
          onSubmit={(e) => {
            e.preventDefault();
            p().saveQueueAsPlaylist(name || "Giliran saya");
            toast(`Giliran disimpan sebagai playlist "${name || "Giliran saya"}"`);
            setSaving(false);
            setName("");
          }}
        >
          <input autoFocus className={inputCls} placeholder="Nama playlist" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama playlist" />
          <button className="btn-luxe cursor-pointer rounded-xl px-3 text-sm font-bold">Simpan</button>
        </form>
      )}
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {cur && (
          <>
            <p className="px-1 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">Sedang dimainkan</p>
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-card p-2">
              <Artwork src={cur.artwork} alt="" className="h-11 w-11" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <NowEq paused={!playing} />
                  <p translate="no" className="truncate text-sm font-semibold text-acc">{cur.title}</p>
                </div>
                <p translate="no" className="truncate text-xs text-muted">{cur.artist}</p>
              </div>
            </div>
          </>
        )}
        <p className="px-1 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">Seterusnya · {upcoming.length}</p>
        <SortableList ids={ids} onMove={(a, b) => p().move(index + 1 + a, index + 1 + b)}>
          {upcoming.map((t, i) => (
            <SortableItem key={ids[i]} id={ids[i]} label={t.title}>
              {(handle) => (
                <div className="group flex items-center gap-2 rounded-xl p-1.5 hover:bg-card-hover">
                  {handle}
                  <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left" onClick={() => p().jumpTo(index + 1 + i)} aria-label={`Main ${t.title} dari giliran`}>
                    <Artwork src={t.artwork} alt="" className="h-10 w-10" rounded="rounded-lg" />
                    <span className="min-w-0">
                      <span translate="no" className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                        {t.artist} <SourceBadge t={t} />
                      </span>
                    </span>
                  </button>
                  <span className="text-xs tabular-nums text-faint">{fmt(t.duration)}</span>
                  <IconBtn label={`Buang ${t.title} dari giliran`} size="sm" onClick={() => p().removeAt(index + 1 + i)} className="opacity-60 group-hover:opacity-100">
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableList>
        {index > 0 && (
          <>
            <p className="mt-3 px-1 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">Sudah dimainkan</p>
            {queue.slice(0, index).map((t, i) => (
              <button key={`${t.id}-p${i}`} onClick={() => p().jumpTo(i)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left opacity-60 hover:bg-card-hover hover:opacity-100">
                <Artwork src={t.artwork} alt="" className="h-9 w-9" rounded="rounded-lg" />
                <span translate="no" className="min-w-0 truncate text-sm">{t.title}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function QueueDrawer() {
  const open = usePlayer((s) => s.queueOpen);
  return (
    <AnimatePresence>
      {open && (
        <motion.aside aria-label="Giliran lagu" initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className={cx("panel glass fixed top-3 right-3 bottom-24 z-50 hidden w-[380px] flex-col p-3 shadow-2xl md:flex")}>
          <div className="absolute top-2 right-2">
            <IconBtn label="Tutup giliran" size="sm" onClick={() => usePlayer.getState().setUi({ queueOpen: false })}>
              <X className="h-4 w-4" />
            </IconBtn>
          </div>
          <QueueList />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

"use client";
import { Download, Eye, EyeOff, PencilRuler, RotateCcw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ACCENTS, SECTION_KINDS, SECTION_LABEL, useLayout, type AccentId, type LayoutPreset, type LayoutState } from "@/store/layout";
import { useSettings } from "@/store/settings";
import { toast } from "@/store/toast";
import { SortableItem, SortableList } from "@/components/music/Sortable";
import { Btn, cx, inputCls, Segmented, Switch } from "@/components/ui";

const PRESETS: { id: LayoutPreset; name: string; desc: string }[] = [
  { id: "sidebar", name: "Sidebar", desc: "Navigasi kiri penuh, kad klasik, bar pemain di bawah." },
  { id: "bento", name: "Bento", desc: "Rel ikon, panel bulat, panel Sedang Dimainkan + Pustaka di kanan." },
  { id: "cinematic", name: "Cinematic", desc: "Navigasi atas, kad besar, pemain terapung. Sesuai skrin besar/TV." },
  { id: "compact", name: "Compact", desc: "Padat dan ringkas, lebih banyak lagu dalam satu skrin." },
];

/** Mini wireframe so users can see each preset before applying it. */
function PresetPreview({ id }: { id: LayoutPreset }) {
  const bar = <div className="absolute inset-x-1 bottom-1 h-2 rounded-sm bg-[color:var(--acc-via)]/60" />;
  return (
    <div className="relative h-24 overflow-hidden rounded-xl bg-bg ring-1 ring-line">
      {id === "sidebar" && (
        <>
          <div className="absolute top-1 bottom-4 left-1 w-7 rounded-sm bg-card-hover" />
          <div className="absolute top-1 right-1 left-10 h-6 rounded-sm bg-card" />
          <div className="absolute top-9 right-1 left-10 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-7 flex-1 rounded-sm bg-card" />
            ))}
          </div>
          {bar}
        </>
      )}
      {id === "bento" && (
        <>
          <div className="absolute top-1 bottom-4 left-1 w-3 rounded-full bg-card-hover" />
          <div className="absolute top-1 right-12 left-6 h-9 rounded-md bg-card" />
          <div className="absolute top-11 right-12 left-6 h-8 rounded-md bg-card" />
          <div className="absolute top-1 right-1 h-7 w-10 rounded-md bg-card-hover" />
          <div className="absolute top-9 right-1 bottom-4 w-10 rounded-md bg-card" />
          {bar}
        </>
      )}
      {id === "cinematic" && (
        <>
          <div className="absolute inset-x-1 top-1 h-2 rounded-sm bg-card-hover" />
          <div className="absolute inset-x-1 top-4 h-10 rounded-md bg-card" />
          <div className="absolute top-[60px] right-1 left-1 flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-5 flex-1 rounded-sm bg-card" />
            ))}
          </div>
          <div className="absolute right-6 bottom-1 left-6 h-2 rounded-full bg-[color:var(--acc-via)]/60" />
        </>
      )}
      {id === "compact" && (
        <>
          <div className="absolute inset-x-1 top-1 h-2 rounded-sm bg-card-hover" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="absolute right-1 left-1 h-1.5 rounded-sm bg-card" style={{ top: 6 + i * 9 + 6 }} />
          ))}
          {bar}
        </>
      )}
    </div>
  );
}

export default function Studio() {
  const L = useLayout();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const theme = useSettings((s) => s.theme);

  const exportLayout = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { set, moveSection, updateSection, applyPreset, reset, replace, editing, ...data } = useLayout.getState();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ auralyqoLayout: 1, ...data }, null, 2)], { type: "application/json" }));
    a.download = "auralyqo-layout.json";
    a.click();
  };
  const importLayout = async (f: File) => {
    try {
      const j = JSON.parse(await f.text()) as Partial<LayoutState> & { auralyqoLayout?: number };
      if (!j.auralyqoLayout || !Array.isArray(j.sections)) throw new Error("Bukan fail layout AURALYQO");
      const ok = j.sections.every((s) => s.id in SECTION_LABEL);
      if (!ok) throw new Error("Seksyen tidak dikenali");
      L.replace({ ...j, updatedAt: Date.now() });
      toast("Layout diimport");
    } catch (e) {
      toast(`Import gagal: ${(e as Error).message}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-5 md:px-8 md:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Layout Studio</h1>
          <p className="mt-1 text-sm text-muted">Layout AURALYQO bukan template kekal. Ubah apa sahaja: perubahan berlaku serta-merta, disimpan dan disegerak ke peranti lain.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => (L.set({ editing: true }), router.push("/"))}>
            <PencilRuler className="h-4 w-4" /> Edit terus di Utama
          </Btn>
          <Btn variant="ghost" onClick={exportLayout}>
            <Download className="h-4 w-4" /> Eksport
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => (e.target.files?.[0] && void importLayout(e.target.files[0]), (e.target.value = ""))} />
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import
          </Btn>
          <Btn variant="ghost" onClick={() => (L.reset(), toast("Layout dikembalikan ke asal"))}>
            <RotateCcw className="h-4 w-4" /> Asal
          </Btn>
        </div>
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-bold">Preset</h2>
        <p className="text-xs text-muted">Titik permulaan. Semua tetapan di bawah masih boleh diubah selepas memilih preset.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => L.applyPreset(p.id)} aria-pressed={L.preset === p.id} className={cx("cursor-pointer rounded-2xl p-3 text-left ring-2 transition", L.preset === p.id ? "bg-card ring-[color:var(--acc-via)]" : "ring-line hover:bg-card")}>
              <PresetPreview id={p.id} />
              <p className="mt-3 font-semibold">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-bold">Gaya</h2>
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Warna aksen</p>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(ACCENTS) as AccentId[]).map((k) => (
                  <button key={k} onClick={() => L.set({ accent: k })} aria-label={ACCENTS[k].name} aria-pressed={L.accent === k} title={ACCENTS[k].name} className={cx("h-10 w-10 cursor-pointer rounded-full ring-offset-2 ring-offset-[color:var(--panel)] transition", L.accent === k ? "ring-2 ring-fg" : "")} style={{ background: `linear-gradient(120deg, ${ACCENTS[k].from}, ${ACCENTS[k].via}, ${ACCENTS[k].to})` }} />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Tema</span>
              <Segmented label="Tema" value={theme} onChange={(v) => useSettings.getState().set({ theme: v })} options={[{ value: "light", label: "Cerah" }, { value: "dark", label: "Gelap" }, { value: "system", label: "Sistem" }]} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Saiz kad</span>
              <Segmented label="Saiz kad" value={L.cardSize} onChange={(v) => L.set({ cardSize: v })} options={[{ value: "s", label: "Kecil" }, { value: "m", label: "Sederhana" }, { value: "l", label: "Besar" }]} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Kepadatan</span>
              <Segmented label="Kepadatan" value={L.density} onChange={(v) => L.set({ density: v })} options={[{ value: "comfortable", label: "Selesa" }, { value: "compact", label: "Padat" }]} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Kebulatan sudut</span>
                <span className="text-xs text-muted">{L.radius}px</span>
              </div>
              <input type="range" className="range mt-2 w-full" min={0} max={32} value={L.radius} onChange={(e) => L.set({ radius: Number(e.target.value) })} aria-label="Kebulatan sudut" style={{ ["--pct" as string]: `${(L.radius / 32) * 100}%` }} />
            </div>
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-lg font-bold">Struktur</h2>
          <div className="mt-1 divide-y divide-[color:var(--line)]">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm font-medium">Kedudukan sidebar</span>
              <Segmented label="Kedudukan sidebar" value={L.sidebarSide} onChange={(v) => L.set({ sidebarSide: v })} options={[{ value: "left", label: "Kiri" }, { value: "right", label: "Kanan" }]} />
            </div>
            <Switch checked={L.sidebarCollapsed} onChange={(v) => L.set({ sidebarCollapsed: v })} label="Sidebar kecil (ikon sahaja)" desc="Untuk preset Sidebar." />
            <Switch checked={L.showRightPanel} onChange={(v) => L.set({ showRightPanel: v })} label="Panel kanan: Sedang Dimainkan & Pustaka" desc="Untuk preset Bento, skrin ≥ 1280px." />
            <div className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-sm font-medium">Gaya pemain</span>
              <Segmented label="Gaya pemain" value={L.playerStyle} onChange={(v) => L.set({ playerStyle: v })} options={[{ value: "bar", label: "Bar penuh" }, { value: "floating", label: "Terapung" }]} />
            </div>
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-bold">Seksyen halaman Utama</h2>
        <p className="text-xs text-muted">Seret untuk susun. Tukar tajuk, gaya paparan, atau sorok seksyen.</p>
        <div className="mt-4 space-y-2">
          <SortableList ids={L.sections.map((s) => s.id)} onMove={L.moveSection}>
            {L.sections.map((s) => (
              <SortableItem key={s.id} id={s.id} label={SECTION_LABEL[s.id]}>
                {(h) => (
                  <div className={cx("flex flex-wrap items-center gap-2 rounded-xl bg-card p-2 ring-1 ring-line", !s.visible && "opacity-55")}>
                    {h}
                    <input className={cx(inputCls, "w-48 py-1.5")} value={s.title ?? ""} placeholder={SECTION_LABEL[s.id]} aria-label={`Tajuk ${SECTION_LABEL[s.id]}`} onChange={(e) => L.updateSection(s.id, { title: e.target.value || undefined })} />
                    {SECTION_KINDS[s.id].length > 1 && <Segmented label={`Gaya ${SECTION_LABEL[s.id]}`} value={s.kind} onChange={(k) => L.updateSection(s.id, { kind: k })} options={SECTION_KINDS[s.id].map((k) => ({ value: k, label: { row: "Baris", grid: "Grid", list: "Senarai", hero: "Hero", circles: "Bulat" }[k] }))} />}
                    <button onClick={() => L.updateSection(s.id, { visible: !s.visible })} aria-label={s.visible ? `Sorok ${SECTION_LABEL[s.id]}` : `Tunjuk ${SECTION_LABEL[s.id]}`} className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full ring-1 ring-line hover:bg-card-hover">
                      {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableList>
        </div>
      </section>
    </div>
  );
}

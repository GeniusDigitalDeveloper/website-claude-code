"use client";
import { Check, Eye, EyeOff, LayoutDashboard, PencilRuler, RotateCcw } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { SECTION_KINDS, SECTION_LABEL, useLayout, type LayoutPreset, type SectionKind } from "@/store/layout";
import { SortableItem, SortableList } from "../music/Sortable";
import { cx, inputCls, Segmented } from "../ui";
import { SECTION_COMPONENT, SECTION_LINK, SectionActions, SectionHead } from "./Sections";

const KIND_LABEL: Record<SectionKind, string> = { row: "Baris", grid: "Grid", list: "Senarai", hero: "Hero", circles: "Bulat" };
export const PRESET_LABEL: Record<LayoutPreset, string> = { sidebar: "Sidebar", bento: "Bento", cinematic: "Cinematic", compact: "Compact" };

export function HomeView() {
  const sections = useLayout((s) => s.sections);
  const editing = useLayout((s) => s.editing);
  const preset = useLayout((s) => s.preset);
  const density = useLayout((s) => s.density);
  const L = useLayout.getState;
  const ids = sections.map((s) => s.id);
  const shown = editing ? sections : sections.filter((s) => s.visible);

  return (
    <div className={cx("relative px-4 pt-5 md:px-8 md:pt-7", density === "compact" ? "space-y-6" : "space-y-9")}>
      <div className="aurora" aria-hidden>
        <span className="top-0 left-[5%] h-72 w-72" style={{ background: "var(--acc-from)" }} />
        <span className="top-10 left-[40%] h-80 w-80" style={{ background: "var(--acc-via)", animationDelay: "-6s" }} />
        <span className="top-0 right-[5%] h-72 w-72" style={{ background: "var(--acc-to)", animationDelay: "-12s" }} />
      </div>

      {/* layout editing toolbar */}
      <div className={cx("relative z-10 flex flex-wrap items-center gap-2", editing ? "panel glass sticky top-[72px] p-3 shadow-xl md:top-3" : "justify-end")}>
        {editing ? (
          <>
            <PencilRuler className="h-4 w-4 text-acc" />
            <span className="mr-2 text-sm font-semibold">Edit layout: seret untuk susun, ikon mata untuk sorok</span>
            <Segmented label="Preset layout" value={preset} onChange={(p) => L().applyPreset(p)} options={(Object.keys(PRESET_LABEL) as LayoutPreset[]).map((v) => ({ value: v, label: PRESET_LABEL[v] }))} />
            <div className="ml-auto flex gap-2">
              <button onClick={() => L().reset()} className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-card">
                <RotateCcw className="h-3.5 w-3.5" /> Asal
              </button>
              <Link href="/studio" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-card">
                <LayoutDashboard className="h-3.5 w-3.5" /> Studio penuh
              </Link>
              <button onClick={() => L().set({ editing: false })} className="grad-bg flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white">
                <Check className="h-3.5 w-3.5" /> Siap
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => L().set({ editing: true })} className="glass flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-card">
            <PencilRuler className="h-3.5 w-3.5" /> Edit layout
          </button>
        )}
      </div>

      <SortableList ids={ids} onMove={(a, b) => L().moveSection(a, b)}>
        <div className={cx("relative flex flex-col", density === "compact" ? "gap-6" : "gap-10")}>
          {shown.map((sec) => {
            const Comp = SECTION_COMPONENT[sec.id];
            const title = sec.title || SECTION_LABEL[sec.id];
            const body = (handle?: React.ReactNode) => (
              <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45 }} aria-label={title} className={cx(editing && "rounded-[var(--radius)] p-3 outline-2 outline-dashed outline-[color:var(--acc-via)]", editing && !sec.visible && "opacity-45")}>
                {editing && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {handle}
                    <input className={cx(inputCls, "max-w-[220px] py-1.5")} value={sec.title ?? ""} placeholder={SECTION_LABEL[sec.id]} aria-label={`Tajuk untuk ${SECTION_LABEL[sec.id]}`} onChange={(e) => L().updateSection(sec.id, { title: e.target.value || undefined })} />
                    {SECTION_KINDS[sec.id].length > 1 && (
                      <Segmented label={`Gaya ${SECTION_LABEL[sec.id]}`} value={sec.kind} onChange={(k) => L().updateSection(sec.id, { kind: k })} options={SECTION_KINDS[sec.id].map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
                    )}
                    <button onClick={() => L().updateSection(sec.id, { visible: !sec.visible })} aria-label={sec.visible ? `Sorok ${title}` : `Tunjuk ${title}`} className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-full ring-1 ring-line hover:bg-card">
                      {sec.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                )}
                {sec.id !== "greeting" && <SectionHead title={title} href={SECTION_LINK[sec.id]} action={<SectionActions id={sec.id} />} />}
                <Comp kind={sec.kind} />
              </motion.section>
            );
            return editing ? (
              <SortableItem key={sec.id} id={sec.id} label={title}>
                {(h) => body(h)}
              </SortableItem>
            ) : (
              <div key={sec.id}>{body()}</div>
            );
          })}
        </div>
      </SortableList>
      <p className="pb-4 text-center text-[11px] text-faint">Katalog &amp; pratonton 30s oleh Deezer API · Tanpa iklan</p>
    </div>
  );
}

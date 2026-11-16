"use client";
export type LtTpl = "news" | "emerald" | "glass" | "dark";
export const LT_TEMPLATES: { id: LtTpl; label: string; desc: string }[] = [
  { id: "news", label: "Modern Broadcast (Siaran TV Berita)", desc: "Panel gelap penuh dengan bar hebahan merah." },
  { id: "emerald", label: "Islamic Emerald & Gold (Klasik)", desc: "Hijau zamrud dan emas, sesuai suasana masjid." },
  { id: "glass", label: "Minimalist Floating Glass (Lower-Third)", desc: "Kaca terapung kemas di bucu bawah." },
  { id: "dark", label: "Dark Panel Informasi (Kuliah & Tazkirah)", desc: "Panel hitam dengan jalur aksen." },
];
type P = { tpl?: string; session?: string; speaker?: string; role?: string; topic?: string; ticker?: string; small?: boolean };
/** Panel maklumat penceramah dan bar hebahan (lower-third). Digunakan di TV dan pratonton panel. */
export default function LowerThird({ tpl = "news", session, speaker, role, topic, ticker, small = false }: P) {
  const t = (["news", "emerald", "glass", "dark"].includes(tpl) ? tpl : "news") as LtTpl;
  const sz = small ? { s: "text-[10px]", n: "text-sm", r: "text-[10px]", t: "text-xs", k: "text-[10px]" } : { s: "text-xs md:text-base", n: "text-xl md:text-5xl", r: "text-sm md:text-2xl", t: "text-sm md:text-3xl", k: "text-sm md:text-2xl" };
  const box: Record<LtTpl, string> = {
    news: "bg-slate-950/85 text-white backdrop-blur", emerald: "text-white", glass: "border-white/25 bg-white/15 text-white backdrop-blur-xl", dark: "bg-black/85 text-white border-l-8 border-red-600",
  };
  const style = t === "emerald" ? { background: "linear-gradient(135deg, rgba(6,78,59,.94), rgba(2,44,34,.94))", boxShadow: "inset 0 2px 0 #fcd34d" } : undefined;
  const bar: Record<LtTpl, string> = { news: "bg-red-600", emerald: "bg-emerald-900", glass: "bg-white/20 backdrop-blur-xl", dark: "bg-red-600" };
  const tag: Record<LtTpl, string> = { news: "bg-red-800", emerald: "bg-yellow-400 text-black", glass: "bg-white/25", dark: "bg-black" };
  return (
    <div className="absolute inset-x-0 bottom-0">
      <div className={`${small ? "mx-2 mb-1 p-2" : "mx-3 mb-2 p-3 md:mx-8 md:mb-3 md:p-5"} ${t === "glass" ? "w-fit max-w-[80%] rounded-3xl border" : "rounded-2xl"} ${box[t]}`} style={style}>
        {session && <p className={`${sz.s} font-extrabold uppercase tracking-widest`} style={{ color: t === "emerald" ? "#fcd34d" : "var(--acc, #fcd34d)" }}>{session}</p>}
        <h2 className={`${sz.n} font-extrabold uppercase leading-tight`}>{speaker || "Nama penceramah"}</h2>
        {role && <p className={`${sz.r} font-semibold text-white/85`}>{role}</p>}
        {topic && <p className={`${sz.t} mt-1 font-bold`}>{topic}</p>}
      </div>
      {ticker && <div className={`flex items-stretch overflow-hidden text-white ${bar[t]} ${t === "glass" ? (small ? "mx-2 mb-1 rounded-full" : "mx-3 mb-2 rounded-full md:mx-8 md:mb-3") : ""}`}><span className={`shrink-0 px-3 py-2 font-extrabold tracking-widest ${tag[t]} ${small ? "text-[9px]" : "text-xs md:px-6 md:text-xl"}`}>HEBAHAN</span><div className={`min-w-0 flex-1 overflow-hidden py-2 font-semibold ${sz.k}`}><div className="marquee px-4" style={{ ["--dur" as string]: "28s" }}>{ticker}</div></div></div>}
    </div>);
}

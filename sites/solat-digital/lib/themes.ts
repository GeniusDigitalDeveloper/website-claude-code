export type Theme = { id: string; label: string; vars: Record<string, string>; swatch: [string, string] };
/** Tema TV. Pembolehubah CSS dibaca oleh kelas kaca (globals.css). */
export const THEMES: Theme[] = [
  { id: "ios", label: "iOS Kaca (lalai)", swatch: ["#fcd34d", "#0f172a"], vars: { "--acc": "#fcd34d", "--tint": "rgba(15,23,42,.42)", "--ov1": "rgba(2,6,23,.70)", "--ov2": "rgba(2,6,23,.42)", "--ov3": "rgba(2,6,23,.85)", "--glow": "251,191,36", "--sl1": "rgba(6,78,59,.55)", "--sl2": "rgba(15,23,42,.55)" } },
  { id: "zamrud", label: "Zamrud", swatch: ["#86efac", "#022c22"], vars: { "--acc": "#86efac", "--tint": "rgba(2,44,34,.52)", "--ov1": "rgba(2,30,22,.72)", "--ov2": "rgba(2,30,22,.40)", "--ov3": "rgba(2,30,22,.88)", "--glow": "52,211,153", "--sl1": "rgba(4,120,87,.55)", "--sl2": "rgba(2,44,34,.60)" } },
  { id: "midnight", label: "Malam Biru", swatch: ["#67e8f9", "#0b1b4d"], vars: { "--acc": "#67e8f9", "--tint": "rgba(8,20,70,.52)", "--ov1": "rgba(5,12,45,.72)", "--ov2": "rgba(5,12,45,.40)", "--ov3": "rgba(5,12,45,.88)", "--glow": "96,165,250", "--sl1": "rgba(29,78,216,.45)", "--sl2": "rgba(8,20,70,.60)" } },
  { id: "emas", label: "Emas Diraja", swatch: ["#fbbf24", "#291806"], vars: { "--acc": "#fbbf24", "--tint": "rgba(41,24,6,.55)", "--ov1": "rgba(28,16,4,.74)", "--ov2": "rgba(28,16,4,.42)", "--ov3": "rgba(28,16,4,.88)", "--glow": "245,158,11", "--sl1": "rgba(146,64,14,.50)", "--sl2": "rgba(41,24,6,.60)" } },
  { id: "ungu", label: "Senja Ungu", swatch: ["#f0abfc", "#2e1050"], vars: { "--acc": "#f0abfc", "--tint": "rgba(46,16,80,.52)", "--ov1": "rgba(30,10,55,.74)", "--ov2": "rgba(30,10,55,.42)", "--ov3": "rgba(30,10,55,.88)", "--glow": "192,132,252", "--sl1": "rgba(126,34,206,.45)", "--sl2": "rgba(46,16,80,.60)" } },
];
export const themeVars = (id?: string) => (THEMES.find((t) => t.id === id) ?? THEMES[0]).vars;

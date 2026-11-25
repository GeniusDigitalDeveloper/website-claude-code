/**
 * Colour themes. Every theme is LIGHT (near-black text) except Night mode, which uses the same
 * hue on a dark background with WHITE text. Text colours are chosen for ≥4.5:1 contrast.
 * `themeVars` must stay self-contained: it is also serialised into the pre-paint <script> in layout.tsx.
 */
export interface ThemeDef {
  id: string;
  name: string;
  hue: number;
  sat: number; // background tint saturation (0-100)
  acc: [string, string, string]; // gradient stops used behind white text (kept dark enough for contrast)
}

export const THEMES: ThemeDef[] = [
  { id: "lunara", name: "Biru Air", hue: 200, sat: 85, acc: ["#0891b2", "#2563eb", "#7c3aed"] },
  { id: "pink", name: "Pink", hue: 330, sat: 80, acc: ["#db2777", "#be185d", "#9d174d"] },
  { id: "biru", name: "Biru", hue: 214, sat: 80, acc: ["#0284c7", "#2563eb", "#1d4ed8"] },
  { id: "hijau", name: "Hijau", hue: 152, sat: 55, acc: ["#059669", "#047857", "#065f46"] },
  { id: "ungu", name: "Ungu", hue: 276, sat: 70, acc: ["#9333ea", "#7e22ce", "#6b21a8"] },
  { id: "oren", name: "Oren", hue: 26, sat: 85, acc: ["#ea580c", "#c2410c", "#9a3412"] },
  { id: "merah", name: "Merah", hue: 352, sat: 75, acc: ["#e11d48", "#be123c", "#9f1239"] },
  { id: "teal", name: "Teal", hue: 176, sat: 55, acc: ["#0d9488", "#0f766e", "#115e59"] },
  { id: "kuning", name: "Kuning", hue: 44, sat: 90, acc: ["#d97706", "#b45309", "#92400e"] },
  { id: "kelabu", name: "Kelabu", hue: 220, sat: 15, acc: ["#475569", "#334155", "#1e293b"] },
];

export function themeVars(t: { hue: number; sat: number; acc: string[] }, night: boolean): Record<string, string> {
  const h = t.hue;
  const s = t.sat;
  const hsl = (sat: number, l: number, a?: number) => (a === undefined ? `hsl(${h} ${sat}% ${l}%)` : `hsl(${h} ${sat}% ${l}% / ${a})`);
  if (night)
    return {
      "--bg": hsl(Math.min(s, 45), 7),
      "--bg-2": hsl(Math.min(s, 40), 10),
      "--panel": "rgb(255 255 255 / 0.07)",
      "--panel-strong": hsl(Math.min(s, 35), 12, 0.94),
      "--card": "rgb(255 255 255 / 0.07)",
      "--card-hover": "rgb(255 255 255 / 0.13)",
      "--line": "rgb(255 255 255 / 0.14)",
      "--fg": "#ffffff",
      "--muted": hsl(Math.min(s, 25), 84),
      "--faint": hsl(Math.min(s, 18), 72),
      "--glass": hsl(Math.min(s, 40), 11, 0.84),
      "--glass-edge": "rgb(255 255 255 / 0.14)",
      "--shadow": "0 18px 40px -18px rgb(0 0 0 / 0.7)",
      "--acc-from": t.acc[0],
      "--acc-via": t.acc[1],
      "--acc-to": t.acc[2],
      "--acc-solid": hsl(Math.max(s, 60), 82),
      "--bg-grad": `linear-gradient(140deg, ${hsl(Math.min(s, 50), 8)} 0%, hsl(${h + 40} 45% 12%) 100%)`,
      "--orb-a": hsl(70, 35),
      "--orb-b": `hsl(${h + 40} 70% 40%)`,
      "--btn-a": t.acc[0],
      "--btn-b": t.acc[2],
    };
  const lunara = t.acc[0] === "#0891b2";
  return {
    "--bg": hsl(s, 93),
    "--bg-2": hsl(s, 88),
    // frosted glass: translucent white over the coloured page, blurred by the .panel utility
    "--panel": hsl(s, 99, 0.4),
    "--panel-strong": hsl(s, 99, 0.9),
    "--card": hsl(s, 99, 0.36),
    "--card-hover": hsl(s, 99, 0.58),
    "--line": "rgb(255 255 255 / 0.62)",
    "--fg": "#0b0b12",
    "--muted": hsl(Math.min(s, 15), 28),
    "--faint": hsl(Math.min(s, 12), 38),
    // floating bars (player, header, toasts) sit over content, so they are more opaque
    "--glass": hsl(s, 98, 0.8),
    "--glass-edge": "rgb(255 255 255 / 0.85)",
    "--shadow": "0 10px 30px -12px rgb(20 20 40 / 0.18)",
    "--acc-from": t.acc[0],
    "--acc-via": t.acc[1],
    "--acc-to": t.acc[2],
    "--acc-solid": hsl(Math.max(s, 65), 30),
    // soft page wash: the default "Biru Air" theme blends aqua into purple, others use their own hue
    // page colour behind the glass: light aqua-blue flowing into a deeper purple (default theme)
    "--bg-grad": lunara
      ? "linear-gradient(135deg, #c4ecff 0%, #a9cdff 32%, #ae9cf1 68%, #8a68dc 100%)"
      : `linear-gradient(140deg, ${hsl(s, 91)} 0%, ${hsl(s, 84)} 55%, hsl(${h + 35} ${s}% 78%) 100%)`,
    "--orb-a": lunara ? "#5ad1f5" : hsl(s, 70),
    "--orb-b": lunara ? "#6d3fd6" : `hsl(${h + 35} ${s}% 62%)`,
    "--btn-a": lunara ? "#2f6fe4" : t.acc[0],
    "--btn-b": lunara ? "#6a2fd0" : t.acc[2],
  };
}

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

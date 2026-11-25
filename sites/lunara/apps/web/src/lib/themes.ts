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
      "--panel": hsl(Math.min(s, 35), 11),
      "--card": hsl(Math.min(s, 32), 15),
      "--card-hover": hsl(Math.min(s, 30), 20),
      "--line": "rgb(255 255 255 / 0.1)",
      "--fg": "#ffffff",
      "--muted": hsl(Math.min(s, 25), 84),
      "--faint": hsl(Math.min(s, 18), 72),
      "--glass": hsl(Math.min(s, 40), 11, 0.72),
      "--glass-edge": "rgb(255 255 255 / 0.14)",
      "--shadow": "0 18px 40px -18px rgb(0 0 0 / 0.7)",
      "--acc-from": t.acc[0],
      "--acc-via": t.acc[1],
      "--acc-to": t.acc[2],
      "--acc-solid": hsl(Math.max(s, 60), 82),
      "--bg-grad": "none",
    };
  return {
    "--bg": hsl(s, 97),
    "--bg-2": hsl(s, 94),
    "--panel": "#ffffff",
    "--card": hsl(Math.min(s, 60), 95),
    "--card-hover": hsl(Math.min(s, 55), 91),
    "--line": hsl(30, 20, 0.12),
    "--fg": "#0b0b12",
    "--muted": hsl(Math.min(s, 15), 28),
    "--faint": hsl(Math.min(s, 12), 38),
    "--glass": hsl(s, 99, 0.7),
    "--glass-edge": "rgb(255 255 255 / 0.75)",
    "--shadow": "0 10px 30px -12px rgb(20 20 40 / 0.18)",
    "--acc-from": t.acc[0],
    "--acc-via": t.acc[1],
    "--acc-to": t.acc[2],
    "--acc-solid": hsl(Math.max(s, 65), 30),
    // soft page wash: the default "Biru Air" theme blends aqua into purple, others use their own hue
    "--bg-grad": t.acc[0] === "#0891b2" ? "linear-gradient(135deg, hsl(190 95% 95%) 0%, hsl(215 95% 96%) 45%, hsl(265 85% 96%) 100%)" : `linear-gradient(160deg, ${hsl(s, 97)}, ${hsl(s, 93)})`,
  };
}

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

import type { SlideItem } from "./types";
/** Font untuk teks slaid. Latin/Melayu: Google Fonts. Arab: Amiri dan Aref Ruqaa (Google Fonts); Traditional Arabic dan Sakkal Majalla ialah font Microsoft
 *  (tidak boleh diedarkan semula) jadi dipakai jika dipasang pada peranti TV, sandaran Amiri jika tiada. */
export const SLIDE_FONTS = ["Plus Jakarta Sans", "Poppins", "Montserrat", "Nunito", "Rubik", "Oswald", "Raleway", "Lora", "Merriweather", "Playfair Display", "Lobster", "Dancing Script"];
export const SLIDE_AR_FONTS: { id: string; label: string; css: string; google?: string; note?: string }[] = [
  { id: "amiri", label: "Amiri (Naskh)", css: '"Amiri", serif', google: "Amiri" },
  { id: "ruqaah", label: "Ruqʿah (Aref Ruqaa)", css: '"Aref Ruqaa", "Amiri", serif', google: "Aref Ruqaa" },
  { id: "trad", label: "Traditional Arabic", css: '"Traditional Arabic", "Amiri", serif', note: "Font Microsoft: dipaparkan jika dipasang pada peranti TV, jika tidak guna Amiri." },
  { id: "sakkal", label: "Sakkal Majalla", css: '"Sakkal Majalla", "Amiri", serif', note: "Font Microsoft: dipaparkan jika dipasang pada peranti TV, jika tidak guna Amiri." },
];
export const SLIDE_SIZES: { v: number; label: string }[] = [{ v: 0.75, label: "Kecil" }, { v: 1, label: "Sederhana" }, { v: 1.25, label: "Besar" }, { v: 1.5, label: "Sangat besar" }];
export const arCss = (id?: string) => (SLIDE_AR_FONTS.find((f) => f.id === id) ?? SLIDE_AR_FONTS[0]).css;
/** Muatkan fon Google yang digunakan oleh senarai slaid. */
export function loadSlideFonts(slides: SlideItem[]) {
  if (typeof document === "undefined") return;
  const fam = new Set<string>(); let ar = false;
  for (const s of slides) { if (s.font) fam.add(s.font); if (s.ar?.trim()) { const g = (SLIDE_AR_FONTS.find((f) => f.id === (s.arFont ?? "amiri")) ?? SLIDE_AR_FONTS[0]).google; if (g) fam.add(g); fam.add("Amiri"); ar = true; } }
  if (!fam.size) return; void ar;
  const id = "sd-slide-fonts"; let l = document.getElementById(id) as HTMLLinkElement | null; if (!l) { l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; document.head.appendChild(l); }
  const href = `https://fonts.googleapis.com/css2?${[...fam].sort().map((f) => "family=" + encodeURIComponent(f).replace(/%20/g, "+") + ":wght@400;700").join("&")}&display=swap`;
  if (l.href !== href) l.href = href;
}

import type { CustomFont } from "./types";
/** Muatkan font Thuluth pilihan dan pulangkan nama family CSS. `custom:<id>` = font Thuluth tersuai admin besar (URL).
 *  Huruf yang tiada dalam font Thuluth jatuh ke sandaran berkaligrafi (Aref Ruqaa) supaya tetap berbaris. */
export function ensureArabicFont(choice: string, custom: CustomFont[] = []): string {
  if (typeof document === "undefined") return "Arabic Honorifics Complete";
  if (!document.getElementById("sd-ar-fallback")) { const l = document.createElement("link"); l.id = "sd-ar-fallback"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&display=swap"; document.head.appendChild(l); }
  if (choice.startsWith("custom:")) {
    const f = custom.find((c) => "custom:" + c.id === choice); if (!f) return "Arabic Honorifics Complete";
    const fam = "SD-" + f.id;
    if (![...document.fonts].some((x) => x.family.replace(/"/g, "") === fam)) { const ff = new FontFace(fam, `url(${f.url})`); ff.load().then((l) => document.fonts.add(l)).catch(() => {}); }
    return fam;
  }
  return "Arabic Honorifics Complete";
}

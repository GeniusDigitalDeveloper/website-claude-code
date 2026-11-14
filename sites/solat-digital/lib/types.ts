export type SlideItem = { id: string; kind: "hadis" | "ayat" | "hikmah" | "ulama" | "jumaat" | "umum"; title?: string; text: string; source?: string; on: boolean; jumaat?: boolean };
export type Announcement = { id: string; text: string; on: boolean };
export type ElStyle = { font?: string; color?: string; border?: string };
export type TvDoc = {
  name: string; state: string; zone: string; country: string; // zone "" = auto
  azanId: string; announcements: Announcement[]; slides: string[]; anim: "kenburns" | "zoomout" | "fade"; secs: number;
  plan: "demo" | "full"; ownerUid: string; updatedAt?: number;
  preMin?: number; font?: string; arabicFont?: string; azanMute?: boolean; jumaatTime?: string; slideList?: SlideItem[]; slideAnim?: "fade" | "slide" | "up" | "zoom" | "flip"; slideSecs?: number;
  ringtone?: "chime" | "bell" | "beep" | "off"; ringRepeat?: number; azanDelayMin?: number; volume?: number;
  theme?: string; styles?: Record<string, ElStyle>; azanByPrayer?: Record<string, string>;
};
export type Registry = { name: string; address: string; city: string; postcode: string; state: string; zone: string; country: string; managerName: string; email: string; createdAt: number };
export type AzanDoc = { name: string; credit: string; url: string; fajrUrl?: string; active: boolean; prayers?: string[] };
export const DEMO_TV: TvDoc = { name: "Masjid Demo", state: "", zone: "", country: "Malaysia", azanId: "", announcements: [], slides: [], anim: "kenburns", secs: 10, plan: "demo", ownerUid: "", preMin: 5, font: "", azanMute: false, jumaatTime: "", slideAnim: "fade", slideSecs: 10, ringtone: "chime", ringRepeat: 1, azanDelayMin: 0, volume: 100, theme: "", styles: {} };
export const uid = () => Math.random().toString(36).slice(2, 9);
export const FONTS = ["Plus Jakarta Sans", "Poppins", "Montserrat", "Nunito", "Rubik", "Oswald"];
export const SLIDE_ANIMS: { id: NonNullable<TvDoc["slideAnim"]>; label: string }[] = [
  { id: "fade", label: "Pudar (fade)" }, { id: "slide", label: "Tolak dari kanan" }, { id: "up", label: "Naik dari bawah" }, { id: "zoom", label: "Zum masuk" }, { id: "flip", label: "Pusing (flip)" },
];
export const KIND_LABEL: Record<SlideItem["kind"], string> = { hadis: "Hadis", ayat: "Ayat al-Quran", hikmah: "Kata hikmah", ulama: "Kata ulama", jumaat: "Khas Jumaat", umum: "Pengumuman" };
export type CustomFont = { id: string; name: string; url: string; credit: string };
/** Tetapan paparan TV (peringkat sistem, ditetapkan Owner). */
export type TvSettings = { font?: string; arabicFont?: string; theme?: string; hijriMode?: "maghrib" | "jakim"; features?: { slides?: boolean; ticker?: boolean; hijri?: boolean; banner?: boolean }; platformSlides?: SlideItem[] };
/** Tetapan panel Pengurus Masjid (Owner boleh buka/tutup bahagian). */
export type PanelSettings = { notice?: string; styleEditor?: boolean; slides?: boolean; announcements?: boolean; images?: boolean; theme?: boolean };
export type Defaults = TvSettings & { customFonts?: CustomFont[]; panel?: PanelSettings; betaIds?: string[]; beta?: TvSettings & { panel?: PanelSettings } };
/** Tetapan berkesan untuk satu masjid: lalai + (jika masjid dalam senarai Beta, tindih dengan tetapan Beta). */
export function effective(d: Defaults | undefined, mid: string): Defaults {
  const base = d ?? {}; if (!mid || !base.betaIds?.includes(mid) || !base.beta) return base;
  const { panel: bp, ...bt } = base.beta;
  return { ...base, ...bt, features: { ...base.features, ...bt.features }, panel: { ...base.panel, ...bp } };
}
export const ARABIC_FONTS: { id: string; label: string; group: string }[] = [
  { id: "honorifics", label: "Thuluth (Arabic Honorifics Complete)", group: "Thuluth" },
];
export const PRAYER_OPTS = [["fajr", "Subuh"], ["dhuhr", "Zuhur"], ["asr", "Asar"], ["maghrib", "Maghrib"], ["isha", "Isyak"], ["jumaat", "Jumaat"]] as const;
export type ChatMeta = { name: string; lastText: string; lastAt: number; lastFrom: "owner" | "masjid"; unreadOwner: number; unreadMasjid: number };
export type ChatMsg = { from: "owner" | "masjid"; text: string; tag?: string; at: number };

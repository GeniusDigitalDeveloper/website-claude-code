export type SlideItem = { id: string; kind: "hadis" | "ayat" | "hikmah" | "ulama" | "jumaat" | "umum"; title?: string; text: string; source?: string; on: boolean; jumaat?: boolean };
export type Announcement = { id: string; text: string; on: boolean };
export type TvDoc = {
  name: string; state: string; zone: string; country: string; // zone "" = auto
  azanId: string; announcements: Announcement[]; slides: string[]; anim: "kenburns" | "zoomout" | "fade"; secs: number;
  plan: "demo" | "full"; ownerUid: string; updatedAt?: number;
  preMin?: number; font?: string; azanMute?: boolean; jumaatTime?: string; slideList?: SlideItem[]; slideAnim?: "fade" | "slide" | "up" | "zoom" | "flip"; slideSecs?: number; ringtone?: "chime" | "bell" | "beep" | "off"; ringRepeat?: number; azanDelayMin?: number; volume?: number;
};
export type Registry = { name: string; address: string; city: string; postcode: string; state: string; zone: string; country: string; managerName: string; email: string; createdAt: number };
export type AzanDoc = { name: string; credit: string; url: string; fajrUrl?: string; active: boolean };
export const DEMO_TV: TvDoc = { name: "Masjid Demo", state: "", zone: "", country: "Malaysia", azanId: "", announcements: [], slides: [], anim: "kenburns", secs: 10, plan: "demo", ownerUid: "", preMin: 5, font: "", azanMute: false, jumaatTime: "", slideAnim: "fade", slideSecs: 10, ringtone: "chime", ringRepeat: 1, azanDelayMin: 0, volume: 100 };
export const uid = () => Math.random().toString(36).slice(2, 9);
export const FONTS = ["Plus Jakarta Sans", "Poppins", "Montserrat", "Nunito", "Rubik", "Oswald"];
export const SLIDE_ANIMS: { id: NonNullable<TvDoc["slideAnim"]>; label: string }[] = [
  { id: "fade", label: "Pudar (fade)" }, { id: "slide", label: "Tolak dari kanan" }, { id: "up", label: "Naik dari bawah" }, { id: "zoom", label: "Zum masuk" }, { id: "flip", label: "Pusing (flip)" },
];
export const KIND_LABEL: Record<SlideItem["kind"], string> = { hadis: "Hadis", ayat: "Ayat al-Quran", hikmah: "Kata hikmah", ulama: "Kata ulama", jumaat: "Khas Jumaat", umum: "Pengumuman" };

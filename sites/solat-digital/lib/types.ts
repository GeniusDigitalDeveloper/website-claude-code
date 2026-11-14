export type Announcement = { id: string; text: string; on: boolean };
export type TvDoc = {
  name: string; state: string; zone: string; country: string; // zone "" = auto
  azanId: string; announcements: Announcement[]; slides: string[]; anim: "kenburns" | "zoomout" | "fade"; secs: number;
  plan: "demo" | "full"; ownerUid: string; updatedAt?: number;
};
export type Registry = { name: string; address: string; city: string; postcode: string; state: string; zone: string; country: string; managerName: string; email: string; createdAt: number };
export type AzanDoc = { name: string; credit: string; url: string; fajrUrl?: string; active: boolean };
export const DEMO_TV: TvDoc = { name: "Masjid Demo", state: "", zone: "", country: "Malaysia", azanId: "", announcements: [], slides: [], anim: "kenburns", secs: 10, plan: "demo", ownerUid: "" };
export const uid = () => Math.random().toString(36).slice(2, 9);

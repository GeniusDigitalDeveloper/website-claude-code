import type { SlideItem } from "./types";
/** Templat slaid siap pakai. Teks boleh disunting; latar boleh ditukar. */
export const SLIDE_TEMPLATES: { id: string; label: string; make: () => Omit<SlideItem, "id"> }[] = [
  { id: "ayat", label: "Ayat al-Quran", make: () => ({ kind: "ayat", bg: "quran-1", on: true, text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", source: "Surah al-Insyirah, ayat 5" }) },
  { id: "hadis", label: "Hadis", make: () => ({ kind: "hadis", bg: "nabawi", on: true, text: "Sebaik-baik kamu ialah orang yang mempelajari al-Quran dan mengajarkannya.", source: "HR. al-Bukhari (no. 5027)" }) },
  { id: "hikmah", label: "Kata hikmah dan peringatan", make: () => ({ kind: "hikmah", bg: "putra", on: true, text: "Jaga solat pada awal waktu. Hati menjadi tenang dan urusan hari itu lebih teratur.", source: "Peringatan" }) },
] as { id: string; label: string; make: () => Omit<SlideItem, "id"> }[];

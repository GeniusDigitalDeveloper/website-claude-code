/** Latar slaid: foto sebenar berlesen terbuka (Wikimedia Commons). Kredit wajib dipaparkan. */
export type SlideBg = { id: string; label: string; url: string; credit: string };
export const SLIDE_BGS: SlideBg[] = [
  { id: "quran-1", label: "Al-Quran (mushaf berhias)", url: "/slides-bg/quran-1.jpg", credit: "Foto: Habib M'henni, domain awam (Wikimedia Commons)" },
  { id: "quran-2", label: "Mushaf manuskrip Uthmaniyyah", url: "/slides-bg/quran-2.jpg", credit: "Foto: Sheikh Hamdullah, domain awam (Wikimedia Commons)" },
  { id: "nabawi", label: "Masjid Nabawi, Madinah", url: "/slides-bg/nabawi.jpg", credit: "Foto: King Eliot, CC BY-SA 4.0 (Wikimedia Commons)" },
  { id: "putra", label: "Kubah Masjid Putra, Putrajaya", url: "/slides-bg/putra.jpg", credit: "Foto: Uwe Aranas (CEphoto), CC BY-SA 3.0 (Wikimedia Commons)" },
  { id: "vakil", label: "Dalaman Masjid Vakil, Shiraz", url: "/slides-bg/vakil.jpg", credit: "Foto: Zahrazari, CC BY 4.0 (Wikimedia Commons)" },
];
export const bgOf = (id?: string) => SLIDE_BGS.find((b) => b.id === id);

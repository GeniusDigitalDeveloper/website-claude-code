import type { SlideItem } from "./types";
// Pek asas. Hadis daripada Sahih al-Bukhari / Sahih Muslim dengan nombor rujukan. Sila semak oleh asatizah sebelum guna.
const S = (id: string, kind: SlideItem["kind"], text: string, source: string, jumaat = false, title = ""): SlideItem => ({ id, kind, text, source, title, on: true, jumaat });
export const DEFAULT_SLIDES: SlideItem[] = [
  S("d1", "hadis", "Sesungguhnya setiap amalan itu bergantung kepada niatnya, dan setiap orang hanya mendapat apa yang dia niatkan.", "HR. al-Bukhari (no. 1) dan Muslim (no. 1907)"),
  S("d2", "hadis", "Sebaik-baik kamu ialah orang yang mempelajari al-Quran dan mengajarkannya.", "HR. al-Bukhari (no. 5027)"),
  S("d3", "hadis", "Solat lima waktu, Jumaat ke Jumaat dan Ramadan ke Ramadan menghapuskan dosa-dosa di antaranya, selagi dosa-dosa besar dijauhi.", "HR. Muslim (no. 233)"),
  S("d4", "hadis", "Sesiapa yang beriman kepada Allah dan hari akhirat, hendaklah dia berkata baik atau diam.", "HR. al-Bukhari (no. 6018) dan Muslim (no. 47)"),
  S("d5", "hadis", "Janganlah engkau memandang remeh sebarang kebaikan, walaupun sekadar bertemu saudaramu dengan wajah yang ceria.", "HR. Muslim (no. 2626)"),
  S("d6", "hadis", "Orang Islam ialah orang yang orang Islam lain selamat daripada lidah dan tangannya.", "HR. al-Bukhari (no. 10)"),
  S("d7", "ayat", "Ketahuilah, dengan mengingati Allah hati menjadi tenteram.", "Surah ar-Ra'd, ayat 28"),
  S("d8", "ayat", "Maka sesungguhnya bersama kesulitan ada kemudahan. Sesungguhnya bersama kesulitan ada kemudahan.", "Surah al-Insyirah, ayat 5 hingga 6"),
  S("d9", "ayat", "Sesungguhnya solat itu mencegah daripada perbuatan keji dan mungkar.", "Surah al-Ankabut, ayat 45"),
  S("d10", "ulama", "Hisablah diri kamu sebelum kamu dihisab, dan timbanglah amalan kamu sebelum ia ditimbang.", "Umar bin al-Khattab RA (dinukil at-Tirmizi, di bawah hadis no. 2459)"),
  S("d11", "hikmah", "Jaga solat pada awal waktu. Hati menjadi tenang dan urusan hari itu lebih teratur.", "Peringatan"),
  S("j1", "jumaat", "Sebaik-baik hari yang matahari terbit padanya ialah hari Jumaat.", "HR. Muslim (no. 854)", true, "Hari Jumaat"),
  S("j2", "jumaat", "Wahai orang-orang yang beriman, apabila diseru untuk menunaikan solat pada hari Jumaat, maka segeralah mengingati Allah dan tinggalkanlah jual beli.", "Surah al-Jumu'ah, ayat 9", true, "Hari Jumaat"),
  S("j3", "jumaat", "Apabila salah seorang kamu hendak datang menunaikan solat Jumaat, hendaklah dia mandi.", "HR. al-Bukhari (no. 877) dan Muslim (no. 844)", true, "Adab Jumaat"),
];

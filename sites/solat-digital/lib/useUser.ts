"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user; // undefined = belum tahu
}
export const authMsg = (e: unknown) => {
  const c = (e as { code?: string })?.code ?? "";
  if (c.includes("email-already")) return "Emel ini sudah didaftarkan. Satu masjid hanya boleh daftar sekali; sila log masuk.";
  if (c.includes("weak-password")) return "Kata laluan terlalu lemah (minimum 6 aksara).";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Emel atau kata laluan salah.";
  if (c.includes("invalid-email")) return "Format emel tidak sah.";
  if (c.includes("configuration-not-found") || c.includes("operation-not-allowed")) return "Log masuk belum diaktifkan pada Firebase. Hubungi admin sistem.";
  if (c.includes("too-many")) return "Terlalu banyak cubaan. Cuba lagi sebentar.";
  if (c.includes("network")) return "Tiada sambungan internet.";
  return "Ralat berlaku. Cuba lagi.";
};

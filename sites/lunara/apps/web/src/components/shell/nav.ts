import { Compass, HardDrive, Heart, Home, LayoutDashboard, Library, Search, Settings, Shield, Tv, UserRound } from "lucide-react";

export const NAV = [
  { href: "/", label: "Utama", icon: Home, mobile: true },
  { href: "/search", label: "Cari", icon: Search, mobile: true },
  { href: "/explore", label: "Teroka", icon: Compass },
  { href: "/library", label: "Pustaka", icon: Library, mobile: true },
  { href: "/favourites", label: "Kegemaran", icon: Heart },
  { href: "/local", label: "Muzik Peranti", icon: HardDrive, mobile: true },
];
export const NAV_2 = [
  { href: "/studio", label: "Layout Studio", icon: LayoutDashboard },
  { href: "/profile", label: "Profil", icon: UserRound, mobile: true },
  { href: "/settings", label: "Tetapan", icon: Settings },
  { href: "/tv", label: "Mod TV", icon: Tv },
];
export const ADMIN = { href: "/admin", label: "Admin", icon: Shield };

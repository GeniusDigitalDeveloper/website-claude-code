import { Compass, HardDrive, Heart, Home, LayoutDashboard, Library, Settings, Shield, Tv, UserRound } from "lucide-react";

export const NAV = [
  { href: "/", label: "Utama", icon: Home, mobile: true },
  { href: "/explore", label: "Teroka", icon: Compass, mobile: true },
  { href: "/library", label: "Pustaka", icon: Library, mobile: true },
  { href: "/favourites", label: "Kegemaran", icon: Heart, mobile: true },
  { href: "/local", label: "Muzik Peranti", icon: HardDrive },
];
export const NAV_2 = [
  { href: "/studio", label: "Layout Studio", icon: LayoutDashboard },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/settings", label: "Tetapan", icon: Settings },
  { href: "/tv", label: "Mod TV", icon: Tv },
];
export const ADMIN = { href: "/admin", label: "Admin", icon: Shield };

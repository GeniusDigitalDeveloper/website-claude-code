"use client";
import { create } from "zustand";
import { tr } from "@/i18n";

interface Toast {
  id: number;
  msg: string;
}
export const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }));
let n = 0;
export function toast(msg: string) {
  const id = ++n;
  msg = tr(msg);
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, msg }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3800);
}

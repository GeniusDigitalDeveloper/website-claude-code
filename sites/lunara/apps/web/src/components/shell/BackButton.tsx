"use client";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cx } from "../ui";

const KEY = "lunara-nav-depth";

/** Counts in-app navigations so "Back" returns to the previous LUNARA page (Home, TV, Search…), never off-site. */
export function useNavDepth() {
  const path = usePathname();
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem(KEY) ?? "-1") + 1;
      sessionStorage.setItem(KEY, String(n));
    } catch {
      /* ignore */
    }
  }, [path]);
}

export function goBack(router: ReturnType<typeof useRouter>) {
  let depth = 0;
  try {
    depth = Number(sessionStorage.getItem(KEY) ?? "0");
    sessionStorage.setItem(KEY, String(Math.max(-1, depth - 2))); // the pop will add one back
  } catch {
    /* ignore */
  }
  if (depth > 0) router.back();
  else router.push("/");
}

/** Glass back button shown next to the logo on every page except Home. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const path = usePathname();
  if (path === "/") return null;
  return (
    <button
      type="button"
      aria-label="Kembali"
      title="Kembali"
      onClick={() => goBack(router)}
      className={cx("chip-glass flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full pr-3.5 pl-2 text-sm font-semibold hover:bg-card-hover", className)}
    >
      <ChevronLeft className="h-5 w-5" />
      <span className="hidden sm:inline">Kembali</span>
    </button>
  );
}

import Link from "next/link";
import { cx } from "../ui";

export const BRAND = {
  name: "LUNARA MUSIC",
  tagline: "Your Music. Your Universe.",
  description:
    "Nikmati dunia muzik tanpa batas bersama LUNARA MUSIC, platform muzik digital yang direka untuk pengalaman hiburan audio yang moden, mudah dan peribadi. Dengar muzik kegemaran, terokai koleksi lagu, cipta playlist sendiri dan nikmati muzik mengikut citarasa anda, semuanya dalam satu platform.",
};

/** In-app mark: play-triangle + crescent moon + star + sound bars (cut from the full logo). */
export function Mark({ size = 34, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/lunara-mark-320.png" alt="" width={size} height={size} className={cx("brand-mark shrink-0 object-contain", className)} style={{ width: size, height: size }} />;
}

export function Wordmark({ className, big }: { className?: string; big?: boolean }) {
  return (
    <span className={cx("flex flex-col leading-none", className)}>
      <span className={cx("font-display font-extrabold tracking-[0.12em]", big ? "text-2xl" : "text-lg")}>LUNARA</span>
      <span className={cx("mt-0.5 font-semibold tracking-[0.42em] text-muted", big ? "text-xs" : "text-[9px]")}>MUSIC</span>
    </span>
  );
}

export function Logo({ compact, className, size = 34 }: { compact?: boolean; className?: string; size?: number }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2.5", className)} aria-label="LUNARA MUSIC, ke laman utama">
      <Mark size={size} />
      {!compact && <Wordmark />}
    </Link>
  );
}

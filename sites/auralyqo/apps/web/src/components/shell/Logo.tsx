import Link from "next/link";
import { cx } from "../ui";

/** Brand logo: the wave mark (from the supplied artwork, white background removed) + wordmark. */
export function Logo({ compact, className, size = 34 }: { compact?: boolean; className?: string; size?: number }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2.5", className)} aria-label="AURALYQO, ke laman utama">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/auralyqo-mark-640.png" alt="" width={size * 1.7} height={size} style={{ height: size, width: "auto" }} />
      {!compact && <span className="font-display text-lg font-extrabold tracking-[0.14em]">AURALYQO</span>}
    </Link>
  );
}

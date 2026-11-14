"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TvDisplay from "@/components/TvDisplay";
import { useMasjids } from "@/lib/store";

function Inner() {
  const id = useSearchParams().get("m");
  const { list, ready } = useMasjids();
  if (!ready) return <p className="p-8">Memuatkan…</p>;
  const m = list.find((x) => x.id === id) ?? (id ? undefined : list[0]);
  if (!m) return <div className="p-8"><p>Masjid tidak dijumpai pada peranti ini.</p><Link className="btn mt-4" href="/">Kembali</Link></div>;
  return <TvDisplay m={m} />;
}
export default function Page() { return <Suspense fallback={<p className="p-8">Memuatkan…</p>}><Inner /></Suspense>; }

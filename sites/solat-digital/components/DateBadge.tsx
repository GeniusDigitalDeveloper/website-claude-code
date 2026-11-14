"use client";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { hijriText } from "@/lib/hijri";
import { klDay, klNow, klSec, syncClock } from "@/lib/prayer";

/** Tarikh Masehi dan Hijrah semasa (jam disegerakkan dengan JAKIM). Dikira dengan kaedah yang sama seperti TV. */
export default function DateBadge({ mode = "jakim" }: { mode?: "jakim" | "maghrib" }) {
  const [, tick] = useState(0);
  useEffect(() => { syncClock().then(() => tick((x) => x + 1)); const t = setInterval(() => tick((x) => x + 1), 15000); return () => clearInterval(t); }, []);
  const d = klNow();
  const greg = new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const hij = hijriText(klDay(d), klSec(d), 18 * 3600 + 59 * 60, mode);
  return <span className="date-badge"><CalendarDays size={16} aria-hidden="true" /><span>{greg}</span><span className="date-sep" aria-hidden="true">·</span><b>{hij}</b></span>;
}

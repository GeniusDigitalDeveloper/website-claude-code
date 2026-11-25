import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the public Deezer API (https://developers.deezer.com/api).
 * - Only whitelisted, read-only catalogue endpoints are forwarded.
 * - Responses are cached at the edge for a short time to protect the upstream rate limit (50 req / 5s).
 * Deezer's public API authorises 30-second previews; full-length playback needs a licensed partner deal.
 */
const ALLOWED = [
  /^search(\/(track|album|artist|playlist))?$/,
  /^chart\/0(\/(tracks|albums|artists|playlists))?$/,
  /^editorial\/0\/(selection|charts)$/,
  /^genre$/,
  /^track\/\d+$/,
  /^album\/\d+(\/tracks)?$/,
  /^artist\/\d+(\/(top|albums|related|radio))?$/,
  /^playlist\/\d+(\/tracks)?$/,
];

const PASS_PARAMS = ["q", "limit", "index", "order", "strict"];

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const p = path.join("/");
  if (!ALLOWED.some((r) => r.test(p))) {
    return NextResponse.json({ error: "endpoint_not_allowed" }, { status: 400 });
  }
  const url = new URL(`https://api.deezer.com/${p}`);
  for (const k of PASS_PARAMS) {
    const v = req.nextUrl.searchParams.get(k);
    if (v !== null) url.searchParams.set(k, v.slice(0, 200));
  }
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // short cache; previews carry signed URLs that expire
      next: { revalidate: p.startsWith("track/") ? 0 : 600 },
    });
    const data = await res.json();
    if (data?.error) {
      return NextResponse.json({ error: data.error.message ?? "upstream_error" }, { status: 502 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": p.startsWith("track/") ? "no-store" : "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unreachable" }, { status: 503 });
  }
}

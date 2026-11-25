"use client";
import { useEffect, useState } from "react";

const cache = new Map<string, { at: number; data: unknown }>();

/** Tiny SWR-like hook with an in-memory cache (5 min) so navigation feels instant. */
export function useAsync<T>(key: string | null, fn: () => Promise<T>, ttl = 5 * 60_000) {
  const hit = key ? cache.get(key) : undefined;
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ data: hit?.data as T | undefined, loading: !hit && !!key });
  useEffect(() => {
    if (!key) return;
    let live = true;
    const c = cache.get(key);
    if (c && Date.now() - c.at < ttl) {
      setState({ data: c.data as T, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn()
      .then((data) => {
        cache.set(key, { at: Date.now(), data });
        if (live) setState({ data, loading: false });
      })
      .catch((e) => live && setState({ error: (e as Error).message, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

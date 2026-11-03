'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, limit, query, type QueryConstraint } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';

/** Langgan masa nyata koleksi dalam organisasi semasa. Sentiasa terhad kepada orgId pengguna. */
export function useOrgCollection<T>(name: string, order?: string, max = 200, extra: QueryConstraint[] = []) {
  const { orgId } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const cs: QueryConstraint[] = [...extra];
    if (order) cs.push(orderBy(order, 'desc'));
    cs.push(limit(max));
    const q = query(collection(db, 'organizations', orgId, name), ...cs);
    return onSnapshot(q,
      (s) => { setData(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)); setLoading(false); setError(null); },
      (e) => { setError(e.message); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, name, order, max]);

  return { data, loading, error };
}

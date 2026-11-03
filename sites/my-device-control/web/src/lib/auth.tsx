'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { ROLE_RANK, type Role } from './types';

interface AuthState {
  user: User | null; loading: boolean; orgId: string | null; role: Role | null;
  can: (min: Role) => boolean; refresh: () => Promise<void>; logout: () => Promise<void>;
}
const Ctx = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const readClaims = useCallback(async (u: User | null, force = false) => {
    if (!u) { setOrgId(null); setRole(null); return; }
    const r = await u.getIdTokenResult(force);
    setOrgId((r.claims.orgId as string) ?? null);
    setRole((r.claims.role as Role) ?? null);
  }, []);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); await readClaims(u); setLoading(false);
  }), [readClaims]);
  useEffect(() => onIdTokenChanged(auth, (u) => { void readClaims(u); }), [readClaims]);

  const value: AuthState = {
    user, loading, orgId, role,
    can: (min) => (role ? ROLE_RANK[role] >= ROLE_RANK[min] : false),
    refresh: async () => { await readClaims(auth.currentUser, true); },
    logout: () => signOut(auth),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, errMsg } from '@/lib/api';
import { useToast, Loading } from './ui';
import { firebaseConfigured } from '@/lib/firebase';

/** Papar apabila akaun Auth berjaya log masuk tetapi belum dikaitkan dengan organisasi. */
export function OnboardingGate() {
  const { user, logout, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await api.bootstrapOrganization({ name });
      await user!.getIdToken(true);
      await refresh();
      toast('ok', 'Organisasi dicipta. Anda kini Super Admin.');
    } catch (e) { toast('err', errMsg(e)); } finally { setBusy(false); }
  }
  if (!user) return <Loading />;
  return (
    <div className="mx-auto mt-16 max-w-lg p-4">
      <div className="card space-y-4">
        <h1 className="text-xl font-extrabold">Akaun belum dikaitkan dengan organisasi</h1>
        <p className="text-sm text-mutedfg">
          Log masuk sebagai <b>{user.email ?? user.uid}</b> berjaya, tetapi akaun ini belum diberi peranan.
          Minta Org Admin menjalankan <i>Users &amp; Roles → Hubungkan akaun</i>, atau jika anda pentadbir pertama
          (e-mel anda ada dalam <code>BOOTSTRAP_ADMIN_EMAILS</code>), cipta organisasi di bawah.
        </p>
        <label className="block text-sm font-semibold">Nama organisasi
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Sekolah Asrama ..." />
        </label>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy || name.trim().length < 2 || !firebaseConfigured} onClick={create}>Cipta organisasi</button>
          <button className="btn-ghost" onClick={() => void refresh()}>Semak semula peranan</button>
          <button className="btn-ghost" onClick={() => void logout()}>Log keluar</button>
        </div>
      </div>
    </div>
  );
}

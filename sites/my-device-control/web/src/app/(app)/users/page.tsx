'use client';
import { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useOrgCollection } from '@/lib/hooks';
import { api, errMsg } from '@/lib/api';
import { ROLE_LABEL, type OrgUser, type Role } from '@/lib/types';
import { ConfirmDialog, Dialog, Empty, ErrorState, Loading, PageHeader, useToast } from '@/components/ui';

export default function UsersPage() {
  const { can, role: myRole, user } = useAuth();
  const toast = useToast();
  const users = useOrgCollection<OrgUser>('users', undefined, 200);
  const [form, setForm] = useState<null | { email: string; role: Role }>(null);
  const [rm, setRm] = useState<OrgUser | null>(null);
  const admin = can('ORG_ADMIN');
  const roles = (['VIEWER', 'DEVICE_MANAGER', 'ORG_ADMIN', ...(myRole === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : [])]) as Role[];

  async function assign() {
    if (!form) return;
    try { await api.assignUser({ email: form.email.trim(), role: form.role }); toast('ok', 'Akaun dihubungkan. Pengguna perlu log masuk semula untuk peranan baharu.'); setForm(null); }
    catch (e) { toast('err', errMsg(e)); }
  }
  async function remove() {
    if (!rm) return;
    try { await api.removeUser({ uid: rm.uid }); toast('ok', 'Pengguna dibuang.'); setRm(null); } catch (e) { toast('err', errMsg(e)); }
  }
  return (
    <>
      <PageHeader title="Users & Roles" sub="Mana-mana akaun Firebase Auth (e-mel, Google, dll.) boleh dihubungkan ke organisasi">
        {admin && <button className="btn-primary" onClick={() => setForm({ email: '', role: 'VIEWER' })}><UserPlus className="h-4 w-4" />Hubungkan akaun</button>}
      </PageHeader>
      <div className="card overflow-x-auto !p-0">
        {users.loading ? <Loading /> : users.error ? <div className="p-4"><ErrorState message={users.error} /></div> : users.data.length === 0 ? <Empty title="Tiada pengguna" /> : (
          <table className="w-full min-w-[600px]">
            <thead><tr><th className="th">Pengguna</th><th className="th">Peranan</th><th className="th">Penyedia log masuk</th><th className="th"><span className="sr-only">Tindakan</span></th></tr></thead>
            <tbody>{users.data.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="td"><p className="font-semibold">{u.displayName ?? u.email}</p><p className="text-xs text-mutedfg">{u.email}</p></td>
                <td className="td">{ROLE_LABEL[u.role]}</td><td className="td">{u.provider ?? '—'}</td>
                <td className="td">{admin && u.uid !== user?.uid && <button className="btn-ghost !px-2" aria-label={`Buang ${u.email}`} onClick={() => setRm(u)}><UserMinus className="h-4 w-4 text-danger" /></button>}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      <section className="card mt-4 text-sm">
        <h2 className="font-bold">Peranan</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-mutedfg">
          <li><b>Super Admin</b>: urus organisasi &amp; semua konfigurasi.</li><li><b>Org Admin</b>: urus semua peranti, kumpulan, polisi &amp; pengguna organisasi.</li>
          <li><b>Device Manager</b>: daftar peranti, hantar arahan, sunting peranti.</li><li><b>Viewer</b>: lihat sahaja.</li>
        </ul>
      </section>
      {form && (
        <Dialog title="Hubungkan akaun Auth" onClose={() => setForm(null)}>
          <div className="space-y-3">
            <p className="text-sm text-mutedfg">Pengguna mesti pernah log masuk sekali (apa-apa penyedia) supaya wujud dalam Firebase Authentication.</p>
            <label className="block text-sm font-semibold">E-mel<input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Peranan
              <select className="input mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setForm(null)}>Batal</button><button className="btn-primary" disabled={!form.email} onClick={assign}>Hubungkan</button></div>
          </div>
        </Dialog>)}
      {rm && <ConfirmDialog danger title="Buang pengguna" confirmLabel="Buang" onClose={() => setRm(null)} onConfirm={remove} body={<>{rm.email} akan hilang akses ke organisasi ini.</>} />}
    </>
  );
}

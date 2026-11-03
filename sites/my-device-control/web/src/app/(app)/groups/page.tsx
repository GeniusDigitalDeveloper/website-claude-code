'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Lock, Unlock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useOrgCollection } from '@/lib/hooks';
import { api, errMsg } from '@/lib/api';
import type { Device, Group } from '@/lib/types';
import { ConfirmDialog, Dialog, Empty, ErrorState, Loading, PageHeader, useToast } from '@/components/ui';

export default function Groups() {
  const { orgId, user, can } = useAuth();
  const toast = useToast();
  const grp = useOrgCollection<Group>('deviceGroups', undefined, 200);
  const dev = useOrgCollection<Device>('devices', 'createdAt', 500);
  const [form, setForm] = useState<null | { id?: string; name: string; description: string }>(null);
  const [del, setDel] = useState<Group | null>(null);
  const [cmd, setCmd] = useState<null | { g: Group; type: 'LOCK' | 'UNLOCK' }>(null);
  const [busy, setBusy] = useState(false);
  const manage = can('DEVICE_MANAGER');
  const count = (id: string) => dev.data.filter((d) => d.groupId === id).length;

  async function save() {
    if (!orgId || !form) return;
    try {
      const base = { name: form.name.trim(), description: form.description.trim(), updatedAt: serverTimestamp() };
      if (form.id) await updateDoc(doc(db, 'organizations', orgId, 'deviceGroups', form.id), base);
      else await addDoc(collection(db, 'organizations', orgId, 'deviceGroups'), { ...base, policyIds: [], createdAt: serverTimestamp(), createdBy: user!.uid });
      toast('ok', 'Kumpulan disimpan.'); setForm(null);
    } catch (e) { toast('err', errMsg(e)); }
  }
  async function remove() {
    if (!orgId || !del) return;
    setBusy(true);
    try {
      // Lepaskan peranti daripada kumpulan sebelum padam.
      await Promise.all(dev.data.filter((d) => d.groupId === del.id).map((d) => updateDoc(doc(db, 'organizations', orgId, 'devices', d.id), { groupId: null, updatedAt: serverTimestamp() })));
      await deleteDoc(doc(db, 'organizations', orgId, 'deviceGroups', del.id));
      toast('ok', 'Kumpulan dipadam.'); setDel(null);
    } catch (e) { toast('err', errMsg(e)); } finally { setBusy(false); }
  }
  async function send() {
    if (!cmd) return;
    setBusy(true);
    try { const r = await api.createCommand({ commandType: cmd.type, groupId: cmd.g.id }); toast('ok', `${r.count} arahan ${cmd.type} dalam queue.`); setCmd(null); }
    catch (e) { toast('err', errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Device Groups" sub="Contoh: Asrama Putera, Kelas 1, Tablet Android">
        {manage && <button className="btn-primary" onClick={() => setForm({ name: '', description: '' })}><Plus className="h-4 w-4" />Kumpulan baharu</button>}
      </PageHeader>
      {grp.loading ? <Loading /> : grp.error ? <ErrorState message={grp.error} /> : grp.data.length === 0 ? (
        <div className="card"><Empty title="Belum ada kumpulan" hint="Cipta kumpulan, kemudian tetapkan peranti melalui All Devices → Sunting." /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {grp.data.map((g) => (
            <div key={g.id} className="card">
              <h2 className="font-bold">{g.name}</h2>
              <p className="text-sm text-mutedfg">{g.description || 'Tiada keterangan'}</p>
              <p className="mt-2 text-sm font-semibold">{count(g.id)} peranti</p>
              {manage && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => setCmd({ g, type: 'LOCK' })}><Lock className="h-4 w-4" />Lock</button>
                  <button className="btn-ghost" onClick={() => setCmd({ g, type: 'UNLOCK' })}><Unlock className="h-4 w-4" />Unlock</button>
                  <button className="btn-ghost !px-2" aria-label={`Sunting ${g.name}`} onClick={() => setForm({ id: g.id, name: g.name, description: g.description ?? '' })}><Pencil className="h-4 w-4" /></button>
                  {can('ORG_ADMIN') && <button className="btn-ghost !px-2" aria-label={`Padam ${g.name}`} onClick={() => setDel(g)}><Trash2 className="h-4 w-4 text-danger" /></button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {form && (
        <Dialog title={form.id ? 'Sunting kumpulan' : 'Kumpulan baharu'} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <label className="block text-sm font-semibold">Nama<input className="input mt-1" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Keterangan<input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setForm(null)}>Batal</button><button className="btn-primary" disabled={!form.name.trim()} onClick={save}>Simpan</button></div>
          </div>
        </Dialog>
      )}
      {del && <ConfirmDialog danger busy={busy} title="Padam kumpulan" confirmLabel="Padam" requireText={del.name} onClose={() => setDel(null)} onConfirm={remove}
        body={<>Kumpulan <b>{del.name}</b> dipadam. {count(del.id)} peranti akan dilepaskan daripada kumpulan (peranti tidak dipadam).</>} />}
      {cmd && <ConfirmDialog danger={cmd.type === 'LOCK'} busy={busy} title={`${cmd.type} kumpulan ${cmd.g.name}`} confirmLabel={cmd.type} onClose={() => setCmd(null)} onConfirm={send}
        body={<>Arahan {cmd.type} dihantar kepada {count(cmd.g.id)} peranti dalam kumpulan ini melalui queue.</>} />}
    </>
  );
}

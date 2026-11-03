'use client';
import { useMemo, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import QRCode from 'qrcode';
import { Plus, Lock, Unlock, Search, Trash2, Pencil, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useOrgCollection } from '@/lib/hooks';
import { api, errMsg } from '@/lib/api';
import type { Device, Group } from '@/lib/types';
import { ConfirmDialog, DeviceBadge, Dialog, Empty, ErrorState, Loading, PageHeader, ago, useToast } from '@/components/ui';

const PAGE = 10;
type Pending = null | { kind: 'LOCK' | 'UNLOCK'; ids: string[]; all?: boolean } | { kind: 'REMOVE'; device: Device };

export default function Devices() {
  const { orgId, can } = useAuth();
  const toast = useToast();
  const dev = useOrgCollection<Device>('devices', 'createdAt', 500);
  const grp = useOrgCollection<Group>('deviceGroups', undefined, 200);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [enroll, setEnroll] = useState(false);
  const [edit, setEdit] = useState<Device | null>(null);
  const manage = can('DEVICE_MANAGER');
  const admin = can('ORG_ADMIN');

  const groupName = (id: string | null) => grp.data.find((g) => g.id === id)?.name ?? '—';
  const rows = useMemo(() => dev.data.filter((d) =>
    (!status || d.status === status) && (!type || d.deviceType === type) &&
    (!q || `${d.deviceName} ${d.deviceId} ${d.deviceModel} ${d.assignedUserId ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  ), [dev.data, q, status, type]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function run() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'REMOVE') { await api.removeDevice({ deviceId: pending.device.id }); toast('ok', 'Peranti dinyahdaftar.'); }
      else {
        const r = await api.createCommand({ commandType: pending.kind, ...(pending.all ? { all: true } : { deviceIds: pending.ids }) });
        toast('ok', `${r.count} arahan ${pending.kind} dimasukkan ke queue (PENDING). Status dikemas kini bila peranti mengesahkan.`);
        setSel(new Set());
      }
      setPending(null);
    } catch (e) { toast('err', errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="All Devices" sub={`${dev.data.length} peranti`}>
        {manage && <button className="btn-primary" onClick={() => setEnroll(true)}><Plus className="h-4 w-4" />Daftar peranti</button>}
        {admin && <button className="btn-danger" disabled={dev.data.length === 0} onClick={() => setPending({ kind: 'LOCK', ids: [], all: true })}><Lock className="h-4 w-4" />Lock All Devices</button>}
      </PageHeader>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input aria-label="Cari peranti" className="input !pl-9" placeholder="Cari nama / ID / model" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <select aria-label="Tapis status" className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Semua status</option>{['ONLINE', 'OFFLINE', 'LOCKED', 'ENROLLMENT_PENDING', 'ERROR'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Tapis jenis" className="input !w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
          <option value="">Semua jenis</option><option>ANDROID</option><option>WINDOWS</option>
        </select>
        {manage && sel.size > 0 && (
          <>
            <button className="btn-ghost" onClick={() => setPending({ kind: 'LOCK', ids: [...sel] })}><Lock className="h-4 w-4" />Lock ({sel.size})</button>
            <button className="btn-ghost" onClick={() => setPending({ kind: 'UNLOCK', ids: [...sel] })}><Unlock className="h-4 w-4" />Unlock ({sel.size})</button>
          </>
        )}
      </div>

      <div className="card overflow-x-auto !p-0">
        {dev.loading ? <Loading /> : dev.error ? <div className="p-4"><ErrorState message={dev.error} /></div> : rows.length === 0 ? (
          <Empty title={dev.data.length ? 'Tiada padanan' : 'Belum ada peranti'} hint={dev.data.length ? 'Ubah carian atau penapis.' : 'Klik "Daftar peranti" untuk menjana token enrollment.'} />
        ) : (
          <table className="w-full min-w-[900px]">
            <thead><tr>
              <th className="th w-10"><input type="checkbox" aria-label="Pilih semua di halaman" disabled={!manage}
                checked={view.length > 0 && view.every((d) => sel.has(d.id))}
                onChange={(e) => setSel((s) => { const n = new Set(s); view.forEach((d) => e.target.checked ? n.add(d.id) : n.delete(d.id)); return n; })} /></th>
              <th className="th">Peranti</th><th className="th">Jenis / OS</th><th className="th">Status</th><th className="th">Enrollment</th>
              <th className="th">Kumpulan</th><th className="th">Pengguna</th><th className="th">Last seen</th><th className="th"><span className="sr-only">Tindakan</span></th>
            </tr></thead>
            <tbody>{view.map((d) => (
              <tr key={d.id} className="border-t border-line">
                <td className="td"><input type="checkbox" aria-label={`Pilih ${d.deviceName}`} disabled={!manage} checked={sel.has(d.id)} onChange={() => toggle(d.id)} /></td>
                <td className="td"><p className="font-semibold">{d.deviceName}</p><p className="font-mono text-xs text-mutedfg">{d.deviceId}</p></td>
                <td className="td">{d.deviceType}<p className="text-xs text-mutedfg">{d.deviceModel} · {d.osVersion}</p></td>
                <td className="td"><DeviceBadge status={d.status} />{d.batteryLevel !== null && <p className="mt-1 text-xs text-mutedfg">Bateri {d.batteryLevel}%</p>}</td>
                <td className="td">{d.enrollmentStatus}</td><td className="td">{groupName(d.groupId)}</td><td className="td">{d.assignedUserId ?? '—'}</td>
                <td className="td">{ago(d.lastSeen)}</td>
                <td className="td whitespace-nowrap">
                  {manage && <button className="btn-ghost !px-2" aria-label={`Sunting ${d.deviceName}`} onClick={() => setEdit(d)}><Pencil className="h-4 w-4" /></button>}{' '}
                  {admin && <button className="btn-ghost !px-2" aria-label={`Buang ${d.deviceName}`} onClick={() => setPending({ kind: 'REMOVE', device: d })}><Trash2 className="h-4 w-4 text-danger" /></button>}
                </td>
              </tr>))}</tbody>
          </table>
        )}
        <div className="flex items-center justify-between border-t border-line p-3 text-sm">
          <span className="text-mutedfg">Halaman {page + 1} / {pages}</span>
          <div className="flex gap-2">
            <button className="btn-ghost !px-2" aria-label="Sebelumnya" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></button>
            <button className="btn-ghost !px-2" aria-label="Seterusnya" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {pending && pending.kind !== 'REMOVE' && (
        <ConfirmDialog danger={pending.kind === 'LOCK'} busy={busy} onClose={() => setPending(null)} onConfirm={run}
          title={pending.all ? 'LOCK ALL DEVICES' : `${pending.kind} ${pending.ids.length} peranti`}
          confirmLabel={pending.all ? 'Lock semua' : pending.kind} requireText={pending.all ? 'LOCK ALL' : undefined}
          body={<>Arahan dimasukkan ke queue dengan status <b>PENDING</b> dan tamat dalam 24 jam. Peranti offline akan menerimanya apabila kembali online. Status <b>EXECUTED</b> hanya dipaparkan selepas peranti mengesahkan.</>} />
      )}
      {pending?.kind === 'REMOVE' && (
        <ConfirmDialog danger busy={busy} onClose={() => setPending(null)} onConfirm={run} title="Nyahdaftar peranti" confirmLabel="Nyahdaftar"
          requireText={pending.device.deviceName} body={<>Peranti <b>{pending.device.deviceName}</b> akan dibuang dan arahan tertunggak dibatalkan.</>} />
      )}
      {enroll && <EnrollDialog groups={grp.data} onClose={() => setEnroll(false)} />}
      {edit && orgId && <EditDialog device={edit} groups={grp.data} orgId={orgId} onClose={() => setEdit(null)} />}
    </>
  );
}

function EditDialog({ device, groups, orgId, onClose }: { device: Device; groups: Group[]; orgId: string; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(device.deviceName);
  const [user, setUser] = useState(device.assignedUserId ?? '');
  const [group, setGroup] = useState(device.groupId ?? '');
  async function save() {
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'devices', device.id), {
        deviceName: name.trim(), assignedUserId: user.trim() || null, groupId: group || null, updatedAt: serverTimestamp(),
      });
      toast('ok', 'Peranti dikemas kini.'); onClose();
    } catch (e) { toast('err', errMsg(e)); }
  }
  return (
    <Dialog title="Sunting peranti" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm font-semibold">Nama<input className="input mt-1" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Pengguna ditetapkan<input className="input mt-1" value={user} onChange={(e) => setUser(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Kumpulan
          <select className="input mt-1" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">— tiada —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Batal</button><button className="btn-primary" disabled={!name.trim()} onClick={save}>Simpan</button></div>
      </div>
    </Dialog>
  );
}

function EnrollDialog({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<'ANDROID' | 'WINDOWS'>('ANDROID');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ token: string; qr: string } | null>(null);
  async function create() {
    setBusy(true);
    try {
      const r = await api.createEnrollment({ deviceType: type, deviceName: name, groupId: group || undefined });
      setRes({ token: r.token, qr: await QRCode.toDataURL(r.qrPayload, { margin: 1, width: 240 }) });
    } catch (e) { toast('err', errMsg(e)); } finally { setBusy(false); }
  }
  return (
    <Dialog title="Daftar peranti baharu" onClose={onClose}>
      {res ? (
        <div className="space-y-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={res.qr} alt="Kod QR enrollment" className="mx-auto h-60 w-60" />
          <p>Imbas kod QR dari agent peranti, atau salin token. <b>Token dipaparkan sekali sahaja</b>, sah 24 jam, sekali guna.</p>
          <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={res.token} aria-label="Token enrollment" />
            <button className="btn-ghost" aria-label="Salin token" onClick={() => { void navigator.clipboard.writeText(res.token); toast('ok', 'Token disalin.'); }}><Copy className="h-4 w-4" /></button></div>
          <div className="flex justify-end"><button className="btn-primary" onClick={onClose}>Selesai</button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Jenis
            <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as 'ANDROID' | 'WINDOWS')}><option>ANDROID</option><option>WINDOWS</option></select></label>
          <label className="block text-sm font-semibold">Nama peranti<input className="input mt-1" placeholder="HONOR TABLET 01" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm font-semibold">Kumpulan (pilihan)
            <select className="input mt-1" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">— tiada —</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Batal</button><button className="btn-primary" disabled={busy || !name.trim()} onClick={create}>Jana token</button></div>
        </div>
      )}
    </Dialog>
  );
}

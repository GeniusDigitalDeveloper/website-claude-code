'use client';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { MonitorSmartphone, Wifi, WifiOff, Lock, Smartphone, Laptop, Clock, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useOrgCollection } from '@/lib/hooks';
import type { Command, Device, LogEntry } from '@/lib/types';
import { DeviceBadge, Empty, ErrorState, Loading, PageHeader, ago } from '@/components/ui';

const COLORS: Record<string, string> = { ONLINE: '#047857', OFFLINE: '#64748B', LOCKED: '#B45309', ENROLLMENT_PENDING: '#0369A1', ERROR: '#DC2626' };

function Stat({ label, value, icon: Icon, tone = 'text-primary' }: { label: string; value: number; icon: LucideIcon; tone?: string }) {
  return (
    <div className="card flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><Icon className={`h-5 w-5 ${tone}`} aria-hidden /></span>
      <div><p className="text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-xs font-semibold text-mutedfg">{label}</p></div>
    </div>
  );
}
const dayKey = (ms: number) => new Date(ms).toLocaleDateString('en-CA');
function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return dayKey(d.getTime()); });
}

export default function Dashboard() {
  const dev = useOrgCollection<Device>('devices', 'createdAt', 500);
  const cmd = useOrgCollection<Command>('commands', 'createdAt', 500);
  const logs = useOrgCollection<LogEntry>('activityLogs', 'createdAt', 500);

  const s = useMemo(() => {
    const d = dev.data;
    const by = (st: string) => d.filter((x) => x.status === st).length;
    return {
      total: d.length, online: by('ONLINE'), offline: by('OFFLINE'), locked: by('LOCKED'),
      android: d.filter((x) => x.deviceType === 'ANDROID').length, windows: d.filter((x) => x.deviceType === 'WINDOWS').length,
      pending: d.filter((x) => x.status === 'ENROLLMENT_PENDING' || x.enrollmentStatus === 'PENDING').length,
      attention: d.filter((x) => x.status === 'ERROR' || (x.batteryLevel !== null && x.batteryLevel < 15)).length,
    };
  }, [dev.data]);

  const days = lastDays(7);
  const series = useMemo(() => days.map((k) => ({
    hari: k.slice(5),
    Peranti: dev.data.filter((x) => x.createdAt && dayKey(x.createdAt.toMillis()) === k).length,
    Arahan: cmd.data.filter((x) => x.createdAt && dayKey(x.createdAt.toMillis()) === k).length,
    Aktiviti: logs.data.filter((x) => x.createdAt && dayKey(x.createdAt.toMillis()) === k).length,
  })), [dev.data, cmd.data, logs.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const pie = Object.entries(dev.data.reduce<Record<string, number>>((a, x) => ({ ...a, [x.status]: (a[x.status] ?? 0) + 1 }), {}))
    .map(([name, value]) => ({ name, value }));
  const cmdStatus = Object.entries(cmd.data.reduce<Record<string, number>>((a, x) => ({ ...a, [x.status]: (a[x.status] ?? 0) + 1 }), {}))
    .map(([status, n]) => ({ status, n }));

  if (dev.loading) return <Loading />;
  if (dev.error) return <ErrorState message={dev.error} />;

  return (
    <>
      <PageHeader title="Dashboard" sub="Data masa nyata dari Cloud Firestore" />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Ringkasan">
        <Stat label="Total Devices" value={s.total} icon={MonitorSmartphone} />
        <Stat label="Online" value={s.online} icon={Wifi} tone="text-ok" />
        <Stat label="Offline" value={s.offline} icon={WifiOff} tone="text-slate-500" />
        <Stat label="Locked" value={s.locked} icon={Lock} tone="text-warn" />
        <Stat label="Android" value={s.android} icon={Smartphone} />
        <Stat label="Windows" value={s.windows} icon={Laptop} />
        <Stat label="Pending Enrollment" value={s.pending} icon={Clock} tone="text-accent" />
        <Stat label="Perlu Perhatian" value={s.attention} icon={AlertTriangle} tone="text-danger" />
      </section>

      {s.total === 0 ? (
        <div className="card mt-6"><Empty title="Belum ada peranti didaftarkan" hint="Pergi ke All Devices → Daftar peranti untuk menjana token enrollment." /></div>
      ) : (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card"><h2 className="mb-2 font-bold">Taburan status peranti</h2>
            <div className="h-64"><ResponsiveContainer><PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>{pie.map((p) => <Cell key={p.name} fill={COLORS[p.name] ?? '#94A3B8'} />)}</Pie>
              <Tooltip /><Legend />
            </PieChart></ResponsiveContainer></div>
            <p className="text-xs text-mutedfg">Sejarah trend online/offline memerlukan snapshot berkala (fasa seterusnya); carta ini menunjukkan keadaan semasa.</p>
          </div>
          <div className="card"><h2 className="mb-2 font-bold">Enrollment, arahan &amp; aktiviti (7 hari)</h2>
            <div className="h-64"><ResponsiveContainer><BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="hari" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="Peranti" fill="#0369A1" /><Bar dataKey="Arahan" fill="#0F172A" /><Bar dataKey="Aktiviti" fill="#64748B" />
            </BarChart></ResponsiveContainer></div>
          </div>
          <div className="card"><h2 className="mb-2 font-bold">Sejarah pelaksanaan arahan</h2>
            {cmdStatus.length === 0 ? <Empty title="Belum ada arahan" /> : (
              <div className="h-56"><ResponsiveContainer><BarChart data={cmdStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="status" width={110} /><Tooltip />
                <Bar dataKey="n" fill="#0369A1" />
              </BarChart></ResponsiveContainer></div>
            )}
          </div>
          <div className="card overflow-x-auto"><h2 className="mb-2 font-bold">Peranti terkini</h2>
            <table className="w-full"><thead><tr><th className="th">Nama</th><th className="th">Jenis</th><th className="th">Status</th><th className="th">Last seen</th></tr></thead>
              <tbody>{dev.data.slice(0, 6).map((d) => (
                <tr key={d.id} className="border-t border-line"><td className="td font-semibold">{d.deviceName}</td><td className="td">{d.deviceType}</td>
                  <td className="td"><DeviceBadge status={d.status} /></td><td className="td">{ago(d.lastSeen)}</td></tr>
              ))}</tbody></table>
          </div>
        </section>
      )}
    </>
  );
}

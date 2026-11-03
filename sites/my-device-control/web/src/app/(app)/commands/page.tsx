'use client';
import { useOrgCollection } from '@/lib/hooks';
import type { Command, Device } from '@/lib/types';
import { CommandBadge, Empty, ErrorState, Loading, PageHeader, fmtTime } from '@/components/ui';

export default function Commands() {
  const cmd = useOrgCollection<Command>('commands', 'createdAt', 200);
  const dev = useOrgCollection<Device>('devices', undefined, 500);
  const name = (id: string) => dev.data.find((d) => d.id === id)?.deviceName ?? id;
  return (
    <>
      <PageHeader title="Device Commands" sub="Queue arahan. EXECUTED hanya selepas disahkan oleh peranti." />
      <div className="card overflow-x-auto !p-0">
        {cmd.loading ? <Loading /> : cmd.error ? <div className="p-4"><ErrorState message={cmd.error} /></div> : cmd.data.length === 0 ? (
          <Empty title="Belum ada arahan" hint="Hantar LOCK / UNLOCK dari All Devices atau Device Groups." />
        ) : (
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">Arahan</th><th className="th">Peranti</th><th className="th">Status</th><th className="th">Dicipta</th><th className="th">Dilaksana</th><th className="th">Ralat</th></tr></thead>
            <tbody>{cmd.data.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="td font-semibold">{c.commandType}<p className="font-mono text-xs font-normal text-mutedfg">{c.commandId}</p></td>
                <td className="td">{name(c.deviceId)}</td><td className="td"><CommandBadge status={c.status} /></td>
                <td className="td">{fmtTime(c.createdAt)}</td><td className="td">{fmtTime(c.executedAt)}</td><td className="td text-danger">{c.errorMessage ?? ''}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

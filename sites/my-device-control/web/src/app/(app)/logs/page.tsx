'use client';
import { useOrgCollection } from '@/lib/hooks';
import type { LogEntry } from '@/lib/types';
import { Empty, ErrorState, Loading, PageHeader, fmtTime } from '@/components/ui';

export default function Logs() {
  const logs = useOrgCollection<LogEntry>('activityLogs', 'createdAt', 200);
  return (
    <>
      <PageHeader title="Activity Logs" sub="Audit tindakan pengurusan dan peristiwa peranti (hanya server boleh menulis)" />
      {logs.loading ? <Loading /> : logs.error ? <ErrorState message={logs.error} /> : logs.data.length === 0 ? (
        <div className="card"><Empty title="Belum ada aktiviti" /></div>
      ) : (
        <ol className="card divide-y divide-line !p-0">
          {logs.data.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
              <time className="w-44 shrink-0 text-xs font-semibold text-mutedfg">{fmtTime(l.createdAt)}</time>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{l.type}</span>
              <span className="text-sm">{l.message}</span>
            </li>))}
        </ol>
      )}
    </>
  );
}

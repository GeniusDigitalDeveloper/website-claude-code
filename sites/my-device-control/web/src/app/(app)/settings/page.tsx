'use client';
import { useAuth } from '@/lib/auth';
import { firebaseConfigured } from '@/lib/firebase';
import { PageHeader } from '@/components/ui';

export default function SettingsPage() {
  const { orgId, role, user } = useAuth();
  const rows: [string, string][] = [
    ['Projek Firebase', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '(belum ditetapkan)'],
    ['Firebase disambungkan', firebaseConfigured ? 'Ya' : 'Tidak'],
    ['Organisasi (orgId)', orgId ?? '—'], ['Peranan anda', role ?? '—'], ['Akaun', user?.email ?? user?.uid ?? '—'],
    ['Tempoh OFFLINE', '10 minit tanpa heartbeat'], ['Tamat arahan', '24 jam'],
  ];
  return (
    <>
      <PageHeader title="Settings" sub="Maklumat sambungan dan polisi sistem (baca sahaja dalam Fasa 1)" />
      <dl className="card grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (<div key={k}><dt className="text-xs font-semibold uppercase text-mutedfg">{k}</dt><dd className="break-all text-sm font-semibold">{v}</dd></div>))}
      </dl>
    </>
  );
}

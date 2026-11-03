import { PageHeader } from '@/components/ui';
import { Info } from 'lucide-react';

export default function Page() {
  return (
    <>
      <PageHeader title="Live Monitoring" sub="Dijadualkan: Fasa 4" />
      <div className="card flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Modul ini belum dibina. Tiada data atau butang palsu dipaparkan.</p>
          <p className="text-mutedfg">Memerlukan Android Agent dengan MediaProjection, persetujuan pengguna di peranti, penunjuk pemantauan yang kelihatan dan saluran penstriman selamat (WebRTC) atau integrasi remote support yang sah. Tiada tangkapan skrin tersembunyi.</p>
        </div>
      </div>
    </>
  );
}

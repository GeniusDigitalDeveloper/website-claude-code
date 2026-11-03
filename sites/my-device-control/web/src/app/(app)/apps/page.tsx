import { PageHeader } from '@/components/ui';
import { Info } from 'lucide-react';

export default function Page() {
  return (
    <>
      <PageHeader title="App Management" sub="Dijadualkan: Fasa 2" />
      <div className="card flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Modul ini belum dibina. Tiada data atau butang palsu dipaparkan.</p>
          <p className="text-mutedfg">Memerlukan Android Agent sebagai Device Owner dan Android Management API / Android Device Policy. Laman web sahaja tidak boleh menyekat aplikasi Android. Koleksi Firestore applications (ALLOW / BLOCK / REQUIRE_APPROVAL) dan rules sudah siap.</p>
        </div>
      </div>
    </>
  );
}

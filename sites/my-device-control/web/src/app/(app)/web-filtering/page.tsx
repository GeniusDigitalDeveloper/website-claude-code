import { PageHeader } from '@/components/ui';
import { Info } from 'lucide-react';

export default function Page() {
  return (
    <>
      <PageHeader title="Web Filtering" sub="Dijadualkan: Fasa 3" />
      <div className="card flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Modul ini belum dibina. Tiada data atau butang palsu dipaparkan.</p>
          <p className="text-mutedfg">Penapisan dilaksanakan melalui managed browser, DNS filtering, web gateway atau polisi pelayar Android Enterprise, bukan oleh Firebase sahaja. Sejarah carian Google tidak boleh diakses tanpa pelayar khas. Koleksi webFilteringRules dan rules sudah siap.</p>
        </div>
      </div>
    </>
  );
}

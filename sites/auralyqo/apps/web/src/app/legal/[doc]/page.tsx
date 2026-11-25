import { notFound } from "next/navigation";

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terma & Syarat",
    body: [
      "AURALYQO menyediakan carian katalog muzik, pratonton yang dibenarkan pembekal, dan pemain untuk fail muzik milik anda sendiri.",
      "Kandungan katalog (metadata, kulit album, pratonton 30 saat) disediakan oleh Deezer melalui API awamnya dan tertakluk kepada terma Deezer. AURALYQO tidak menyediakan muat turun lagu katalog.",
      "Fail muzik yang anda import kekal milik anda. Anda bertanggungjawab memastikan anda berhak memainkannya.",
      "AURALYQO tiada iklan. Kami tidak menjual data anda.",
      "Penyalahgunaan (cubaan memintas DRM, mengikis data secara automatik, atau menyerang perkhidmatan) akan menyebabkan akaun digantung.",
      "Dokumen ini ialah draf untuk semakan peguam sebelum pelancaran awam.",
    ],
  },
  privacy: {
    title: "Dasar Privasi",
    body: [
      "Data akaun (nama, e-mel, gambar profil) disimpan dalam Firebase (Google Cloud) dan hanya boleh dibaca oleh anda.",
      "Playlist, kegemaran, sejarah pendengaran dan tetapan disegerakkan ke akaun anda supaya tersedia pada peranti lain. Anda boleh matikan sejarah pendengaran dan memadam data bila-bila masa di Tetapan.",
      "Fail muzik pada peranti anda TIDAK dimuat naik. Laluan fail dan fail audio kekal pada peranti.",
      "Tiada SDK pengiklanan dan tiada penjejakan pengiklanan.",
      "Kata laluan diurus oleh Firebase Authentication dan tidak pernah disimpan dalam bentuk teks biasa oleh AURALYQO.",
      "Memadam akaun akan memadam data awan anda secara kekal.",
      "Dokumen ini ialah draf untuk semakan peguam sebelum pelancaran awam.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 pt-8 md:px-8">
      <h1 className="font-display text-3xl font-extrabold">{d.title}</h1>
      <p className="mt-1 text-xs text-muted">Dikemas kini: November 2026</p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
        {d.body.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ol>
    </article>
  );
}

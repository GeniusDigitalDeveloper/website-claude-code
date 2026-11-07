# Invoice Digital & Quotation — Genius Digital

Aplikasi web sebenar (HTML/CSS/JS modul ES + Firebase Auth + Cloud Firestore + Hosting). Tiada framework/build; tiada `localStorage` untuk data.

- **Projek Firebase:** `genius-digital-40bc9` (GENIUS DIGITAL) — app web "INVOICE DIGITAL & QUOTATION" (`1:508099045190:web:f4ec1d3f5c38ae391e2747`)
- **Hosting site:** `genius-digital-40bc9-48a54`
- **Panel awam:** `/invoice/` · **Panel admin:** `/admin/` · `/` dialihkan ke `/invoice/`

## Struktur
```
public/invoice/index.html   panel awam (landing, auth, app)
public/admin/index.html     panel admin
public/assets/js/           firebase, auth, db, stats, pdf, i18n, app, admin, modules/*
firestore.rules             rules GABUNGAN (rules asal + blok inv_)
rules-backup/               salinan rules asal sebelum perubahan
```

## Data (Firestore) — semua berawalan `inv_` supaya tidak berlanggar dengan app lain
`inv_users/{uid}` (+ subkoleksi `customers, products, invoices, quotations, receipts, meta, counters`), `inv_settings/app`, `inv_stats*` (statistik footer), `inv_activity`, `inv_adminLogs`.

## Keselamatan
- Admin = custom claim `admin: true` (sedia ada pada akaun admin projek). Kuat kuasa oleh Security Rules, bukan UI.
- Pengguna hanya akses `inv_users/{uid}/...` milik sendiri; tidak boleh ubah `ownerUid`, `disabled`, role; resit tidak boleh diubah/dipadam; nombor dokumen guna kaunter transaksi (+1 sahaja).
- "Nyahaktif pengguna" menetapkan `inv_users/{uid}.disabled=true`: rules menolak semua bacaan/tulisan data app untuk pengguna itu (akaun Auth tidak dipadam).
- Tiada kata laluan/kunci rahsia dalam kod. Config web Firebase memang awam.

## Deploy
```bash
# Rules: HANYA tambah blok inv_ (rules lain kekal). Sentiasa mulakan dari rules semasa projek.
firebase deploy --only firestore:rules --project genius-digital-40bc9
firebase deploy --only hosting --project genius-digital-40bc9   # site 48a54 sahaja
```
> Jangan `firebase deploy` tanpa `--only`. Jangan deploy ke site `genius-digital-40bc9` (domain `geniusdigital.space`) — itu menggantikan app Genius Digital utama.

## Statistik footer (waktu Malaysia)
Kunci harian `YYYY-MM-DD` dan bulanan `YYYY-MM` dikira dalam `Asia/Kuala_Lumpur` (reset 12 tengah malam MYT / awal bulan MYT); keseluruhan = kaunter kumulatif. Pelawat dikira sekali sehari bagi setiap pelayar.

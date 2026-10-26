---
name: debug-my-code
description: Cari dan baiki ralat dalam kod, terangkan apa yang salah dan beri versi yang betul. Guna bila pengguna kata "error", "bug", "tak jalan", "debug", "kenapa crash" atau tampal mesej ralat.
---

# Debug My Code (Prompt #11)

Prompt asal: "Find and fix the errors in this code. Explain what was wrong and provide the corrected version."

## Langkah
1. Hasilkan semula masalah dulu (jalankan kod / ujian, baca log dan stack trace penuh).
2. Cari punca sebenar, bukan simptom. Semak perubahan terkini (`git log`, `git diff`) jika dalam repo.
3. Baiki dengan perubahan paling kecil yang menyelesaikan punca.
4. Sahkan: jalankan semula kes yang gagal dan ujian berkaitan. Jangan dakwa "sudah baiki" tanpa bukti.

## Format jawapan
- **Apa yang salah** (punca, dalam bahasa mudah)
- **Kenapa ia berlaku**
- **Pembetulan** (diff atau kod yang telah dibetulkan)
- **Bukti** (output ujian sebelum/selepas)
- **Cara elak pada masa depan** (jika berguna)

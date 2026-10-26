---
name: task-automation
description: Tunjukkan cara automasikan sesuatu tugasan menggunakan tools atau kod dengan panduan langkah demi langkah. Guna bila pengguna kata "automate", "automasi", "nak buat auto", "kerja berulang" atau tanya cara jimat masa untuk tugasan rutin.
---

# Task Automation (Prompt #15)

Prompt asal: "Show me how to automate this task using tools or code, with a step-by-step guide."

## Langkah
1. Fahami tugasan semasa: langkah manual, kekerapan, input/output, tools yang sudah digunakan.
2. Cadangkan 2–3 pilihan, dari paling mudah (no-code: Zapier/Make/Metricool/Google Sheets, hook Claude Code, GitHub Actions) ke paling fleksibel (skrip).
3. Pilih satu cadangan utama dan bina/terangkan sepenuhnya. Jika dalam repo dan pengguna setuju, terus laksana (contoh: hook dalam `.claude/settings.json`, workflow `.github/workflows/`).
4. Uji automasi dan terangkan cara memantau dan mematikannya.

## Format jawapan
- **Tugasan sekarang** (langkah manual + masa dibazirkan)
- **Pilihan automasi** (jadual: Pilihan | Kos | Kesukaran | Kesesuaian)
- **Cadangan saya** + panduan langkah demi langkah (dengan kod/konfigurasi)
- **Ujian & pemantauan**
- **Anggaran masa dijimatkan**

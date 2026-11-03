#!/usr/bin/env python3
"""Jana preview.html (satu fail) daripada fail sumber. Jalankan: python3 build-preview.py"""
import json, html

FILES = [  # (laluan, tajuk, langkah, keterangan ringkas)
  ("firestore.rules", "Rules Firestore", 2, "Tampal dalam Firebase Console → Firestore Database → Rules → Publish."),
  ("database.rules.json", "Rules Realtime Database", 3, "Tampal dalam Firebase Console → Realtime Database → Rules → Publish."),
  ("functions/index.js", "Cloud Functions (backend selamat)", 4, "Fail: functions/index.js. EDIT e-mel admin di bahagian atas (BOOTSTRAP_ADMIN_EMAILS_DEFAULT)."),
  ("functions/package.json", "functions/package.json", 4, "Fail: functions/package.json."),
  ("firebase.json", "firebase.json", 4, "Fail: firebase.json (di akar folder projek)."),
  ("firestore.indexes.json", "firestore.indexes.json", 4, "Fail: firestore.indexes.json (indeks untuk tugas offline & arahan tamat)."),
  ("index.html", "index.html (halaman log masuk)", 6, "Satu fail lengkap. Muat naik ke Interactive Link."),
  ("admin.html", "admin.html (dashboard admin)", 6, "Satu fail lengkap. Muat naik di folder yang sama dengan index.html."),
  ("scripts/link-existing-admins.mjs", "Skrip: hubungkan semua akaun Auth sedia ada (pilihan)", 8, "Jalankan di komputer anda sahaja. Perlu service account (jangan kongsi)."),
]
data = [{"path": p, "title": t, "step": s, "note": n, "code": open(p, encoding="utf-8").read()} for p, t, s, n in FILES]
js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--").replace("<script", "<\\script").replace("<SCRIPT", "<\\SCRIPT").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

TEMPLATE = open("preview.template.html", encoding="utf-8").read()
open("preview.html", "w", encoding="utf-8").write(TEMPLATE.replace("/*__DATA__*/[]", js))
print("preview.html", len(data), "fail")

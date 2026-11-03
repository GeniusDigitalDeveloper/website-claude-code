#!/usr/bin/env python3
"""Jana preview.html (satu fail, 5 tab). Jalankan: python3 build-preview.py"""
import json
FILES = [
  ("index", "index.html", "index.html"),
  ("admin", "admin.html", "admin.html"),
  ("rtdb", "database.rules.json", "Rules Database"),
  ("fs", "firestore.rules", "Rules Firestore"),
]
data = {k: {"file": p, "label": l, "code": open(p, encoding="utf-8").read()} for k, p, l in FILES}
js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--").replace("<script", "<\\script").replace("<SCRIPT", "<\\SCRIPT").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
open("preview.html", "w", encoding="utf-8").write(open("preview.template.html", encoding="utf-8").read().replace("/*__DATA__*/{}", js))
print("preview.html OK")

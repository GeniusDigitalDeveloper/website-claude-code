#!/usr/bin/env python3
"""Jana preview.html (satu fail, 5 tab). Jalankan: python3 build-preview.py"""
import json
FILES = [
  ("index", "index.html", "index.html"),
  ("admin", "admin.html", "admin.html"),
  ("agent", "agent.html", "agent.html (peranti lain)"),
  ("rtdb", "database.rules.json", "Rules Database"),
  ("fs", "firestore.rules", "Rules Firestore"),
]
data = {k: {"file": p, "label": l, "code": open(p, encoding="utf-8").read()} for k, p, l in FILES}
js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--").replace("<script", "<\\script").replace("<SCRIPT", "<\\SCRIPT").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
tpl = open("preview.template.html", encoding="utf-8").read().replace("/*__DATA__*/{}", js)
# preview-artifact.html = serpihan untuk Artifact (rangka dokumen ditambah oleh platform)
open("preview-artifact.html", "w", encoding="utf-8").write(tpl)
# preview.html = fail penuh berdiri sendiri
open("preview.html", "w", encoding="utf-8").write('<!doctype html>\n<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n' + tpl + '\n</body></html>\n')
print("preview.html + preview-artifact.html OK")

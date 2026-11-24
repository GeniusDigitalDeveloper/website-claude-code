"""Jana index.html (buku preview satu fail) daripada template + kod asal.
Jalankan dari mana-mana: python3 sites/temu-havenly-home/buku/build.py"""
import base64, json, pathlib
here = pathlib.Path(__file__).resolve().parent
site = here.parent
src = {k: base64.b64encode((site / f).read_bytes()).decode()
       for k, f in {"awam": "panel-awam.html", "admin": "portal-admin.html"}.items()}
out = (here / "template.html").read_text(encoding="utf-8").replace("__SUMBER__", json.dumps(src))
(site / "index.html").write_text(out, encoding="utf-8")
print("index.html:", len(out), "bytes")

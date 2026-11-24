"""Jana (selepas node buku/snap.js untuk rakaman paparan sebenar)
 index.html (buku preview satu fail) daripada template + kod asal.
Jalankan dari mana-mana: python3 sites/temu-havenly-home/buku/build.py"""
import base64, json, pathlib
here = pathlib.Path(__file__).resolve().parent
site = here.parent
src = {k: base64.b64encode((site / f).read_bytes()).decode()
       for k, f in {"awam": "panel-awam.html", "admin": "portal-admin.html"}.items()}
for k in ("awam", "admin"):
    src["shot_" + k] = base64.b64encode((here / "snap" / f"{k}.jpg").read_bytes()).decode()
out = (here / "template.html").read_text(encoding="utf-8").replace("__SUMBER__", json.dumps(src))
(site / "index.html").write_text(out, encoding="utf-8")
print("index.html:", len(out), "bytes")

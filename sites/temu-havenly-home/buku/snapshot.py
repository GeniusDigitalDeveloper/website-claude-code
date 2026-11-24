"""Salinan ringan data & gambar SEBENAR dari Firebase -> terus dalam panel-awam.html.

Tujuan: bila link dibuka, gambar/logo/data ustaz terus keluar (tiada gambar contoh AI
atau data kosong) sementara Firebase live dimuatkan. Firebase tetap sambung dan akan
kemas kini paparan secara realtime. Skrip ini HANYA MEMBACA database (GET), tidak menulis.

Guna (jalankan semula bila admin tukar gambar/data supaya salinan dalam kod terkini):
    python3 sites/temu-havenly-home/buku/snapshot.py
"""
import base64, io, json, pathlib, re, urllib.request
from PIL import Image

SITE = pathlib.Path(__file__).resolve().parent.parent
HTML = SITE / "panel-awam.html"
DB = "https://temu-havenly-home-4443a-default-rtdb.asia-southeast1.firebasedatabase.app/"
# Laluan yang dibaca oleh panel awam (bookings TIDAK dimasukkan: data peribadi tetamu)
PATHS = ["branding", "admin_locks", "cinema_slides", "gallery", "faq", "feedbacks", "stats", "cms_texts"]
START, END = "<!-- THH_SNAPSHOT_START -->", "<!-- THH_SNAPSHOT_END -->"

imgs, seen = [], {}


def shrink(data_uri, max_w):
    raw = base64.b64decode(data_uri.split(",", 1)[1])
    im = Image.open(io.BytesIO(raw))
    im = im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=55, optimize=True, progressive=True)
    small = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    return small if len(small) < len(data_uri) else data_uri


def ref(data_uri, max_w):
    key = (data_uri[:200], len(data_uri), max_w)
    if key not in seen:
        imgs.append(shrink(data_uri, max_w))
        seen[key] = len(imgs) - 1
    return "@@IMG" + str(seen[key])


def walk(o, path):
    if isinstance(o, dict):
        return {k: walk(v, path + "/" + k) for k, v in o.items()}
    if isinstance(o, list):
        return [walk(v, path) for v in o]
    if isinstance(o, str) and o.startswith("data:image"):
        if path.endswith("/logoUrl"):
            return ref(o, 320)
        big = path.startswith("/cinema_slides") or path.startswith("/gallery")
        return ref(o, 820 if big else 560)
    return o


def main():
    snap = {}
    for p in PATHS:
        with urllib.request.urlopen(DB + p + ".json", timeout=120) as r:
            v = json.load(r)
        if v is None:
            continue
        if p == "feedbacks":  # hanya yang diluluskan, tanpa nombor telefon
            items = v.values() if isinstance(v, dict) else v
            v = {x["id"]: {k: x[k] for k in x if k != "contact"} for x in items if x and x.get("approved")}
        snap[p] = walk(v, "/" + p)

    payload = json.dumps({"data": snap, "imgs": imgs}, ensure_ascii=False, separators=(",", ":"))
    block = (f'{START}\n  <script id="thhSnapshotData" type="application/json">{payload}</script>\n  {END}')
    html = HTML.read_text(encoding="utf-8")
    if START in html:
        html = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda m: block, html, flags=re.S)
    else:
        html = html.replace("</body>", block + "\n</body>", 1)
    HTML.write_text(html, encoding="utf-8")
    print(f"snapshot: {len(imgs)} gambar, {len(payload)/1e6:.2f} MB -> {HTML.name}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Gabung index.html + css + js jadi satu fail HTML untuk tampal di mana-mana hosting.

Gambar dimuat dari CDN Pexels (tiada folder assets diperlukan).
Jalankan: python3 build-single.py  ->  single-file/index.html
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent

# nama fail gambar -> (id Pexels, lebar, tinggi)
PEXELS = {
    "nasi-mandi-ayam": (18698231, 800, 600),
    "nasi-kabsah-ayam": (17650170, 800, 600),
    "nasi-mandi-kambing": (7340956, 800, 600),
    "nasi-kofta-panggang": (15058965, 800, 600),
    "nasi-kabsah-daging": (5410401, 800, 600),
    "nasi-lamb-shank": (30403529, 800, 600),
    "nasi-madghout-ayam": (3926133, 800, 600),
    "nasi-zurbian-kambing": (16229982, 800, 600),
    "nasi-maqluba-ayam": (2092916, 800, 600),
    "nasi-platter-keluarga": (17139829, 800, 600),
    "teh-adeni": (3556686, 600, 600),
    "teh-karak": (36157389, 600, 600),
    "teh-pudina-maghribi": (30906049, 600, 600),
    "teh-sulaimani": (1417945, 600, 600),
    "gahwa-arab": (30146018, 600, 600),
    "teh-hijau-pudina": (3889844, 600, 600),
    "kopi-ais": (16496287, 600, 600),
    "teh-tarik-ais": (8605859, 600, 600),
    "spanish-latte-ais": (10540639, 600, 600),
    "coklat-ais": (7761651, 600, 600),
    "sirap-bandung": (11767573, 600, 600),
    "laban-ayran": (26698544, 600, 600),
    "jus-mangga": (4955257, 600, 600),
    "mango-lassi": (8211179, 600, 600),
    "jus-tembikai": (11009208, 600, 600),
    "jus-oren": (8679612, 600, 600),
    "limonana": (298720, 600, 600),
    "jus-avokado-kurma": (11896074, 600, 600),
    "jus-delima": (5947024, 600, 600),
    "susu-kurma": (9762169, 600, 600),
    "hero-plate": (17650170, 1100, 1100),
    "hero-bowl": (18698231, 700, 700),
    "about-interior": (20291129, 900, 1100),
    "about-dates": (4469611, 700, 700),
    "gallery-feast": (19386650, 900, 1200),
    "gallery-chicken": (21822134, 1200, 800),
    "og-image": (17650170, 1200, 630),
}


def url(name):
    pid, w, h = PEXELS[name]
    return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w={w}&h={h}"


html = (ROOT / "index.html").read_text()
css = (ROOT / "css/style.css").read_text()
data = (ROOT / "js/data.js").read_text()
app = (ROOT / "js/app.js").read_text()
logo = (ROOT / "assets/favicon.svg").read_bytes()

# gambar dalam HTML
html = re.sub(r"assets/img/([a-z0-9-]+)\.jpg", lambda m: url(m.group(1)).replace("&", "&amp;"), html)
html = html.replace('href="assets/favicon.svg"', 'href="data:image/svg+xml;base64,' + base64.b64encode(logo).decode() + '"')

# gambar dalam JS
img_map = "const PEXELS_IMG = {\n" + "".join(f'  "{k}": "{url(k)}",\n' for k in PEXELS) + "};\n"
app = app.replace("const imgSrc = (m) => `assets/img/${m.img}.jpg`;", "const imgSrc = (m) => PEXELS_IMG[m.img];")
assert "PEXELS_IMG[m.img]" in app, "imgSrc tidak dijumpai dalam app.js"

# CSS & JS sebaris
html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "\n</style>")
html = html.replace('<script src="js/data.js"></script>', "<script>\n" + img_map + data + "\n</script>")
html = html.replace('<script src="js/app.js"></script>', "<script>\n" + app + "\n</script>")
assert "assets/" not in html, "masih ada rujukan assets/"

out = ROOT / "single-file" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"{out} ({out.stat().st_size / 1024:.0f} KB)")

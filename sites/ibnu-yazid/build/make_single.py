"""Bina fail tunggal (HTML+CSS+JS sebaris).
Guna: python3 build/make_single.py <folder_keluaran>
Hasil: ibnu-yazid.html (awam), ibnu-yazid-admin.html (admin, dengan pratonton awam dibenamkan),
       preview/ibnu-yazid.html dan preview/ibnu-yazid-admin.html (tanpa rangka dokumen, untuk Artifact)."""
import base64, os, re, sys
out = sys.argv[1]
r = lambda f: open(f, encoding="utf-8").read()
os.makedirs(out + "/preview", exist_ok=True)

pub = r("index.html")
pub = pub.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + r("style.css") + "\n</style>")
pub = pub.replace('<script src="defaults.js"></script>', "<script>\n" + r("defaults.js") + "\n</script>")
pub = pub.replace('<script src="core.js"></script>', "<script>\n" + r("core.js") + "\n</script>")
pub = pub.replace('<script src="firebase-config.js"></script>', "<script>\n" + r("firebase-config.js") + "\n</script>")
pub = pub.replace('<script src="fb.js"></script>', "<script>\n" + r("fb.js") + "\n</script>")
pub = pub.replace('<script src="script.js"></script>', "<script>\n" + r("script.js") + "\n</script>")
open(out + "/ibnu-yazid.html", "w", encoding="utf-8").write(pub)

adm = r("admin.html")
adm = adm.replace('<link rel="stylesheet" href="admin.css">', "<style>\n" + r("admin.css") + "\n</style>")
adm = adm.replace('<script src="defaults.js"></script>', "<script>\n" + r("defaults.js") + "\n</script>")
adm = adm.replace('<script src="core.js"></script>', "<script>\n" + r("core.js") + "\n</script>")
adm = adm.replace('<script src="firebase-config.js"></script>', "<script>\n" + r("firebase-config.js") + "\n</script>")
adm = adm.replace('<script src="fb.js"></script>', "<script>\n" + r("fb.js") + "\n</script>")
b64 = base64.b64encode(pub.encode("utf-8")).decode()
adm = adm.replace('<script src="admin.js"></script>', '<script type="text/plain" id="publicTpl">' + b64 + "</script>\n  <script>\n" + r("admin.js") + "\n</script>")
open(out + "/ibnu-yazid-admin.html", "w", encoding="utf-8").write(adm)

def artifact(h, title):
    for t in ["<!doctype html>\n", '<html lang="ms">\n', "<head>\n", "</head>\n", "<body>\n", '  <meta charset="utf-8">\n',
              '  <meta name="viewport" content="width=device-width, initial-scale=1">\n']:
        h = h.replace(t, "", 1)
    h = re.sub(r"</body>\s*</html>\s*$", "", h)
    h = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", h, count=1)
    return h
open(out + "/preview/ibnu-yazid.html", "w", encoding="utf-8").write(artifact(pub, "Ibnu Yazid"))
open(out + "/preview/ibnu-yazid-admin.html", "w", encoding="utf-8").write(artifact(adm, "Panel Admin Ibnu Yazid"))
for f in ("ibnu-yazid.html", "ibnu-yazid-admin.html", "preview/ibnu-yazid.html", "preview/ibnu-yazid-admin.html"):
    print(f, os.path.getsize(out + "/" + f) // 1024, "KB")

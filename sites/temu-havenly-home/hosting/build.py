"""Sediakan hosting/public untuk Firebase Hosting (deploy: hosting SAHAJA).
  /           -> panel-awam.html
  /AdminTEMU  -> portal-admin.html (noindex)
  /home       -> redirect 301 ke /  (link lama kekal berfungsi)
Jalankan: python3 sites/temu-havenly-home/hosting/build.py"""
import pathlib, shutil, datetime
here = pathlib.Path(__file__).resolve().parent
site = here.parent
pub = here / "public"
if pub.exists():
    shutil.rmtree(pub)
pub.mkdir()
shutil.copyfile(site / "panel-awam.html", pub / "index.html")
shutil.copyfile(site / "portal-admin.html", pub / "AdminTEMU.html")
today = datetime.date.today().isoformat()
(pub / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://temuhomestay.com/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
""")
(pub / "robots.txt").write_text("User-agent: *\nAllow: /\n\nSitemap: https://temuhomestay.com/sitemap.xml\n")
print("public:", sorted(p.name for p in pub.iterdir()))

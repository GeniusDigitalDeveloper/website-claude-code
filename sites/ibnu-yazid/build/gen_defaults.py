"""Jana defaults.js daripada texts.json (ekstrak teks BM/BI laman awam).
Guna: python3 build/gen_defaults.py <texts.json> <defaults.js>"""
import json, re, sys, html

src, out = sys.argv[1], sys.argv[2]
raw = json.load(open(src))
MS, EN = raw["ms"], raw["en"]

def conv(s):
    s = re.sub(r'<span class="grad">(.*?)</span>', r'*\1*', s)
    s = re.sub(r'<a href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', s)
    return html.unescape(s)

def L(k):
    return {"ms": conv(MS[k]), "en": conv(EN[k])}

used = set()
def U(k):
    used.add(k); return L(k)

# ---------- senarai berstruktur ----------
services = []
for i, (sid, art, jawi, icon, feat, featured) in enumerate([
    ("khat", "khat", "خط", "jawi", 4, False),
    ("web", "web", "", "monitor", 4, True),
    ("claude", "video", "", "video", 4, False),
], start=1):
    s = {
        "id": sid, "visible": True, "featured": featured, "icon": icon, "jawi": jawi, "art": art,
        "artText": "بسم الله" if art == "khat" else "",
        "short": U(f"sv{i}.short"), "title": U(f"sv{i}.t"),
        "priceLead": U("from") if i < 3 else U("setup"),
        "priceMin": [50, 300, 99][i-1], "priceMax": [100, 500, 99][i-1],
        "priceText": ["RM50 – RM100", "RM300 – RM500", "RM99"][i-1],
        "desc": U(f"m{i}.p"),
        "features": [U(f"sv{i}.l{n}") for n in range(1, feat+1)],
        "note": U("sv3.note") if i == 3 else {"ms": "", "en": ""},
        "ctaLabel": U(f"sv{i}.cta"),
        "ctaUrl": ["https://ibnuyazid.site/digitalart",
                   "https://wa.me/60177977935?text=Assalamualaikum%2C%20saya%20berminat%20dengan%20pakej%20Website%20%2F%20Aplikasi.",
                   "https://hermesfordummies.bcl.my/form/claude-video/18216"][i-1],
        "ctaIcon": True,
    }
    services.append(s)

plans = [
    {"id": "p-khat", "serviceId": "khat", "featured": False, "kicker": U("sv1.short"), "price": "50", "priceTo": "– RM100",
     "cur": "RM", "unit": {"ms": "", "en": ""}, "features": [U("h1.l1"), U("h1.l2"), U("h1.l3")],
     "action": "quote", "url": "", "btnLabel": {"ms": "", "en": ""}},
    {"id": "p-web", "serviceId": "web", "featured": True, "kicker": U("sv2.short"), "price": "300", "priceTo": "– RM500",
     "cur": "RM", "unit": {"ms": "", "en": ""}, "features": [U("h2.l1"), L("sv2.l2"), L("sv2.l3"), L("sv2.l4")],
     "action": "quote", "url": "", "btnLabel": {"ms": "", "en": ""}},
    {"id": "p-claude", "serviceId": "claude", "featured": False, "kicker": U("sv3.short"), "price": "99", "priceTo": "",
     "cur": "RM", "unit": U("h3.once"), "features": [U("h3.l1"), L("sv3.l3"), U("h3.l3")],
     "action": "service", "url": "", "btnLabel": {"ms": "", "en": ""}},
]

problems = [{"prob": U(f"p{i}.prob"), "sol": U(f"p{i}.sol")} for i in (1, 2, 3)]
steps = [{"icon": ic, "title": U(f"pr{i}.t"), "desc": U(f"pr{i}.d")}
         for i, ic in zip((1, 2, 3, 4), ("chat", "doc", "edit", "check"))]
works = [
    {"art": "khat", "artText": "بسم الله", "tag": U("pf1.tag"), "title": "Qalam Digital Calligraphy", "serviceId": "khat"},
    {"art": "web", "artText": "", "tag": U("pf2.tag"), "title": "ibnuyazid.site", "serviceId": "web"},
    {"art": "video", "artText": "", "tag": U("pf3.tag"), "title": "Claude For Dummies", "serviceId": "claude"},
]
albums = [
    {"id": "web", "name": U("t.web"), "images": []},
    {"id": "khat", "name": U("t.khat"), "images": []},
    {"id": "claude", "name": U("t.claude"), "images": []},
]
values = [{"icon": ic, "text": U(f"ab.v{i}")} for i, ic in zip((1, 2, 3), ("shield", "edit", "clock"))]
faq = [{"q": U(f"q{i}.q"), "a": U(f"q{i}.a")} for i in range(1, 8)]
chips = [U(f"hero.a{i}") for i in (1, 2, 3)]
stats = [
    {"prefix": "RM", "value": 50, "label": U("s.khat")},
    {"prefix": "RM", "value": 300, "label": U("s.web")},
    {"prefix": "RM", "value": 99, "label": U("s.claude")},
    {"prefix": "RM", "value": 70, "label": U("s.host")},
]
ticker = ["Kaligrafi Khat", "Tulisan Jawi", "Website", "Aplikasi", "Hosting", "Domain", "Video AI", "Claude Code"]

# ---------- teks statik: semua kunci yang belum digunakan dalam senarai ----------
extra = {
    "skip": None, "aria.wa": ({"ms": "Hubungi melalui WhatsApp", "en": "Contact via WhatsApp"}),
    "aria.close": ({"ms": "Tutup", "en": "Close"}),
    "hero.chip": None,
}
texts = {}
for k in MS:
    if k in used or k.startswith(("h1.", "h2.", "h3.", "sv1.", "sv2.", "sv3.", "m1.", "m2.", "m3.", "pf1.", "pf2.", "pf3.")):
        continue
    if re.match(r"^(p[123]|pr[1-4]|q[1-7]|ab\.v[123]|hero\.a[123]|s\.(khat|web|claude|host))", k):
        continue
    if k in ("t.web", "t.khat", "t.claude"):
        continue
    texts[k.replace(".", "_")] = L(k)
texts["aria_wa"] = extra["aria.wa"]; texts["aria_close"] = extra["aria.close"]
MSGS = {
    "msg.errName": ("Sila isi nama anda.", "Please enter your name."),
    "msg.errPhone": ("Sila isi no. telefon Malaysia yang sah, cth 012-3456789.", "Please enter a valid Malaysian phone number, e.g. 012-3456789."),
    "msg.ok": ("Terima kasih! WhatsApp sedang dibuka untuk hantar mesej anda.", "Thank you! WhatsApp is opening to send your message."),
    "msg.openWa": ("Tak terbuka? Tekan di sini.", "Didn't open? Tap here."),
    "msg.waIntro": ("Assalamualaikum Ibnu Yazid, saya nak minta sebut harga.", "Hi Ibnu Yazid, I'd like to request a quote."),
    "msg.name": ("Nama", "Name"), "msg.phone": ("Telefon", "Phone"), "msg.plan": ("Pakej", "Package"), "msg.msg": ("Mesej", "Message"),
    "msg.copied": ("Nombor disalin", "Number copied"), "msg.copyFail": ("Salin manual: 017-797 7935", "Copy manually: 017-797 7935"),
    "msg.visFail": ("Statistik tidak dapat dimuatkan buat masa ini.", "Statistics can't be loaded right now."),
    "msg.empty": ("Gambar testimoni", "Testimonial photo"), "msg.photo": ("Testimoni", "Testimonial"),
    "msg.menuOpen": ("Buka menu", "Open menu"), "msg.menuClose": ("Tutup menu", "Close menu"),
    "msg.langBtn": ("Tukar bahasa ke Bahasa Inggeris", "Switch language to Malay"),
}
for k, (a, b) in MSGS.items():
    texts[k.replace(".", "_")] = {"ms": a, "en": b}

D = {
    "rev": 1,
    "brand": {
        "name": "Ibnu Yazid", "subtitle": {"ms": "AI Web Developer", "en": "AI Web Developer"},
        "mark": "ي", "logo": "", "waNumber": "60177977935", "phoneDisplay": "017-797 7935",
        "waMessage": {"ms": "Assalamualaikum Ibnu Yazid, saya nak tanya tentang perkhidmatan.",
                      "en": "Hi Ibnu Yazid, I'd like to ask about your services."},
        "qalamLabel": "Qalam Digital Calligraphy", "qalamUrl": "https://ibnuyazid.site/digitalart",
    },
    "seo": {
        "title": "Ibnu Yazid | AI Web Developer, Khat Digital & Video AI",
        "address": [{"locality": "Kuantan", "region": "Pahang"}, {"locality": "Tumpat", "region": "Kelantan"}],
        "description": "Ibnu Yazid, AI Web Developer di Kuantan & Tumpat. Khat dan Jawi digital dari RM50, website dan aplikasi dari RM300, setup video AI Claude For Dummies RM99. WhatsApp 017-797 7935.",
    },
    "effects": {"sound": True},
    "sections": {k: True for k in ("ticker", "stats", "problems", "services", "process", "portfolio",
                                    "testimonials", "pricing", "about", "faq", "banner", "visits")},
    "theme": {"palette": "teal", "custom": {"primary": "#0f766e", "secondary": "#0e7490", "accent": "#f59e0b"},
              "fontHead": "Outfit", "fontBody": "Work Sans"},
    "t": texts,
    "chips": chips, "ticker": ticker, "stats": stats, "problems": problems,
    "services": services, "steps": steps, "works": works, "albums": albums,
    "plans": plans, "values": values, "faq": faq,
    "deco": {"hero": "قلم", "banner": "قلم", "aboutArt": "ابن يزيد", "chipA": "Kuantan, Pahang", "chipB": "Tumpat, Kelantan"},
    "visits": {"api": "https://abacus.jasoncameron.dev", "ns": "ibnuyazid-web-live"},
}
js = "/* Dijana oleh build/gen_defaults.py. Data lalai laman (BM/BI). */\nwindow.IY_DEFAULTS = " + json.dumps(D, ensure_ascii=False, indent=1) + ";\n"
open(out, "w").write(js)
print("kunci teks statik:", len(texts), "| digunakan dalam senarai:", len(used))
print("tidak dipakai langsung:", sorted(set(MS) - set(texts) - used))

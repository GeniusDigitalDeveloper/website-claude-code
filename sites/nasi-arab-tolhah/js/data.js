/* =========================================================
   Nasi Arab Tolhah — data kedai, menu & teks dwibahasa
   Tukar maklumat kedai di CONFIG sahaja.
   ========================================================= */

const CONFIG = {
  name: "Nasi Arab Tolhah",
  whatsapp: "60177977935",          // 017-797 7935 (format antarabangsa, tanpa +)
  phoneDisplay: "017-797 7935",
  address: "No. 18, Jalan Mawar 3, Taman Mawar, 43000 Kajang, Selangor",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Nasi+Arab+Tolhah+Kajang",
  socials: {
    tiktok:    { handle: "@nasiarabtolhah", url: "https://www.tiktok.com/@nasiarabtolhah" },
    instagram: { handle: "@nasiarabtolhah", url: "https://www.instagram.com/nasiarabtolhah" },
    facebook:  { handle: "Nasi Arab Tolhah", url: "https://www.facebook.com/nasiarabtolhah" }
  },
  openHour: "11:00",
  closeHour: "23:00",
  currency: "RM"
};

/* ---------- 10 jenis nasi Arab ---------- */
const RICE = [
  {
    id: "r01", cat: "ayam", img: "nasi-mandi-ayam", price: 17.9, tag: "best",
    name: { ms: "Nasi Arab Mandi Ayam", en: "Chicken Mandi Rice" },
    desc: {
      ms: "Ayam suku dipanggang dalam tanur, nasi basmathi wangi rempah Yaman, sambal tomato dan sup.",
      en: "Quarter chicken roasted in a tandoor over fragrant Yemeni-spiced basmati, with tomato salsa and soup."
    }
  },
  {
    id: "r02", cat: "ayam", img: "nasi-kabsah-ayam", price: 18.9, tag: "chef",
    name: { ms: "Nasi Kabsah Ayam", en: "Chicken Kabsa Rice" },
    desc: {
      ms: "Resipi Saudi: nasi dimasak bersama tomato, kismis dan badam, dihidang dengan ayam bakar rempah.",
      en: "Saudi recipe: rice simmered with tomato, raisins and almonds, served with spiced grilled chicken."
    }
  },
  {
    id: "r03", cat: "daging", img: "nasi-mandi-kambing", price: 29.9, tag: "best",
    name: { ms: "Nasi Mandi Kambing", en: "Lamb Mandi Rice" },
    desc: {
      ms: "Kambing muda dimasak perlahan 6 jam hingga lembut tertanggal dari tulang, ditabur bawang goreng.",
      en: "Young lamb slow-cooked for 6 hours until fall-off-the-bone tender, topped with crispy shallots."
    }
  },
  {
    id: "r04", cat: "daging", img: "nasi-kofta-panggang", price: 19.9,
    name: { ms: "Nasi Arab Kofta Panggang", en: "Grilled Kofta Rice" },
    desc: {
      ms: "Kofta daging cincang berempah dipanggang arang, atas nasi kuning, kuah yogurt bawang putih.",
      en: "Charcoal-grilled spiced minced beef kofta on golden rice with garlic yogurt sauce."
    }
  },
  {
    id: "r05", cat: "daging", img: "nasi-kabsah-daging", price: 25.9,
    name: { ms: "Nasi Kabsah Daging", en: "Beef Kabsa Rice" },
    desc: {
      ms: "Daging lembu empuk dimasak bersama nasi dalam periuk besar, aroma kayu manis dan buah pelaga.",
      en: "Tender beef cooked with the rice in a large pot, scented with cinnamon and cardamom."
    }
  },
  {
    id: "r06", cat: "daging", img: "nasi-lamb-shank", price: 38.9, tag: "chef",
    name: { ms: "Nasi Mandi Lamb Shank", en: "Lamb Shank Mandi Rice" },
    desc: {
      ms: "Betis kambing utuh, diperap semalaman dan dipanggang perlahan. Hidangan istimewa Tolhah.",
      en: "A whole lamb shank marinated overnight and slow-roasted. Tolhah's signature plate."
    }
  },
  {
    id: "r07", cat: "ayam", img: "nasi-madghout-ayam", price: 18.9,
    name: { ms: "Nasi Madghout Ayam", en: "Chicken Madghout Rice" },
    desc: {
      ms: "Nasi dan ayam dimasak bertekanan sehingga rempah meresap ke setiap butir. Lembut dan berkuah.",
      en: "Rice and chicken pressure-cooked so the spices soak into every grain. Soft and moist."
    }
  },
  {
    id: "r08", cat: "daging", img: "nasi-zurbian-kambing", price: 31.9,
    name: { ms: "Nasi Zurbian Kambing", en: "Lamb Zurbian Rice" },
    desc: {
      ms: "Hidangan Aden dalam periuk tanah: kambing, kentang, yogurt dan safron dimasak berlapis.",
      en: "An Aden classic in a clay pot: lamb, potato, yogurt and saffron cooked in layers."
    }
  },
  {
    id: "r09", cat: "ayam", img: "nasi-maqluba-ayam", price: 21.9,
    name: { ms: "Nasi Maqluba Ayam", en: "Chicken Maqluba Rice" },
    desc: {
      ms: "Nasi \"terbalik\" Palestin dengan terung, kentang dan ayam, diterbalikkan di depan anda.",
      en: "Palestinian \"upside-down\" rice with aubergine, potato and chicken, flipped at your table."
    }
  },
  {
    id: "r10", cat: "kongsi", img: "nasi-platter-keluarga", price: 89.0, tag: "share",
    name: { ms: "Platter Dulang Keluarga (4 orang)", en: "Family Tray Platter (serves 4)" },
    desc: {
      ms: "Satu dulang besar: ayam mandi, kambing, kofta, nasi kabsah, salad, sambal dan sup untuk 4 orang.",
      en: "One big tray: mandi chicken, lamb, kofta, kabsa rice, salad, salsa and soup for four."
    }
  }
];

/* ---------- 20 jenis minuman ---------- */
const DRINKS = [
  { id: "d01", cat: "panas", img: "teh-adeni",          price: 5.5,  tag: "best",
    name: { ms: "Teh Adeni",             en: "Adeni Tea" },
    desc: { ms: "Teh susu Yaman dengan pelaga dan cengkih.", en: "Yemeni milk tea with cardamom and clove." } },
  { id: "d02", cat: "panas", img: "teh-karak",          price: 5.0,
    name: { ms: "Teh Karak",             en: "Karak Chai" },
    desc: { ms: "Teh pekat berempah ala Dubai, manis lemak.", en: "Strong, creamy Dubai-style spiced tea." } },
  { id: "d03", cat: "panas", img: "teh-pudina-maghribi", price: 6.5,
    name: { ms: "Teh Pudina Maghribi (teko)", en: "Moroccan Mint Tea (pot)" },
    desc: { ms: "Teh hijau dan daun pudina segar dalam teko perak.", en: "Green tea and fresh mint in a silver pot." } },
  { id: "d04", cat: "panas", img: "teh-sulaimani",      price: 4.5,
    name: { ms: "Teh Sulaimani",         en: "Sulaimani Tea" },
    desc: { ms: "Teh O ringan dengan limau dan sedikit rempah.", en: "Light black tea with lemon and a hint of spice." } },
  { id: "d05", cat: "panas", img: "gahwa-arab",         price: 7.9,  tag: "chef",
    name: { ms: "Gahwa Kopi Arab + Kurma", en: "Arabic Gahwa + Dates" },
    desc: { ms: "Kopi Arab safron dalam dallah, dihidang bersama 3 biji kurma.", en: "Saffron Arabic coffee in a dallah, served with 3 dates." } },
  { id: "d06", cat: "panas", img: "teh-hijau-pudina",   price: 5.0,
    name: { ms: "Teh Hijau Pudina",      en: "Green Mint Tea" },
    desc: { ms: "Teh hijau panas, segar dan ringan selepas makan.", en: "Hot green tea, fresh and light after a meal." } },

  { id: "d07", cat: "sejuk", img: "kopi-ais",           price: 4.5,
    name: { ms: "Kopi Ais",              en: "Iced Coffee" },
    desc: { ms: "Kopi tempatan pekat dengan susu dan ais.", en: "Bold local coffee with milk over ice." } },
  { id: "d08", cat: "sejuk", img: "teh-tarik-ais",      price: 4.5,
    name: { ms: "Teh Tarik Ais",         en: "Iced Pulled Tea" },
    desc: { ms: "Teh tarik berbuih, sejuk dan lemak manis.", en: "Frothy pulled milk tea, chilled." } },
  { id: "d09", cat: "sejuk", img: "spanish-latte-ais",  price: 9.9,
    name: { ms: "Spanish Latte Ais",     en: "Iced Spanish Latte" },
    desc: { ms: "Espresso dengan susu pekat manis dan susu segar.", en: "Espresso with condensed and fresh milk." } },
  { id: "d10", cat: "sejuk", img: "coklat-ais",         price: 6.9,
    name: { ms: "Coklat Ais",            en: "Iced Chocolate" },
    desc: { ms: "Coklat pekat, susu dan ais, disiram sos coklat.", en: "Rich chocolate and milk over ice with chocolate drizzle." } },
  { id: "d11", cat: "sejuk", img: "sirap-bandung",      price: 4.0,
    name: { ms: "Sirap Bandung Ais",     en: "Iced Rose Milk (Bandung)" },
    desc: { ms: "Sirap ros dan susu, kegemaran semua umur.", en: "Rose syrup with milk, loved by all ages." } },
  { id: "d12", cat: "sejuk", img: "laban-ayran",        price: 6.5,
    name: { ms: "Laban Ayran",           en: "Laban Ayran" },
    desc: { ms: "Minuman yogurt masin ala Arab, sangat sesuai dengan nasi mandi.", en: "Salted Arabic yogurt drink, perfect with mandi." } },

  { id: "d13", cat: "jus", img: "jus-mangga",           price: 8.5,
    name: { ms: "Jus Mangga",            en: "Mango Juice" },
    desc: { ms: "Mangga harum manis dikisar segar.", en: "Freshly blended sweet mango." } },
  { id: "d14", cat: "jus", img: "mango-lassi",          price: 9.9,
    name: { ms: "Mango Lassi",           en: "Mango Lassi" },
    desc: { ms: "Mangga, yogurt dan sedikit pelaga.", en: "Mango, yogurt and a touch of cardamom." } },
  { id: "d15", cat: "jus", img: "jus-tembikai",         price: 6.5,
    name: { ms: "Jus Tembikai",          en: "Watermelon Juice" },
    desc: { ms: "Tembikai merah segar tanpa gula tambahan.", en: "Fresh red watermelon, no added sugar." } },
  { id: "d16", cat: "jus", img: "jus-oren",             price: 7.5,
    name: { ms: "Jus Oren Segar",        en: "Fresh Orange Juice" },
    desc: { ms: "Oren diperah setiap pesanan.", en: "Oranges squeezed to order." } },
  { id: "d17", cat: "jus", img: "limonana",             price: 7.9,  tag: "best",
    name: { ms: "Limonana (Lemon Pudina)", en: "Limonana (Lemon Mint)" },
    desc: { ms: "Lemon dan pudina dikisar dengan ais, sangat menyegarkan.", en: "Lemon and mint blended with ice. Very refreshing." } },
  { id: "d18", cat: "jus", img: "jus-avokado-kurma",    price: 12.9, tag: "chef",
    name: { ms: "Jus Avokado Kurma",     en: "Avocado Date Shake" },
    desc: { ms: "Avokado, kurma Ajwa dan susu. Pekat dan mengenyangkan.", en: "Avocado, Ajwa dates and milk. Thick and filling." } },
  { id: "d19", cat: "jus", img: "jus-delima",           price: 11.9,
    name: { ms: "Jus Delima",            en: "Pomegranate Juice" },
    desc: { ms: "Delima segar diperah, sedikit masam manis.", en: "Freshly pressed pomegranate, sweet and tart." } },
  { id: "d20", cat: "jus", img: "susu-kurma",           price: 9.5,
    name: { ms: "Susu Kurma",            en: "Date Milk" },
    desc: { ms: "Kurma Madinah dikisar bersama susu segar.", en: "Madinah dates blended with fresh milk." } }
];

/* ---------- Teks antara muka (BM / EN) ---------- */
const I18N = {
  ms: {
    "meta.title": "Nasi Arab Tolhah — Nasi Mandi, Kabsah & Minuman Arab",
    "top.hours": "Buka setiap hari 11:00 pagi – 11:00 malam",
    "nav.home": "Utama", "nav.rice": "Menu Nasi", "nav.drinks": "Minuman", "nav.about": "Tentang",
    "nav.how": "Cara Tempah", "nav.gallery": "Galeri", "nav.contact": "Hubungi", "nav.cart": "Troli",
    "nav.open": "Buka menu", "nav.close": "Tutup menu", "cart.open": "Buka troli",

    "hero.eyebrow": "Restoran Nasi Arab · Kajang",
    "hero.title": "Rasa Arab asli, dimasak perlahan.",
    "hero.sub": "Nasi mandi, kabsah dan zurbian dengan daging empuk yang dimasak 6 jam. Pilih menu, tempah meja atau bungkus, dan hantar terus ke WhatsApp kami.",
    "hero.cta": "Lihat Menu & Pesan", "hero.cta2": "WhatsApp Kami",
    "hero.stat1": "jenis nasi Arab", "hero.stat2": "jenis minuman", "hero.stat3": "caj tambahan",
    "hero.badge": "Daging dimasak 6 jam", "hero.badge2": "Rempah import asli",
    "hero.scroll": "Skrol ke bawah",

    "feat.eyebrow": "Kenapa Tolhah",
    "feat.title": "Tiga perkara yang kami jaga",
    "feat.1.t": "Masak perlahan, empuk", "feat.1.d": "Kambing dan ayam diperap semalaman, kemudian dimasak perlahan dalam tanur sehingga lembut.",
    "feat.2.t": "Rempah asli Timur Tengah", "feat.2.d": "Lumi, pelaga, safron dan hawaij dibawa masuk terus, dikisar sendiri setiap minggu.",
    "feat.3.t": "Harga makanan sahaja", "feat.3.d": "Tiada caj perkhidmatan, tiada caj tempahan. Anda bayar harga makanan, itu sahaja.",

    "sig.eyebrow": "Pilihan Chef", "sig.title": "Hidangan istimewa, dalam 3D",
    "sig.sub": "Seret atau tekan anak panah untuk pusing pinggan.",
    "sig.prev": "Hidangan sebelum", "sig.next": "Hidangan seterusnya",

    "rice.eyebrow": "Menu Utama", "rice.title": "10 jenis nasi Arab",
    "rice.sub": "Setiap pinggan dihidang dengan sambal tomato, salad dan sup panas.",
    "filter.all": "Semua", "filter.ayam": "Ayam", "filter.daging": "Kambing & Daging", "filter.kongsi": "Untuk Dikongsi",
    "filter.panas": "Panas", "filter.sejuk": "Sejuk", "filter.jus": "Jus Segar",
    "drinks.eyebrow": "Minuman", "drinks.title": "20 jenis minuman",
    "drinks.sub": "Dari teh Adeni panas hingga jus avokado kurma yang pekat.",
    "tag.best": "Terlaris", "tag.chef": "Pilihan Chef", "tag.share": "Untuk 4 orang",
    "add": "Tambah", "added": "Ditambah", "add.aria": "Tambah ke troli",

    "about.eyebrow": "Kisah Kami", "about.title": "Dari dapur keluarga ke meja anda",
    "about.p1": "Tolhah bermula dari resipi keluarga yang dibawa pulang dari Yaman dan Mekah. Kami percaya nasi Arab yang sedap datang dari kesabaran: daging diperap semalaman, nasi dimasak dengan stok sendiri, dan rempah dikisar segar.",
    "about.p2": "Hari ini kami masih masak dengan cara yang sama, dalam tanur, setiap hari, untuk keluarga, rakan sekerja dan tetamu yang datang dari jauh.",
    "about.s1": "jam masak perlahan", "about.s2": "hari seminggu kami buka", "about.s3": "bahan halal",

    "how.eyebrow": "Cara Tempah", "how.title": "Tempah dalam 3 langkah",
    "how.1.t": "Pilih menu", "how.1.d": "Tekan \"Tambah\" pada nasi dan minuman yang anda mahu.",
    "how.2.t": "Semak troli", "how.2.d": "Tambah, kurang atau padam item. Pilih tempah meja atau bungkus.",
    "how.3.t": "Hantar ke WhatsApp", "how.3.d": "Semak invois, kemudian hantar. Kami sahkan tempahan anda di WhatsApp.",
    "how.cta": "Mula Pilih Menu",

    "gal.eyebrow": "Galeri", "gal.title": "Suasana di Tolhah",

    "contact.eyebrow": "Lokasi & Waktu", "contact.title": "Jumpa kami di Kajang",
    "contact.addr": "Alamat", "contact.hours": "Waktu operasi", "contact.hours.v": "Setiap hari, 11:00 pagi – 11:00 malam",
    "contact.phone": "Telefon / WhatsApp", "contact.map": "Buka di Google Maps", "contact.wa": "Mesej di WhatsApp",
    "cta.title": "Lapar? Meja anda menunggu.", "cta.sub": "Tempah sekarang, sampai terus makan. Tiada caj tambahan.",

    "foot.tag": "Nasi Arab asli dimasak perlahan, dihidang dengan mesra.",
    "foot.menu": "Menu", "foot.contact": "Hubungi", "foot.follow": "Ikuti kami",
    "foot.rights": "Hak cipta terpelihara.", "foot.photos": "Foto: Pexels",

    "cart.title": "Troli anda", "cart.empty.t": "Troli masih kosong", "cart.empty.d": "Pilih nasi dan minuman kegemaran anda dahulu.",
    "cart.browse": "Lihat menu", "cart.more": "Tambah menu lain", "cart.clear": "Kosongkan",
    "cart.subtotal": "Jumlah makanan", "cart.fees": "Caj tambahan", "cart.total": "Jumlah bayaran",
    "cart.checkout": "Checkout", "cart.close": "Tutup troli", "cart.each": "seunit",
    "cart.inc": "Tambah satu", "cart.dec": "Kurang satu", "cart.remove": "Padam item",
    "cart.note": "Tiada caj perkhidmatan atau tempahan. Bayar di kaunter.",

    "co.title": "Checkout tempahan", "co.sub": "Pilih cara anda mahu menikmati pesanan.",
    "co.dine": "Tempah Meja", "co.dine.d": "Makan di kedai", "co.take": "Bungkus", "co.take.d": "Ambil di kaunter",
    "co.name": "Nama penuh", "co.phone": "No. telefon", "co.date": "Tarikh", "co.time": "Masa tiba",
    "co.time.take": "Masa ambil", "co.pax": "Bilangan orang", "co.notes": "Nota (pilihan)",
    "co.notes.ph": "Contoh: kurang pedas, kerusi bayi, meja dekat tingkap",
    "co.back": "Kembali ke troli", "co.next": "Lihat invois", "co.close": "Tutup checkout",
    "co.err.name": "Sila isi nama anda.", "co.err.phone": "Sila isi nombor telefon yang sah.",
    "co.err.date": "Sila pilih tarikh hari ini atau selepasnya.", "co.err.time": "Sila pilih masa antara 11:00 pagi dan 10:30 malam.",
    "co.err.pax": "Sila pilih bilangan orang.", "co.err.past": "Masa itu sudah lepas. Sila pilih masa lain.",

    "inv.title": "Invois Tempahan", "inv.no": "No. invois", "inv.issued": "Dikeluarkan",
    "inv.type": "Jenis", "inv.when": "Tarikh & masa", "inv.pax": "Bilangan orang", "inv.customer": "Pelanggan",
    "inv.item": "Item", "inv.qty": "Kuantiti", "inv.price": "Harga", "inv.amount": "Jumlah",
    "inv.service": "Caj perkhidmatan", "inv.booking": "Caj tempahan", "inv.tax": "Cukai",
    "inv.foot": "Anda hanya bayar harga makanan. Bayaran dibuat di kaunter semasa anda tiba.",
    "inv.edit": "Edit semula", "inv.print": "Cetak", "inv.send": "Hantar ke WhatsApp", "inv.close": "Tutup invois",
    "inv.people": "orang", "inv.stamp": "Tiada caj", "inv.unit": "seunit",

    "toast.added": "ditambah ke troli", "toast.removed": "dipadam dari troli", "toast.cleared": "Troli dikosongkan",
    "toast.sent": "WhatsApp dibuka. Terima kasih! Kami akan sahkan tempahan anda.",

    "wa.header": "TEMPAHAN BARU — NASI ARAB TOLHAH", "wa.hello": "Assalamualaikum, saya ingin membuat tempahan:",
    "wa.items": "Pesanan", "wa.food": "Jumlah makanan", "wa.fees": "Caj tambahan", "wa.total": "JUMLAH BAYARAN", "wa.notes": "Nota",
    "wa.end": "Bayaran di kaunter. Mohon sahkan tempahan ini. Terima kasih.",
    "wa.quick": "Assalamualaikum Nasi Arab Tolhah, saya ingin bertanya tentang menu dan tempahan."
  },

  en: {
    "meta.title": "Nasi Arab Tolhah — Mandi, Kabsa & Arabic Drinks",
    "top.hours": "Open daily 11:00 AM – 11:00 PM",
    "nav.home": "Home", "nav.rice": "Rice Menu", "nav.drinks": "Drinks", "nav.about": "About",
    "nav.how": "How to Order", "nav.gallery": "Gallery", "nav.contact": "Contact", "nav.cart": "Cart",
    "nav.open": "Open menu", "nav.close": "Close menu", "cart.open": "Open cart",

    "hero.eyebrow": "Arabic Rice Restaurant · Kajang",
    "hero.title": "True Arabic flavour, slow-cooked.",
    "hero.sub": "Mandi, kabsa and zurbian with meat slow-cooked for 6 hours. Pick your dishes, book a table or take away, and send it straight to our WhatsApp.",
    "hero.cta": "See Menu & Order", "hero.cta2": "WhatsApp Us",
    "hero.stat1": "Arabic rice dishes", "hero.stat2": "drinks", "hero.stat3": "extra charges",
    "hero.badge": "Meat cooked for 6 hours", "hero.badge2": "Authentic imported spices",
    "hero.scroll": "Scroll down",

    "feat.eyebrow": "Why Tolhah",
    "feat.title": "Three things we never compromise",
    "feat.1.t": "Slow-cooked, tender", "feat.1.d": "Lamb and chicken are marinated overnight, then slow-cooked in a tandoor until soft.",
    "feat.2.t": "Real Middle Eastern spices", "feat.2.d": "Loomi, cardamom, saffron and hawaij, imported and ground in-house every week.",
    "feat.3.t": "You pay for food only", "feat.3.d": "No service charge, no booking fee. You pay the menu price, nothing else.",

    "sig.eyebrow": "Chef's Picks", "sig.title": "Signature dishes, in 3D",
    "sig.sub": "Drag or use the arrows to spin the plates.",
    "sig.prev": "Previous dish", "sig.next": "Next dish",

    "rice.eyebrow": "Main Menu", "rice.title": "10 Arabic rice dishes",
    "rice.sub": "Every plate comes with tomato salsa, salad and hot soup.",
    "filter.all": "All", "filter.ayam": "Chicken", "filter.daging": "Lamb & Beef", "filter.kongsi": "To Share",
    "filter.panas": "Hot", "filter.sejuk": "Cold", "filter.jus": "Fresh Juice",
    "drinks.eyebrow": "Drinks", "drinks.title": "20 drinks",
    "drinks.sub": "From hot Adeni tea to a thick avocado date shake.",
    "tag.best": "Best seller", "tag.chef": "Chef's pick", "tag.share": "Serves 4",
    "add": "Add", "added": "Added", "add.aria": "Add to cart",

    "about.eyebrow": "Our Story", "about.title": "From a family kitchen to your table",
    "about.p1": "Tolhah began with family recipes brought home from Yemen and Mecca. We believe great Arabic rice comes from patience: meat marinated overnight, rice cooked in our own stock, and spices ground fresh.",
    "about.p2": "Today we still cook the same way, in a tandoor, every day, for families, colleagues and guests who travel from afar.",
    "about.s1": "hours of slow cooking", "about.s2": "days a week we open", "about.s3": "halal ingredients",

    "how.eyebrow": "How to Order", "how.title": "Order in 3 steps",
    "how.1.t": "Pick your dishes", "how.1.d": "Tap \"Add\" on the rice and drinks you want.",
    "how.2.t": "Review your cart", "how.2.d": "Add, reduce or remove items. Choose dine-in booking or takeaway.",
    "how.3.t": "Send to WhatsApp", "how.3.d": "Check the invoice, then send. We confirm your booking on WhatsApp.",
    "how.cta": "Start Choosing",

    "gal.eyebrow": "Gallery", "gal.title": "Inside Tolhah",

    "contact.eyebrow": "Location & Hours", "contact.title": "Find us in Kajang",
    "contact.addr": "Address", "contact.hours": "Opening hours", "contact.hours.v": "Daily, 11:00 AM – 11:00 PM",
    "contact.phone": "Phone / WhatsApp", "contact.map": "Open in Google Maps", "contact.wa": "Message on WhatsApp",
    "cta.title": "Hungry? Your table is waiting.", "cta.sub": "Book now, arrive and eat. No extra charges.",

    "foot.tag": "Authentic Arabic rice, slow-cooked and served warmly.",
    "foot.menu": "Menu", "foot.contact": "Contact", "foot.follow": "Follow us",
    "foot.rights": "All rights reserved.", "foot.photos": "Photos: Pexels",

    "cart.title": "Your cart", "cart.empty.t": "Your cart is empty", "cart.empty.d": "Pick your favourite rice and drinks first.",
    "cart.browse": "Browse menu", "cart.more": "Add more items", "cart.clear": "Clear",
    "cart.subtotal": "Food total", "cart.fees": "Extra charges", "cart.total": "Amount to pay",
    "cart.checkout": "Checkout", "cart.close": "Close cart", "cart.each": "each",
    "cart.inc": "Add one", "cart.dec": "Remove one", "cart.remove": "Remove item",
    "cart.note": "No service or booking charges. Pay at the counter.",

    "co.title": "Booking checkout", "co.sub": "Choose how you want to enjoy your order.",
    "co.dine": "Book a Table", "co.dine.d": "Dine in", "co.take": "Takeaway", "co.take.d": "Pick up at counter",
    "co.name": "Full name", "co.phone": "Phone number", "co.date": "Date", "co.time": "Arrival time",
    "co.time.take": "Pick-up time", "co.pax": "Number of guests", "co.notes": "Notes (optional)",
    "co.notes.ph": "e.g. less spicy, baby chair, table by the window",
    "co.back": "Back to cart", "co.next": "View invoice", "co.close": "Close checkout",
    "co.err.name": "Please enter your name.", "co.err.phone": "Please enter a valid phone number.",
    "co.err.date": "Please choose today or a later date.", "co.err.time": "Please choose a time between 11:00 AM and 10:30 PM.",
    "co.err.pax": "Please choose the number of guests.", "co.err.past": "That time has passed. Please choose another time.",

    "inv.title": "Booking Invoice", "inv.no": "Invoice no.", "inv.issued": "Issued",
    "inv.type": "Type", "inv.when": "Date & time", "inv.pax": "Guests", "inv.customer": "Customer",
    "inv.item": "Item", "inv.qty": "Qty", "inv.price": "Price", "inv.amount": "Amount",
    "inv.service": "Service charge", "inv.booking": "Booking fee", "inv.tax": "Tax",
    "inv.foot": "You only pay for the food. Payment is made at the counter when you arrive.",
    "inv.edit": "Edit order", "inv.print": "Print", "inv.send": "Send to WhatsApp", "inv.close": "Close invoice",
    "inv.people": "guests", "inv.stamp": "No charges", "inv.unit": "each",

    "toast.added": "added to cart", "toast.removed": "removed from cart", "toast.cleared": "Cart cleared",
    "toast.sent": "WhatsApp opened. Thank you! We will confirm your booking.",

    "wa.header": "NEW BOOKING — NASI ARAB TOLHAH", "wa.hello": "Hello, I would like to place a booking:",
    "wa.items": "Order", "wa.food": "Food total", "wa.fees": "Extra charges", "wa.total": "AMOUNT TO PAY", "wa.notes": "Notes",
    "wa.end": "Payment at the counter. Please confirm this booking. Thank you.",
    "wa.quick": "Hello Nasi Arab Tolhah, I would like to ask about your menu and bookings."
  }
};

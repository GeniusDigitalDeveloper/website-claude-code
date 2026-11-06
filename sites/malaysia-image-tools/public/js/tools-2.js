/* ---------- Rotator ---------- */
registerTool(editorTool({
  id: 'image-rotator', cat: 'edit', name: 'Image Rotator', icon: 'rotate', suffix: 'putar',
  desc: 'Putar gambar 90°, 180° atau mana-mana sudut dengan latar lutsinar atau berwarna.',
  defaults: { angle: 0, transparent: true, bg: '#ffffff' },
  controls: [
    { type: 'buttons', label: 'Putaran pantas', buttons: [{ label: '↺ 90° kiri', run: v => v.angle = ((v.angle - 90 + 540) % 360) - 180 }, { label: '↻ 90° kanan', run: v => v.angle = ((v.angle + 90 + 540) % 360) - 180 }, { label: '180°', run: v => v.angle = ((v.angle + 180 + 540) % 360) - 180 }] },
    { type: 'range', key: 'angle', label: 'Sudut', min: -180, max: 180, unit: '°' },
    { type: 'check', key: 'transparent', label: 'Latar lutsinar (PNG/WEBP)' },
    { type: 'color', key: 'bg', label: 'Warna latar', show: v => !v.transparent }
  ],
  draw(src, v) {
    const rad = v.angle * Math.PI / 180, w = src.width, h = src.height;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const c = makeCanvas(w * cos + h * sin, w * sin + h * cos), x = ctx2d(c);
    if (!v.transparent) { x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height); }
    x.translate(c.width / 2, c.height / 2); x.rotate(rad); x.drawImage(src, -w / 2, -h / 2);
    return c;
  }
}));

/* ---------- Flipper ---------- */
registerTool(editorTool({
  id: 'image-flipper', cat: 'edit', name: 'Image Flipper', icon: 'flip', suffix: 'terbalik',
  desc: 'Terbalikkan gambar secara mendatar (cermin) atau menegak.',
  defaults: { h: true, vv: false },
  controls: [
    { type: 'check', key: 'h', label: 'Terbalik mendatar (kiri ↔ kanan)' },
    { type: 'check', key: 'vv', label: 'Terbalik menegak (atas ↕ bawah)' },
    { type: 'note', html: 'Gunakan untuk swafoto yang terbalik atau teks cermin.' }
  ],
  draw(src, v) {
    const c = makeCanvas(src.width, src.height), x = ctx2d(c);
    x.translate(v.h ? c.width : 0, v.vv ? c.height : 0); x.scale(v.h ? -1 : 1, v.vv ? -1 : 1); x.drawImage(src, 0, 0);
    return c;
  }
}));

/* ---------- Color Picker ---------- */
registerTool({
  id: 'image-color-picker', cat: 'edit', name: 'Image Color Picker', icon: 'picker', popular: true,
  desc: 'Klik mana-mana titik pada gambar untuk dapatkan kod warna HEX, RGB, HSL dan CMYK.',
  mount(root, scope) {
    let full = null, fx = null; const hist = [];
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip" data-r="info">Gerakkan tetikus / jari atas gambar, klik untuk pilih</span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div><div class="stage"><canvas class="picker-canvas" data-r="cv"></canvas></div></div>
      <aside class="card ws-panel"><p class="panel-title">Warna dipilih</p><div class="big-sw" data-r="sw" style="background:#2457f5"></div>
        <div class="kv" data-r="kv"></div><p class="panel-title">Sejarah</p><div class="hist" data-r="hist"><span class="meta-line">Belum ada warna</span></div></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar untuk ambil warna', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    const cv = R('cv'), loupe = $('#loupe');
    async function load(files) {
      const [f] = checkFiles(files, { max: 1 }); if (!f) return;
      try {
        const img = await loadImage(f); scope.urls.push(img._url);
        full = toCanvas(img); fx = full.getContext('2d', { willReadFrequently: true });
        const p = toCanvas(img, 1600); cv.width = p.width; cv.height = p.height; cv.getContext('2d').drawImage(p, 0, 0);
        R('dz').hidden = true; R('ws').hidden = false; pick(Math.floor(full.width / 2), Math.floor(full.height / 2), false);
      } catch (e) { toast(e.message, 'error'); }
    }
    const pos = e => { const r = cv.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) / r.width * full.width), 0, full.width - 1), clamp(Math.floor((e.clientY - r.top) / r.height * full.height), 0, full.height - 1)]; };
    function pick(px, py, save) {
      const [r, g, b] = fx.getImageData(px, py, 1, 1).data; const hex = rgbToHex(r, g, b); const [h, s, l] = rgbToHsl(r, g, b); const [c, m, y, k] = rgbToCmyk(r, g, b);
      R('sw').style.background = hex;
      const rows = [['HEX', hex], ['RGB', `rgb(${r}, ${g}, ${b})`], ['HSL', `hsl(${h}, ${s}%, ${l}%)`], ['CMYK', `${c}%, ${m}%, ${y}%, ${k}%`], ['Titik', `x ${px}, y ${py}`]];
      R('kv').innerHTML = rows.map(([k2, val]) => `<span>${k2}</span><code>${val}</code>${k2 === 'Titik' ? '<i></i>' : `<button class="btn sm ghost" type="button" data-copy="${esc(val)}" aria-label="Salin ${k2}">${icon('copy')}</button>`}`).join('');
      if (save) { if (hist[0] !== hex) hist.unshift(hex); hist.length = Math.min(hist.length, 16); R('hist').innerHTML = hist.map(hx => `<button type="button" style="background:${hx}" title="${hx}" data-copy="${hx}" aria-label="Salin ${hx}"></button>`).join(''); copyText(hex, `${hex} disalin`); track('image-color-picker'); }
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy); });
    cv.addEventListener('pointermove', e => {
      if (!full) return; const [px, py] = pos(e);
      const lx = loupe.getContext('2d'); lx.imageSmoothingEnabled = false; lx.clearRect(0, 0, 110, 110);
      lx.drawImage(full, px - 5, py - 5, 11, 11, 0, 0, 110, 110); lx.strokeStyle = '#fff'; lx.lineWidth = 2; lx.strokeRect(50, 50, 10, 10); lx.strokeStyle = '#000'; lx.lineWidth = 1; lx.strokeRect(49, 49, 12, 12);
      loupe.style.display = 'block'; loupe.style.left = (e.clientX + 18) + 'px'; loupe.style.top = (e.clientY - 128) + 'px';
      pick(px, py, false);
    });
    cv.addEventListener('pointerleave', () => loupe.style.display = 'none');
    cv.addEventListener('click', e => { if (full) pick(...pos(e), true); });
    scope.cleanup.push(() => loupe.style.display = 'none');
  }
});

/* ---------- Brightness / Contrast / Saturation ---------- */
const adjustTool = (id, name, ic, key, desc) => registerTool(editorTool({
  id, cat: 'edit', name, icon: ic, desc, suffix: key,
  defaults: { [key]: 0 },
  controls: [
    { type: 'range', key, label: { brightness: 'Kecerahan', contrast: 'Kontras', saturation: 'Ketepuan warna' }[key], min: -100, max: 100, unit: '' },
    { type: 'buttons', label: 'Pratetap', buttons: [{ label: '−50', run: v => v[key] = -50 }, { label: '−25', run: v => v[key] = -25 }, { label: '0', run: v => v[key] = 0 }, { label: '+25', run: v => v[key] = 25 }, { label: '+50', run: v => v[key] = 50 }] }
  ],
  draw(src, v) { return adjustPixels(toCanvas(src), v); }
}));
adjustTool('image-brightness', 'Image Brightness Editor', 'sun', 'brightness', 'Cerahkan gambar yang gelap atau gelapkan gambar yang terlalu terang.');
adjustTool('image-contrast', 'Image Contrast Editor', 'contrast', 'contrast', 'Tingkatkan atau kurangkan kontras supaya gambar lebih jelas.');
adjustTool('image-saturation', 'Image Saturation Editor', 'drop', 'saturation', 'Jadikan warna lebih terang menyerlah atau lebih lembut.');

/* ---------- Grayscale ---------- */
registerTool(editorTool({
  id: 'image-grayscale', cat: 'edit', name: 'Image Grayscale Converter', icon: 'gray', suffix: 'kelabu',
  desc: 'Tukar gambar kepada hitam putih, kelabu atau sepia klasik.',
  defaults: { mode: 'lum', amount: 100, threshold: 128 },
  controls: [
    { type: 'seg', key: 'mode', label: 'Gaya', options: [['lum', 'Kelabu'], ['average', 'Purata'], ['desat', 'Lembut'], ['sepia', 'Sepia'], ['bw', 'Hitam-Putih']] },
    { type: 'range', key: 'amount', label: 'Keamatan', min: 0, max: 100, unit: '%' },
    { type: 'range', key: 'threshold', label: 'Ambang hitam/putih', min: 1, max: 254, show: v => v.mode === 'bw' }
  ],
  draw(src, v) { return grayscalePixels(toCanvas(src), v.mode, v.amount, v.threshold); }
}));

/* ---------- Blur ---------- */
registerTool(editorTool({
  id: 'image-blur', cat: 'edit', name: 'Image Blur Tool', icon: 'blur', suffix: 'kabur',
  desc: 'Kaburkan gambar atau gunakan kesan mozek (pixelate) untuk sorok maklumat sensitif.',
  defaults: { mode: 'blur', radius: 8, block: 16 },
  controls: [
    { type: 'seg', key: 'mode', label: 'Jenis', options: [['blur', 'Kabur (blur)'], ['pixel', 'Mozek (pixelate)']] },
    { type: 'range', key: 'radius', label: 'Kekuatan kabur', min: 0, max: 60, unit: ' px', show: v => v.mode === 'blur' },
    { type: 'range', key: 'block', label: 'Saiz blok mozek', min: 2, max: 120, unit: ' px', show: v => v.mode === 'pixel' }
  ],
  draw(src, v, s) {
    const c = toCanvas(src);
    if (v.mode === 'blur') return boxBlur(c, v.radius * s / 1.6);
    const b = Math.max(1, v.block * s), sw = Math.max(1, Math.round(c.width / b)), sh = Math.max(1, Math.round(c.height / b));
    const t = makeCanvas(sw, sh); ctx2d(t).drawImage(c, 0, 0, sw, sh);
    const o = makeCanvas(c.width, c.height), x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, o.width, o.height);
    return o;
  }
}));

/* ---------- Border Maker ---------- */
registerTool(editorTool({
  id: 'image-border', cat: 'edit', name: 'Image Border Maker', icon: 'border', suffix: 'bingkai', formats: ['image/png', 'image/jpeg', 'image/webp'], defaultFormat: 'image/png',
  desc: 'Tambah bingkai berwarna, berganda atau gradien serta bucu bulat pada gambar.',
  defaults: { width: 40, style: 'solid', color: '#2457f5', color2: '#7b3fe4', radius: 0, gap: '#ffffff' },
  onLoad(v, img) { v.width = Math.max(4, Math.round(Math.min(img.naturalWidth, img.naturalHeight) * .04)); },
  controls: [
    { type: 'seg', key: 'style', label: 'Gaya', options: [['solid', 'Padu'], ['double', 'Berganda'], ['gradient', 'Gradien']] },
    { type: 'range', key: 'width', label: 'Ketebalan', min: 0, max: 400, unit: ' px' },
    { type: 'color', key: 'color', label: 'Warna bingkai' },
    { type: 'color', key: 'color2', label: 'Warna kedua (gradien)', show: v => v.style === 'gradient' },
    { type: 'color', key: 'gap', label: 'Warna jarak (berganda)', show: v => v.style === 'double' },
    { type: 'range', key: 'radius', label: 'Bucu bulat', min: 0, max: 50, unit: '%' }
  ],
  draw(src, v, s) {
    const b = Math.round(v.width * s), W = src.width + 2 * b, H = src.height + 2 * b;
    const c = makeCanvas(W, H), x = ctx2d(c); const R = Math.min(W, H) / 2 * v.radius / 100;
    roundRectPath(x, c, 0, 0, W, H, R); x.save(); x.clip();
    if (v.style === 'gradient') { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, v.color); g.addColorStop(1, v.color2); x.fillStyle = g; } else x.fillStyle = v.color;
    x.fillRect(0, 0, W, H);
    if (v.style === 'double' && b >= 3) { const t = b / 3; roundRectPath(x, c, t, t, W - 2 * t, H - 2 * t, Math.max(0, R - t)); x.fillStyle = v.gap; x.fill(); roundRectPath(x, c, 2 * t, 2 * t, W - 4 * t, H - 4 * t, Math.max(0, R - 2 * t)); x.fillStyle = v.color; x.fill(); }
    x.restore();
    roundRectPath(x, c, b, b, src.width, src.height, Math.max(0, R - b)); x.save(); x.clip(); x.drawImage(src, b, b); x.restore();
    return c;
  },
  info: (v, img) => `${img.naturalWidth}×${img.naturalHeight} → ${img.naturalWidth + 2 * v.width}×${img.naturalHeight + 2 * v.width} px`
}));

/* =====================================================================
   IMAGE UTILITIES
   ===================================================================== */
/* ---------- Metadata Viewer ---------- */
registerTool({
  id: 'image-metadata', cat: 'util', name: 'Image Metadata Viewer', icon: 'info',
  desc: 'Lihat maklumat EXIF tersembunyi: kamera, tarikh, tetapan & lokasi GPS. Buang metadata dengan sekali klik.',
  mount(root, scope) {
    let img = null, file = null, data = null;
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden><div class="card pad" style="display:grid;gap:14px;min-width:0"><div data-r="gps"></div><div data-r="tables" style="display:grid;gap:14px"></div></div>
      <aside class="card ws-panel"><img data-r="th" alt="" style="border-radius:10px;max-height:220px;object-fit:contain;background:var(--soft);width:100%"><div class="kv" data-r="basic"></div>
      <button class="btn primary block" data-r="strip" type="button">${icon('shield')}Buang Metadata & Muat Turun</button><button class="btn block" data-r="json" type="button">${icon('copy')}Salin sebagai JSON</button><button class="btn block" data-r="change" type="button">${icon('upload')}Fail lain</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp,image/avif', title: 'Seret & lepas gambar untuk lihat metadata', hint: 'Terbaik dengan foto JPG asal daripada kamera/telefon', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    const GROUP = { ifd0: 'Peranti & Imej (IFD0)', exif: 'EXIF — Tetapan Kamera', gps: 'GPS — Lokasi', interop: 'Interop', ifd1: 'Thumbnail (IFD1)', iptc: 'IPTC — Hak Cipta & Kapsyen', xmp: 'XMP', jfif: 'JFIF', ihdr: 'PNG Header', icc: 'Profil Warna ICC' };
    const fmtVal = val => {
      if (val == null) return '-';
      if (val instanceof Date) return val.toLocaleString('ms-MY');
      if (val instanceof Uint8Array || val instanceof ArrayBuffer) return `[data binari ${val.byteLength} bait]`;
      if (Array.isArray(val)) return val.length > 16 ? `[${val.length} nilai]` : val.join(', ');
      if (typeof val === 'object') { try { return JSON.stringify(val).slice(0, 300); } catch { return String(val); } }
      if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(4).replace(/0+$/, '');
      return String(val).slice(0, 500);
    };
    async function load(files) {
      const [f] = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], max: 1 }); if (!f) return;
      await withBusy('Membaca metadata...', async () => {
        img = await loadImage(f); scope.urls.push(img._url); file = f;
        await loadScript(LIBS.exifr);
        data = await exifr.parse(f, { tiff: true, exif: true, gps: true, interop: true, ifd1: true, iptc: true, xmp: true, icc: true, jfif: true, ihdr: true, mergeOutput: false, translateValues: true, reviveValues: true }).catch(() => null);
        let gps = null; try { gps = await exifr.gps(f); } catch { }
        R('dz').hidden = true; R('ws').hidden = false; R('th').src = img._url;
        const rows = [['Nama', f.name], ['Jenis', f.type || '-'], ['Saiz', fmtBytes(f.size)], ['Dimensi', `${img.naturalWidth}×${img.naturalHeight}`], ['Nisbah', ratioText(img.naturalWidth, img.naturalHeight)], ['Diubah', new Date(f.lastModified).toLocaleString('ms-MY')]];
        R('basic').innerHTML = rows.map(([k, v]) => `<span>${k}</span><code title="${esc(v)}">${esc(v)}</code><i></i>`).join('');
        R('gps').innerHTML = gps && isFinite(gps.latitude) ? `<div class="banner warning">${icon('alert')}<div><b>Gambar ini mengandungi lokasi GPS.</b> Koordinat: <span class="mono">${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}</span> · <a href="https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}" target="_blank" rel="noopener">Lihat di peta</a><br>Buang metadata sebelum kongsi gambar di media sosial untuk melindungi privasi anda.</div></div>` : `<div class="banner success">${icon('shield')}<div>Tiada data lokasi GPS ditemui dalam gambar ini.</div></div>`;
        const groups = data ? Object.entries(data).filter(([, o]) => o && typeof o === 'object' && Object.keys(o).length) : [];
        R('tables').innerHTML = groups.length ? groups.map(([g, o]) => `<div><h3 style="font-size:15px;margin-bottom:8px">${esc(GROUP[g] || g.toUpperCase())} <span class="count">${Object.keys(o).length}</span></h3><div class="tbl-wrap"><table class="tbl"><tbody>${Object.entries(o).map(([k, val]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(fmtVal(val))}</td></tr>`).join('')}</tbody></table></div></div>`).join('') : '<div class="empty">Tiada metadata EXIF/IPTC/XMP ditemui. Gambar mungkin telah diproses oleh aplikasi atau media sosial yang membuang metadata.</div>';
      });
    }
    R('json').addEventListener('click', () => copyText(JSON.stringify(data || {}, (k, v) => v instanceof Uint8Array ? `[binari ${v.length}]` : v, 2), 'JSON metadata disalin'));
    R('strip').addEventListener('click', () => withBusy('Membuang metadata...', async () => {
      const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/png';
      const blob = await encode(toCanvas(img), type, .95); saveBlob(blob, `${baseName(file.name)}-tanpa-metadata.${EXT[blob.type]}`, 'image-metadata');
    }));
  }
});

/* ---------- Dimension Checker ---------- */
registerTool({
  id: 'image-dimension', cat: 'util', name: 'Image Dimension Checker', icon: 'ruler',
  desc: 'Semak lebar, tinggi, nisbah aspek, megapiksel dan kesesuaian untuk media sosial bagi banyak gambar sekaligus.',
  mount(root, scope) {
    const items = [];
    root.innerHTML = `<div data-r="dz"></div><div data-r="out" hidden><div class="row" style="margin:14px 0 10px"><b>Keputusan</b><span class="count" data-r="cnt"></span><span class="sp"></span><button class="btn sm" data-r="copy" type="button">${icon('copy')}Salin CSV</button><button class="btn sm danger" data-r="reset" type="button">${icon('trash')}Reset</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Gambar</th><th>Nama</th><th>Lebar × Tinggi</th><th>Nisbah</th><th>MP</th><th>Orientasi</th><th>Saiz</th><th>Sesuai untuk</th><th></th></tr></thead><tbody data-r="tb"></tbody></table></div></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', multiple: true, title: 'Seret & lepas gambar untuk semak dimensi', onFiles: add });
    R('dz').appendChild(dz);
    const fits = (w, h) => { const r = w / h, o = []; const near = t => Math.abs(r - t) < .02;
      if (near(16 / 9)) o.push(w >= 1280 ? 'YouTube Thumbnail' : '16:9 (kecil)'); if (near(1)) o.push(w >= 1080 ? 'Instagram Post' : w >= 400 ? 'Gambar Profil' : 'Ikon'); if (near(4 / 5)) o.push('Instagram Portrait'); if (near(9 / 16)) o.push('Story / TikTok / Reels'); if (near(1.91)) o.push('Facebook / Link Preview'); if (near(4 / 3)) o.push('Foto 4:3'); if (near(3 / 2)) o.push('Foto DSLR 3:2');
      return o.length ? o : ['—']; };
    async function add(files) {
      const ok = checkFiles(files, { current: items.length });
      for (const f of ok) { try { const img = await loadImage(f); scope.urls.push(img._url); items.push({ f, img, w: img.naturalWidth, h: img.naturalHeight }); } catch (e) { toast(e.message, 'error'); } }
      if (ok.length) track('image-dimension');
      render();
    }
    function render() {
      R('out').hidden = !items.length; dz.classList.toggle('compact', !!items.length); R('cnt').textContent = items.length + ' fail';
      R('tb').innerHTML = items.map((it, i) => `<tr><td><img src="${it.img._url}" alt="" style="width:46px;height:46px;object-fit:cover;border-radius:7px"></td><td style="max-width:200px;word-break:break-all">${esc(it.f.name)}</td><td class="mono"><b>${it.w} × ${it.h}</b> px</td><td class="mono">${ratioText(it.w, it.h)}</td><td class="mono">${(it.w * it.h / 1e6).toFixed(2)}</td><td>${it.w > it.h ? 'Landskap' : it.w < it.h ? 'Potret' : 'Segi empat'}</td><td class="mono">${fmtBytes(it.f.size)}</td><td>${fits(it.w, it.h).map(t => `<span class="chip" style="margin:2px">${t}</span>`).join('')}</td><td><button class="btn sm danger" data-i="${i}" type="button" aria-label="Buang">${icon('trash')}</button></td></tr>`).join('');
    }
    R('tb').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { items.splice(+b.dataset.i, 1); render(); } });
    R('reset').addEventListener('click', () => { items.length = 0; render(); });
    R('copy').addEventListener('click', () => copyText('nama,lebar,tinggi,nisbah,megapiksel,saiz_bait\n' + items.map(i => `"${i.f.name.replace(/"/g, '""')}",${i.w},${i.h},${ratioText(i.w, i.h)},${(i.w * i.h / 1e6).toFixed(2)},${i.f.size}`).join('\n'), 'CSV disalin'));
  }
});

/* ---------- Color Palette Extractor ---------- */
function extractPalette(img, k) {
  const c = toCanvas(img, 140), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 125) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const cents = [px[Math.floor(rnd() * px.length)].slice()];
  while (cents.length < k) {
    const ds = px.map(p => Math.min(...cents.map(c => dist(p, c)))); const sum = ds.reduce((a, b) => a + b, 0); if (!sum) break;
    let t = rnd() * sum, i = 0; while ((t -= ds[i]) > 0 && i < ds.length - 1) i++; cents.push(px[i].slice());
  }
  const asg = new Array(px.length).fill(0);
  for (let it = 0; it < 12; it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => { let best = 0, bd = Infinity; cents.forEach((c, j) => { const dd = dist(p, c); if (dd < bd) { bd = dd; best = j; } }); asg[i] = best; const a = acc[best]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
    acc.forEach((a, j) => { if (a[3]) cents[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  const counts = cents.map(() => 0); asg.forEach(a => counts[a]++);
  return cents.map((c, j) => ({ rgb: c.map(Math.round), hex: rgbToHex(...c.map(Math.round)), pct: counts[j] / px.length })).filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct);
}
registerTool({
  id: 'color-palette', cat: 'util', name: 'Image Color Palette Extractor', icon: 'palette', isNew: true,
  desc: 'Ekstrak warna dominan daripada gambar untuk jenama, reka bentuk atau tema laman web.',
  mount(root, scope) {
    let img = null, file = null, pal = [];
    const v = { k: 6 };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden><div class="card pad" style="display:grid;gap:14px;min-width:0"><div class="palbar" data-r="bar"></div><div class="swatches" data-r="sw"></div><span class="meta-line">Klik pada warna untuk salin kod HEX.</span></div>
      <aside class="card ws-panel"><img data-r="th" alt="" style="border-radius:10px;max-height:200px;object-fit:contain;width:100%;background:var(--soft)"><div class="ctrls" data-r="ctrls"></div>
      <button class="btn block" data-r="css" type="button">${icon('copy')}Salin CSS Variables</button><button class="btn block" data-r="json" type="button">${icon('copy')}Salin JSON</button><button class="btn primary block" data-r="png" type="button">${icon('download')}Muat Turun Palet (PNG)</button><button class="btn block" data-r="change" type="button">${icon('upload')}Gambar lain</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar untuk ekstrak palet', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    renderControls(R('ctrls'), [{ type: 'range', key: 'k', label: 'Bilangan warna', min: 2, max: 12 }], v, debounce(run, 150));
    async function load(files) { const [f] = checkFiles(files, { max: 1 }); if (!f) return; try { img = await loadImage(f); scope.urls.push(img._url); file = f; R('th').src = img._url; R('dz').hidden = true; R('ws').hidden = false; run(); } catch (e) { toast(e.message, 'error'); } }
    function run() {
      if (!img) return; pal = extractPalette(img, v.k);
      R('bar').innerHTML = pal.map(p => `<i style="background:${p.hex};flex:${p.pct}" title="${p.hex}"></i>`).join('');
      R('sw').innerHTML = pal.map(p => `<button class="sw" type="button" data-hex="${p.hex}"><i style="background:${p.hex}"></i><div><b>${p.hex}</b><span>rgb(${p.rgb.join(', ')}) · ${(p.pct * 100).toFixed(1)}%</span></div></button>`).join('');
    }
    R('sw').addEventListener('click', e => { const b = e.target.closest('[data-hex]'); if (b) copyText(b.dataset.hex, b.dataset.hex + ' disalin'); });
    R('css').addEventListener('click', () => { copyText(':root {\n' + pal.map((p, i) => `  --warna-${i + 1}: ${p.hex};`).join('\n') + '\n}', 'CSS disalin'); track('color-palette'); });
    R('json').addEventListener('click', () => { copyText(JSON.stringify(pal.map(p => ({ hex: p.hex, rgb: p.rgb, peratus: +(p.pct * 100).toFixed(1) })), null, 2), 'JSON disalin'); track('color-palette'); });
    R('png').addEventListener('click', () => withBusy('Menjana palet...', async () => {
      const W = 1200, sh = 260, c = makeCanvas(W, sh + 90), x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, W, c.height);
      const bw = W / pal.length; pal.forEach((p, i) => { x.fillStyle = p.hex; x.fillRect(i * bw, 0, bw + 1, sh); x.fillStyle = '#0e1530'; x.font = '600 22px "JetBrains Mono", monospace'; x.textAlign = 'center'; x.fillText(p.hex, i * bw + bw / 2, sh + 52); });
      saveBlob(await canvasToBlob(c, 'image/png'), `${baseName(file.name)}-palet.png`, 'color-palette');
    }));
  }
});

/* ---------- Favicon Generator ---------- */
function buildIco(pngs) {
  const head = 6 + 16 * pngs.length; const total = head + pngs.reduce((a, p) => a + p.buf.length, 0);
  const out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint16(0, 0, true); dv.setUint16(2, 1, true); dv.setUint16(4, pngs.length, true);
  let off = head;
  pngs.forEach((p, i) => { const e = 6 + i * 16; out[e] = p.size >= 256 ? 0 : p.size; out[e + 1] = p.size >= 256 ? 0 : p.size; out[e + 2] = 0; out[e + 3] = 0; dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true); dv.setUint32(e + 8, p.buf.length, true); dv.setUint32(e + 12, off, true); out.set(p.buf, off); off += p.buf.length; });
  return new Blob([out], { type: 'image/x-icon' });
}
registerTool({
  id: 'favicon-generator', cat: 'util', name: 'Favicon Generator', icon: 'star',
  desc: 'Jana favicon.ico, ikon Apple, Android & PWA (16 hingga 512 px) berserta kod HTML untuk laman web anda.',
  mount(root, scope) {
    let img = null, file = null;
    const v = { pad: 0, radius: 0, bgOn: false, bg: '#ffffff' };
    const SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden><div class="card pad" style="display:grid;gap:16px;min-width:0">
      <div><p class="panel-title" style="margin-bottom:10px">Pratonton tab browser</p><div style="background:#dfe3ee;border-radius:12px 12px 0 0;padding:8px 8px 0;max-width:420px"><div style="background:#fff;border-radius:9px 9px 0 0;padding:9px 12px;display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600"><canvas data-r="tab" width="16" height="16" style="width:16px;height:16px"></canvas>Laman Web Saya<span style="margin-left:auto;color:var(--muted)">✕</span></div></div></div>
      <div class="row" data-r="sizes" style="align-items:end;gap:14px"></div>
      <div class="fld"><span>Kod HTML (letak dalam &lt;head&gt;)</span><textarea class="inp mono" data-r="code" rows="7" readonly style="font-size:12px"></textarea><button class="btn sm" data-r="copy" type="button" style="justify-self:start">${icon('copy')}Salin Kod</button></div></div>
      <aside class="card ws-panel"><div class="ctrls" data-r="ctrls"></div><button class="btn primary block" data-r="zip" type="button">${icon('download')}Muat Turun Pakej (ZIP)</button><button class="btn block" data-r="ico" type="button">${icon('download')}favicon.ico sahaja</button><button class="btn block" data-r="change" type="button">${icon('upload')}Gambar lain</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/png,image/jpeg,image/webp,image/svg+xml', title: 'Seret & lepas logo anda', hint: 'Disyorkan: PNG segi empat sekurang-kurangnya 512×512 px', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    const code = `<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">`;
    R('code').value = code; R('copy').addEventListener('click', () => copyText(code, 'Kod HTML disalin'));
    function make(size) {
      const c = makeCanvas(size, size), x = ctx2d(c); const R0 = size / 2 * v.radius / 100;
      roundRectPath(x, c, 0, 0, size, size, R0); x.save(); x.clip();
      if (v.bgOn) { x.fillStyle = v.bg; x.fillRect(0, 0, size, size); }
      const p = size * v.pad / 100; drawContain(x, img, p, p, size - 2 * p, size - 2 * p); x.restore();
      return c;
    }
    async function load(files) { const [f] = checkFiles(files, { types: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], max: 1 }); if (!f) return; try { img = await loadImage(f); scope.urls.push(img._url); file = f; R('dz').hidden = true; R('ws').hidden = false; if (img.naturalWidth < 512 || img.naturalHeight < 512) toast('Gambar lebih kecil daripada 512 px. Ikon besar mungkin kelihatan kabur.', 'warn'); draw(); } catch (e) { toast(e.message, 'error'); } }
    renderControls(R('ctrls'), [
      { type: 'range', key: 'pad', label: 'Ruang tepi', min: 0, max: 30, unit: '%' },
      { type: 'range', key: 'radius', label: 'Bucu bulat', min: 0, max: 100, unit: '%' },
      { type: 'check', key: 'bgOn', label: 'Latar berwarna (bukan lutsinar)' },
      { type: 'color', key: 'bg', label: 'Warna latar', show: v => v.bgOn }
    ], v, () => draw());
    const draw = rafThrottle(() => {
      if (!img) return;
      R('tab').getContext('2d').clearRect(0, 0, 16, 16); R('tab').getContext('2d').drawImage(make(16), 0, 0);
      R('sizes').innerHTML = ''; [16, 32, 48, 64, 128, 180].forEach(s => { const d = document.createElement('div'); d.style.cssText = 'display:grid;gap:4px;justify-items:center'; const c = make(s); c.style.cssText = `width:${Math.min(s, 96)}px;height:${Math.min(s, 96)}px;image-rendering:${s < 64 ? 'pixelated' : 'auto'};border:1px dashed var(--line)`; d.appendChild(c); d.insertAdjacentHTML('beforeend', `<span class="meta-line">${s}px</span>`); R('sizes').appendChild(d); });
    });
    const NAMES = { 16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 48: 'favicon-48x48.png', 64: 'favicon-64x64.png', 128: 'favicon-128x128.png', 180: 'apple-touch-icon.png', 192: 'android-chrome-192x192.png', 512: 'android-chrome-512x512.png' };
    async function ico() { const parts = []; for (const s of [16, 32, 48]) parts.push({ size: s, buf: new Uint8Array(await (await canvasToBlob(make(s), 'image/png')).arrayBuffer()) }); return buildIco(parts); }
    R('ico').addEventListener('click', () => withBusy('Menjana favicon.ico...', async () => saveBlob(await ico(), 'favicon.ico', 'favicon-generator')));
    R('zip').addEventListener('click', () => withBusy('Menjana ikon...', async () => {
      const entries = [{ name: 'favicon.ico', blob: await ico() }];
      for (const s of SIZES) entries.push({ name: NAMES[s], blob: await canvasToBlob(make(s), 'image/png') });
      entries.push({ name: 'site.webmanifest', blob: new Blob([JSON.stringify({ name: 'Laman Web Saya', short_name: 'Laman', icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }, { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }], theme_color: '#ffffff', background_color: '#ffffff', display: 'standalone' }, null, 2)], { type: 'application/json' }) });
      entries.push({ name: 'kod-html.txt', blob: new Blob([code], { type: 'text/plain' }) });
      busy(false); await saveZip(entries, 'favicon-pakej.zip', 'favicon-generator'); busy(true);
    }));
  }
});

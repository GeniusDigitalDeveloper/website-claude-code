/* ---------- YouTube Thumbnail Resizer ---------- */
registerTool({
  id: 'youtube-thumbnail', cat: 'util', name: 'YouTube Thumbnail Resizer', icon: 'play', popular: true,
  desc: 'Jadikan mana-mana gambar thumbnail YouTube 1280×720 atau 1920×1080, automatik di bawah had 2 MB.',
  mount(root, scope) {
    let img = null, file = null;
    const v = { size: '1280', fit: 'cover', fx: 50, fy: 50, bg: '#0e1530', safe: true };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div><div class="stage" style="position:relative"><canvas data-r="cv"></canvas></div></div>
      <aside class="card ws-panel"><div class="ctrls" data-r="ctrls"></div><div class="note">YouTube menghadkan thumbnail kepada <b>2 MB</b>. Kualiti JPG akan dilaraskan secara automatik supaya fail anda lulus.</div>
      <button class="btn primary block" data-r="dl" type="button">${icon('download')}Muat Turun Thumbnail</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar untuk thumbnail YouTube', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    async function load(files) { const [f] = checkFiles(files, { max: 1 }); if (!f) return; try { img = await loadImage(f); scope.urls.push(img._url); file = f; R('dz').hidden = true; R('ws').hidden = false; draw(); } catch (e) { toast(e.message, 'error'); } }
    renderControls(R('ctrls'), [
      { type: 'seg', key: 'size', label: 'Saiz output', options: [['1280', '1280×720 (disyorkan)'], ['1920', '1920×1080']] },
      { type: 'seg', key: 'fit', label: 'Cara muat', options: [['cover', 'Penuh (potong)'], ['blur', 'Latar kabur'], ['color', 'Latar warna']] },
      { type: 'range', key: 'fx', label: 'Fokus mendatar', min: 0, max: 100, unit: '%', show: v => v.fit === 'cover' },
      { type: 'range', key: 'fy', label: 'Fokus menegak', min: 0, max: 100, unit: '%', show: v => v.fit === 'cover' },
      { type: 'color', key: 'bg', label: 'Warna latar', show: v => v.fit === 'color' },
      { type: 'check', key: 'safe', label: 'Tunjuk kawasan label masa (pratonton sahaja)' }
    ], v, () => draw());
    function render(W) {
      const H = Math.round(W * 9 / 16), c = makeCanvas(W, H), x = ctx2d(c);
      if (v.fit === 'cover') drawCover(x, img, 0, 0, W, H, v.fx / 100, v.fy / 100);
      else {
        if (v.fit === 'blur') { const t = makeCanvas(W / 4, H / 4); drawCover(ctx2d(t), img, 0, 0, t.width, t.height); boxBlur(t, 6); x.drawImage(t, 0, 0, W, H); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, W, H); }
        else { x.fillStyle = v.bg; x.fillRect(0, 0, W, H); }
        drawContain(x, img, 0, 0, W, H);
      }
      return c;
    }
    const draw = rafThrottle(() => {
      if (!img) return; const c = render(1280), cv = R('cv'); cv.width = c.width; cv.height = c.height; const x = cv.getContext('2d'); x.drawImage(c, 0, 0);
      if (v.safe) { x.fillStyle = 'rgba(0,0,0,.8)'; roundRectPath(x, cv, 1280 - 96, 720 - 48, 82, 34, 6); x.fill(); x.fillStyle = '#fff'; x.font = '600 20px "Plus Jakarta Sans", Arial'; x.textAlign = 'center'; x.fillText('12:34', 1280 - 55, 720 - 24); }
      R('info').textContent = `Sumber ${img.naturalWidth}×${img.naturalHeight} → ${v.size === '1920' ? '1920×1080' : '1280×720'} (16:9)`;
    });
    R('dl').addEventListener('click', () => withBusy('Menyediakan thumbnail...', async () => {
      const W = +v.size, H = Math.round(W * 9 / 16); let c = render(W);
      if (v.fit === 'cover') { const iw = img.naturalWidth, ih = img.naturalHeight, s = Math.max(W / iw, H / ih), sw = W / s, sh = H / s, crop = makeCanvas(sw, sh); crop.getContext('2d').drawImage(img, (iw - sw) * v.fx / 100, (ih - sh) * v.fy / 100, sw, sh, 0, 0, crop.width, crop.height); c = await hqResize(crop, W, H); }
      let q = .92, blob = await encode(c, 'image/jpeg', q);
      while (blob.size > 2 * 1048576 && q > .4) { q -= .07; blob = await encode(c, 'image/jpeg', q); }
      if (blob.size > 2 * 1048576) toast('Fail masih melebihi 2 MB. Cuba saiz 1280×720.', 'warn');
      else toast(`Saiz akhir ${fmtBytes(blob.size)} · kualiti ${Math.round(q * 100)}% · lulus had 2 MB YouTube`, 'success', 5000);
      saveBlob(blob, `${baseName(file.name)}-youtube-${v.size === '1920' ? '1920x1080' : '1280x720'}.jpg`, 'youtube-thumbnail');
    }));
  }
});

/* ---------- Passport Photo Layout Generator ---------- */
const PHOTO_SIZES = { my: ['Pasport Malaysia', 35, 50], std: ['Standard antarabangsa / visa', 35, 45], us: ['2 × 2 inci (AS)', 51, 51], r1: ['Foto kerja / borang (1R)', 25, 32] };
const PAPERS = { r4: ['4R (102 × 152 mm)', 102, 152], r3: ['3R (89 × 127 mm)', 89, 127], a4: ['A4 (210 × 297 mm)', 210, 297] };
registerTool({
  id: 'passport-photo', cat: 'util', name: 'Passport Photo Layout Generator', icon: 'passport',
  desc: 'Potong foto ikut saiz pasport (35×50 mm) dan susun beberapa salinan pada kertas 4R atau A4 untuk dicetak.',
  mount(root, scope) {
    let img = null, file = null, cropper = null;
    const v = { size: 'my', paper: 'r4', copies: 0, lines: true, gap: 2 };
    const DPI = 300, mm = n => Math.round(n / 25.4 * DPI);
    root.innerHTML = `<div data-r="dz"></div><div data-r="ws" hidden>
      <div class="ws" style="margin-top:0"><div class="card"><div class="stage-bar"><span class="chip blue">Langkah 1 · Potong muka</span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar foto</button></div><div class="stage" data-r="stage"></div></div>
      <aside class="card ws-panel"><div class="ctrls" data-r="ctrls"></div><div class="note">Pastikan foto ikut syarat terkini agensi (cth. latar putih, muka menghadap depan). Alat ini hanya memotong & menyusun foto, tidak mengubah latar.</div></aside></div>
      <div class="card" style="margin-top:16px"><div class="stage-bar"><span class="chip blue">Langkah 2 · Susun atur cetakan</span><span class="chip" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="pdf" type="button">${icon('pdf')}PDF</button><button class="btn sm primary" data-r="jpg" type="button">${icon('download')}JPG (300 DPI)</button></div><div class="stage"><canvas data-r="sheet" style="max-height:70vh"></canvas></div></div></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', title: 'Seret & lepas foto berukuran pasport', hint: 'Foto muka yang jelas dengan latar cerah', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    const ctrls = () => renderControls(R('ctrls'), [
      { type: 'select', key: 'size', label: 'Saiz foto', options: Object.entries(PHOTO_SIZES).map(([k, [n, w, h]]) => [k, `${n} (${w}×${h} mm)`]) },
      { type: 'select', key: 'paper', label: 'Saiz kertas', options: Object.entries(PAPERS).map(([k, [n]]) => [k, n]) },
      { type: 'range', key: 'copies', label: 'Bilangan salinan (0 = penuhkan kertas)', min: 0, max: 40 },
      { type: 'range', key: 'gap', label: 'Jarak antara foto', min: 0, max: 6, unit: ' mm' },
      { type: 'check', key: 'lines', label: 'Garis panduan potong' }
    ], v, k => { if (k === 'size') cropper.setAspect(PHOTO_SIZES[v.size][1] / PHOTO_SIZES[v.size][2]); layout(); });
    async function load(files) {
      const [f] = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], max: 1 }); if (!f) return;
      try { img = await loadImage(f); scope.urls.push(img._url); file = f; R('dz').hidden = true; R('ws').hidden = false; cropper && cropper.destroy(); const [, w, h] = PHOTO_SIZES[v.size]; cropper = createCropper(R('stage'), img, { aspect: w / h, onChange: () => layout() }); ctrls(); layout(); }
      catch (e) { toast(e.message, 'error'); }
    }
    function sheet() {
      const [, pw, ph] = PHOTO_SIZES[v.size], [, aw, ah] = PAPERS[v.paper];
      const margin = 4, gap = v.gap;
      const cols = Math.max(1, Math.floor((aw - 2 * margin + gap) / (pw + gap))), rows = Math.max(1, Math.floor((ah - 2 * margin + gap) / (ph + gap)));
      const max = cols * rows, n = v.copies ? Math.min(v.copies, max) : max;
      const c = makeCanvas(mm(aw), mm(ah)), x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      const r = cropper.get(); const photo = makeCanvas(mm(pw), mm(ph)); ctx2d(photo).drawImage(img, r.x, r.y, r.w, r.h, 0, 0, photo.width, photo.height);
      const gw = cols * pw + (cols - 1) * gap, gh = rows * ph + (rows - 1) * gap; const ox = (aw - gw) / 2, oy = (ah - gh) / 2;
      for (let i = 0; i < n; i++) {
        const cx = i % cols, cy = Math.floor(i / cols); const X = mm(ox + cx * (pw + gap)), Y = mm(oy + cy * (ph + gap));
        x.drawImage(photo, X, Y);
        if (v.lines) { x.strokeStyle = '#9aa3bd'; x.lineWidth = 1; x.setLineDash([8, 6]); x.strokeRect(X - .5, Y - .5, photo.width + 1, photo.height + 1); x.setLineDash([]); }
      }
      return { c, n, max };
    }
    const layout = rafThrottle(() => { if (!cropper) return; const { c, n, max } = sheet(); const cv = R('sheet'); const s = Math.min(1, 1100 / c.width); cv.width = c.width * s; cv.height = c.height * s; ctx2d(cv).drawImage(c, 0, 0, cv.width, cv.height); R('info').textContent = `${n} foto (maks ${max}) · ${PAPERS[v.paper][0]} · 300 DPI`; });
    R('jpg').addEventListener('click', () => withBusy('Menjana cetakan...', async () => { const { c } = sheet(); saveBlob(await encode(c, 'image/jpeg', .95), `foto-pasport-${v.paper}.jpg`, 'passport-photo'); }));
    R('pdf').addEventListener('click', () => withBusy('Menjana PDF...', async () => {
      await loadScript(LIBS.jspdf); const { c } = sheet(); const [, aw, ah] = PAPERS[v.paper];
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [aw, ah], orientation: 'p' }); doc.addImage(c.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, aw, ah);
      saveBlob(doc.output('blob'), `foto-pasport-${v.paper}.pdf`, 'passport-photo');
    }));
    scope.cleanup.push(() => cropper && cropper.destroy());
  }
});

/* ---------- Profile Picture Maker ---------- */
registerTool({
  id: 'profile-picture', cat: 'util', name: 'Profile Picture Maker', icon: 'user', isNew: true,
  desc: 'Cipta gambar profil bulat atau segi empat dengan cincin warna/gradien untuk WhatsApp, LinkedIn & media sosial.',
  mount(root, scope) {
    let img = null, file = null, cropper = null;
    const v = { shape: 'circle', ring: 'gradient', rw: 4, c1: '#2457f5', c2: '#7b3fe4', bgOn: true, bg: '#ffffff', size: 800 };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip blue">Seret kotak untuk pilih muka</span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar foto</button></div><div class="stage" data-r="stage"></div></div>
      <aside class="card ws-panel"><div class="stage" style="min-height:0;border-radius:12px;padding:12px"><canvas data-r="pv" width="240" height="240" style="width:180px;height:180px;box-shadow:none"></canvas></div><div class="ctrls" data-r="ctrls"></div>
      <button class="btn primary block" data-r="dl" type="button">${icon('download')}Muat Turun PNG</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', title: 'Seret & lepas foto untuk gambar profil', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    async function load(files) {
      const [f] = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], max: 1 }); if (!f) return;
      try {
        img = await loadImage(f); scope.urls.push(img._url); file = f; R('dz').hidden = true; R('ws').hidden = false; cropper && cropper.destroy(); cropper = createCropper(R('stage'), img, { aspect: 1, round: v.shape === 'circle', onChange: () => pv() });
        renderControls(R('ctrls'), [
          { type: 'seg', key: 'shape', label: 'Bentuk', options: [['circle', 'Bulat'], ['rounded', 'Bucu bulat'], ['square', 'Segi empat']] },
          { type: 'seg', key: 'ring', label: 'Cincin', options: [['none', 'Tiada'], ['solid', 'Padu'], ['gradient', 'Gradien']] },
          { type: 'range', key: 'rw', label: 'Ketebalan cincin', min: 1, max: 15, unit: '%', show: v => v.ring !== 'none' },
          { type: 'color', key: 'c1', label: 'Warna cincin', show: v => v.ring !== 'none' },
          { type: 'color', key: 'c2', label: 'Warna kedua', show: v => v.ring === 'gradient' },
          { type: 'check', key: 'bgOn', label: 'Isi latar (tiada lutsinar)' },
          { type: 'color', key: 'bg', label: 'Warna latar', show: v => v.bgOn },
          { type: 'seg', key: 'size', label: 'Saiz output', options: [[400, '400'], [800, '800'], [1080, '1080']] }
        ], v, () => { cropper.setRound(v.shape === 'circle'); pv(); });
      } catch (e) { toast(e.message, 'error'); }
    }
    function make(S) {
      const c = makeCanvas(S, S), x = ctx2d(c), r = cropper.get();
      const shape = (inset) => { if (v.shape === 'circle') { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - inset, 0, Math.PI * 2); } else roundRectPath(x, c, inset, inset, S - 2 * inset, S - 2 * inset, v.shape === 'rounded' ? (S - 2 * inset) * .18 : 0); };
      const ring = v.ring === 'none' ? 0 : S * v.rw / 100;
      if (ring) { shape(0); if (v.ring === 'gradient') { const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, v.c1); g.addColorStop(1, v.c2); x.fillStyle = g; } else x.fillStyle = v.c1; x.fill(); }
      const inset = ring ? ring + S * .012 : 0;
      if (ring) { shape(ring); x.fillStyle = v.bgOn ? v.bg : '#ffffff'; if (!v.bgOn) { x.save(); x.globalCompositeOperation = 'destination-out'; x.fill(); x.restore(); } else x.fill(); }
      x.save(); shape(inset); x.clip(); if (v.bgOn) { x.fillStyle = v.bg; x.fillRect(0, 0, S, S); }
      x.drawImage(img, r.x, r.y, r.w, r.h, inset, inset, S - 2 * inset, S - 2 * inset); x.restore();
      return c;
    }
    const pv = rafThrottle(() => { if (!cropper) return; const c = make(240), p = R('pv'); const x = p.getContext('2d'); x.clearRect(0, 0, 240, 240); x.drawImage(c, 0, 0); });
    R('dl').addEventListener('click', () => withBusy('Mencipta gambar profil...', async () => saveBlob(await canvasToBlob(make(+v.size), 'image/png'), `${baseName(file.name)}-profil-${v.size}.png`, 'profile-picture')));
    scope.cleanup.push(() => cropper && cropper.destroy());
  }
});

/* ---------- Image Collage Maker ---------- */
const LAYOUTS = {
  '2h': [[0, 0, .5, 1], [.5, 0, .5, 1]], '2v': [[0, 0, 1, .5], [0, .5, 1, .5]],
  '3a': [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]], '3b': [[0, 0, 1, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
  '3h': [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], '4': [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]],
  '1+3': [[0, 0, 1, 2 / 3], [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3]],
  '5': [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, 1 / 3, .5], [1 / 3, .5, 1 / 3, .5], [2 / 3, .5, 1 / 3, .5]],
  '6': Array.from({ length: 6 }, (_, i) => [(i % 3) / 3, Math.floor(i / 3) / 2, 1 / 3, .5]),
  '9': Array.from({ length: 9 }, (_, i) => [(i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3])
};
registerTool({
  id: 'image-collage', cat: 'util', name: 'Image Collage Maker', icon: 'collage', popular: true,
  desc: 'Gabungkan 2 hingga 9 gambar dalam satu kolaj dengan pelbagai susun atur, jarak dan warna latar.',
  mount(root, scope) {
    const items = [];
    const v = { layout: '4', canvas: '1080x1080', gap: 12, pad: 12, radius: 2, bg: '#ffffff', fmt: 'image/jpeg' };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="add" type="button">${icon('upload')}Tambah gambar</button></div><div class="stage"><canvas data-r="cv"></canvas></div><div class="pad" style="border-top:1px solid var(--line)"><div class="row" data-r="thumbs" style="gap:8px"></div></div></div>
      <aside class="card ws-panel"><div class="fld"><span>Susun atur</span><div class="lay-grid" data-r="lays"></div></div><div class="ctrls" data-r="ctrls"></div>
      <button class="btn primary block" data-r="dl" type="button">${icon('download')}Muat Turun Kolaj</button><button class="btn danger block" data-r="reset" type="button">${icon('trash')}Reset</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', multiple: true, title: 'Seret & lepas 2–9 gambar untuk kolaj', onFiles: add });
    R('dz').appendChild(dz); R('add').addEventListener('click', () => $('input', dz).click());
    R('lays').innerHTML = Object.entries(LAYOUTS).map(([k, cells]) => `<button class="lay ${k === v.layout ? 'on' : ''}" type="button" data-l="${k}" aria-label="Susun atur ${cells.length} gambar">${cells.map(([x, y, w, h]) => `<i style="left:calc(${x * 100}% + 2px + ${x ? 1 : 0}px);top:calc(${y * 100}% + 2px);width:calc(${w * 100}% - 4px);height:calc(${h * 100}% - 4px)"></i>`).join('')}</button>`).join('');
    R('lays').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; v.layout = b.dataset.l; $$('.lay', root).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    renderControls(R('ctrls'), [
      { type: 'select', key: 'canvas', label: 'Saiz kanvas', options: [['1080x1080', 'Segi empat 1080×1080'], ['1080x1350', 'Instagram potret 1080×1350'], ['1080x1920', 'Story 1080×1920'], ['1920x1080', 'Landskap 1920×1080'], ['2400x2400', 'Cetak 2400×2400']] },
      { type: 'range', key: 'gap', label: 'Jarak antara gambar', min: 0, max: 60, unit: ' px' },
      { type: 'range', key: 'pad', label: 'Jidar luar', min: 0, max: 100, unit: ' px' },
      { type: 'range', key: 'radius', label: 'Bucu bulat', min: 0, max: 20, unit: '%' },
      { type: 'color', key: 'bg', label: 'Warna latar' },
      { type: 'seg', key: 'fmt', label: 'Format', options: [['image/jpeg', 'JPG'], ['image/png', 'PNG']] }
    ], v, () => draw());
    async function add(files) {
      const ok = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], max: 9, current: items.length });
      for (const f of ok) { try { const img = await loadImage(f); scope.urls.push(img._url); items.push({ f, img }); } catch (e) { toast(e.message, 'error'); } }
      if (items.length) { R('dz').hidden = true; R('ws').hidden = false; const best = { 1: '2h', 2: '2h', 3: '3a', 4: '4', 5: '5', 6: '6', 7: '9', 8: '9', 9: '9' }[items.length]; v.layout = best; $$('.lay', root).forEach(x => x.classList.toggle('on', x.dataset.l === best)); }
      thumbs(); draw();
    }
    function thumbs() { R('thumbs').innerHTML = items.map((it, i) => `<div style="position:relative"><img src="${it.img._url}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line)"><div class="row" style="gap:2px;margin-top:3px"><button class="btn sm" style="height:24px;padding:0 6px" data-a="l" data-i="${i}" type="button" aria-label="Ke kiri">‹</button><button class="btn sm" style="height:24px;padding:0 6px" data-a="r" data-i="${i}" type="button" aria-label="Ke kanan">›</button><button class="btn sm danger" style="height:24px;padding:0 6px" data-a="x" data-i="${i}" type="button" aria-label="Buang">✕</button></div></div>`).join('') + `<span class="meta-line">${items.length}/9 gambar · susunan ikut urutan</span>`; }
    R('thumbs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (b.dataset.a === 'x') items.splice(i, 1); if (b.dataset.a === 'l' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]]; if (b.dataset.a === 'r' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]]; thumbs(); draw(); });
    function render(scale = 1) {
      const [W0, H0] = v.canvas.split('x').map(Number), W = W0 * scale, H = H0 * scale, c = makeCanvas(W, H), x = ctx2d(c);
      x.fillStyle = v.bg; x.fillRect(0, 0, W, H);
      const pad = v.pad * scale, gap = v.gap * scale, iw = W - 2 * pad, ih = H - 2 * pad;
      LAYOUTS[v.layout].forEach(([cx, cy, cw, ch], i) => {
        const x0 = pad + cx * iw + (cx > 0.001 ? gap / 2 : 0), y0 = pad + cy * ih + (cy > 0.001 ? gap / 2 : 0);
        const x1 = pad + (cx + cw) * iw - (cx + cw < .999 ? gap / 2 : 0), y1 = pad + (cy + ch) * ih - (cy + ch < .999 ? gap / 2 : 0);
        const w = x1 - x0, h = y1 - y0, r = Math.min(w, h) * v.radius / 100;
        x.save(); roundRectPath(x, c, x0, y0, w, h, r); x.clip();
        if (items[i]) drawCover(x, items[i].img, x0, y0, w, h);
        else if (scale < 1) { x.fillStyle = '#eef0f9'; x.fillRect(x0, y0, w, h); x.fillStyle = '#8e97b5'; x.font = `600 ${Math.max(12, w / 12)}px "Plus Jakarta Sans", Arial`; x.textAlign = 'center'; x.fillText('+ gambar', x0 + w / 2, y0 + h / 2); }
        x.restore();
      });
      return c;
    }
    const draw = rafThrottle(() => { if (!items.length) { R('ws').hidden = true; R('dz').hidden = false; return; } const [W] = v.canvas.split('x').map(Number); const c = render(Math.min(1, 900 / W)), cv = R('cv'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); R('info').textContent = `${v.canvas.replace('x', '×')} px · ${LAYOUTS[v.layout].length} petak · ${items.length} gambar`; });
    R('dl').addEventListener('click', () => withBusy('Mencipta kolaj...', async () => { const blob = await encode(render(1), v.fmt, .92); saveBlob(blob, `kolaj-${v.canvas}.${EXT[blob.type]}`, 'image-collage'); }));
    R('reset').addEventListener('click', () => { items.length = 0; thumbs(); draw(); });
  }
});

/* ---------- Meme Generator ---------- */
function wrapLines(x, text, maxW) {
  const out = []; String(text).split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); });
  return out;
}
registerTool(editorTool({
  id: 'meme-generator', cat: 'util', name: 'Meme Generator', icon: 'smile', suffix: 'meme', formats: ['image/jpeg', 'image/png'], defaultFormat: 'image/jpeg',
  desc: 'Tambah teks atas dan bawah gaya meme klasik pada mana-mana gambar.',
  defaults: { top: 'BILA DAH SIAP KERJA', bottom: 'TAPI BOS KATA ADA REVISI', size: 9, color: '#ffffff', stroke: '#000000', upper: true, font: 'Anton' },
  controls: [
    { type: 'textarea', key: 'top', label: 'Teks atas', max: 200 },
    { type: 'textarea', key: 'bottom', label: 'Teks bawah', max: 200 },
    { type: 'range', key: 'size', label: 'Saiz huruf', min: 3, max: 20, unit: '%' },
    { type: 'seg', key: 'font', label: 'Fon', options: [['Anton', 'Klasik'], ['Plus Jakarta Sans', 'Moden'], ['Arial', 'Ringkas']] },
    { type: 'color', key: 'color', label: 'Warna teks' },
    { type: 'color', key: 'stroke', label: 'Warna garis tepi' },
    { type: 'check', key: 'upper', label: 'HURUF BESAR' }
  ],
  async draw(src, v) {
    const c = toCanvas(src), x = ctx2d(c), W = c.width, H = c.height;
    const fs = Math.max(10, Math.round(Math.min(W, H) * v.size / 100)); const fam = `"${v.font}", Impact, "Arial Black", sans-serif`;
    try { await document.fonts.load(`800 ${fs}px "${v.font}"`); } catch { }
    x.font = `${v.font === 'Anton' ? 400 : 800} ${fs}px ${fam}`; x.textAlign = 'center'; x.lineJoin = 'round';
    x.fillStyle = v.color; x.strokeStyle = v.stroke; x.lineWidth = Math.max(2, fs / 7);
    const put = (txt, top) => {
      if (!txt.trim()) return; const lines = wrapLines(x, v.upper ? txt.toUpperCase() : txt, W * .92); const lh = fs * 1.12;
      lines.forEach((l, i) => { const y = top ? fs * .35 + lh * (i + 1) - fs * .15 : H - fs * .45 - lh * (lines.length - 1 - i); x.strokeText(l, W / 2, y); x.fillText(l, W / 2, y); });
    };
    put(v.top, true); put(v.bottom, false);
    return c;
  }
}));

/* ---------- Image Comparison Tool ---------- */
registerTool({
  id: 'image-comparison', cat: 'util', name: 'Image Comparison Tool', icon: 'compare',
  desc: 'Bandingkan dua gambar dengan peluncur sebelum/selepas, paparan sebelah-menyebelah atau peta perbezaan piksel.',
  mount(root, scope) {
    const S = { a: null, b: null }; let mode = 'slider', aligned = null;
    root.innerHTML = `<div class="two" data-r="dzs"><div data-r="dza"></div><div data-r="dzb"></div></div>
      <div class="card" data-r="ws" hidden style="margin-top:16px"><div class="stage-bar"><div class="seg" data-r="modes"><button type="button" data-m="slider" class="on">Peluncur</button><button type="button" data-m="side">Sebelah-menyebelah</button><button type="button" data-m="diff">Perbezaan</button></div><span class="chip" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="dl" type="button">${icon('download')}Muat Turun Paparan</button><button class="btn sm danger" data-r="reset" type="button">${icon('trash')}Reset</button></div><div class="stage" data-r="out"></div></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const mk = (key, label) => { const d = dropzone({ accept: 'image/*', title: label, hint: 'Seret, klik atau tampal', compact: true, onFiles: async files => { const [f] = checkFiles(files, { max: 1 }); if (!f) return; try { const img = await loadImage(f); scope.urls.push(img._url); S[key] = img; $('b', d).textContent = `${label}: ${f.name}`; d.style.borderColor = 'var(--ok)'; update(); } catch (e) { toast(e.message, 'error'); } } }); return d; };
    R('dza').appendChild(mk('a', 'Gambar A (sebelum)')); R('dzb').appendChild(mk('b', 'Gambar B (selepas)'));
    pasteTarget = null;
    R('modes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; $$('[data-m]', root).forEach(x => x.classList.toggle('on', x === b)); update(); });
    function align() {
      const a = toCanvas(S.a, 2000), b = makeCanvas(a.width, a.height); ctx2d(b).drawImage(S.b, 0, 0, b.width, b.height); return { a, b };
    }
    function diffCanvas(a, b) {
      const w = a.width, h = a.height, da = a.getContext('2d').getImageData(0, 0, w, h).data, db = b.getContext('2d').getImageData(0, 0, w, h).data;
      const o = makeCanvas(w, h), ox = o.getContext('2d'), im = ox.createImageData(w, h), d = im.data; let diff = 0;
      for (let i = 0; i < da.length; i += 4) {
        const dv = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3; const g = (da[i] * .3 + da[i + 1] * .59 + da[i + 2] * .11) * .35 + 150;
        if (dv > 16) { diff++; d[i] = 230; d[i + 1] = 30; d[i + 2] = 80; } else { d[i] = d[i + 1] = d[i + 2] = g; } d[i + 3] = 255;
      }
      ox.putImageData(im, 0, 0); return { o, pct: diff / (w * h) * 100 };
    }
    function sideCanvas(a, b) { const g = Math.round(a.width * .02), c = makeCanvas(a.width * 2 + g, a.height), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(a, 0, 0); x.drawImage(b, a.width + g, 0); return c; }
    let current = null;
    async function update() {
      if (!S.a || !S.b) return; R('ws').hidden = false; aligned = align(); const out = R('out'); out.innerHTML = '';
      const sizeNote = (S.a.naturalWidth !== S.b.naturalWidth || S.a.naturalHeight !== S.b.naturalHeight) ? ` · B diskala ke ${aligned.a.width}×${aligned.a.height}` : '';
      if (mode === 'slider') { const ua = URL.createObjectURL(await canvasToBlob(aligned.a)), ub = URL.createObjectURL(await canvasToBlob(aligned.b)); scope.urls.push(ua, ub); out.appendChild(compareView(ua, ub, ['A', 'B'])); current = sideCanvas(aligned.a, aligned.b); R('info').textContent = `A ${S.a.naturalWidth}×${S.a.naturalHeight} · B ${S.b.naturalWidth}×${S.b.naturalHeight}${sizeNote}`; }
      if (mode === 'side') { current = sideCanvas(aligned.a, aligned.b); out.appendChild(current); R('info').textContent = 'A (kiri) · B (kanan)' + sizeNote; }
      if (mode === 'diff') { const { o, pct } = diffCanvas(aligned.a, aligned.b); current = o; out.appendChild(o); R('info').textContent = `${pct.toFixed(2)}% piksel berbeza (ditanda merah)` + sizeNote; }
    }
    R('dl').addEventListener('click', () => current && withBusy('Menyediakan fail...', async () => saveBlob(await canvasToBlob(current, 'image/png'), `perbandingan-${mode}.png`, 'image-comparison')));
    R('reset').addEventListener('click', () => { S.a = S.b = null; mountTool('image-comparison'); });
  }
});

/* =====================================================================
   KUALITI TINGGI: pica (Lanczos + unsharp mask) & AI Remove Background
   ===================================================================== */
LIBS.pica = 'https://cdnjs.cloudflare.com/ajax/libs/pica/9.0.1/pica.min.js';
LIBS.transformers = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
let PICA = null;
async function hqResize(src, w, h, sharpen = true) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  try {
    await loadScript(LIBS.pica);
    PICA = PICA || window.pica({ features: ['js', 'wasm', 'ww'] });
    const from = src instanceof HTMLCanvasElement ? src : toCanvas(src);
    const to = makeCanvas(w, h);
    const down = w < from.width;
    await PICA.resize(from, to, { filter: 'lanczos3', unsharpAmount: sharpen && down ? 70 : 0, unsharpRadius: 0.6, unsharpThreshold: 2 });
    return to;
  } catch (e) { console.warn('pica gagal, guna kanvas:', e); return resample(src, w, h); }
}

/* AI model (RMBG-1.4 oleh BRIA AI, ONNX) */
const RMBG = { T: null, model: null, proc: null, dtype: null };
async function loadRmbg(dtype, onProgress) {
  if (RMBG.model && RMBG.dtype === dtype) return RMBG;
  const T = RMBG.T || await import(LIBS.transformers);
  RMBG.T = T; T.env.allowLocalModels = false;
  const files = {};
  const progress_callback = p => {
    if (p.status === 'progress' && p.file) { files[p.file] = [p.loaded || 0, p.total || 0]; const v = Object.values(files); const l = v.reduce((a, b) => a + b[0], 0), t = v.reduce((a, b) => a + b[1], 0); onProgress && onProgress(t ? l / t : 0, l, t); }
  };
  let device = 'wasm';
  if (navigator.gpu) { try { const a = await navigator.gpu.requestAdapter(); if (a) device = 'webgpu'; } catch { } }
  const opts = { config: { model_type: 'custom' }, dtype, progress_callback };
  try { RMBG.model = await T.AutoModel.from_pretrained('briaai/RMBG-1.4', { ...opts, device }); }
  catch (e) { if (device === 'wasm') throw e; console.warn('WebGPU gagal, guna WASM', e); device = 'wasm'; RMBG.model = await T.AutoModel.from_pretrained('briaai/RMBG-1.4', { ...opts, device }); }
  RMBG.proc = RMBG.proc || await T.AutoProcessor.from_pretrained('briaai/RMBG-1.4', { config: { do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5], feature_extractor_type: 'ImageFeatureExtractor', image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 } } });
  RMBG.dtype = dtype; RMBG.device = device;
  return RMBG;
}
async function predictMask(file) {
  const { T, model, proc } = RMBG;
  const image = await T.RawImage.fromBlob(file);
  const { pixel_values } = await proc(image);
  const { output } = await model({ input: pixel_values });
  const m = await T.RawImage.fromTensor(output[0].mul(255).to('uint8'));
  const c = makeCanvas(m.width, m.height), x = c.getContext('2d'), id = x.createImageData(m.width, m.height);
  const ch = m.channels || 1;
  for (let i = 0, j = 0; j < m.width * m.height; j++, i += ch) { const v = m.data[i]; id.data[j * 4] = id.data[j * 4 + 1] = id.data[j * 4 + 2] = v; id.data[j * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  return c;
}

registerTool({
  id: 'remove-background', cat: 'edit', name: 'Remove Background (AI)', icon: 'magic', popular: true,
  desc: 'Buang latar belakang secara automatik dengan AI dalam browser. Hasil PNG lutsinar resolusi penuh, atau tukar latar ke warna, kabur atau gambar lain.',
  mount(root, scope) {
    let img = null, file = null, mask = null, bgImg = null;
    const v = { quality: 'q8', bg: 'none', color: '#ffffff', blur: 18, hard: 35, feather: 1, shadow: false, fmt: 'image/png' };
    root.innerHTML = `<div class="note" style="margin-bottom:12px">${icon('info')} Model AI <b>RMBG-1.4</b> (sumber terbuka, BRIA AI) dimuat turun <b>sekali sahaja</b> ke browser anda (≈44 MB standard / ≈176 MB maksimum) dan disimpan dalam cache. Gambar anda <b>tidak</b> dihantar ke mana-mana pelayan. Lesen model: kegunaan bukan komersial.</div>
      <div data-r="dz"></div>
      <div class="ws" data-r="ws" hidden>
        <div class="card"><div class="stage-bar"><span class="chip" data-r="info"></span><span class="sp"></span><div class="seg" data-r="view"><button type="button" data-m="res" class="on">Hasil</button><button type="button" data-m="cmp">Sebelum/Selepas</button><button type="button" data-m="mask">Topeng</button></div><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div><div class="stage" data-r="stage"><canvas data-r="cv"></canvas></div></div>
        <aside class="card ws-panel"><div class="ctrls" data-r="ctrls"></div><hr class="sep"><div class="ctrls" data-r="exp"></div>
          <button class="btn primary block" data-r="dl" type="button">${icon('download')}Muat Turun Resolusi Penuh</button></aside>
      </div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', title: 'Seret & lepas gambar untuk buang latar', hint: 'Orang, produk, haiwan, kenderaan · JPG, PNG, WEBP', onFiles: load });
    R('dz').appendChild(dz); R('change').addEventListener('click', () => $('input', dz).click());
    let viewMode = 'res';
    R('view').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; viewMode = b.dataset.m; $$('[data-m]', R('view')).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    const bgInput = document.createElement('input'); bgInput.type = 'file'; bgInput.accept = 'image/*';
    bgInput.addEventListener('change', async () => { const [f] = checkFiles(bgInput.files, { max: 1 }); bgInput.value = ''; if (!f) return; try { bgImg = await loadImage(f); scope.urls.push(bgImg._url); v.bg = 'image'; ctrls(); draw(); } catch (e) { toast(e.message, 'error'); } });
    function ctrls() {
      renderControls(R('ctrls'), [
        { type: 'seg', key: 'quality', label: 'Kualiti AI', options: [['q8', 'Standard (pantas)'], ['fp32', 'Maksimum']] },
        { type: 'seg', key: 'bg', label: 'Latar baharu', options: [['none', 'Lutsinar'], ['color', 'Warna'], ['blur', 'Kabur asal'], ['image', 'Gambar']] },
        { type: 'color', key: 'color', label: 'Warna latar', show: v => v.bg === 'color' },
        { type: 'range', key: 'blur', label: 'Kekuatan kabur', min: 4, max: 60, unit: ' px', show: v => v.bg === 'blur' },
        { type: 'buttons', label: 'Gambar latar', show: v => v.bg === 'image', buttons: [{ label: bgImg ? 'Tukar gambar latar' : 'Pilih gambar latar', run: () => bgInput.click() }] },
        { type: 'range', key: 'hard', label: 'Ketajaman tepi', min: 0, max: 90, unit: '%' },
        { type: 'range', key: 'feather', label: 'Kelembutan tepi', min: 0, max: 8, unit: ' px' },
        { type: 'check', key: 'shadow', label: 'Bayang lembut di bawah subjek' }
      ], v, k => { if (k === 'quality') rerun(); else draw(); });
      renderControls(R('exp'), [{ type: 'seg', key: 'fmt', label: 'Format', options: [['image/png', 'PNG (lutsinar)'], ['image/webp', 'WEBP'], ['image/jpeg', 'JPG']] },
        { type: 'note', html: 'JPG tidak menyokong lutsinar. Latar putih akan digunakan jika latar "Lutsinar".', show: v => v.fmt === 'image/jpeg' }], v, () => { });
    }
    async function runModel() {
      busy(true, 'Memuatkan model AI...');
      try {
        await loadRmbg(v.quality, (p, l, t) => { setProgress(p); $('#busyText').textContent = `Memuat turun model AI ${Math.round(p * 100)}% (${fmtBytes(l)} / ${fmtBytes(t)})`; });
        $('#busyText').textContent = 'AI sedang mengasingkan subjek...'; await sleep(30);
        const t0 = performance.now(); mask = await predictMask(file);
        R('info').textContent = `${img.naturalWidth}×${img.naturalHeight} px · AI ${((performance.now() - t0) / 1000).toFixed(1)} s · ${RMBG.device === 'webgpu' ? 'GPU' : 'CPU'}`;
        toast('Latar belakang berjaya dibuang.', 'success');
      } catch (e) {
        console.error(e); mask = null;
        toast(IN_FRAME ? 'Model AI tidak dapat dimuat turun dalam pratonton ini. Hos index.html sendiri untuk guna alat ini.' : 'Gagal memuatkan model AI: ' + (e.message || e), 'error', 8000);
      } finally { busy(false); }
    }
    async function load(files) {
      const [f] = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], max: 1 }); if (!f) return;
      try { img = await loadImage(f); scope.urls.push(img._url); file = f; R('dz').hidden = true; R('ws').hidden = false; ctrls(); await runModel(); draw(); }
      catch (e) { toast(e.message, 'error'); }
    }
    const rerun = async () => { if (!file) return; await runModel(); draw(); };
    function cutout(W, H) {
      const s = W / img.naturalWidth;
      const m = makeCanvas(W, H), mx = ctx2d(m); mx.drawImage(mask, 0, 0, W, H);
      if (v.feather > 0) boxBlur(m, v.feather * Math.max(s, .5));
      const md = mx.getImageData(0, 0, W, H).data;
      const out = makeCanvas(W, H), ox = ctx2d(out); ox.drawImage(img, 0, 0, W, H);
      const im = ox.getImageData(0, 0, W, H), d = im.data;
      const k = v.hard / 100, lo = k * 0.5 * 255, hi = 255 - k * 0.5 * 255;
      for (let i = 0; i < d.length; i += 4) { let a = (md[i] - lo) / (hi - lo); a = a < 0 ? 0 : a > 1 ? 1 : a; a = a * a * (3 - 2 * a) * (k > 0 ? 1 : 0) + (k > 0 ? 0 : md[i] / 255); d[i + 3] = d[i + 3] * a; }
      ox.putImageData(im, 0, 0); return out;
    }
    function compose(W, H, forJpg) {
      const fg = cutout(W, H), c = makeCanvas(W, H), x = ctx2d(c);
      if (v.bg === 'color' || (forJpg && v.bg === 'none')) { x.fillStyle = v.bg === 'color' ? v.color : '#ffffff'; x.fillRect(0, 0, W, H); }
      if (v.bg === 'blur') { const sm = Math.min(1, 600 / Math.max(W, H)); const t = makeCanvas(W * sm, H * sm); ctx2d(t).drawImage(img, 0, 0, t.width, t.height); boxBlur(t, v.blur * sm); x.drawImage(t, 0, 0, W, H); }
      if (v.bg === 'image' && bgImg) drawCover(x, bgImg, 0, 0, W, H);
      if (v.shadow) { x.save(); x.filter = `blur(${Math.round(W / 60)}px)`; x.globalAlpha = .35; const sh = makeCanvas(W, H), sx = sh.getContext('2d'); sx.drawImage(fg, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H); x.drawImage(sh, W * .012, H * .02); x.restore(); }
      x.drawImage(fg, 0, 0); return c;
    }
    const draw = rafThrottle(() => {
      if (!img || !mask) return;
      const s = Math.min(1, CONFIG.previewMax / Math.max(img.naturalWidth, img.naturalHeight)), W = Math.round(img.naturalWidth * s), H = Math.round(img.naturalHeight * s);
      const st = R('stage');
      if (viewMode === 'cmp') {
        const c = compose(W, H); c.toBlob(b => { const u = URL.createObjectURL(b); scope.urls.push(u); st.innerHTML = ''; st.appendChild(compareView(img._url, u)); });
        return;
      }
      let cv = R('cv'); if (!cv) { st.innerHTML = '<canvas data-r="cv"></canvas>'; cv = R('cv'); }
      const c = viewMode === 'mask' ? (() => { const m = makeCanvas(W, H); ctx2d(m).drawImage(mask, 0, 0, W, H); return m; })() : compose(W, H);
      cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); x.drawImage(c, 0, 0);
    });
    R('dl').addEventListener('click', () => withBusy('Menghasilkan resolusi penuh...', async () => {
      if (!mask) throw new Error('Topeng AI belum tersedia. Muat naik semula gambar.');
      await sleep(30); const c = compose(img.naturalWidth, img.naturalHeight, v.fmt === 'image/jpeg');
      const blob = await encode(c, v.fmt, .95); saveBlob(blob, `${baseName(file.name)}-tanpa-latar.${EXT[blob.type]}`, 'remove-background');
    }));
  }
});

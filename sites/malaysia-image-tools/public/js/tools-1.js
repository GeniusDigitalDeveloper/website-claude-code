/* =====================================================================
   PENDAFTARAN ALAT (modular): tambah alat baharu dengan registerTool({...})
   ===================================================================== */
const CATS = {
  convert: { name: 'Image Converter', bm: 'Penukar Format', cls: 'c-convert', desc: 'Tukar format gambar dan PDF dengan sekali klik.' },
  edit: { name: 'Image Editor', bm: 'Penyunting Gambar', cls: 'c-edit', desc: 'Mampat, ubah saiz, potong dan laraskan gambar.' },
  util: { name: 'Image Utilities', bm: 'Utiliti Gambar', cls: 'c-util', desc: 'Alat praktikal untuk kerja harian, pejabat dan media sosial.' }
};
const TOOLS = [];
function registerTool(t) { TOOLS.push(t); }

/* ---------- Rangka A: penukar kelompok (batch) ---------- */
function batchConvertTool(def) {
  return {
    ...def,
    mount(root, scope) {
      const items = [];
      const v = { out: def.to || 'image/jpeg', quality: 92, bg: '#ffffff' };
      root.innerHTML = `<div data-r="dz"></div>
        <div class="card toolbar" data-r="bar" hidden>
          ${def.to ? `<div class="fld"><span>Format output</span><div class="chip blue" style="justify-self:start">${MIME_LABEL[def.to]}</div></div>` :
          `<div class="fld"><label for="cvOut">Format output</label><select class="inp" id="cvOut"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WEBP</option></select></div>`}
          <div class="fld" data-r="qwrap"><span><label for="cvQ">Kualiti</label><output data-r="qo">92%</output></span><input id="cvQ" type="range" min="10" max="100" value="92"></div>
          <div class="fld" data-r="bgwrap" style="max-width:150px"><label for="cvBg">Latar (lutsinar → JPG)</label><input id="cvBg" type="color" value="#ffffff"></div>
          <div class="row"><button class="btn primary" data-r="go" type="button">${icon('convert')}Tukar Semua</button><button class="btn" data-r="all" type="button" disabled>${icon('download')}Muat Turun Semua</button><button class="btn danger" data-r="reset" type="button">${icon('trash')}Reset</button></div>
        </div>
        <div class="summary" data-r="sum"></div>
        <div class="flist" data-r="list"></div>`;
      const R = k => $(`[data-r="${k}"]`, root);
      R('dz').appendChild(dropzone({ accept: def.accept, multiple: true, title: `Seret & lepas fail ${def.fromLabel} di sini`, hint: `Boleh pilih banyak fail · maksimum ${CONFIG.maxFiles} fail, ${CONFIG.maxImageMB} MB setiap satu`, onFiles: add }));
      const outSel = $('#cvOut', root);
      const syncOpts = () => { const o = outSel ? outSel.value : v.out; v.out = o; R('qwrap').hidden = o === 'image/png'; R('bgwrap').hidden = o !== 'image/jpeg'; items.forEach(it => { it.blob = null; }); renderList(); };
      outSel && outSel.addEventListener('change', syncOpts);
      $('#cvQ', root).addEventListener('input', e => { v.quality = +e.target.value; R('qo').textContent = v.quality + '%'; items.forEach(it => it.blob = null); renderList(); });
      $('#cvBg', root).addEventListener('input', e => { v.bg = e.target.value; items.forEach(it => it.blob = null); });
      syncOpts();
      async function add(files) {
        const ok = checkFiles(files, { types: def.types, current: items.length });
        for (const f of ok) {
          try { const img = await loadImage(f); scope.urls.push(img._url); items.push({ id: Math.random().toString(36).slice(2), file: f, img }); }
          catch (e) { toast(e.message, 'error'); }
        }
        renderList();
      }
      function renderList() {
        R('bar').hidden = !items.length;
        R('all').disabled = !items.some(i => i.blob);
        const done = items.filter(i => i.blob);
        R('sum').innerHTML = items.length ? `<span>Fail: <b>${items.length}</b></span><span>Saiz asal: <b>${fmtBytes(items.reduce((a, i) => a + i.file.size, 0))}</b></span>${done.length ? `<span>Siap: <b>${done.length}/${items.length}</b></span><span>Saiz baharu: <b>${fmtBytes(done.reduce((a, i) => a + i.blob.size, 0))}</b></span>` : ''}` : '';
        R('list').innerHTML = items.map(it => `<div class="fitem" data-id="${it.id}">
          <img class="th" src="${it.outUrl && it.blob ? it.outUrl : it.img._url}" alt="">
          <div style="min-width:0"><div class="nm">${esc(it.file.name)}</div>
            <div class="sub"><span>${MIME_LABEL[it.file.type] || it.file.type}</span><span>${it.img.naturalWidth}×${it.img.naturalHeight}</span><span>${fmtBytes(it.file.size)}</span>
            ${it.blob ? `<span>→ ${MIME_LABEL[it.blob.type]} · ${fmtBytes(it.blob.size)}</span><span class="chip ok" style="padding:0 7px">${icon('check')}Siap</span>` : '<span>Belum ditukar</span>'}</div></div>
          <div class="acts">${it.blob ? `<button class="btn sm" data-a="view" type="button">Pratonton</button><button class="btn sm primary" data-a="dl" type="button">${icon('download')}Muat Turun</button>` : ''}<button class="btn sm danger" data-a="rm" type="button" aria-label="Buang fail">${icon('trash')}</button></div></div>`).join('');
      }
      R('list').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return; const it = items.find(i => i.id === b.closest('.fitem').dataset.id); if (!it) return;
        if (b.dataset.a === 'rm') { items.splice(items.indexOf(it), 1); renderList(); }
        if (b.dataset.a === 'dl') saveBlob(it.blob, `${baseName(it.file.name)}.${EXT[it.blob.type]}`, def.id);
        if (b.dataset.a === 'view') showCompare(it.file.name, it.img._url, it.outUrl);
      });
      async function convertAll() {
        if (!items.length) return;
        await withBusy('Menukar gambar...', async () => {
          for (let k = 0; k < items.length; k++) {
            const it = items[k]; busy(true, `Menukar ${k + 1}/${items.length}...`);
            try {
              const c = toCanvas(it.img);
              let src = c;
              if (v.out === 'image/jpeg' && v.bg !== '#ffffff') { src = makeCanvas(c.width, c.height); const x = ctx2d(src); x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0); }
              it.blob = await encode(src, v.out, v.quality / 100);
              if (it.outUrl) URL.revokeObjectURL(it.outUrl);
              it.outUrl = URL.createObjectURL(it.blob); scope.urls.push(it.outUrl);
            } catch (e) { toast(`${it.file.name}: ${e.message}`, 'error'); }
            finally { busy(false); }
            setProgress((k + 1) / items.length); await sleep(0);
          }
          toast(`${items.filter(i => i.blob).length} gambar berjaya ditukar.`, 'success');
        });
        renderList();
      }
      R('go').addEventListener('click', convertAll);
      R('all').addEventListener('click', () => saveZip(items.filter(i => i.blob).map(i => ({ blob: i.blob, name: `${baseName(i.file.name)}.${EXT[i.blob.type]}` })), `${def.id}-${Date.now()}.zip`, def.id));
      R('reset').addEventListener('click', () => { items.length = 0; renderList(); toast('Semua fail dibuang.', 'info'); });
    }
  };
}

/* ---------- Rangka B: penyunting satu gambar ---------- */
function editorTool(def) {
  return {
    ...def,
    mount(root, scope) {
      const v = JSON.parse(JSON.stringify(def.defaults || {}));
      const fmts = def.formats || ['image/png', 'image/jpeg', 'image/webp'];
      let img = null, prev = null, file = null, holding = false;
      const ex = { fmt: def.defaultFormat || null, q: 92 };
      root.innerHTML = `<div data-r="dz"></div>
        <div class="ws" data-r="ws" hidden>
          <div class="card"><div class="stage-bar"><span class="chip" data-r="info"></span><span class="sp"></span>
            <button class="btn sm ghost" data-r="hold" type="button">Tahan: lihat asal</button>
            <button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div>
            <div class="stage"><canvas data-r="cv"></canvas></div></div>
          <aside class="card ws-panel"><p class="panel-title">Tetapan</p><div class="ctrls" data-r="ctrls"></div><hr class="sep"><p class="panel-title">Simpan</p><div class="ctrls" data-r="exp"></div></aside>
        </div>`;
      const R = k => $(`[data-r="${k}"]`, root);
      const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar di sini', hint: `JPG, PNG, WEBP · maksimum ${CONFIG.maxImageMB} MB`, onFiles: load });
      R('dz').appendChild(dz);
      const cv = R('cv');
      async function load(files) {
        const [f] = checkFiles(files, { max: 1 }); if (!f) return;
        try {
          img = await loadImage(f); scope.urls.push(img._url); file = f;
          prev = toCanvas(img, CONFIG.previewMax);
          if (!ex.fmt) ex.fmt = fmts.includes(f.type) ? f.type : fmts[0];
          R('dz').hidden = true; R('ws').hidden = false;
          def.onLoad && def.onLoad(v, img);
          renderControls(R('ctrls'), def.controls, v, draw);
          renderExport(); draw();
        } catch (e) { toast(e.message, 'error'); }
      }
      function renderExport() {
        const opts = fmts.map(m => [m, MIME_LABEL[m]]);
        renderControls(R('exp'), [
          ...(fmts.length > 1 ? [{ type: 'seg', key: 'fmt', label: 'Format', options: opts }] : []),
          { type: 'range', key: 'q', label: 'Kualiti', min: 10, max: 100, unit: '%', show: e => e.fmt !== 'image/png' },
        ], ex, () => { });
        const row = document.createElement('div'); row.className = 'row';
        row.innerHTML = `<button class="btn primary" type="button" data-r="dl" style="flex:1">${icon('download')}Muat Turun</button><button class="btn" type="button" data-r="rs">${icon('reset')}Set Semula</button>`;
        R('exp').appendChild(row);
        R('dl').onclick = exportFull;
        R('rs').onclick = () => { Object.assign(v, JSON.parse(JSON.stringify(def.defaults || {}))); def.onLoad && def.onLoad(v, img); renderControls(R('ctrls'), def.controls, v, draw); draw(); };
      }
      const draw = rafThrottle(async () => {
        if (!prev) return;
        if (holding) { copyTo(prev); return; }
        const s = prev.width / img.naturalWidth;
        const out = await def.draw(prev, v, s, img);
        copyTo(out);
        R('info').textContent = def.info ? def.info(v, img) : `${img.naturalWidth}×${img.naturalHeight} px · ${fmtBytes(file.size)}`;
      });
      function copyTo(c) { cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); }
      const hold = R('hold');
      hold.addEventListener('pointerdown', () => { holding = true; draw(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => hold.addEventListener(e, () => { if (holding) { holding = false; draw(); } }));
      R('change').addEventListener('click', () => dz.querySelector('input').click());
      async function exportFull() {
        await withBusy('Menyediakan fail resolusi penuh...', async () => {
          await sleep(30);
          if (def.export) { const r = await def.export(img, v, ex, file); saveBlob(r.blob, r.name, def.id); return; }
          const full = toCanvas(img);
          const out = await def.draw(full, v, 1, img);
          const blob = await encode(out, ex.fmt, ex.q / 100);
          saveBlob(blob, `${baseName(file.name)}-${def.suffix || def.id}.${EXT[blob.type]}`, def.id);
        });
      }
    }
  };
}

/* =====================================================================
   IMAGE CONVERTER
   ===================================================================== */
registerTool(batchConvertTool({ id: 'jpg-to-png', cat: 'convert', name: 'JPG to PNG', icon: 'convert', desc: 'Tukar gambar JPG kepada PNG tanpa kehilangan kualiti.', types: ['image/jpeg'], accept: '.jpg,.jpeg,image/jpeg', fromLabel: 'JPG', to: 'image/png', popular: true }));
registerTool(batchConvertTool({ id: 'png-to-jpg', cat: 'convert', name: 'PNG to JPG', icon: 'convert', desc: 'Tukar PNG kepada JPG yang lebih kecil. Latar lutsinar diisi warna pilihan.', types: ['image/png'], accept: '.png,image/png', fromLabel: 'PNG', to: 'image/jpeg', popular: true }));
registerTool(batchConvertTool({ id: 'webp-to-jpg', cat: 'convert', name: 'WEBP to JPG', icon: 'convert', desc: 'Tukar WEBP daripada web kepada JPG yang serasi di semua peranti.', types: ['image/webp'], accept: '.webp,image/webp', fromLabel: 'WEBP', to: 'image/jpeg' }));
registerTool(batchConvertTool({ id: 'jpg-to-webp', cat: 'convert', name: 'JPG to WEBP', icon: 'convert', desc: 'Tukar JPG kepada WEBP untuk laman web yang lebih laju.', types: ['image/jpeg'], accept: '.jpg,.jpeg,image/jpeg', fromLabel: 'JPG', to: 'image/webp' }));
registerTool(batchConvertTool({ id: 'png-to-webp', cat: 'convert', name: 'PNG to WEBP', icon: 'convert', desc: 'Tukar PNG kepada WEBP dan kekalkan lutsinar dengan saiz lebih kecil.', types: ['image/png'], accept: '.png,image/png', fromLabel: 'PNG', to: 'image/webp' }));
registerTool(batchConvertTool({ id: 'image-format-converter', cat: 'convert', name: 'Image Format Converter', icon: 'image', desc: 'Pilih format output (JPG, PNG atau WEBP), tetapkan kualiti dan tukar.', types: IMG_TYPES, accept: 'image/*', fromLabel: 'gambar', to: null, isNew: true }));

/* ---------- Image to PDF ---------- */
registerTool({
  id: 'image-to-pdf', cat: 'convert', name: 'Image to PDF', icon: 'pdf', popular: true,
  desc: 'Gabungkan beberapa gambar menjadi satu fail PDF. Susun semula halaman sebelum simpan.',
  mount(root, scope) {
    const items = [];
    const v = { page: 'a4', orient: 'auto', margin: 10, quality: 90 };
    root.innerHTML = `<div data-r="dz"></div>
      <div class="ws" data-r="ws" hidden><div class="card pad"><div class="row" style="margin-bottom:10px"><b>Halaman</b><span class="count" data-r="cnt"></span><span class="sp"></span><span class="meta-line">Guna ▲▼ untuk susun semula</span></div><div class="flist" data-r="list" style="margin:0"></div></div>
      <aside class="card ws-panel"><p class="panel-title">Tetapan PDF</p><div class="ctrls" data-r="ctrls"></div>
      <div class="row"><button class="btn primary" style="flex:1" data-r="go" type="button">${icon('pdf')}Cipta PDF</button><button class="btn danger" data-r="reset" type="button">${icon('trash')}</button></div></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', multiple: true, title: 'Seret & lepas gambar untuk PDF', hint: 'JPG, PNG, WEBP · boleh pilih banyak gambar', onFiles: add });
    R('dz').appendChild(dz);
    renderControls(R('ctrls'), [
      { type: 'select', key: 'page', label: 'Saiz halaman', options: [['a4', 'A4 (210 × 297 mm)'], ['letter', 'Letter (216 × 279 mm)'], ['a5', 'A5 (148 × 210 mm)'], ['fit', 'Ikut saiz gambar']] },
      { type: 'seg', key: 'orient', label: 'Orientasi', options: [['auto', 'Auto'], ['p', 'Potret'], ['l', 'Landskap']], show: v => v.page !== 'fit' },
      { type: 'seg', key: 'margin', label: 'Jidar (mm)', options: [[0, 'Tiada'], [5, '5'], [10, '10'], [20, '20']], show: v => v.page !== 'fit' },
      { type: 'range', key: 'quality', label: 'Kualiti gambar', min: 40, max: 100, unit: '%' }
    ], v, () => { });
    async function add(files) {
      const ok = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], current: items.length });
      for (const f of ok) { try { const img = await loadImage(f); scope.urls.push(img._url); items.push({ id: Math.random().toString(36).slice(2), file: f, img }); } catch (e) { toast(e.message, 'error'); } }
      render();
    }
    function render() {
      R('ws').hidden = !items.length; dz.classList.toggle('compact', items.length > 0);
      R('cnt').textContent = items.length + ' halaman';
      R('list').innerHTML = items.map((it, i) => `<div class="fitem" data-id="${it.id}"><img class="th" src="${it.img._url}" alt=""><div style="min-width:0"><div class="nm">${i + 1}. ${esc(it.file.name)}</div><div class="sub"><span>${it.img.naturalWidth}×${it.img.naturalHeight}</span><span>${fmtBytes(it.file.size)}</span></div></div>
        <div class="acts"><button class="btn sm" data-a="up" type="button" aria-label="Naik" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="btn sm" data-a="down" type="button" aria-label="Turun" ${i === items.length - 1 ? 'disabled' : ''}>${icon('down')}</button><button class="btn sm danger" data-a="rm" type="button" aria-label="Buang">${icon('trash')}</button></div></div>`).join('');
    }
    R('list').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const i = items.findIndex(x => x.id === b.closest('.fitem').dataset.id);
      if (b.dataset.a === 'rm') items.splice(i, 1);
      if (b.dataset.a === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
      if (b.dataset.a === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
      render();
    });
    R('reset').addEventListener('click', () => { items.length = 0; render(); });
    R('go').addEventListener('click', () => withBusy('Mencipta PDF...', async () => {
      if (!items.length) return;
      await loadScript(LIBS.jspdf);
      const { jsPDF } = window.jspdf;
      const SIZES = { a4: [595.28, 841.89], letter: [612, 792], a5: [419.53, 595.28] };
      let doc = null;
      for (let k = 0; k < items.length; k++) {
        const img = items[k].img; const iw = img.naturalWidth, ih = img.naturalHeight;
        let pw, ph, m;
        if (v.page === 'fit') { pw = iw * .75; ph = ih * .75; m = 0; }
        else {
          [pw, ph] = SIZES[v.page]; const land = v.orient === 'l' || (v.orient === 'auto' && iw > ih);
          if (land) [pw, ph] = [ph, pw]; m = v.margin * 2.8346;
        }
        const o = pw > ph ? 'l' : 'p';
        if (!doc) doc = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: o, compress: true });
        else doc.addPage([pw, ph], o);
        const s = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih);
        const w = iw * s, h = ih * s;
        const maxPx = Math.min(1, 3000 / Math.max(iw, ih));
        const c = makeCanvas(iw * maxPx, ih * maxPx); const x = ctx2d(c); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        doc.addImage(c.toDataURL('image/jpeg', v.quality / 100), 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
        setProgress((k + 1) / items.length); await sleep(0);
      }
      saveBlob(doc.output('blob'), `gambar-${items.length}-halaman.pdf`, 'image-to-pdf');
    }));
  }
});

/* ---------- PDF to Image ---------- */
registerTool({
  id: 'pdf-to-image', cat: 'convert', name: 'PDF to Image', icon: 'pdfimg', isNew: true,
  desc: 'Tukar setiap halaman PDF kepada gambar PNG atau JPG berkualiti tinggi.',
  mount(root, scope) {
    let pdf = null, file = null; const results = [];
    const v = { scale: 2, fmt: 'image/png', q: 90, range: '' };
    root.innerHTML = `<div data-r="dz"></div><div data-r="ws" hidden>
      <div class="card toolbar"><div class="fld"><span>Fail</span><div class="nm" data-r="nm" style="font-weight:650"></div></div><div class="ctrls" data-r="ctrls" style="flex:3;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"></div>
      <div class="row"><button class="btn primary" data-r="go" type="button">${icon('pdfimg')}Tukar Halaman</button><button class="btn" data-r="all" type="button" disabled>${icon('download')}Muat Turun Semua</button><button class="btn danger" data-r="reset" type="button">${icon('trash')}Reset</button></div></div>
      <div class="rgrid" data-r="res"></div></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    R('dz').appendChild(dropzone({ accept: 'application/pdf,.pdf', title: 'Seret & lepas fail PDF di sini', hint: `Satu fail PDF · maksimum ${CONFIG.maxPdfMB} MB`, onFiles: load }));
    renderControls(R('ctrls'), [
      { type: 'seg', key: 'scale', label: 'Resolusi', options: [[1, '72 DPI'], [2, '144 DPI'], [3, '216 DPI']] },
      { type: 'seg', key: 'fmt', label: 'Format', options: [['image/png', 'PNG'], ['image/jpeg', 'JPG']] },
      { type: 'text', key: 'range', label: 'Halaman (kosong = semua)', placeholder: 'cth: 1-3, 5' }
    ], v, () => { });
    async function load(files) {
      const [f] = checkFiles(files, { types: ['application/pdf'], maxMB: CONFIG.maxPdfMB, max: 1 }); if (!f) return;
      await withBusy('Membuka PDF...', async () => {
        await loadScript(LIBS.pdfjs); await loadScript(LIBS.pdfworker);
        pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfworker;
        pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        file = f; results.length = 0;
        R('nm').innerHTML = `${esc(f.name)} <span class="count">${pdf.numPages} halaman</span>`;
        R('dz').hidden = true; R('ws').hidden = false; renderRes();
      });
    }
    function parseRange(s, n) {
      if (!s.trim()) return Array.from({ length: n }, (_, i) => i + 1);
      const set = new Set();
      s.split(',').forEach(part => { const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/); if (!m) return; const a = +m[1], b = m[2] ? +m[2] : a; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= n) set.add(i); });
      return [...set].sort((a, b) => a - b);
    }
    function renderRes() {
      R('all').disabled = !results.length;
      R('res').innerHTML = results.map((r, i) => `<div class="ritem"><img src="${r.url}" alt="Halaman ${r.page}"><div class="meta-line">Hlm ${r.page} · ${r.w}×${r.h} · ${fmtBytes(r.blob.size)}</div><button class="btn sm" data-i="${i}" type="button">${icon('download')}Muat Turun</button></div>`).join('');
    }
    R('res').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const r = results[+b.dataset.i]; saveBlob(r.blob, r.name, 'pdf-to-image'); });
    R('go').addEventListener('click', () => withBusy('Menukar halaman...', async () => {
      const pages = parseRange(v.range, pdf.numPages);
      if (!pages.length) return toast('Julat halaman tidak sah.', 'warn');
      if (pages.length > 100) return toast('Maksimum 100 halaman sekali tukar. Sila hadkan julat.', 'warn');
      results.forEach(r => URL.revokeObjectURL(r.url)); results.length = 0;
      for (let k = 0; k < pages.length; k++) {
        busy(true, `Halaman ${pages[k]} (${k + 1}/${pages.length})...`);
        try {
          const page = await pdf.getPage(pages[k]);
          let vp = page.getViewport({ scale: v.scale });
          const lim = Math.min(1, 8000 / Math.max(vp.width, vp.height)); if (lim < 1) vp = page.getViewport({ scale: v.scale * lim });
          const c = makeCanvas(vp.width, vp.height); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: x, viewport: vp }).promise;
          const blob = await encode(c, v.fmt, v.q / 100); const url = URL.createObjectURL(blob); scope.urls.push(url);
          results.push({ page: pages[k], blob, url, w: c.width, h: c.height, name: `${baseName(file.name)}-hlm${pages[k]}.${EXT[blob.type]}` });
          renderRes();
        } finally { busy(false); }
        setProgress((k + 1) / pages.length);
      }
      toast(`${results.length} halaman berjaya ditukar.`, 'success');
    }));
    R('all').addEventListener('click', () => saveZip(results.map(r => ({ blob: r.blob, name: r.name })), `${baseName(file.name)}-gambar.zip`, 'pdf-to-image'));
    R('reset').addEventListener('click', () => { pdf && pdf.destroy(); pdf = null; results.length = 0; R('ws').hidden = true; R('dz').hidden = false; renderRes(); });
  }
});

/* =====================================================================
   IMAGE EDITOR
   ===================================================================== */
/* ---------- Image Compressor ---------- */
registerTool({
  id: 'image-compressor', cat: 'edit', name: 'Image Compressor', icon: 'compress', popular: true,
  desc: 'Kecilkan saiz fail JPG, PNG dan WEBP. Lihat saiz asal, saiz baharu dan peratus penjimatan.',
  mount(root, scope) {
    const items = [];
    const v = { q: 70, fmt: 'same', maxw: 0 };
    root.innerHTML = `<div data-r="dz"></div>
      <div class="card toolbar" data-r="bar" hidden>
        <div class="fld" style="flex:2"><span><label for="cmpQ">Kualiti mampatan</label><output data-r="qo">70%</output></span><input id="cmpQ" type="range" min="5" max="100" value="70"><span class="meta-line" style="font-weight:400">Rendah = fail lebih kecil · Tinggi = kualiti lebih baik</span></div>
        <div class="fld"><label for="cmpF">Format output</label><select class="inp" id="cmpF"><option value="same">Sama seperti asal</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP (paling kecil)</option></select></div>
        <div class="fld"><label for="cmpW">Lebar maksimum</label><select class="inp" id="cmpW"><option value="0">Kekal saiz asal</option><option value="3840">3840 px (4K)</option><option value="2560">2560 px</option><option value="1920">1920 px (Full HD)</option><option value="1280">1280 px</option><option value="1024">1024 px</option><option value="800">800 px</option></select></div>
        <div class="row"><button class="btn primary" data-r="all" type="button">${icon('download')}Muat Turun Semua</button><button class="btn danger" data-r="reset" type="button">${icon('trash')}Reset Semua</button></div>
      </div>
      <div class="summary" data-r="sum"></div>
      <div class="flist" data-r="list"></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp', multiple: true, title: 'Seret & lepas gambar untuk dimampatkan', hint: `JPG, PNG, WEBP · banyak fail sekali gus · maks ${CONFIG.maxImageMB} MB setiap satu`, onFiles: add });
    R('dz').appendChild(dz);
    const recompute = debounce(() => runAll(), 300);
    $('#cmpQ', root).addEventListener('input', e => { v.q = +e.target.value; R('qo').textContent = v.q + '%'; recompute(); });
    $('#cmpF', root).addEventListener('change', e => { v.fmt = e.target.value; recompute(); });
    $('#cmpW', root).addEventListener('change', e => { v.maxw = +e.target.value; recompute(); });
    async function add(files) {
      const ok = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp'], current: items.length });
      const fresh = [];
      for (const f of ok) { try { const img = await loadImage(f); scope.urls.push(img._url); const it = { id: Math.random().toString(36).slice(2), file: f, img }; items.push(it); fresh.push(it); } catch (e) { toast(e.message, 'error'); } }
      render(); if (fresh.length) runAll(fresh);
    }
    let runId = 0;
    async function runAll(list = items) {
      const my = ++runId; if (!list.length) return;
      busy(true, 'Memampatkan...');
      try {
        for (let k = 0; k < list.length; k++) {
          if (my !== runId) return;
          const it = list[k];
          busy(true, `Memampatkan ${k + 1}/${list.length}...`);
          try { await compress(it); } catch (e) { toast(`${it.file.name}: ${e.message}`, 'error'); } finally { busy(false); }
          setProgress((k + 1) / list.length); render(); await sleep(0);
        }
      } finally { busy(false); }
    }
    async function compress(it) {
      const iw = it.img.naturalWidth, ih = it.img.naturalHeight;
      const s = v.maxw && iw > v.maxw ? v.maxw / iw : 1;
      const c = s < 1 ? await hqResize(it.img, iw * s, ih * s) : toCanvas(it.img);
      const type = v.fmt === 'same' ? it.file.type : v.fmt;
      let blob = await encode(c, type, v.q / 100);
      it.kept = false;
      if (blob.size >= it.file.size && s === 1 && type === it.file.type) { blob = it.file; it.kept = true; }
      it.blob = blob; it.w = c.width; it.h = c.height;
      if (it.outUrl) URL.revokeObjectURL(it.outUrl);
      it.outUrl = URL.createObjectURL(blob); scope.urls.push(it.outUrl);
    }
    function render() {
      R('bar').hidden = !items.length; dz.classList.toggle('compact', items.length > 0);
      const done = items.filter(i => i.blob);
      const o = done.reduce((a, i) => a + i.file.size, 0), n = done.reduce((a, i) => a + i.blob.size, 0);
      R('sum').innerHTML = items.length ? `<span>Fail: <b>${items.length}</b></span><span>Jumlah asal: <b>${fmtBytes(o)}</b></span><span>Selepas mampat: <b>${fmtBytes(n)}</b></span>${o ? `<span>Penjimatan: <b style="color:var(--ok)">${Math.max(0, Math.round((1 - n / o) * 100))}%</b></span>` : ''}` : '';
      R('list').innerHTML = items.map(it => {
        const red = it.blob ? Math.round((1 - it.blob.size / it.file.size) * 100) : 0;
        return `<div class="fitem" data-id="${it.id}"><div class="cmp-thumbs"><img src="${it.img._url}" alt="Sebelum" data-a="cmp" title="Sebelum"></div>
        <div style="min-width:0"><div class="nm">${esc(it.file.name)}</div><div class="sub"><span>Asal: ${fmtBytes(it.file.size)}</span>${it.blob ? `<span>→ Baharu: ${fmtBytes(it.blob.size)}</span>${it.kept ? '<span class="save neutral">Sudah optimum · fail asal dikekalkan</span>' : red > 0 ? `<span class="save good">−${red}%</span>` : `<span class="save neutral">+${-red}% (lebih besar)</span>`}<span>${it.w}×${it.h} · ${MIME_LABEL[it.blob.type] || ''}</span>` : '<span>Memproses...</span>'}</div></div>
        <div class="acts">${it.blob ? `<button class="btn sm" data-a="cmp" type="button">${icon('compare')}Sebelum/Selepas</button><button class="btn sm primary" data-a="dl" type="button">${icon('download')}Muat Turun</button>` : ''}<button class="btn sm danger" data-a="rm" type="button" aria-label="Buang">${icon('trash')}</button></div></div>`;
      }).join('');
    }
    R('list').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const it = items.find(i => i.id === b.closest('.fitem').dataset.id); if (!it) return;
      if (b.dataset.a === 'rm') { items.splice(items.indexOf(it), 1); render(); }
      if (b.dataset.a === 'dl') saveBlob(it.blob, `${baseName(it.file.name)}-mampat.${EXT[it.blob.type]}`, 'image-compressor');
      if (b.dataset.a === 'cmp' && it.blob) showCompare(`${it.file.name} · ${fmtBytes(it.file.size)} → ${fmtBytes(it.blob.size)}`, it.img._url, it.outUrl);
    });
    R('all').addEventListener('click', () => saveZip(items.filter(i => i.blob).map(i => ({ blob: i.blob, name: `${baseName(i.file.name)}-mampat.${EXT[i.blob.type]}` })), `gambar-mampat-${Date.now()}.zip`, 'image-compressor'));
    R('reset').addEventListener('click', () => { runId++; items.length = 0; render(); toast('Semua fail telah dibuang.', 'info'); });
  }
});

/* ---------- Image Resizer ---------- */
const SIZE_PRESETS = [
  ['YouTube Thumbnail', 1920, 1080], ['YouTube (HD)', 1280, 720], ['Instagram Post', 1080, 1080], ['Instagram Portrait', 1080, 1350], ['Instagram Story', 1080, 1920],
  ['Facebook Post', 1200, 630], ['Facebook Cover', 820, 312], ['TikTok', 1080, 1920], ['Gambar Profil', 400, 400], ['Profil HD', 800, 800], ['X / Twitter Post', 1600, 900], ['LinkedIn Banner', 1584, 396]
];
registerTool({
  id: 'image-resizer', cat: 'edit', name: 'Image Resizer', icon: 'resize', popular: true,
  desc: 'Ubah saiz gambar dengan lebar & tinggi tersuai atau preset YouTube, Instagram, Facebook, TikTok dan profil.',
  mount(root, scope) {
    let img = null, file = null;
    const v = { w: 0, h: 0, lock: true, fit: 'stretch', bg: '#ffffff', fmt: 'image/jpeg', q: 92, sharp: true };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div><div class="stage"><canvas data-r="cv"></canvas></div></div>
      <aside class="card ws-panel">
        <p class="panel-title">Saiz tersuai</p>
        <div class="two"><label class="fld">Lebar (px)<input class="inp mono" id="rsW" type="number" min="1" max="10000"></label><label class="fld">Tinggi (px)<input class="inp mono" id="rsH" type="number" min="1" max="10000"></label></div>
        <label class="check"><input type="checkbox" id="rsLock" checked>Kekalkan nisbah aspek</label>
        <div class="seg" data-r="pct"><button type="button" data-p="25">25%</button><button type="button" data-p="50">50%</button><button type="button" data-p="75">75%</button><button type="button" data-p="100">Asal</button></div>
        <p class="panel-title">Preset media sosial</p>
        <div class="seg" data-r="presets">${SIZE_PRESETS.map(([n, w, h], i) => `<button type="button" data-i="${i}" title="${w}×${h}">${esc(n)} <span class="mono" style="opacity:.6">${w}×${h}</span></button>`).join('')}</div>
        <div class="fld" data-r="fitwrap"><span>Jika nisbah berbeza</span><div class="seg" data-r="fit"><button type="button" data-f="cover">Potong (penuh)</button><button type="button" data-f="contain">Muat + latar</button><button type="button" data-f="stretch">Regang</button></div></div>
        <label class="fld" data-r="bgwrap">Warna latar<input type="color" id="rsBg" value="#ffffff"></label>
        <hr class="sep"><div class="ctrls" data-r="exp"></div>
        <button class="btn primary block" data-r="dl" type="button">${icon('download')}Muat Turun</button>
      </aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar untuk diubah saiz', hint: `JPG, PNG, WEBP · maks ${CONFIG.maxImageMB} MB`, onFiles: load });
    R('dz').appendChild(dz);
    const W = $('#rsW', root), H = $('#rsH', root), L = $('#rsLock', root);
    async function load(files) {
      const [f] = checkFiles(files, { max: 1 }); if (!f) return;
      try { img = await loadImage(f); scope.urls.push(img._url); file = f; v.w = img.naturalWidth; v.h = img.naturalHeight; v.fit = 'stretch'; v.fmt = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) ? f.type : 'image/png'; R('dz').hidden = true; R('ws').hidden = false; renderExp(); sync(); }
      catch (e) { toast(e.message, 'error'); }
    }
    function renderExp() { renderControls(R('exp'), [{ type: 'check', key: 'sharp', label: 'Penajaman pintar (Lanczos3 + unsharp)' }, { type: 'seg', key: 'fmt', label: 'Format', options: [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WEBP']] }, { type: 'range', key: 'q', label: 'Kualiti', min: 10, max: 100, unit: '%', show: v => v.fmt !== 'image/png' }], v, () => { }); }
    const ratio = () => img.naturalWidth / img.naturalHeight;
    function sync() {
      W.value = v.w; H.value = v.h;
      const differs = Math.abs(v.w / v.h - ratio()) > 0.01;
      R('fitwrap').hidden = !differs; R('bgwrap').hidden = !(differs && v.fit === 'contain');
      $$('[data-f]', root).forEach(b => b.classList.toggle('on', b.dataset.f === v.fit));
      preview();
    }
    W.addEventListener('input', () => { v.w = clamp(+W.value || 1, 1, 10000); if (v.lock) { v.h = Math.max(1, Math.round(v.w / ratio())); H.value = v.h; } syncLater(); });
    H.addEventListener('input', () => { v.h = clamp(+H.value || 1, 1, 10000); if (v.lock) { v.w = Math.max(1, Math.round(v.h * ratio())); W.value = v.w; } syncLater(); });
    const syncLater = debounce(sync, 200);
    L.addEventListener('change', () => { v.lock = L.checked; if (v.lock) { v.h = Math.round(v.w / ratio()); sync(); } });
    R('pct').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const p = +b.dataset.p / 100; v.w = Math.max(1, Math.round(img.naturalWidth * p)); v.h = Math.max(1, Math.round(img.naturalHeight * p)); sync(); });
    R('presets').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const [, w, h] = SIZE_PRESETS[+b.dataset.i]; v.w = w; v.h = h; v.lock = false; L.checked = false; if (v.fit === 'stretch') v.fit = 'cover'; $$('button', R('presets')).forEach(x => x.classList.toggle('on', x === b)); sync(); });
    R('fit').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; v.fit = b.dataset.f; sync(); });
    $('#rsBg', root).addEventListener('input', e => { v.bg = e.target.value; preview(); });
    R('change').addEventListener('click', () => $('input', dz).click());
    function render(maxSide) {
      const s = Math.min(1, maxSide / Math.max(v.w, v.h));
      const w = Math.max(1, Math.round(v.w * s)), h = Math.max(1, Math.round(v.h * s));
      const differs = Math.abs(v.w / v.h - ratio()) > 0.01;
      if (!differs || v.fit === 'stretch') return resample(img, w, h);
      const c = makeCanvas(w, h), x = ctx2d(c);
      if (v.fit === 'contain') { x.fillStyle = v.bg; x.fillRect(0, 0, w, h); drawContain(x, img, 0, 0, w, h); }
      else drawCover(x, img, 0, 0, w, h);
      return c;
    }
    async function renderHQ() {
      const iw = img.naturalWidth, ih = img.naturalHeight, differs = Math.abs(v.w / v.h - ratio()) > 0.01;
      if (!differs || v.fit === 'stretch') return hqResize(img, v.w, v.h, v.sharp);
      if (v.fit === 'contain') {
        const s = Math.min(v.w / iw, v.h / ih), t = await hqResize(img, iw * s, ih * s, v.sharp);
        const c = makeCanvas(v.w, v.h), x = ctx2d(c); x.fillStyle = v.bg; x.fillRect(0, 0, v.w, v.h); x.drawImage(t, Math.round((v.w - t.width) / 2), Math.round((v.h - t.height) / 2)); return c;
      }
      const s = Math.max(v.w / iw, v.h / ih), sw = v.w / s, sh = v.h / s, crop = makeCanvas(sw, sh);
      crop.getContext('2d').drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, crop.width, crop.height);
      return hqResize(crop, v.w, v.h, v.sharp);
    }
    const preview = rafThrottle(() => {
      const c = render(CONFIG.previewMax), cv = R('cv'); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0);
      R('info').textContent = `Asal ${img.naturalWidth}×${img.naturalHeight} → Baharu ${v.w}×${v.h} px`;
    });
    R('dl').addEventListener('click', () => withBusy('Mengubah saiz...', async () => {
      if (v.w * v.h > CONFIG.maxPixels) throw new Error('Saiz output terlalu besar untuk browser.');
      await sleep(20); const c = await renderHQ(); const blob = await encode(c, v.fmt, v.q / 100);
      saveBlob(blob, `${baseName(file.name)}-${v.w}x${v.h}.${EXT[blob.type]}`, 'image-resizer');
    }));
  }
});

/* ---------- Image Cropper ---------- */
registerTool({
  id: 'image-cropper', cat: 'edit', name: 'Image Cropper', icon: 'crop',
  desc: 'Potong gambar secara bebas atau ikut nisbah 1:1, 4:3, 16:9, 9:16 dan lain-lain.',
  mount(root, scope) {
    let img = null, file = null, cropper = null;
    const v = { aspect: 0, fmt: 'image/png', q: 92 };
    root.innerHTML = `<div data-r="dz"></div><div class="ws" data-r="ws" hidden>
      <div class="card"><div class="stage-bar"><span class="chip blue" data-r="info"></span><span class="sp"></span><button class="btn sm" data-r="change" type="button">${icon('upload')}Tukar gambar</button></div><div class="stage" data-r="stage"></div></div>
      <aside class="card ws-panel"><div class="ctrls" data-r="ctrls"></div><div class="fld"><span>Hasil potongan</span><div class="stage" style="min-height:120px;border-radius:10px;padding:8px"><canvas data-r="mini" style="max-height:180px"></canvas></div></div><hr class="sep"><div class="ctrls" data-r="exp"></div>
      <button class="btn primary block" data-r="dl" type="button">${icon('crop')}Potong & Muat Turun</button></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Seret & lepas gambar untuk dipotong', hint: 'Seret kotak untuk gerak · seret bucu untuk ubah saiz', onFiles: load });
    R('dz').appendChild(dz);
    R('change').addEventListener('click', () => $('input', dz).click());
    const mini = rafThrottle(r => { const m = R('mini'); const s = Math.min(1, 360 / Math.max(r.w, r.h)); m.width = Math.max(1, r.w * s); m.height = Math.max(1, r.h * s); ctx2d(m).drawImage(img, r.x, r.y, r.w, r.h, 0, 0, m.width, m.height); R('info').textContent = `Potongan: ${r.w}×${r.h} px · x${r.x} y${r.y}`; });
    async function load(files) {
      const [f] = checkFiles(files, { max: 1 }); if (!f) return;
      try {
        img = await loadImage(f); scope.urls.push(img._url); file = f; v.fmt = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) ? f.type : 'image/png';
        R('dz').hidden = true; R('ws').hidden = false;
        cropper && cropper.destroy(); cropper = createCropper(R('stage'), img, { aspect: v.aspect, onChange: mini });
        renderControls(R('ctrls'), [{ type: 'seg', key: 'aspect', label: 'Nisbah', options: [[0, 'Bebas'], [1, '1:1'], [4 / 3, '4:3'], [3 / 4, '3:4'], [16 / 9, '16:9'], [9 / 16, '9:16'], [3 / 2, '3:2'], [img.naturalWidth / img.naturalHeight, 'Asal']] }], v, () => cropper.setAspect(+v.aspect));
        renderControls(R('exp'), [{ type: 'seg', key: 'fmt', label: 'Format', options: [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WEBP']] }, { type: 'range', key: 'q', label: 'Kualiti', min: 10, max: 100, unit: '%', show: v => v.fmt !== 'image/png' }], v, () => { });
      } catch (e) { toast(e.message, 'error'); }
    }
    R('dl').addEventListener('click', () => withBusy('Memotong...', async () => {
      const r = cropper.get(); const c = makeCanvas(r.w, r.h); ctx2d(c).drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      const blob = await encode(c, v.fmt, v.q / 100); saveBlob(blob, `${baseName(file.name)}-potong-${r.w}x${r.h}.${EXT[blob.type]}`, 'image-cropper');
    }));
    scope.cleanup.push(() => cropper && cropper.destroy());
  }
});

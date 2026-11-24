/* =====================================================================
   ALAT BAHARU: Image to Link (ImgBB) & Image to Embed Code
   Lencana "NEW" hijau: newUntil = tarikh tamat (waktu Malaysia). Selepas tarikh itu lencana hilang sendiri.
   ===================================================================== */
const IMGBB_KEY = window.MIT_IMGBB_KEY || '';
const NEW_UNTIL = '2026-12-24'; /* 1 bulan selepas alat ditambah (24 Nov 2026) */

const lsJSON = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };

/* ---------- Image to Link ---------- */
function imgbbUpload(file, { expiration = 0, onProgress } = {}) {
  return new Promise((res, rej) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('name', baseName(file.name));
    if (expiration) fd.append('expiration', String(expiration));
    const x = new XMLHttpRequest();
    x.open('POST', 'https://api.imgbb.com/1/upload?key=' + encodeURIComponent(IMGBB_KEY));
    x.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => {
      try {
        const j = JSON.parse(x.responseText);
        if (x.status === 200 && j.success) res(j.data);
        else rej(new Error((j.error && j.error.message) || `Ralat pelayan (${x.status})`));
      } catch { rej(new Error('Respons tidak sah daripada pelayan imej.')); }
    };
    x.onerror = () => rej(new Error('Tidak dapat menyambung ke pelayan imej. Semak sambungan internet.'));
    x.send(fd);
  });
}

if (IMGBB_KEY) registerTool({
  id: 'image-to-link', cat: 'util', name: 'Image to Link', icon: 'link', newUntil: NEW_UNTIL, uploads: true,
  desc: 'Muat naik gambar dan dapatkan pautan awam yang boleh dikongsi di WhatsApp, forum atau laman web.',
  mount(root, scope) {
    const items = []; const v = { exp: 0 };
    const KEY = 'mit_links';
    root.innerHTML = `<div class="banner warning">${icon('alert')}<div><b>Alat ini memuat naik gambar anda ke ImgBB.</b> Sesiapa yang ada pautan boleh melihat gambar. Jangan muat naik gambar peribadi atau sensitif. Alat lain di laman ini tidak memuat naik apa-apa.</div></div>
      <div data-r="dz"></div>
      <div class="card toolbar" data-r="bar" hidden>
        <div class="fld"><label for="lkExp">Tempoh pautan</label><select class="inp" id="lkExp"><option value="0">Kekal (tiada tamat)</option><option value="3600">1 jam</option><option value="86400">1 hari</option><option value="604800">7 hari</option><option value="2592000">30 hari</option><option value="15552000">180 hari</option></select></div>
        <div class="row"><button class="btn primary" data-r="go" type="button">${icon('upload')}Muat Naik &amp; Jana Pautan</button><button class="btn" data-r="copyall" type="button" disabled>${icon('copy')}Salin Semua Pautan</button><button class="btn danger" data-r="reset" type="button">${icon('trash')}Reset</button></div>
      </div>
      <div class="flist" data-r="list"></div>
      <section class="sec" data-r="histwrap" hidden><div class="sec-head"><div><h2>Sejarah muat naik</h2><p>Disimpan dalam peranti ini sahaja. Pautan padam (delete) hanya ada di sini.</p></div><button class="btn sm danger" data-r="clearhist" type="button">Kosongkan</button></div><div class="flist" data-r="hist"></div></section>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp', multiple: true, title: 'Seret & lepas gambar untuk dapatkan pautan', hint: 'JPG, PNG, WEBP, GIF, BMP · maksimum 10 gambar sekali gus', onFiles: add });
    R('dz').appendChild(dz);
    $('#lkExp', root).addEventListener('change', e => { v.exp = +e.target.value; });
    const lr = (label, val) => `<div class="linkrow"><span>${label}</span><input class="inp mono" readonly value="${esc(val)}" aria-label="${esc(label)}"><button class="btn sm" type="button" data-copy="${esc(val)}" aria-label="Salin ${esc(label)}">${icon('copy')}</button></div>`;
    function add(files) {
      const ok = checkFiles(files, { types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'], max: 10, current: items.length });
      for (const f of ok) { const url = URL.createObjectURL(f); scope.urls.push(url); items.push({ id: Math.random().toString(36).slice(2), file: f, url, status: 'ready', p: 0 }); }
      render();
    }
    function render() {
      R('bar').hidden = !items.length; dz.classList.toggle('compact', !!items.length);
      R('copyall').disabled = !items.some(i => i.data);
      R('go').disabled = !items.some(i => i.status === 'ready' || i.status === 'error');
      R('list').innerHTML = items.map(it => `<div class="fitem" data-id="${it.id}"><img class="th" src="${it.url}" alt="">
        <div style="min-width:0"><div class="nm">${esc(it.file.name)}</div><div class="sub"><span>${fmtBytes(it.file.size)}</span>
          ${it.status === 'ready' ? '<span>Belum dimuat naik</span>' : ''}${it.status === 'uploading' ? `<span>Memuat naik ${Math.round(it.p * 100)}%</span>` : ''}${it.status === 'error' ? `<span class="chip bad" style="padding:0 7px">${esc(it.err)}</span>` : ''}${it.status === 'done' ? `<span class="chip ok" style="padding:0 7px">${icon('check')}Siap</span>` : ''}</div>
          ${it.data ? `<div class="linkrows">${lr('Pautan terus', it.data.url)}${lr('Halaman pratonton', it.data.url_viewer)}${lr('Thumbnail', (it.data.thumb || {}).url || it.data.url)}${lr('Pautan padam', it.data.delete_url)}</div>` : ''}</div>
        <div class="acts">${it.data ? `<button class="btn sm" data-a="embed" type="button">${icon('code')}Kod Embed</button>` : ''}<button class="btn sm danger" data-a="rm" type="button" aria-label="Buang">${icon('trash')}</button></div></div>`).join('');
      const hist = lsJSON(KEY) || [];
      R('histwrap').hidden = !hist.length;
      R('hist').innerHTML = hist.map(h => `<div class="fitem" style="grid-template-columns:48px minmax(0,1fr)"><img class="th" style="width:48px;height:48px" src="${esc(h.thumb || h.url)}" alt="" loading="lazy"><div style="min-width:0"><div class="nm">${esc(h.name)}</div><div class="sub"><span>${new Date(h.at).toLocaleString('ms-MY')}</span><span>${h.exp ? 'Tamat: ' + new Date(h.exp).toLocaleDateString('ms-MY') : 'Kekal'}</span></div><div class="linkrows">${lr('Pautan terus', h.url)}${lr('Pautan padam', h.del)}</div></div></div>`).join('');
    }
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-copy]'); if (c) return copyText(c.dataset.copy, 'Pautan disalin');
      const b = e.target.closest('[data-a]'); if (!b) return; const it = items.find(i => i.id === b.closest('.fitem').dataset.id); if (!it) return;
      if (b.dataset.a === 'rm') { items.splice(items.indexOf(it), 1); render(); }
      if (b.dataset.a === 'embed') { try { sessionStorage.setItem('mit_embed_url', it.data.url); } catch { } location.hash = '#image-to-embed'; }
    });
    R('go').addEventListener('click', async () => {
      R('go').disabled = true;
      for (const it of items.filter(i => i.status === 'ready' || i.status === 'error')) {
        it.status = 'uploading'; it.p = 0; it.err = ''; render();
        try {
          it.data = await imgbbUpload(it.file, { expiration: v.exp, onProgress: p => { it.p = p; const s = $(`[data-id="${it.id}"] .sub span`, root); if (s && it.status === 'uploading') s.textContent = `Memuat naik ${Math.round(p * 100)}%`; } });
          it.status = 'done';
          const hist = lsJSON(KEY) || [];
          hist.unshift({ name: it.file.name, url: it.data.url, thumb: (it.data.thumb || {}).url, del: it.data.delete_url, at: Date.now(), exp: v.exp ? Date.now() + v.exp * 1000 : 0 });
          lsJSON(KEY, hist.slice(0, 30)); track('image-to-link');
        } catch (e) { it.status = 'error'; it.err = e.message; }
        render();
      }
      const n = items.filter(i => i.data).length; if (n) toast(`${n} pautan berjaya dijana.`, 'success');
    });
    R('copyall').addEventListener('click', () => copyText(items.filter(i => i.data).map(i => i.data.url).join('\n'), 'Semua pautan disalin'));
    R('reset').addEventListener('click', () => { items.length = 0; render(); });
    R('clearhist').addEventListener('click', () => { lsJSON(KEY, []); render(); });
    render();
  }
});

/* ---------- Image to Embed Code ---------- */
registerTool({
  id: 'image-to-embed', cat: 'util', name: 'Image to Embed Code', icon: 'code', newUntil: NEW_UNTIL,
  desc: 'Jana kod HTML, Markdown, BBCode, CSS dan React untuk memaparkan gambar di laman web, blog atau forum.',
  mount(root, scope) {
    const v = { src: '', alt: '', title: '', width: '', responsive: true, lazy: true, radius: 0, href: '', newtab: true };
    let dataUri = '', fileName = '';
    try { const pre = sessionStorage.getItem('mit_embed_url'); if (pre) { v.src = pre; sessionStorage.removeItem('mit_embed_url'); } } catch { }
    root.innerHTML = `<div data-r="dz"></div><div class="ws"><div class="card"><div class="stage-bar"><span class="chip" data-r="info">Masukkan pautan gambar atau pilih fail</span></div><div class="stage" data-r="stage" style="min-height:180px"></div><div class="pad" data-r="outs" style="display:grid;gap:12px;border-top:1px solid var(--line)"></div></div>
      <aside class="card ws-panel"><p class="panel-title">Tetapan</p><div class="ctrls" data-r="ctrls"></div></aside></div>`;
    const R = k => $(`[data-r="${k}"]`, root);
    const dz = dropzone({ accept: 'image/*', title: 'Atau pilih fail gambar (kod base64)', hint: 'Untuk kod yang berfungsi tanpa pautan. Fail besar menghasilkan kod yang sangat panjang.', compact: true, onFiles: async files => {
      const [f] = checkFiles(files, { max: 1, maxMB: 5 }); if (!f) return;
      dataUri = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Gagal membaca fail.')); r.readAsDataURL(f); }).catch(e => { toast(e.message, 'error'); return ''; });
      if (!dataUri) return; fileName = f.name; v.src = ''; const i = $('#c_src', root); if (i) i.value = '';
      if (!v.alt) { v.alt = baseName(f.name); const a = $('#c_alt', root); if (a) a.value = v.alt; }
      if (dataUri.length > 140000) toast('Fail ini menghasilkan kod yang sangat panjang. Gunakan alat Image to Link untuk kod yang lebih ringkas.', 'warn', 6000);
      update();
    } });
    R('dz').appendChild(dz);
    renderControls(R('ctrls'), [
      { type: 'text', key: 'src', label: 'Pautan gambar (URL)', placeholder: 'https://contoh.com/gambar.jpg', max: 2000 },
      { type: 'text', key: 'alt', label: 'Teks alternatif (alt)', placeholder: 'Terangkan gambar', max: 200 },
      { type: 'text', key: 'title', label: 'Tajuk (pilihan)', max: 200 },
      { type: 'text', key: 'width', label: 'Lebar', placeholder: 'cth: 600 atau 100%', max: 8 },
      { type: 'range', key: 'radius', label: 'Bucu bulat', min: 0, max: 50, unit: ' px' },
      { type: 'check', key: 'responsive', label: 'Responsif (muat skrin kecil)' },
      { type: 'check', key: 'lazy', label: 'Muat malas (loading="lazy")' },
      { type: 'text', key: 'href', label: 'Pautan bila diklik (pilihan)', placeholder: 'https://...', max: 2000 },
      { type: 'check', key: 'newtab', label: 'Buka dalam tab baharu', show: v => !!v.href }
    ], v, () => { if (v.src && dataUri) { dataUri = ''; fileName = ''; } update(); });
    const src = () => dataUri || v.src.trim();
    const validSrc = s => /^https?:\/\/\S+$/i.test(s) || /^data:image\/[a-z+.-]+;base64,/i.test(s);
    const wNum = () => /^\d+$/.test(v.width.trim()) ? v.width.trim() : '';
    const wPct = () => /^\d+%$/.test(v.width.trim()) ? v.width.trim() : '';
    const styleParts = () => { const p = []; if (wPct()) p.push(`width:${wPct()}`); if (v.responsive) p.push('max-width:100%', 'height:auto'); if (v.radius) p.push(`border-radius:${v.radius}px`); return p; };
    function outputs() {
      const s = src(), isData = s.startsWith('data:'), alt = v.alt.trim(), href = v.href.trim();
      const st = styleParts();
      const attrs = [`src="${esc(s)}"`, `alt="${esc(alt)}"`];
      if (v.title.trim()) attrs.push(`title="${esc(v.title.trim())}"`);
      if (wNum()) attrs.push(`width="${wNum()}"`);
      if (v.lazy) attrs.push('loading="lazy"');
      if (st.length) attrs.push(`style="${st.join(';')}"`);
      const img = `<img ${attrs.join(' ')}>`;
      const link = h => `<a href="${esc(h)}"${v.newtab ? ' target="_blank" rel="noopener"' : ''}>${img}</a>`;
      const out = [{ label: 'HTML', code: img }];
      if (href) out.push({ label: 'HTML dengan pautan', code: link(href) });
      else if (!isData) out.push({ label: 'HTML dengan pautan ke gambar', code: link(s) });
      if (!isData) {
        const md = `![${alt}](${s}${v.title.trim() ? ` "${v.title.trim().replace(/"/g, '&quot;')}"` : ''})`;
        out.push({ label: 'Markdown', code: href ? `[${md}](${href})` : md });
        out.push({ label: 'BBCode (forum)', code: (wNum() ? `[img width=${wNum()}]${s}[/img]` : `[img]${s}[/img]`) });
        if (href) out.push({ label: 'BBCode dengan pautan', code: `[url=${href}][img]${s}[/img][/url]` });
      }
      out.push({ label: 'CSS (latar)', code: `background-image: url("${s}");\nbackground-size: cover;\nbackground-position: center;${v.radius ? `\nborder-radius: ${v.radius}px;` : ''}` });
      const jsx = [`src="${esc(s)}"`, `alt="${esc(alt)}"`]; if (wNum()) jsx.push(`width={${wNum()}}`); if (v.lazy) jsx.push('loading="lazy"');
      const jst = []; if (wPct()) jst.push(`width: '${wPct()}'`); if (v.responsive) jst.push("maxWidth: '100%'", "height: 'auto'"); if (v.radius) jst.push(`borderRadius: ${v.radius}`);
      if (jst.length) jsx.push(`style={{ ${jst.join(', ')} }}`);
      out.push({ label: 'React (JSX)', code: `<img ${jsx.join(' ')} />` });
      return out;
    }
    function update() {
      const s = src(), st = R('stage'), outs = R('outs');
      if (!s) { st.innerHTML = '<span class="meta-line">Pratonton akan dipaparkan di sini.</span>'; outs.innerHTML = ''; R('info').textContent = 'Masukkan pautan gambar atau pilih fail'; return; }
      if (!validSrc(s)) { st.innerHTML = '<span class="meta-line">Pautan mesti bermula dengan https:// atau http://</span>'; outs.innerHTML = ''; R('info').textContent = 'Pautan tidak sah'; return; }
      st.innerHTML = ''; const im = document.createElement('img'); im.alt = 'Pratonton'; im.style.maxHeight = '320px';
      im.onerror = () => { st.innerHTML = '<span class="meta-line">Gambar tidak dapat dimuatkan daripada pautan ini.</span>'; }; im.src = s; st.appendChild(im);
      R('info').textContent = dataUri ? `Fail: ${fileName} · base64 ${fmtBytes(dataUri.length)}` : 'Daripada pautan';
      outs.innerHTML = outputs().map((o, i) => `<div class="outbox"><div class="row"><b style="font-size:13px">${esc(o.label)}</b><span class="sp"></span><button class="btn sm" type="button" data-i="${i}">${icon('copy')}Salin</button></div><textarea class="inp mono" readonly rows="${Math.min(6, Math.max(2, o.code.split('\n').length + Math.floor(o.code.length / 70)))}" aria-label="${esc(o.label)}">${esc(o.code)}</textarea></div>`).join('');
      outs._list = outputs();
    }
    R('outs').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; copyText(R('outs')._list[+b.dataset.i].code, 'Kod disalin'); track('image-to-embed'); });
    update();
  }
});

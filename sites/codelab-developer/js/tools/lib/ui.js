// Bahan binaan UI untuk semua tools: medan, panel output, kerangka transform/CSS/generator.
import { h, debounce, uid } from '../../utils/dom.js';
import { icon } from '../../utils/icons.js';
import { copyText, downloadText, downloadBlob, makeZip, byteSize, fmtBytes } from '../../utils/io.js';
import { highlight } from '../../utils/highlight.js';
import { toast } from '../../components/toast.js';
import { t } from '../../i18n/i18n.js';

/** Ralat tool yang boleh diterjemah: throw new ToolError('err.invalidJson', {msg}) */
export class ToolError extends Error {
  constructor(key, args) { super(key); this.key = key; this.args = args; }
}

export function btn(ic, key, { variant = 'ghost', onclick, aria, type = 'button', cls = '' } = {}) {
  return h('button', { type, class: `btn btn-${variant} ${cls}`.trim(), onclick, aria: aria || undefined },
    ic ? icon(ic, 16) : null, key ? h('span', { i18n: key }) : null);
}

// ---------- medan borang ----------
export function field(d) {
  const id = uid('f');
  let input;
  const common = { id, name: d.key };
  switch (d.type) {
    case 'select':
      input = h('select', common, d.options.map((o) => (o.raw
        ? h('option', { value: o.v }, o.l)
        : h('option', { value: o.v, i18n: o.l }))));
      input.value = d.value ?? d.options[0].v;
      break;
    case 'checkbox':
      input = h('input', { ...common, type: 'checkbox', checked: !!d.value });
      break;
    case 'textarea':
      input = h('textarea', { ...common, rows: d.rows || 3, spellcheck: 'false', ph: d.ph });
      input.value = d.value ?? '';
      break;
    case 'range':
      input = h('input', { ...common, type: 'range', min: d.min ?? 0, max: d.max ?? 100, step: d.step ?? 1 });
      input.value = d.value ?? 0;
      break;
    case 'number':
      input = h('input', { ...common, type: 'number', min: d.min, max: d.max, step: d.step ?? 1, inputmode: 'decimal' });
      input.value = d.value ?? 0;
      break;
    case 'color':
      input = h('input', { ...common, type: 'color' });
      input.value = d.value ?? '#4f46e5';
      break;
    default:
      input = h('input', { ...common, type: 'text', ph: d.ph, spellcheck: 'false', autocomplete: 'off', dir: d.dir || undefined });
      input.value = d.value ?? '';
  }
  const readout = d.type === 'range' ? h('output', { for: id, class: 'readout' }, `${input.value}${d.unit || ''}`) : null;
  if (readout) input.addEventListener('input', () => { readout.textContent = `${input.value}${d.unit || ''}`; });
  const get = () => (d.type === 'checkbox' ? input.checked : ['range', 'number'].includes(d.type) ? Number(input.value) : input.value);
  const set = (v) => {
    if (d.type === 'checkbox') input.checked = !!v; else input.value = v;
    if (readout) readout.textContent = `${v}${d.unit || ''}`;
  };
  const row = h('div', { class: `field field-${d.type || 'text'} ${d.wide ? 'field-wide' : ''}` },
    d.type === 'checkbox'
      ? h('label', { class: 'check', for: id }, input, h('span', { i18n: d.label }))
      : [h('label', { for: id }, h('span', { i18n: d.label }), readout), input]);
  return { el: row, input, get, set, key: d.key };
}

export function controls(defs, onChange = () => {}) {
  const fs = defs.map(field);
  const el = h('div', { class: 'controls' }, fs.map((f) => f.el));
  const fire = () => onChange(values());
  el.addEventListener('input', fire);
  el.addEventListener('change', fire);
  const values = () => Object.fromEntries(fs.map((f) => [f.key, f.get()]));
  const set = (obj) => { fs.forEach((f) => { if (f.key in obj) f.set(obj[f.key]); }); };
  const byKey = (k) => fs.find((f) => f.key === k);
  return { el, values, set, byKey };
}

export function errorBox() {
  const el = h('div', { class: 'alert alert-error', role: 'alert', hidden: true });
  return {
    el,
    show(e) {
      el.hidden = false; el.replaceChildren(icon('triangle-alert', 16));
      const span = h('span');
      if (e && e.key) { span.dataset.i18n = e.key; if (e.args) span.dataset.i18nArgs = JSON.stringify(e.args); span.textContent = t(e.key, e.args); }
      else span.textContent = String(e && e.message ? e.message : e);
      el.append(span);
    },
    hide() { el.hidden = true; },
  };
}

// ---------- panel output ----------
export function outputPane({ lang = 'txt', filename = 'output.txt', mime = 'text/plain', label = 'ui.output', actions = true } = {}) {
  let text = '', name = filename, curMime = mime;
  const code = h('code');
  const pre = h('pre', { class: 'code-view', tabindex: '0', dir: 'ltr' }, code);
  const empty = h('span', { class: 'code-empty', i18n: 'ui.emptyOutput' });
  const copyB = btn('copy', 'ui.copy', { onclick: async () => { if (!text) return; toast((await copyText(text)) ? 'toast.copied' : 'toast.copyFailed', null, 'ok'); } });
  const dlB = btn('download', 'ui.download', { onclick: () => { if (text) { downloadText(text, name, curMime); toast('toast.downloaded'); } } });
  const el = h('div', { class: 'pane' },
    h('div', { class: 'pane-head' }, h('h3', { i18n: label }), actions ? h('div', { class: 'pane-actions' }, copyB, dlB) : null),
    pre);
  const api = {
    el,
    set(txt, l) {
      text = txt || '';
      code.replaceChildren(text ? highlight(text, l || lang) : empty);
      copyB.disabled = dlB.disabled = !text;
    },
    get: () => text,
    setFile(n, m) { name = n; if (m) curMime = m; },
  };
  api.set('');
  return api;
}

// ---------- kerangka: input teks → output teks ----------
export function transformTool(cfg) {
  const { inLang = 'txt', outLang = 'txt', ext = 'txt', mime = 'text/plain', options = [], sample = '', run, showSize = false,
    action = 'ui.run', inLabel = 'ui.input', outLabel = 'ui.output', inPh = 'ui.inputPh', accept = '' } = cfg;
  const input = h('textarea', { class: 'code-input', spellcheck: 'false', ph: inPh, aria: inLabel, dir: 'ltr', autocapitalize: 'off' });
  const out = outputPane({ lang: outLang, filename: `result.${ext}`, mime, label: outLabel });
  const err = errorBox();
  const stats = h('div', { class: 'stats-row', hidden: true });
  let seq = 0;
  const opts = controls(options, () => exec());
  async function exec() {
    const my = ++seq; const v = input.value;
    if (!v.trim()) { out.set(''); err.hide(); stats.hidden = true; return; }
    try {
      const r = await run(v, opts.values());
      if (my !== seq) return;
      out.set(r); err.hide();
      if (showSize) renderStats(v, r);
    } catch (e) {
      if (my !== seq) return;
      out.set(''); err.show(e); stats.hidden = true;
    }
  }
  const execD = debounce(exec, 350);
  input.addEventListener('input', execD);
  function renderStats(a, b) {
    const x = byteSize(a), y = byteSize(b);
    const pct = x ? Math.max(0, ((x - y) / x) * 100) : 0;
    const chip = (k, v, cls = '') => h('div', { class: `stat-chip ${cls}` }, h('span', { i18n: k }), h('strong', {}, v));
    stats.hidden = false;
    stats.replaceChildren(chip('ui.sizeOriginal', fmtBytes(x)), chip('ui.sizeResult', fmtBytes(y)),
      chip('ui.sizeReduction', `${pct.toFixed(1)}%`, 'accent'));
  }
  const file = h('input', { type: 'file', hidden: true, accept, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { err.show(new ToolError('err.fileTooLarge')); return; }
    input.value = await f.text(); e.target.value = ''; exec();
  } });
  const el = h('div', { class: 'tool tool-transform' },
    options.length ? opts.el : null,
    h('div', { class: 'toolbar' },
      btn('play', action, { variant: 'primary', onclick: exec }),
      sample ? btn('file-text', 'ui.sample', { onclick: () => { input.value = sample; exec(); } }) : null,
      btn('upload', 'ui.openFile', { onclick: () => file.click() }), file,
      btn('trash-2', 'ui.clear', { onclick: () => { input.value = ''; exec(); input.focus(); } })),
    err.el, stats,
    h('div', { class: 'split' },
      h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: inLabel })), input),
      out.el));
  return Object.assign(el, { _run: exec, _input: input });
}

// ---------- kerangka: penjana CSS visual ----------
export function cssTool(cfg) {
  const { controls: defs, presets = [], css, render, selector = '.demo', filename = 'style.css', stageBg } = cfg;
  const styleEl = h('style');
  const stage = h('div', { class: 'css-stage' });
  if (stageBg) stage.style.background = stageBg;
  const frame = h('div', { class: 'stage-frame' }, stage);
  const out = outputPane({ lang: 'css', filename, mime: 'text/css', label: 'ui.cssOutput' });
  const ctl = controls(defs, update);
  let sel = selector;
  function update() {
    const v = ctl.values();
    const text = css(v);
    styleEl.textContent = text;
    stage.replaceChildren(styleEl, render ? render(v) : h('div', { class: sel.replace(/^\./, '') }));
    out.set(text);
  }
  const widths = [['smartphone', 'ui.vMobile', '375px'], ['panel-top', 'ui.vTablet', '768px'], ['layout-dashboard', 'ui.vDesktop', '100%']];
  const vBtns = widths.map(([ic, k, w], i) => {
    const b = btn(ic, k, { cls: i === 2 ? 'active' : '', onclick: () => { frame.style.maxWidth = w; vBtns.forEach((x) => x.classList.toggle('active', x === b)); } });
    return b;
  });
  const presetRow = presets.length ? h('div', { class: 'presets' },
    h('span', { class: 'presets-label', i18n: 'ui.presets' }),
    presets.map((p) => h('button', { type: 'button', class: 'chip', onclick: () => { ctl.set(p.v); update(); } }, p.raw ? p.n : h('span', { i18n: p.n })))) : null;
  const el = h('div', { class: 'tool tool-css' },
    h('div', { class: 'css-grid' },
      h('div', { class: 'css-side' }, presetRow, ctl.el),
      h('div', { class: 'css-main' },
        h('div', { class: 'pane' },
          h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.preview' }), h('div', { class: 'pane-actions' }, vBtns)),
          frame),
        out.el)));
  update();
  return el;
}

// ---------- kerangka: borang → satu/beberapa fail ----------
export function formTool(cfg) {
  const { fields, build, preview, sectionTitles } = cfg;
  const err = h('ul', { class: 'alert alert-error', role: 'alert', hidden: true });
  const warn = h('ul', { class: 'alert alert-warn', hidden: true });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const out = outputPane({ label: 'ui.output' });
  const pv = preview ? h('div', { class: 'pane preview-pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.preview' })), h('div', { class: 'preview-body' })) : null;
  const zipBtn = btn('file-down', 'ui.downloadZip', { onclick: () => {
    if (!files.length) return;
    downloadBlob(makeZip(files.map((f) => ({ name: f.name, data: f.content }))), cfg.zipName || 'files.zip'); toast('toast.downloaded');
  } });
  let files = [], active = 0;
  const ctl = controls(fields, update);
  function showFile(i) {
    active = i;
    const f = files[i];
    out.set(f ? f.content : '', f?.lang); if (f) out.setFile(f.name, f.mime);
    [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
  }
  function update() {
    const v = ctl.values();
    const r = build(v);
    files = r.files || [];
    const errs = r.errors || [];
    err.hidden = !errs.length;
    err.replaceChildren(...errs.map((e) => h('li', { i18n: e.key, i18nArgs: e.args })));
    const ws = r.warnings || [];
    warn.hidden = !ws.length;
    warn.replaceChildren(...ws.map((e) => h('li', { i18n: e.key, i18nArgs: e.args })));
    tabs.replaceChildren(...files.map((f, i) => h('button', { type: 'button', role: 'tab', class: 'tab', onclick: () => showFile(i) }, f.name)));
    tabs.hidden = files.length < 2; zipBtn.hidden = files.length < 2;
    showFile(Math.min(active, Math.max(files.length - 1, 0)));
    if (pv) { const body = pv.querySelector('.preview-body'); body.replaceChildren(preview(v) || ''); }
  }
  const el = h('div', { class: 'tool tool-form' },
    h('div', { class: 'form-grid' },
      h('div', { class: 'form-side pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.settings' })), ctl.el),
      h('div', { class: 'form-main' }, pv, err, warn, tabs, out.el, h('div', { class: 'toolbar' }, zipBtn))));
  update();
  return Object.assign(el, { _ctl: ctl, _update: update });
}

/** Kotak mudah untuk keputusan "label: nilai" dengan butang salin. */
export function resultRow(labelKey, value, { mono = true } = {}) {
  const b = btn('copy', null, { aria: 'ui.copy', cls: 'btn-icon', onclick: async () => toast((await copyText(String(value))) ? 'toast.copied' : 'toast.copyFailed') });
  return h('div', { class: 'result-row' },
    h('span', { class: 'result-label', i18n: labelKey }),
    h('code', { class: mono ? 'result-value' : 'result-value plain', dir: 'ltr' }, String(value)), b);
}

export { h, icon, t, toast, copyText, downloadText, downloadBlob, highlight, debounce, byteSize, fmtBytes };

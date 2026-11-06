import { h, icon, btn, field, controls, outputPane, errorBox, resultRow, transformTool, ToolError, copyText, toast, debounce, byteSize, fmtBytes } from './lib/ui.js';
import { randomInt } from './lib/color.js';
import { jsonError, parseXml } from './lib/formatters.js';
import { b64Decode } from './lib/convert.js';
import { clear, setT } from '../utils/dom.js';
import { getLang, LANGS } from '../i18n/i18n.js';

const hasCrypto = !!(globalThis.crypto && crypto.getRandomValues);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- UUID ----------
function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; return bytesToUuid(b);
}
function uuidV7() {
  const b = crypto.getRandomValues(new Uint8Array(16)); let t = BigInt(Date.now());
  for (let i = 5; i >= 0; i--) { b[i] = Number(t & 0xffn); t >>= 8n; }
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80; return bytesToUuid(b);
}
const bytesToUuid = (b) => { const x = [...b].map((v) => v.toString(16).padStart(2, '0')).join(''); return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`; };

// ---------- masa ----------
const fmtTz = (d, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'long', hourCycle: 'h23' }).format(d);
function relative(d) {
  const diff = (d.getTime() - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat(LANGS[getLang()].locale + '-u-nu-latn', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [u, s] of units) if (Math.abs(diff) >= s || u === 'second') return rtf.format(Math.round(diff / s), u);
  return '';
}
function tsRows(d) {
  const ms = d.getTime();
  return [['ui.ts_iso', d.toISOString()], ['ui.ts_rfc', d.toUTCString()], ['ui.ts_myt', fmtTz(d, 'Asia/Kuala_Lumpur')], ['ui.ts_local', `${fmtTz(d, Intl.DateTimeFormat().resolvedOptions().timeZone)} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`],
    ['ui.ts_relative', relative(d)], ['ui.ts_seconds', String(Math.floor(ms / 1000))], ['ui.ts_millis', String(ms)]];
}
const TZ_OPTS = [{ v: 'myt', l: 'ui.tzMyt' }, { v: 'utc', l: 'UTC', raw: true }, { v: 'local', l: 'ui.tzLocal' }];
function partsToMs(p, tz) {
  if (tz === 'myt') return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - 8 * 3600000;
  if (tz === 'utc') return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return new Date(p.y, p.mo - 1, p.d, p.h, p.mi, p.s).getTime();
}
function liveClock() {
  const sec = h('code', { dir: 'ltr' }), ms = h('code', { dir: 'ltr' });
  const box = h('div', { class: 'pane live-clock' }, h('span', { class: 'result-label', i18n: 'ui.nowEpoch' }), sec, ms);
  const tick = () => { if (!box.isConnected && box._started) { clearInterval(box._t); return; } box._started = true; const n = Date.now(); sec.textContent = String(Math.floor(n / 1000)); ms.textContent = `${n} ms`; };
  box._t = setInterval(tick, 1000); tick();
  return box;
}

// ---------- pengesah ----------
function validatorTool({ inLang, sample, check, accept }) {
  const input = h('textarea', { class: 'code-input', spellcheck: 'false', ph: 'ui.inputPh', aria: 'ui.input', dir: 'ltr' });
  const status = h('div', { class: 'status', hidden: true }), issues = h('ul', { class: 'issues' }), info = h('div', { class: 'stats-row' });
  const run = () => {
    const src = input.value; clear(issues); clear(info);
    if (!src.trim()) { status.hidden = true; return; }
    const r = check(src); status.hidden = false;
    status.className = `status ${r.ok ? 'ok' : 'bad'}`;
    status.replaceChildren(icon(r.ok ? 'circle-check' : 'circle-alert', 20), h('strong', { i18n: r.ok ? 'ui.valid' : 'ui.invalid' }));
    r.issues.forEach((i) => issues.append(h('li', { class: `issue ${i.level}` }, icon(i.level === 'error' ? 'circle-alert' : 'triangle-alert', 16), h('span', { i18n: i.key, i18nArgs: i.args }))));
    (r.info || []).forEach(([k, v]) => info.append(h('div', { class: 'stat-chip' }, h('span', { i18n: k }), h('strong', {}, String(v)))));
  };
  input.addEventListener('input', debounce(run, 300));
  return h('div', { class: 'tool' }, h('div', { class: 'toolbar' }, btn('play', 'ui.validate', { variant: 'primary', onclick: run }), btn('file-text', 'ui.sample', { onclick: () => { input.value = sample; run(); } }), btn('trash-2', 'ui.clear', { onclick: () => { input.value = ''; run(); } })),
    h('div', { class: 'split' }, h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.input' })), input), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.result' })), status, issues, info)));
}

const depthOf = (v) => (v && typeof v === 'object' ? 1 + Math.max(0, ...Object.values(v).map(depthOf)) : 0);
const lineAt = (s, i) => s.slice(0, i).split('\n').length;

function checkHtml(src) {
  const issues = []; const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const re = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const OPT = new Set('p li dt dd tr td th thead tbody tfoot option optgroup colgroup caption rt rp html head body'.split(' '));
  const stack = []; const ids = new Map(); let m; let tags = 0, hasTitle = false, hasLang = false;
  const add = (level, key, args) => issues.push({ level, key, args });
  if (!/^\s*<!doctype html/i.test(src)) add('warn', 'val.noDoctype');
  while ((m = re.exec(src))) {
    if (m[3] === undefined && m[1] === undefined) continue;
    const line = lineAt(src, m.index);
    if (m[1]) { tags++; const nm = m[1].toLowerCase(); if (nm === 'script' || nm === 'style') { } continue; }
    const closing = m[2] === '/', name = m[3].toLowerCase(), attrs = m[4] || '';
    if (!closing) {
      tags++;
      if (name === 'html' && /\blang\s*=/.test(attrs)) hasLang = true;
      if (name === 'title') hasTitle = true;
      if (name === 'img' && !/\balt\s*=/.test(attrs)) add('warn', 'val.imgAlt', { line });
      if (['font', 'center', 'marquee', 'blink', 'big'].includes(name)) add('warn', 'val.deprecated', { tag: name, line });
      const idm = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/.exec(attrs);
      if (idm) { const id = idm[1] ?? idm[2] ?? idm[3]; if (ids.has(id)) add('error', 'val.dupId', { id, line }); else ids.set(id, line); }
      if (!VOID.has(name) && !/\/\s*$/.test(attrs)) stack.push({ name, line });
    } else if (!VOID.has(name)) {
      const top = stack[stack.length - 1];
      if (top && top.name === name) stack.pop();
      else if (stack.some((s) => s.name === name)) { while (stack.length && stack[stack.length - 1].name !== name) { const u = stack.pop(); if (!OPT.has(u.name)) add('error', 'val.unclosed', { tag: u.name, line: u.line }); } stack.pop(); }
      else add('error', 'val.stray', { tag: name, line });
    }
  }
  stack.forEach((u) => { if (!OPT.has(u.name)) add('error', 'val.unclosed', { tag: u.name, line: u.line }); });
  if (/<html\b/i.test(src) && !hasLang) add('warn', 'val.noLang');
  if (/<head\b/i.test(src) && !hasTitle) add('warn', 'val.noTitle');
  issues.push({ level: 'warn', key: 'val.htmlNote' });
  return { ok: !issues.some((i) => i.level === 'error'), issues, info: [['ui.tags', tags], ['ui.ids', ids.size], ['ui.lines', src.split('\n').length]] };
}

// ---------- JWT ----------
function b64urlJson(part) {
  try { return JSON.parse(b64Decode(part)); } catch { throw new ToolError('err.jwtPart'); }
}

// ---------- worker regex ----------
const WORKER_SRC = `self.onmessage=function(e){var d=e.data;try{var fl=d.flags.indexOf('g')<0?d.flags+'g':d.flags;var re=new RegExp(d.pattern,fl);var out=[],n=0;for(var m of d.text.matchAll(re)){out.push({i:m.index,t:m[0],g:Array.prototype.slice.call(m,1),n:m.groups||null});if(++n>=1000)break}var rep=null;if(d.replace!==null){rep=d.text.replace(new RegExp(d.pattern,fl),d.replace)}self.postMessage({ok:true,matches:out,rep:rep,capped:n>=1000})}catch(err){self.postMessage({ok:false,msg:String(err.message)})}}`;

function counters(primary) {
  const input = h('textarea', { class: 'code-input tall', spellcheck: 'false', ph: 'ui.typeHere', aria: 'ui.input' });
  const grid = h('div', { class: 'counter-grid' }), extra = h('div', { class: 'pane extra' });
  const seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(getLang(), { granularity: 'word' }) : null;
  const update = () => {
    const s = input.value;
    const words = (seg ? [...seg.segment(s)].filter((x) => x.isWordLike).map((x) => x.segment) : s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []);
    const chars = [...s].length, noSpace = [...s.replace(/\s/g, '')].length;
    const lines = s ? s.split(/\r?\n/) : [], nonEmpty = lines.filter((l) => l.trim()).length;
    const sentences = (s.match(/[^.!?؟\n]+[.!?؟]+(\s|$)|[^.!?؟\n]+$/gm) || []).filter((x) => x.trim()).length;
    const paragraphs = s.split(/\n\s*\n/).filter((x) => x.trim()).length;
    const stats = { words: words.length, chars, noSpace, lines: lines.length, sentences, paragraphs, bytes: byteSize(s), reading: Math.max(s.trim() ? 1 : 0, Math.ceil(words.length / 200)) };
    const order = { words: ['words', 'chars', 'noSpace', 'sentences', 'paragraphs', 'lines', 'reading', 'bytes'], chars: ['chars', 'noSpace', 'words', 'lines', 'bytes', 'sentences', 'paragraphs', 'reading'], lines: ['lines', 'words', 'chars', 'paragraphs', 'sentences', 'noSpace', 'bytes', 'reading'] }[primary];
    grid.replaceChildren(...order.map((k, i) => h('div', { class: `counter ${i === 0 ? 'primary' : ''}` }, h('strong', {}, String(stats[k])), h('span', { i18n: `ui.c_${k}` }))));
    clear(extra);
    if (primary === 'words') {
      const f = new Map(); words.map((w) => w.toLowerCase()).filter((w) => w.length > 3).forEach((w) => f.set(w, (f.get(w) || 0) + 1));
      const top = [...f.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      extra.append(h('h3', { i18n: 'ui.topWords' }), top.length ? h('ul', { class: 'kw-list' }, top.map(([w, n]) => h('li', {}, h('span', { dir: 'auto' }, w), h('strong', {}, String(n))))) : h('p', { class: 'muted' }, '—'));
    } else if (primary === 'chars') {
      const letters = (s.match(/\p{L}/gu) || []).length, digits = (s.match(/\p{N}/gu) || []).length, spaces = (s.match(/\s/g) || []).length, punct = (s.match(/\p{P}/gu) || []).length;
      extra.append(h('h3', { i18n: 'ui.breakdown' }), h('ul', { class: 'kw-list' }, [['ui.c_letters', letters], ['ui.c_digits', digits], ['ui.c_spaces', spaces], ['ui.c_punct', punct]].map(([k, n]) => h('li', {}, h('span', { i18n: k }), h('strong', {}, String(n))))));
    } else {
      const longest = lines.reduce((a, l) => Math.max(a, [...l].length), 0);
      extra.append(h('h3', { i18n: 'ui.breakdown' }), h('ul', { class: 'kw-list' }, [['ui.c_nonEmpty', nonEmpty], ['ui.c_blank', lines.length - nonEmpty], ['ui.c_longest', longest]].map(([k, n]) => h('li', {}, h('span', { i18n: k }), h('strong', {}, String(n))))));
    }
  };
  input.addEventListener('input', update); update();
  return h('div', { class: 'tool' }, grid, h('div', { class: 'split' }, h('div', { class: 'pane' }, input, h('div', { class: 'toolbar' }, btn('trash-2', 'ui.clear', { onclick: () => { input.value = ''; update(); input.focus(); } }))), extra));
}

const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc gravida'.split(' ');

export const tools = {
  'uuid-generator': () => {
    const ctl = controls([{ key: 'ver', type: 'select', label: 'ui.version', value: 'v4', options: [{ v: 'v4', l: 'UUID v4 (random)', raw: true }, { v: 'v7', l: 'UUID v7 (time-ordered)', raw: true }] }, { key: 'n', type: 'range', label: 'ui.count', min: 1, max: 100, value: 5 },
      { key: 'upper', type: 'checkbox', label: 'ui.uppercase', value: false }, { key: 'dash', type: 'checkbox', label: 'ui.hyphens', value: true }], () => gen());
    const out = outputPane({ filename: 'uuids.txt', label: 'ui.output' }), err = errorBox();
    const gen = () => {
      if (!hasCrypto) { err.show(new ToolError('err.noCrypto')); return; }
      const v = ctl.values(); const l = Array.from({ length: v.n }, () => { let u = v.ver === 'v7' ? uuidV7() : uuidV4(); if (!v.dash) u = u.replace(/-/g, ''); return v.upper ? u.toUpperCase() : u; });
      out.set(l.join('\n')); err.hide();
    };
    const el = h('div', { class: 'tool' }, ctl.el, h('div', { class: 'toolbar' }, btn('refresh-cw', 'ui.generate', { variant: 'primary', onclick: gen })), err.el, out.el);
    gen(); return el;
  },

  'password-generator': () => {
    const SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~' };
    const ctl = controls([{ key: 'len', type: 'range', label: 'ui.length', min: 4, max: 128, value: 20 }, { key: 'upper', type: 'checkbox', label: 'ui.pwUpper', value: true }, { key: 'lower', type: 'checkbox', label: 'ui.pwLower', value: true },
      { key: 'digits', type: 'checkbox', label: 'ui.pwDigits', value: true }, { key: 'symbols', type: 'checkbox', label: 'ui.pwSymbols', value: true }, { key: 'noamb', type: 'checkbox', label: 'ui.pwNoAmbiguous', value: false }], () => gen());
    const pw = h('code', { class: 'pw', dir: 'ltr' }), meter = h('div', { class: 'meter' }, h('span')), meterLabel = h('strong'), meterBits = h('span', { class: 'muted' }), err = errorBox();
    let shown = true, cur = '';
    const eye = btn('eye', null, { aria: 'ui.toggleVisibility', cls: 'btn-icon', onclick: () => { shown = !shown; paint(); } });
    const paint = () => { pw.textContent = shown ? cur : '•'.repeat(cur.length); };
    function gen() {
      const v = ctl.values(); const amb = /[Il1O0o]/g;
      const classes = ['upper', 'lower', 'digits', 'symbols'].filter((k) => v[k]).map((k) => (v.noamb ? SETS[k].replace(amb, '') : SETS[k]));
      if (!classes.length) { err.show(new ToolError('err.pwNoClass')); cur = ''; paint(); return; }
      err.hide();
      const pool = classes.join(''); const chars = classes.map((c) => c[randomInt(c.length)]);
      while (chars.length < v.len) chars.push(pool[randomInt(pool.length)]);
      cur = shuffle(chars).slice(0, v.len).join(''); paint();
      const bits = Math.round(v.len * Math.log2(pool.length)); const lvl = bits < 40 ? 0 : bits < 60 ? 1 : bits < 90 ? 2 : 3;
      meter.dataset.level = lvl; meter.firstChild.style.width = `${Math.min(100, (bits / 128) * 100)}%`;
      setT(meterLabel, `ui.strength${lvl}`); meterLabel.dataset.bits = bits; meterBits.textContent = ` · ~${bits} bit`;
    }
    const el = h('div', { class: 'tool' }, ctl.el, !hasCrypto ? h('div', { class: 'alert alert-warn' }, icon('triangle-alert', 16), h('span', { i18n: 'err.noCryptoPw' })) : null, err.el,
      h('div', { class: 'pane pw-box' }, h('div', { class: 'pw-row' }, pw, eye, btn('copy', null, { aria: 'ui.copy', cls: 'btn-icon', onclick: async () => { if (cur) toast((await copyText(cur)) ? 'toast.copied' : 'toast.copyFailed'); } })), meter, h('div', { class: 'meter-label' }, meterLabel, meterBits),
        h('div', { class: 'toolbar' }, btn('refresh-cw', 'ui.generate', { variant: 'primary', onclick: gen })), h('p', { class: 'muted', i18n: 'ui.pwNotStored' })));
    gen(); return el;
  },

  'lorem-ipsum': () => {
    const ctl = controls([{ key: 'unit', type: 'select', label: 'ui.unit', value: 'p', options: [{ v: 'p', l: 'ui.u_paragraphs' }, { v: 's', l: 'ui.u_sentences' }, { v: 'w', l: 'ui.u_words' }] }, { key: 'n', type: 'range', label: 'ui.count', min: 1, max: 50, value: 3 },
      { key: 'classic', type: 'checkbox', label: 'ui.startLorem', value: true }, { key: 'html', type: 'checkbox', label: 'ui.wrapP', value: false }], () => gen());
    const out = outputPane({ filename: 'lorem.txt', label: 'ui.output' });
    const words = (n) => Array.from({ length: n }, () => LOREM[randomInt(LOREM.length)]);
    const sentence = (first) => { const w = first ? ['lorem', 'ipsum', 'dolor', 'sit', 'amet', ...words(3 + randomInt(6))] : words(6 + randomInt(10)); const s = w.join(' '); return s[0].toUpperCase() + s.slice(1) + '.'; };
    function gen() {
      const v = ctl.values(); let txt;
      if (v.unit === 'w') { const w = v.classic ? ['lorem', 'ipsum', ...words(Math.max(v.n - 2, 0))] : words(v.n); txt = w.slice(0, v.n).join(' '); }
      else if (v.unit === 's') txt = Array.from({ length: v.n }, (_, i) => sentence(v.classic && i === 0)).join(' ');
      else { const ps = Array.from({ length: v.n }, (_, i) => Array.from({ length: 3 + randomInt(4) }, (_, j) => sentence(v.classic && i === 0 && j === 0)).join(' ')); txt = v.html ? ps.map((p) => `<p>${p}</p>`).join('\n') : ps.join('\n\n'); }
      out.set(txt, v.html && v.unit === 'p' ? 'html' : 'txt');
    }
    const el = h('div', { class: 'tool' }, ctl.el, h('div', { class: 'toolbar' }, btn('refresh-cw', 'ui.generate', { variant: 'primary', onclick: gen })), out.el);
    gen(); return el;
  },

  'timestamp-converter': () => {
    const input = h('input', { type: 'text', class: 'big-input', value: String(Math.floor(Date.now() / 1000)), dir: 'ltr', aria: 'ui.timestamp', inputmode: 'numeric', spellcheck: 'false' });
    const rows = h('div', { class: 'results' }), err = errorBox(); const hint = h('p', { class: 'muted' });
    const upd = () => {
      const raw = input.value.trim();
      if (/^-?\d+(\.\d+)?$/.test(raw)) {
        const n = Number(raw), a = Math.abs(n); const unit = a >= 1e17 ? 'ns' : a >= 1e14 ? 'µs' : a >= 1e11 ? 'ms' : 's';
        const ms = unit === 'ns' ? n / 1e6 : unit === 'µs' ? n / 1e3 : unit === 'ms' ? n : n * 1000; const d = new Date(ms);
        if (Number.isNaN(d.getTime())) { err.show(new ToolError('err.tsRange')); clear(rows); return; }
        err.hide(); setT(hint, 'ui.detectedUnit', { unit });
        rows.replaceChildren(...tsRows(d).map(([k, v]) => resultRow(k, v, { mono: k !== 'ui.ts_relative' })));
      } else {
        const ms = Date.parse(raw); if (!raw || Number.isNaN(ms)) { err.show(new ToolError('err.tsInvalid')); clear(rows); return; }
        err.hide(); hint.textContent = ''; delete hint.dataset.i18n; rows.replaceChildren(...tsRows(new Date(ms)).map(([k, v]) => resultRow(k, v)));
      }
    };
    input.addEventListener('input', upd);
    const el = h('div', { class: 'tool' }, liveClock(), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.tsInput' }), btn('clock', 'ui.useNow', { onclick: () => { input.value = String(Math.floor(Date.now() / 1000)); upd(); } })), input, hint, err.el), h('div', { class: 'pane' }, rows));
    upd(); return el;
  },

  'epoch-converter': () => {
    const unitSel = field({ key: 'unit', type: 'select', label: 'ui.unit', value: 's', options: [{ v: 's', l: 'ui.seconds' }, { v: 'ms', l: 'ui.millis' }, { v: 'us', l: 'ui.micros' }, { v: 'ns', l: 'ui.nanos' }] });
    const epoch = h('input', { type: 'text', class: 'big-input', value: String(Math.floor(Date.now() / 1000)), dir: 'ltr', inputmode: 'numeric', 'aria-label': 'Epoch', spellcheck: 'false' });
    const rowsA = h('div', { class: 'results' }), errA = errorBox();
    const now = new Date();
    const mk = (k, label, v, min, max) => field({ key: k, type: 'number', label, value: v, min, max });
    const fs = { y: mk('y', 'ui.year', now.getFullYear(), 1970, 9999), mo: mk('mo', 'ui.month', now.getMonth() + 1, 1, 12), d: mk('d', 'ui.day', now.getDate(), 1, 31), h: mk('h', 'ui.hour', now.getHours(), 0, 23), mi: mk('mi', 'ui.minute', now.getMinutes(), 0, 59), s: mk('s', 'ui.second', now.getSeconds(), 0, 59) };
    const tzSel = field({ key: 'tz', type: 'select', label: 'ui.timezone', value: 'myt', options: TZ_OPTS });
    const rowsB = h('div', { class: 'results' }), errB = errorBox();
    const updA = () => {
      const raw = epoch.value.trim();
      if (!/^-?\d+$/.test(raw)) { errA.show(new ToolError('err.epochInt')); clear(rowsA); return; }
      const big = BigInt(raw), div = { s: 0.001, ms: 1, us: 1000, ns: 1e6 }[unitSel.get()];
      const ms = unitSel.get() === 's' ? Number(big) * 1000 : unitSel.get() === 'ms' ? Number(big) : Number(big / BigInt(div)); const d = new Date(ms);
      if (Number.isNaN(d.getTime())) { errA.show(new ToolError('err.tsRange')); clear(rowsA); return; }
      errA.hide(); rowsA.replaceChildren(...tsRows(d).slice(0, 5).map(([k, v]) => resultRow(k, v, { mono: k !== 'ui.ts_relative' })));
    };
    const updB = () => {
      const p = Object.fromEntries(Object.entries(fs).map(([k, f]) => [k, f.get()]));
      if (Object.values(p).some((x) => !Number.isFinite(x))) { errB.show(new ToolError('err.dateParts')); clear(rowsB); return; }
      const dim = new Date(Date.UTC(p.y, p.mo, 0)).getUTCDate();
      if (p.d > dim || p.d < 1 || p.mo < 1 || p.mo > 12 || p.h > 23 || p.mi > 59 || p.s > 59) { errB.show(new ToolError('err.dateParts')); clear(rowsB); return; }
      const ms = partsToMs(p, tzSel.get()); errB.hide();
      rowsB.replaceChildren(resultRow('ui.ts_seconds', Math.floor(ms / 1000)), resultRow('ui.ts_millis', ms), resultRow('ui.micros', `${ms}000`), resultRow('ui.nanos', `${ms}000000`), resultRow('ui.ts_iso', new Date(ms).toISOString()));
    };
    epoch.addEventListener('input', updA); unitSel.input.addEventListener('change', updA);
    [...Object.values(fs), tzSel].forEach((f) => f.input.addEventListener('input', updB));
    const el = h('div', { class: 'tool' }, liveClock(),
      h('div', { class: 'split' },
        h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.epochToDate' })), unitSel.el, epoch, errA.el, rowsA),
        h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.dateToEpoch' })), h('div', { class: 'controls' }, ...Object.values(fs).map((f) => f.el), tzSel.el), errB.el, rowsB)));
    updA(); updB(); return el;
  },

  'regex-tester': () => {
    const pat = h('input', { type: 'text', class: 'big-input mono', value: '(\\w+)@(\\w+)\\.com', dir: 'ltr', spellcheck: 'false', aria: 'ui.pattern', autocomplete: 'off' });
    const flagDefs = ['g', 'i', 'm', 's', 'u'].map((f) => ({ f, el: h('input', { type: 'checkbox', checked: f === 'g', 'aria-label': `flag ${f}`, onchange: () => run() }) }));
    const text = h('textarea', { class: 'code-input', spellcheck: 'false', dir: 'ltr', aria: 'ui.testText' }); text.value = 'ali@contoh.com, siti@genius.com, bukan-emel';
    const rep = h('input', { type: 'text', dir: 'ltr', ph: 'ui.replaceWith', spellcheck: 'false', aria: 'ui.replaceWith' });
    const err = errorBox(), hl = h('pre', { class: 'code-view hl', dir: 'ltr' }), list = h('div', { class: 'results' }), count = h('div', { class: 'muted' }), repOut = outputPane({ filename: 'replaced.txt', label: 'ui.replaceResult' });
    let worker, timer;
    const run = () => {
      clearTimeout(timer); worker?.terminate();
      const flags = flagDefs.filter((x) => x.el.checked).map((x) => x.f).join('');
      if (!pat.value) { hl.textContent = text.value; clear(list); count.textContent = ''; delete count.dataset.i18n; err.hide(); repOut.set(''); return; }
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      timer = setTimeout(() => { worker.terminate(); err.show(new ToolError('err.regexTimeout')); }, 1500);
      worker.onmessage = (e) => {
        clearTimeout(timer); const r = e.data; worker.terminate();
        if (!r.ok) { err.show(new ToolError('err.regex', { msg: r.msg })); return; }
        err.hide();
        const frag = document.createDocumentFragment(); let last = 0; const s = text.value;
        r.matches.forEach((m) => { frag.append(s.slice(last, m.i)); const mk = h('mark', {}, m.t); frag.append(mk); last = m.i + m.t.length; });
        frag.append(s.slice(last)); hl.replaceChildren(frag);
        setT(count, 'ui.matchCount', { n: r.matches.length + (r.capped ? '+' : '') });
        list.replaceChildren(...r.matches.slice(0, 100).map((m, i) => h('div', { class: 'match' }, h('span', { class: 'idx' }, `#${i + 1} @${m.i}`), h('code', { dir: 'ltr' }, m.t || '∅'), ...m.g.map((g, gi) => h('span', { class: 'grp', dir: 'ltr' }, `$${gi + 1}: ${g === undefined ? 'undefined' : g}`)))));
        repOut.set(r.rep ?? '');
      };
      worker.onerror = () => { clearTimeout(timer); err.show(new ToolError('err.regex', { msg: 'Worker' })); };
      worker.postMessage({ pattern: pat.value, flags, text: text.value, replace: rep.value ? rep.value : null });
    };
    const d = debounce(run, 250); [pat, text, rep].forEach((x) => x.addEventListener('input', d));
    const el = h('div', { class: 'tool' }, h('div', { class: 'pane' }, h('div', { class: 'regex-row' }, h('span', { class: 'slash' }, '/'), pat, h('span', { class: 'slash' }, '/'), h('div', { class: 'flags' }, flagDefs.map((x) => h('label', { class: 'flag' }, x.el, h('span', {}, x.f))))), err.el),
      h('div', { class: 'split' }, h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.testText' })), text, rep), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.highlighted' })), hl, count)),
      h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.matches' })), list), repOut.el);
    run(); return el;
  },

  'json-validator': () => validatorTool({ sample: '{"nama": "CodeLab", "alat": [1, 2, 3,], "aktif": true}',
    check: (src) => {
      try { const v = JSON.parse(src); const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
        return { ok: true, issues: [], info: [['ui.type', t], [Array.isArray(v) ? 'ui.items' : 'ui.keys', v && typeof v === 'object' ? Object.keys(v).length : 0], ['ui.depth', depthOf(v)], ['ui.size', fmtBytes(byteSize(src))]] };
      } catch (e) { const er = jsonError(src, e); return { ok: false, issues: [{ level: 'error', key: er.key, args: er.args }] }; }
    } }),
  'html-validator': () => validatorTool({ sample: '<html>\n<head></head>\n<body>\n  <div id="a"><p>Teks\n  <img src="x.png">\n  <div id="a"></div>\n</body>\n</html>', check: checkHtml }),
  'xml-validator': () => validatorTool({ sample: '<?xml version="1.0"?>\n<katalog>\n  <alat id="1">HTML</alat>\n  <alat id="2">CSS\n</katalog>',
    check: (src) => {
      try { const d = parseXml(src); const all = d.getElementsByTagName('*'); let attrs = 0, depth = 0; for (const e of all) { attrs += e.attributes.length; let n = 0, p = e; while (p.parentElement) { n++; p = p.parentElement; } depth = Math.max(depth, n + 1); }
        return { ok: true, issues: [], info: [['ui.rootEl', d.documentElement.nodeName], ['ui.elements', all.length], ['ui.attrs', attrs], ['ui.depth', depth]] };
      } catch (e) { return { ok: false, issues: [{ level: 'error', key: e.key || 'err.invalidXml', args: e.args || { msg: e.message, loc: '-' } }] }; }
    } }),

  'jwt-decoder': () => {
    const input = h('textarea', { class: 'code-input', spellcheck: 'false', ph: 'ui.jwtPh', 'aria-label': 'JWT', dir: 'ltr' });
    const err = errorBox(), warn = h('div', { class: 'alert alert-warn' }, icon('shield', 16), h('span', { i18n: 'ui.jwtNotVerified' }));
    const header = outputPane({ lang: 'json', filename: 'header.json', mime: 'application/json', label: 'ui.jwtHeader' }), payload = outputPane({ lang: 'json', filename: 'payload.json', mime: 'application/json', label: 'ui.jwtPayload' });
    const sig = h('code', { class: 'sig', dir: 'ltr' }), claims = h('div', { class: 'results' }), notes = h('ul', { class: 'issues' });
    const run = () => {
      const tok = input.value.trim().replace(/^Bearer\s+/i, ''); clear(claims); clear(notes);
      if (!tok) { header.set(''); payload.set(''); sig.textContent = ''; err.hide(); return; }
      try {
        const parts = tok.split('.'); if (parts.length !== 3) throw new ToolError('err.jwtParts');
        const hd = b64urlJson(parts[0]), pl = b64urlJson(parts[1]);
        header.set(JSON.stringify(hd, null, 2)); payload.set(JSON.stringify(pl, null, 2)); sig.textContent = parts[2] || '(empty)'; err.hide();
        const now = Date.now() / 1000;
        [['exp', 'ui.jwt_exp'], ['iat', 'ui.jwt_iat'], ['nbf', 'ui.jwt_nbf']].forEach(([k, lab]) => { if (typeof pl[k] === 'number') claims.append(resultRow(lab, `${new Date(pl[k] * 1000).toISOString()} · ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date(pl[k] * 1000))} MYT`)); });
        if (typeof pl.exp === 'number') notes.append(h('li', { class: `issue ${pl.exp < now ? 'error' : 'ok'}` }, icon(pl.exp < now ? 'circle-alert' : 'circle-check', 16), h('span', { i18n: pl.exp < now ? 'ui.jwtExpired' : 'ui.jwtNotExpired' })));
        if (typeof pl.nbf === 'number' && pl.nbf > now) notes.append(h('li', { class: 'issue warn' }, icon('triangle-alert', 16), h('span', { i18n: 'ui.jwtNotYet' })));
        if (String(hd.alg).toLowerCase() === 'none') notes.append(h('li', { class: 'issue error' }, icon('circle-alert', 16), h('span', { i18n: 'ui.jwtAlgNone' })));
      } catch (e) { header.set(''); payload.set(''); sig.textContent = ''; err.show(e); }
    };
    input.addEventListener('input', debounce(run, 250));
    const sampleTok = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFpc3lhaCIsImlhdCI6MTc2MjQwMDAwMCwiZXhwIjoxNzYyNDg2NDAwfQ.c2lnbmF0dXJlLWNvbnRvaC1zYWhhamE';
    return h('div', { class: 'tool' }, warn, h('div', { class: 'toolbar' }, btn('file-text', 'ui.sample', { onclick: () => { input.value = sampleTok; run(); } }), btn('trash-2', 'ui.clear', { onclick: () => { input.value = ''; run(); } })),
      h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.jwtToken' })), input), err.el, notes, claims,
      h('div', { class: 'split' }, header.el, payload.el), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.jwtSignature' })), sig));
  },

  'url-parser': () => {
    const input = h('input', { type: 'text', class: 'big-input', value: 'https://user:pass@www.contoh.my:8080/alat/format?kata=html&tema=cerah&tema=gelap#bahagian-2', dir: 'ltr', spellcheck: 'false', 'aria-label': 'URL' });
    const rows = h('div', { class: 'results' }), params = h('div', { class: 'results' }), err = errorBox();
    const run = () => {
      clear(rows); clear(params); let u;
      try { u = new URL(input.value.trim()); } catch { err.show(new ToolError('err.url')); return; }
      err.hide();
      [['protocol', u.protocol], ['username', decodeURIComponent(u.username)], ['password', u.password ? '••••' : ''], ['host', u.host], ['hostname', u.hostname], ['port', u.port || '(default)'], ['pathname', u.pathname], ['search', u.search], ['hash', u.hash], ['origin', u.origin]]
        .forEach(([k, v]) => rows.append(resultRow(`ui.u_${k}`, v || '—')));
      [...u.searchParams.entries()].forEach(([k, v]) => params.append(h('div', { class: 'result-row' }, h('code', { class: 'result-label mono' }, k), h('code', { class: 'result-value', dir: 'ltr' }, v))));
      if (!params.children.length) params.append(h('p', { class: 'muted', i18n: 'ui.noParams' }));
    };
    input.addEventListener('input', run);
    const el = h('div', { class: 'tool' }, h('div', { class: 'pane' }, input, err.el), h('div', { class: 'split' }, h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.urlParts' })), rows), h('div', { class: 'pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.queryParams' })), params)));
    run(); return el;
  },

  'query-parser': () => transformTool({ inLang: 'txt', outLang: 'json', ext: 'json', mime: 'application/json', action: 'ui.convert',
    options: [{ key: 'mode', type: 'select', label: 'ui.mode', value: 'parse', options: [{ v: 'parse', l: 'ui.qParse' }, { v: 'build', l: 'ui.qBuild' }] }],
    sample: '?kata=html&tema=cerah&tema=gelap&q=alat%20web',
    run: (s, o) => {
      if (o.mode === 'parse') {
        let q = s.trim(); const qi = q.indexOf('?'); if (qi >= 0) q = q.slice(qi + 1); q = q.split('#')[0];
        const out = {}; for (const [k, v] of new URLSearchParams(q)) { if (k in out) out[k] = [].concat(out[k], v); else out[k] = v; }
        return JSON.stringify(out, null, 2);
      }
      let obj; try { obj = JSON.parse(s); } catch (e) { throw jsonError(s, e); }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ToolError('err.needObject');
      const sp = new URLSearchParams(); Object.entries(obj).forEach(([k, v]) => [].concat(v).forEach((x) => sp.append(k, x !== null && typeof x === 'object' ? JSON.stringify(x) : String(x))));
      return sp.toString();
    } }),

  'word-counter': () => counters('words'),
  'char-counter': () => counters('chars'),
  'line-counter': () => counters('lines'),
};

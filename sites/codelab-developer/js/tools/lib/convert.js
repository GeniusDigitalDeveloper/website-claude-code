// Fungsi penukaran data (tulen, tiada kesan sampingan DOM kecuali pengurai XML).
import { ToolError } from './ui.js';
import { parseXml, jsonError } from './formatters.js';

// ---------- CSV ----------
export function parseCsv(text, delim = ',') {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (q) throw new ToolError('err.csvQuote');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function toCsv(rows, delim = ',', safe = false) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (safe && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /["\n\r]/.test(s) || s.includes(delim) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(delim)).join('\n');
}

const infer = (s) => { if (s === '') return s; if (/^-?\d+(\.\d+)?$/.test(s) && !/^0\d/.test(s)) return Number(s); if (s === 'true') return true; if (s === 'false') return false; if (s === 'null') return null; return s; };

export function csvToJson(text, { delim, header, types, indent }) {
  const d = delim === 'tab' ? '\t' : delim;
  const rows = parseCsv(text, d);
  if (!rows.length) return '[]';
  let data;
  if (header) {
    const keys = rows[0].map((k, i) => k.trim() || `column${i + 1}`);
    data = rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, types ? infer(r[i] ?? '') : (r[i] ?? '')])));
  } else data = rows.map((r) => r.map((c) => (types ? infer(c) : c)));
  return JSON.stringify(data, null, indent);
}

const flatten = (o, p = '', out = {}) => {
  if (Array.isArray(o) || o === null || typeof o !== 'object') { out[p] = o; return out; }
  const ks = Object.keys(o);
  if (!ks.length) { out[p] = ''; return out; }
  ks.forEach((k) => flatten(o[k], p ? `${p}.${k}` : k, out));
  return out;
};

export function jsonToCsv(text, { delim, flat, safe }) {
  let v; try { v = JSON.parse(text); } catch (e) { throw jsonError(text, e); }
  const arr = Array.isArray(v) ? v : [v];
  if (!arr.length) return '';
  const d = delim === 'tab' ? '\t' : delim;
  if (arr.every((x) => Array.isArray(x))) return toCsv(arr, d, safe);
  const objs = arr.map((x) => (x && typeof x === 'object' ? (flat ? flatten(x) : x) : { value: x }));
  const cols = [...new Set(objs.flatMap((o) => Object.keys(o)))];
  return toCsv([cols, ...objs.map((o) => cols.map((c) => o[c]))], d, safe);
}

// ---------- XML <-> JSON ----------
const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tagName = (k) => { let n = String(k).replace(/[^\w.-]/g, '_'); if (!/^[A-Za-z_]/.test(n)) n = '_' + n; return n; };

export function jsonToXml(text, { root, indent }) {
  let v; try { v = JSON.parse(text); } catch (e) { throw jsonError(text, e); }
  const pad = ' '.repeat(indent);
  const node = (k, val, d) => {
    const name = tagName(k), sp = pad.repeat(d);
    if (Array.isArray(val)) return val.map((x) => node(k, x, d)).join('\n');
    if (val === null || val === undefined) return `${sp}<${name}/>`;
    if (typeof val !== 'object') return `${sp}<${name}>${escXml(val)}</${name}>`;
    const attrs = [], kids = [];
    let txt = '';
    for (const [ck, cv] of Object.entries(val)) {
      if (ck.startsWith('@') && (cv === null || typeof cv !== 'object')) attrs.push(` ${tagName(ck.slice(1))}="${escXml(cv ?? '')}"`);
      else if (ck === '#text') txt = escXml(cv);
      else kids.push(node(ck, cv, d + 1));
    }
    if (!kids.length) return txt ? `${sp}<${name}${attrs.join('')}>${txt}</${name}>` : `${sp}<${name}${attrs.join('')}/>`;
    return `${sp}<${name}${attrs.join('')}>\n${kids.join('\n')}${txt ? `\n${pad.repeat(d + 1)}${txt}` : ''}\n${sp}</${name}>`;
  };
  const body = Array.isArray(v) || typeof v !== 'object' || v === null ? node('item', v, 1).replace(/^/, '') : Object.entries(v).map(([k, x]) => node(k, x, 1)).join('\n');
  const rn = tagName(root || 'root');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rn}>\n${Array.isArray(v) ? node('item', v, 1) : body}\n</${rn}>`;
}

export function xmlToJson(text, { indent, attrs }) {
  const doc = parseXml(text);
  const conv = (el) => {
    const obj = {};
    if (attrs) for (const a of el.attributes) obj['@' + a.name] = a.value;
    const kids = [...el.children];
    const t = [...el.childNodes].filter((n) => n.nodeType === 3 || n.nodeType === 4).map((n) => n.nodeValue).join('').trim();
    for (const k of kids) {
      const val = conv(k);
      if (k.localName in obj || (k.nodeName in obj)) {
        if (!Array.isArray(obj[k.nodeName])) obj[k.nodeName] = [obj[k.nodeName]];
        obj[k.nodeName].push(val);
      } else obj[k.nodeName] = val;
    }
    if (!kids.length && !Object.keys(obj).length) return t;
    if (t) obj['#text'] = t;
    return obj;
  };
  const r = doc.documentElement;
  return JSON.stringify({ [r.nodeName]: conv(r) }, null, indent);
}

// ---------- Base64 / URL / Entiti ----------
export function b64Encode(s, urlSafe) {
  const bytes = new TextEncoder().encode(s); let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  let o = btoa(bin);
  if (urlSafe) o = o.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return o;
}
export function b64Decode(s) {
  let x = s.trim().replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(x)) throw new ToolError('err.base64');
  x += '='.repeat((4 - (x.length % 4)) % 4);
  let bin; try { bin = atob(x); } catch { throw new ToolError('err.base64'); }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new ToolError('err.notUtf8'); }
}

export function urlEncode(s, full) { return full ? encodeURI(s) : encodeURIComponent(s); }
export function urlDecode(s, plus) {
  try { return decodeURIComponent(plus ? s.replace(/\+/g, ' ') : s); } catch { throw new ToolError('err.urlMalformed'); }
}

export function entityEncode(s, all) {
  let o = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  if (all) o = [...o].map((c) => (c.codePointAt(0) > 126 ? `&#x${c.codePointAt(0).toString(16).toUpperCase()};` : c)).join('');
  return o;
}
let inertDoc;
export function entityDecode(s) {
  inertDoc ||= document.implementation.createHTMLDocument('');
  const ta = inertDoc.createElement('textarea'); // RCDATA: tag tidak diurai, hanya entiti
  ta.innerHTML = s.replace(/</g, '&lt;');
  return ta.value;
}

// ---------- Unicode ----------
export function unicodeConvert(s, mode) {
  const cps = [...s].map((c) => c.codePointAt(0));
  const hex = (n, w = 4) => n.toString(16).toUpperCase().padStart(w, '0');
  switch (mode) {
    case 'escape': return [...s].map((c) => { const n = c.codePointAt(0); return n < 128 && n >= 32 ? c : n > 0xffff ? `\\u{${hex(n, 1)}}` : `\\u${hex(n)}`; }).join('');
    case 'codepoints': return cps.map((n) => `U+${hex(n)}`).join(' ');
    case 'entities': return [...s].map((c) => { const n = c.codePointAt(0); return n < 128 && n >= 32 ? c : `&#x${hex(n, 1)};`; }).join('');
    case 'decimal': return cps.join(' ');
    default: {
      let o = s
        .replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, h) => cp(h))
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/U\+([0-9a-fA-F]{4,6})/gi, (_, h) => cp(h))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => cp(h))
        .replace(/&#(\d+);/g, (_, d) => cp(Number(d).toString(16)));
      return o;
    }
  }
}
function cp(h) { const n = parseInt(h, 16); if (n > 0x10ffff) throw new ToolError('err.codepoint'); return String.fromCodePoint(n); }

// ---------- Asas nombor / teks <-> bait ----------
const BASES = { bin: 2, oct: 8, dec: 10, hex: 16 };
const PREFIX = { bin: /^0b/i, oct: /^0o/i, hex: /^0x/i, dec: /^$/ };
const DIGITS = { bin: /^[01]+$/, oct: /^[0-7]+$/, dec: /^\d+$/, hex: /^[0-9a-f]+$/i };

function parseBig(str, base) {
  let s = str.trim().replace(/[\s_]/g, ''); let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  s = s.replace(PREFIX[base], '');
  if (!s || !DIGITS[base].test(s)) throw new ToolError('err.baseDigits', { base: BASES[base] });
  const b = BigInt(BASES[base]); let v = 0n;
  for (const ch of s.toLowerCase()) v = v * b + BigInt(parseInt(ch, 36));
  return neg ? -v : v;
}

export function baseConvert(text, { mode, base }) {
  if (mode === 'number') {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((l) => {
      const v = parseBig(l, base);
      return `BIN ${v.toString(2)}\nOCT ${v.toString(8)}\nDEC ${v.toString(10)}\nHEX ${v.toString(16).toUpperCase()}`;
    }).join('\n\n');
  }
  const width = { bin: 8, oct: 3, dec: 1, hex: 2 }[base];
  if (mode === 'encode') {
    return [...new TextEncoder().encode(text)].map((b) => (base === 'hex' ? b.toString(16).toUpperCase() : b.toString(BASES[base])).padStart(width, '0')).join(' ');
  }
  const bytes = text.trim().split(/[\s,]+/).filter(Boolean).map((tok) => {
    const n = Number(parseBig(tok, base));
    if (n > 255) throw new ToolError('err.byteRange');
    return n;
  });
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes)); } catch { throw new ToolError('err.notUtf8'); }
}

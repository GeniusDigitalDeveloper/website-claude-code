// Enjin minify. JS guna Terser (BSD) — selamat; CSS/HTML/SVG/JSON guna pengurai sendiri.
import { loadScript, vendor } from '../../utils/io.js';
import { ToolError } from './ui.js';
import { jsonError } from './formatters.js';

export function minifyJson(s) {
  try { return JSON.stringify(JSON.parse(s)); } catch (e) { throw jsonError(s, e); }
}

export async function minifyJs(src, { mangle = true } = {}) {
  await loadScript(vendor('terser.min.js'));
  try {
    const r = await window.Terser.minify(src, { compress: true, mangle });
    if (r.error) throw r.error;
    return r.code || '';
  } catch (e) {
    throw new ToolError('err.syntax', { msg: String(e.message || e) + (e.line ? ` (${e.line}:${e.col})` : '') });
  }
}

/** Minify CSS dengan mesin keadaan (selamat untuk string, url(), calc()). */
export function minifyCss(src) {
  let out = '', buf = '', i = 0, paren = 0;
  const n = src.length;
  const squash = (s) => s.replace(/\s+/g, ' ').trim();
  const selector = (s) => squash(s).replace(/\s*([>+~,])\s*/g, '$1').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  const decl = (s) => {
    s = squash(s); if (!s) return '';
    if (s.startsWith('@')) return s.replace(/\s*,\s*/g, ',');
    const c = s.indexOf(':'); if (c < 0) return s;
    let prop = s.slice(0, c).trim(), val = s.slice(c + 1).trim();
    val = val.replace(/\s*,\s*/g, ',').replace(/\s*!\s*important/i, '!important').replace(/(^|[\s,(])0(\.\d+)/g, '$1$2');
    return `${prop}:${val}`;
  };
  while (i < n) {
    const ch = src[i];
    if (ch === '"' || ch === "'") { let j = i + 1; while (j < n && src[j] !== ch) { if (src[j] === '\\') j++; j++; } buf += src.slice(i, j + 1); i = j + 1; continue; }
    if (ch === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); const c = src.slice(i, j < 0 ? n : j + 2); if (c.startsWith('/*!')) out += c; i = j < 0 ? n : j + 2; continue; }
    if (ch === '(') paren++; else if (ch === ')') paren = Math.max(0, paren - 1);
    if (paren === 0 && ch === '{') {
      const raw = buf.trim();
      out += (raw.startsWith('@') ? squash(raw).replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',') : selector(raw)) + '{'; buf = '';
    } else if (paren === 0 && ch === ';') { const d = decl(buf); if (d) out += d + ';'; buf = ''; }
    else if (paren === 0 && ch === '}') { const d = decl(buf); if (d) out += d; out = out.replace(/;$/, '') + '}'; buf = ''; }
    else buf += ch;
    i++;
  }
  const tail = decl(buf); if (tail) out += tail;
  if (/[{]/.test(src) && (out.match(/{/g) || []).length !== (out.match(/}/g) || []).length) throw new ToolError('err.cssBraces');
  return out.replace(/;}/g, '}');
}

const BLOCK = new Set('html head body title meta link script style base div p ul ol li dl dt dd section article aside nav header footer main form fieldset legend table thead tbody tfoot tr td th caption h1 h2 h3 h4 h5 h6 blockquote hr br address figure figcaption details summary option select textarea noscript template'.split(' '));
const RAW = new Set(['pre', 'textarea', 'script', 'style']);

export function minifyHtml(src) {
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-zA-Z][^\s/>]*(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+|</gi;
  const tk = src.match(re) || [];
  const tagName = (t) => /^<\/?([a-zA-Z][^\s/>]*)/.exec(t)?.[1]?.toLowerCase();
  const isTag = (t) => t && t[0] === '<' && !t.startsWith('<!--') && /^<\/?[a-zA-Z]/.test(t);
  const blockAt = (t) => isTag(t) && BLOCK.has(tagName(t));
  const parts = [];
  tk.forEach((t, idx) => {
    if (t.startsWith('<!--')) { if (/^<!--\[if|^<!--<!/.test(t)) parts.push(t); return; }
    if (/^<!doctype/i.test(t)) { parts.push(t.replace(/\s+/g, ' ')); return; }
    const name = tagName(t);
    if (t[0] === '<' && RAW.has(name) && /<\/\w+\s*>$/.test(t)) {
      const m = /^(<[^>]*>)([\s\S]*?)(<\/\w+\s*>)$/.exec(t);
      if (m) {
        let inner = m[2];
        if (name === 'style') { try { inner = minifyCss(inner); } catch { inner = inner.trim(); } }
        else if (name === 'script' && !/\bsrc=/.test(m[1])) inner = inner.replace(/^\s*\n/gm, '').trim();
        parts.push(cleanTag(m[1]) + inner + m[3].replace(/\s+/g, '')); return;
      }
    }
    if (isTag(t)) { parts.push(cleanTag(t)); return; }
    if (t[0] === '<') { parts.push(t); return; }
    let txt = t.replace(/\s+/g, ' ');
    const prev = tk[idx - 1], next = tk[idx + 1];
    if (!prev || blockAt(prev)) txt = txt.replace(/^ /, '');
    if (!next || blockAt(next)) txt = txt.replace(/ $/, '');
    if (txt) parts.push(txt);
  });
  return parts.join('').trim();
}
const cleanTag = (t) => t.replace(/\s+/g, ' ').replace(/\s+(\/?>)$/, '$1').replace(/\s*=\s*(?=["'])/g, '=');

export function minifySvg(src, { precision = 3 } = {}) {
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'svg') throw new ToolError('err.invalidSvg');
  let s = src
    .replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '').replace(/<(sodipodi|inkscape):[\s\S]*?(\/>|<\/\1:[^>]+>)/gi, '')
    .replace(/\s+(?:xmlns:(?:inkscape|sodipodi|dc|cc|rdf)|inkscape:[\w-]+|sodipodi:[\w-]+|data-name)="[^"]*"/g, '')
    .replace(/>\s+</g, '><').replace(/\s+/g, ' ').replace(/\s*=\s*/g, '=').replace(/\s+(\/?>)/g, '$1').replace(/> </g, '><');
  const f = 10 ** precision;
  s = s.replace(/-?\d*\.\d+/g, (m) => String(Math.round(parseFloat(m) * f) / f).replace(/^(-?)0\./, '$1.'));
  return s.trim();
}

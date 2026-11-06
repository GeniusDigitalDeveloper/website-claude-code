// Enjin format kod. Prettier (MIT) & sql-formatter (MIT) dimuat dari /assets/vendor — tiada CDN, tiada API.
import { loadScript, vendor } from '../../utils/io.js';
import { ToolError } from './ui.js';

let prettierP;
function prettier() {
  prettierP ||= (async () => {
    await loadScript(vendor('prettier-standalone.js'));
    await Promise.all(['babel', 'estree', 'postcss', 'html', 'markdown'].map((p) => loadScript(vendor(`prettier-${p}.js`))));
    return { p: window.prettier, pl: window.prettierPlugins };
  })();
  return prettierP;
}

async function runPrettier(src, parser, indent, plugins) {
  const { p, pl } = await prettier();
  try {
    return await p.format(src, { parser, tabWidth: indent, useTabs: false, plugins: plugins.map((k) => pl[k]), printWidth: 100 });
  } catch (e) {
    const loc = e.loc?.start ? ` (${e.loc.start.line}:${e.loc.start.column})` : '';
    throw new ToolError('err.syntax', { msg: String(e.message).split('\n')[0].replace(/\s*\(\d+:\d+\)\s*$/, '') + loc });
  }
}

export const formatHtml = (s, i) => runPrettier(s, 'html', i, ['html', 'babel', 'estree', 'postcss']);
export const formatCss = (s, i) => runPrettier(s, 'css', i, ['postcss']);
export const formatJs = (s, i) => runPrettier(s, 'babel', i, ['babel', 'estree']);
export const formatMd = (s, i) => runPrettier(s, 'markdown', i, ['markdown']);

export function formatJson(s, i) {
  try { return JSON.stringify(JSON.parse(s), null, i); }
  catch (e) { throw jsonError(s, e); }
}

/** Cari kedudukan ralat JSON dengan pengimbas rekursif kecil (mesej V8 moden tidak sentiasa memberi kedudukan). */
function findJsonErrorPos(s) {
  let i = 0;
  const ws = () => { while (i < s.length && /[ \t\n\r]/.test(s[i])) i++; };
  const fail = () => { throw i; };
  const val = () => {
    ws(); const c = s[i];
    if (c === '{') { i++; ws(); if (s[i] === '}') { i++; return; } for (;;) { ws(); if (s[i] !== '"') fail(); str(); ws(); if (s[i] !== ':') fail(); i++; val(); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === '}') { i++; return; } fail(); } }
    if (c === '[') { i++; ws(); if (s[i] === ']') { i++; return; } for (;;) { val(); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === ']') { i++; return; } fail(); } }
    if (c === '"') return str();
    const m = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(s.slice(i));
    if (!m) fail(); i += m[0].length;
  };
  const str = () => { i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; else if (s[i] < ' ') fail(); i++; } if (s[i] !== '"') fail(); i++; };
  try { val(); ws(); if (i < s.length) fail(); } catch (p) { return typeof p === 'number' ? p : undefined; }
  return undefined;
}

/** Tukar ralat JSON.parse kepada mesej dengan baris:lajur. */
export function jsonError(src, e) {
  const msg = String(e.message);
  let pos = /position (\d+)/.exec(msg)?.[1];
  pos = pos !== undefined ? Number(pos) : findJsonErrorPos(src);
  let line, col;
  if (pos !== undefined) {
    const before = src.slice(0, pos).split('\n');
    line = before.length; col = before[before.length - 1].length + 1;
  } else {
    const lm = /line (\d+) column (\d+)/.exec(msg);
    if (lm) { line = +lm[1]; col = +lm[2]; }
  }
  return new ToolError('err.invalidJson', { msg: msg.replace(/\s*\(line.*\)$/, '').replace(/, \.\.\..*$/, '').replace(/ is not valid JSON.*$/, ''), loc: line ? `${line}:${col}` : '-' });
}

// ---- XML ----
export function parseXml(src) {
  const doc = new DOMParser().parseFromString(src, 'application/xml');
  const pe = doc.getElementsByTagName('parsererror')[0];
  if (pe) {
    const raw = pe.textContent.replace(/\s+/g, ' ').trim();
    const m = /line (?:number )?(\d+)(?:,? (?:at )?column (?:number )?(\d+))?/i.exec(raw);
    const msg = raw.replace(/^(This page contains the following errors:|XML Parsing Error:)\s*/i, '').replace(/Below is a rendering.*$/i, '').slice(0, 220);
    throw new ToolError('err.invalidXml', { msg, loc: m ? `${m[1]}:${m[2] || '?'}` : '-' });
  }
  return doc;
}

export function formatXml(src, indent) {
  parseXml(src);
  const pad = ' '.repeat(indent);
  const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/[^>]+>|<[^>]+>|[^<]+/g;
  const tk = src.match(re) || [];
  const out = []; let d = 0;
  const isOpen = (x) => /^<[^!?/][^>]*[^/]>$|^<[^!?/>]>$/.test(x);
  for (let i = 0; i < tk.length; i++) {
    const x = tk[i];
    if (!x.startsWith('<')) { const tx = x.trim().replace(/\s+/g, ' '); if (tx) out.push(pad.repeat(d) + tx); continue; }
    if (x.startsWith('</')) { d = Math.max(0, d - 1); out.push(pad.repeat(d) + x); continue; }
    if (isOpen(x)) {
      const n1 = tk[i + 1], n2 = tk[i + 2];
      if (n1 !== undefined && !n1.startsWith('<') && n1.trim() && n2 && n2.startsWith('</')) { out.push(pad.repeat(d) + x + n1.trim().replace(/\s+/g, ' ') + n2); i += 2; continue; }
      if (n1 && n1.startsWith('</')) { out.push(pad.repeat(d) + x + n1); i += 1; continue; }
      out.push(pad.repeat(d) + x); d++; continue;
    }
    out.push(pad.repeat(d) + x);
  }
  return out.join('\n') + '\n';
}

// ---- SQL ----
export async function formatSql(src, indent, dialect = 'sql') {
  await loadScript(vendor('sql-formatter.min.js'));
  try { return window.sqlFormatter.format(src, { language: dialect, tabWidth: indent, keywordCase: 'upper', linesBetweenQueries: 1 }); }
  catch (e) { throw new ToolError('err.syntax', { msg: String(e.message).split('\n')[0] }); }
}

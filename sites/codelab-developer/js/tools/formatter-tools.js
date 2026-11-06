import { transformTool } from './lib/ui.js';
import * as F from './lib/formatters.js';

const indent = { key: 'indent', type: 'select', label: 'ui.indent', value: '2', options: [{ v: '2', l: 'ui.indent2' }, { v: '4', l: 'ui.indent4' }] };
const mk = (o) => () => transformTool({ options: [indent], action: 'ui.format', ...o });

export const tools = {
  'html-formatter': mk({ inLang: 'html', outLang: 'html', ext: 'html', mime: 'text/html', accept: '.html,.htm,.txt',
    sample: '<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>CodeLab</title><style>body{margin:0;font-family:sans-serif}</style></head><body><header><nav><a href="/">Utama</a><a href="/alat">Alat</a></nav></header><main><h1>Selamat datang</h1><p>Alat pembangun web <strong>percuma</strong>.</p><ul><li>Format</li><li>Minify</li></ul></main><script>const a=1;console.log(a)</script></body></html>',
    run: (s, o) => F.formatHtml(s, +o.indent) }),
  'css-formatter': mk({ inLang: 'css', outLang: 'css', ext: 'css', mime: 'text/css', accept: '.css,.txt',
    sample: '.card{display:flex;padding:16px;border-radius:12px;background:#fff}.card:hover{box-shadow:0 8px 24px rgba(0,0,0,.12)}@media(max-width:600px){.card{flex-direction:column}}',
    run: (s, o) => F.formatCss(s, +o.indent) }),
  'js-formatter': mk({ inLang: 'js', outLang: 'js', ext: 'js', mime: 'text/javascript', accept: '.js,.mjs,.txt',
    sample: 'function sapa(nama){if(!nama){return "Hai"}const mesej=`Hai, ${nama}!`;console.log(mesej);return mesej}const senarai=[1,2,3].map(n=>n*2).filter(n=>n>2);',
    run: (s, o) => F.formatJs(s, +o.indent) }),
  'json-formatter': () => transformTool({ inLang: 'json', outLang: 'json', ext: 'json', mime: 'application/json', action: 'ui.format', accept: '.json,.txt',
    options: [indent, { key: 'sort', type: 'checkbox', label: 'ui.sortKeys', value: false }],
    sample: '{"nama":"CodeLab Developer","versi":1,"alat":["formatter","minifier"],"aktif":true,"pemilik":{"jenama":"Genius Digital"}}',
    run: (s, o) => {
      if (!o.sort) return F.formatJson(s, +o.indent);
      let v; try { v = JSON.parse(s); } catch (e) { throw F.jsonError(s, e); }
      const sortDeep = (x) => (Array.isArray(x) ? x.map(sortDeep) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortDeep(x[k])])) : x);
      return JSON.stringify(sortDeep(v), null, +o.indent);
    } }),
  'xml-formatter': mk({ inLang: 'xml', outLang: 'xml', ext: 'xml', mime: 'application/xml', accept: '.xml,.txt',
    sample: '<?xml version="1.0" encoding="UTF-8"?><katalog><alat id="1"><nama>HTML Formatter</nama><kategori>formatter</kategori></alat><alat id="2"><nama>CSS Minifier</nama><kategori>minifier</kategori></alat></katalog>',
    run: (s, o) => F.formatXml(s, +o.indent) }),
  'sql-formatter': () => transformTool({ inLang: 'sql', outLang: 'sql', ext: 'sql', mime: 'application/sql', action: 'ui.format', accept: '.sql,.txt',
    options: [indent, { key: 'dialect', type: 'select', label: 'ui.dialect', value: 'sql', options: ['sql', 'mysql', 'mariadb', 'postgresql', 'sqlite', 'transactsql'].map((v) => ({ v, l: v === 'sql' ? 'Standard SQL' : v, raw: true })) }],
    sample: "select u.id,u.nama,count(o.id) as jumlah from pengguna u left join pesanan o on o.user_id=u.id where u.aktif=1 and u.dicipta>'2026-01-01' group by u.id,u.nama having count(o.id)>2 order by jumlah desc limit 10;",
    run: (s, o) => F.formatSql(s, +o.indent, o.dialect) }),
  'md-formatter': mk({ inLang: 'md', outLang: 'md', ext: 'md', mime: 'text/markdown', accept: '.md,.markdown,.txt',
    sample: '# Tajuk\nSatu perenggan   dengan  ruang berlebihan.\n* item satu\n* item dua\n\n\n\n|Nama|Nilai|\n|--|--|\n|a|1|\n|bb|22|\n',
    run: (s, o) => F.formatMd(s, +o.indent) }),
};

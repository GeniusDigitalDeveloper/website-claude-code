import { transformTool } from './lib/ui.js';
import * as C from './lib/convert.js';

const indent = { key: 'indent', type: 'select', label: 'ui.indent', value: '2', options: [{ v: '2', l: 'ui.indent2' }, { v: '4', l: 'ui.indent4' }] };
const delim = { key: 'delim', type: 'select', label: 'ui.delimiter', value: ',', options: [{ v: ',', l: ', ( , )', raw: true }, { v: ';', l: '; ( ; )', raw: true }, { v: 'tab', l: 'Tab', raw: true }, { v: '|', l: '| ( | )', raw: true }] };
const SAMPLE_JSON = '[{"nama":"Aisyah","umur":28,"kota":"Kuala Lumpur"},{"nama":"Hafiz","umur":31,"kota":"Johor Bahru"}]';
const conv = (o) => () => transformTool({ action: 'ui.convert', ...o });

const baseTool = (defBase) => conv({ inLang: 'txt', outLang: 'txt', ext: 'txt',
  options: [
    { key: 'mode', type: 'select', label: 'ui.mode', value: 'number', options: [{ v: 'number', l: 'ui.modeNumber' }, { v: 'encode', l: 'ui.modeTextEncode' }, { v: 'decode', l: 'ui.modeTextDecode' }] },
    { key: 'base', type: 'select', label: 'ui.base', value: defBase, options: [{ v: 'bin', l: 'Binary (2)', raw: true }, { v: 'oct', l: 'Octal (8)', raw: true }, { v: 'dec', l: 'Decimal (10)', raw: true }, { v: 'hex', l: 'Hexadecimal (16)', raw: true }] },
  ],
  sample: { bin: '1010 1111', dec: '255\n1024', hex: 'FF\n3E8' }[defBase],
  run: (s, o) => C.baseConvert(s, o) });

export const tools = {
  'json-to-csv': conv({ inLang: 'json', outLang: 'txt', ext: 'csv', mime: 'text/csv', sample: SAMPLE_JSON, accept: '.json,.txt',
    options: [delim, { key: 'flat', type: 'checkbox', label: 'ui.flatten', value: true }, { key: 'safe', type: 'checkbox', label: 'ui.csvSafe', value: false }],
    run: (s, o) => C.jsonToCsv(s, o) }),
  'csv-to-json': conv({ inLang: 'txt', outLang: 'json', ext: 'json', mime: 'application/json', accept: '.csv,.txt',
    sample: 'nama,umur,kota\nAisyah,28,Kuala Lumpur\nHafiz,31,"Johor Bahru"',
    options: [delim, indent, { key: 'header', type: 'checkbox', label: 'ui.firstRowHeader', value: true }, { key: 'types', type: 'checkbox', label: 'ui.inferTypes', value: true }],
    run: (s, o) => C.csvToJson(s, { ...o, indent: +o.indent }) }),
  'json-to-xml': conv({ inLang: 'json', outLang: 'xml', ext: 'xml', mime: 'application/xml', sample: '{"pengguna":{"@id":"7","nama":"Aisyah","bahasa":["BM","EN","AR"]}}', accept: '.json,.txt',
    options: [indent, { key: 'root', type: 'text', label: 'ui.rootName', value: 'root' }],
    run: (s, o) => C.jsonToXml(s, { root: o.root, indent: +o.indent }) }),
  'xml-to-json': conv({ inLang: 'xml', outLang: 'json', ext: 'json', mime: 'application/json', accept: '.xml,.txt',
    sample: '<katalog><alat id="1">HTML Formatter</alat><alat id="2">CSS Minifier</alat></katalog>',
    options: [indent, { key: 'attrs', type: 'checkbox', label: 'ui.keepAttrs', value: true }],
    run: (s, o) => C.xmlToJson(s, { indent: +o.indent, attrs: o.attrs }) }),
  'base64-encode': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: 'CodeLab Developer — Genius Digital ✓',
    options: [{ key: 'urlsafe', type: 'checkbox', label: 'ui.urlSafe', value: false }], run: (s, o) => C.b64Encode(s, o.urlsafe) }),
  'base64-decode': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: 'Q29kZUxhYiBEZXZlbG9wZXIg4oCUIEdlbml1cyBEaWdpdGFsIOKckw==', run: (s) => C.b64Decode(s) }),
  'url-encode': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: 'https://contoh.my/cari?q=alat web & pembangun&bahasa=melayu',
    options: [{ key: 'full', type: 'select', label: 'ui.mode', value: 'comp', options: [{ v: 'comp', l: 'ui.urlComponent' }, { v: 'full', l: 'ui.urlFull' }] }],
    run: (s, o) => C.urlEncode(s, o.full === 'full') }),
  'url-decode': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: 'https%3A%2F%2Fcontoh.my%2Fcari%3Fq%3Dalat%20web%20%26%20pembangun',
    options: [{ key: 'plus', type: 'checkbox', label: 'ui.plusSpace', value: false }], run: (s, o) => C.urlDecode(s, o.plus) }),
  'html-entity-encode': conv({ inLang: 'html', outLang: 'html', ext: 'txt', sample: '<p class="nota">Harga: RM5 & "diskaun" © 2026</p>',
    options: [{ key: 'all', type: 'checkbox', label: 'ui.encodeNonAscii', value: false }], run: (s, o) => C.entityEncode(s, o.all) }),
  'html-entity-decode': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: '&lt;p class=&quot;nota&quot;&gt;Harga: RM5 &amp; &#8220;diskaun&#8221; &copy; 2026&lt;/p&gt;', run: (s) => C.entityDecode(s) }),
  'unicode-converter': conv({ inLang: 'txt', outLang: 'txt', ext: 'txt', sample: 'Halo, مرحبا 🌏',
    options: [{ key: 'mode', type: 'select', label: 'ui.mode', value: 'escape', options: [
      { v: 'escape', l: 'ui.uniEscape' }, { v: 'codepoints', l: 'ui.uniCodepoints' }, { v: 'entities', l: 'ui.uniEntities' }, { v: 'decimal', l: 'ui.uniDecimal' }, { v: 'decode', l: 'ui.uniDecode' }] }],
    run: (s, o) => C.unicodeConvert(s, o.mode) }),
  'binary-converter': baseTool('bin'),
  'decimal-converter': baseTool('dec'),
  'hex-converter': baseTool('hex'),
};

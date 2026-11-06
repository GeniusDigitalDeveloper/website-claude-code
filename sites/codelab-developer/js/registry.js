// Pendaftaran semua alat. Nama alat diterjemah melalui kunci `tool.<id>.name` dalam /locales/*.json.
// Cara tambah alat: 1) tambah baris di sini, 2) eksport fungsi dengan id yang sama dalam modul tools/*, 3) tambah terjemahan.

export const CATEGORIES = [
  { id: 'formatter', icon: 'braces', module: 'formatter-tools', color: 'indigo' },
  { id: 'minifier', icon: 'layers', module: 'minifier-tools', color: 'violet' },
  { id: 'css', icon: 'palette', module: 'css-tools', color: 'blue' },
  { id: 'color', icon: 'pipette', module: 'color-tools', color: 'pink' },
  { id: 'converter', icon: 'arrow-left-right', module: 'converter-tools', color: 'cyan' },
  { id: 'utility', icon: 'wrench', module: 'utility-tools', color: 'teal' },
  { id: 'generator', icon: 'wand-sparkles', module: 'generator-tools', color: 'amber' },
];

// [id, ikon, kata kunci carian (fungsi, BI + BM)]
const T = (cat, rows) => rows.map(([id, icon, kw]) => ({ id, cat, icon, kw }));

export const TOOLS = [
  ...T('formatter', [
    ['html-formatter', 'file-code', 'html beautify prettify indent format kemaskan'],
    ['css-formatter', 'file-code', 'css beautify prettify stylesheet format'],
    ['js-formatter', 'file-code', 'javascript js beautify prettify format'],
    ['json-formatter', 'file-json', 'json pretty print format sort keys'],
    ['xml-formatter', 'file-code', 'xml pretty print format indent'],
    ['sql-formatter', 'database', 'sql query database mysql postgres format'],
    ['md-formatter', 'file-text', 'markdown md format readme'],
  ]),
  ...T('minifier', [
    ['html-minifier', 'layers', 'html minify compress kecilkan'],
    ['css-minifier', 'layers', 'css minify compress kecilkan'],
    ['js-minifier', 'layers', 'javascript js minify uglify terser compress'],
    ['json-minifier', 'layers', 'json minify compress'],
    ['svg-minifier', 'layers', 'svg minify optimize optimise vector'],
  ]),
  ...T('css', [
    ['css-gradient', 'palette', 'gradient linear radial conic background warna'],
    ['css-box-shadow', 'square-dashed', 'box shadow bayang kad'],
    ['css-border-radius', 'square-dashed', 'border radius sudut bulat rounded'],
    ['css-glassmorphism', 'droplets', 'glassmorphism glass blur frosted kaca'],
    ['css-neumorphism', 'blend', 'neumorphism soft ui embossed'],
    ['css-button', 'square-mouse-pointer', 'button butang hover cta'],
    ['css-animation', 'sparkles', 'animation keyframes animasi'],
    ['css-transform', 'rotate-3d', 'transform rotate scale skew translate'],
    ['css-flexbox', 'columns-3', 'flexbox flex layout susun atur'],
    ['css-grid', 'grid-3x3', 'grid layout css grid'],
    ['css-text-shadow', 'type', 'text shadow teks bayang'],
    ['css-clip-path', 'scissors', 'clip path polygon bentuk shape'],
  ]),
  ...T('color', [
    ['color-palette', 'palette', 'palette palet warna scheme analogous triadic'],
    ['hex-to-rgb', 'pipette', 'hex rgb convert tukar warna'],
    ['rgb-to-hex', 'pipette', 'rgb hex convert tukar warna'],
    ['hex-to-hsl', 'pipette', 'hex hsl convert tukar warna'],
    ['hsl-to-hex', 'pipette', 'hsl hex convert tukar warna'],
    ['contrast-checker', 'contrast', 'contrast wcag accessibility aksesibiliti kontras'],
    ['gradient-picker', 'sliders-horizontal', 'gradient picker stops colour'],
    ['random-color', 'shuffle', 'random rawak warna color generator'],
    ['color-blindness', 'eye', 'color blindness buta warna protanopia deuteranopia simulator'],
    ['image-color-picker', 'pipette', 'image picker eyedropper gambar warna extract'],
  ]),
  ...T('converter', [
    ['json-to-csv', 'arrow-left-right', 'json csv convert spreadsheet'],
    ['csv-to-json', 'arrow-left-right', 'csv json convert spreadsheet'],
    ['json-to-xml', 'arrow-left-right', 'json xml convert'],
    ['xml-to-json', 'arrow-left-right', 'xml json convert'],
    ['base64-encode', 'binary', 'base64 encode kod'],
    ['base64-decode', 'binary', 'base64 decode nyahkod'],
    ['url-encode', 'link-2', 'url encode percent escape'],
    ['url-decode', 'link-2', 'url decode percent unescape'],
    ['html-entity-encode', 'code-xml', 'html entity encode escape'],
    ['html-entity-decode', 'code-xml', 'html entity decode unescape'],
    ['unicode-converter', 'globe', 'unicode codepoint escape utf'],
    ['binary-converter', 'binary', 'binary binari bit base 2'],
    ['decimal-converter', 'hash', 'decimal perpuluhan base 10 nombor'],
    ['hex-converter', 'hash', 'hexadecimal hex heksa base 16'],
  ]),
  ...T('utility', [
    ['uuid-generator', 'fingerprint', 'uuid guid unique id generator'],
    ['password-generator', 'key-round', 'password kata laluan generator random secure'],
    ['lorem-ipsum', 'align-justify', 'lorem ipsum placeholder teks dummy'],
    ['timestamp-converter', 'clock', 'unix timestamp date masa tarikh'],
    ['epoch-converter', 'calendar-clock', 'epoch unix time tarikh masa'],
    ['regex-tester', 'regex', 'regex regular expression test padanan'],
    ['json-validator', 'circle-check', 'json validate validator semak sah'],
    ['html-validator', 'circle-check', 'html validate validator semak sah'],
    ['xml-validator', 'circle-check', 'xml validate validator semak sah'],
    ['jwt-decoder', 'shield', 'jwt json web token decode inspect'],
    ['url-parser', 'link-2', 'url parse parser host path query'],
    ['query-parser', 'link-2', 'query string parse parser params'],
    ['word-counter', 'whole-word', 'word count kiraan perkataan'],
    ['char-counter', 'text-cursor-input', 'character count aksara huruf kiraan'],
    ['line-counter', 'list-ordered', 'line count baris kiraan'],
  ]),
  ...T('generator', [
    ['html-boilerplate', 'file-code', 'html boilerplate template starter'],
    ['css-reset', 'paintbrush', 'css reset normalize'],
    ['meta-tag', 'tag', 'meta tag seo title description'],
    ['og-meta', 'share-2', 'open graph og twitter card social share'],
    ['favicon-generator', 'image', 'favicon icon ico apple touch'],
    ['robots-txt', 'bot', 'robots txt crawler seo'],
    ['sitemap-xml', 'map', 'sitemap xml seo urls'],
    ['htaccess', 'file-cog', 'htaccess apache redirect https gzip'],
    ['web-manifest', 'smartphone', 'web manifest pwa app install'],
    ['schema-markup', 'sparkles', 'schema json-ld structured data seo rich results'],
  ]),
];

export const toolById = (id) => TOOLS.find((t) => t.id === id);
export const catById = (id) => CATEGORIES.find((c) => c.id === id);
export const toolsByCat = (c) => TOOLS.filter((t) => t.cat === c);

const modCache = {};
/** Muat modul kategori dan pulangkan fungsi pembina UI bagi alat. */
export async function loadTool(id) {
  const t = toolById(id); if (!t) return null;
  const m = catById(t.cat).module;
  modCache[m] ||= import(`./tools/${m}.js`);
  const mod = await modCache[m];
  return mod.tools[id] || null;
}

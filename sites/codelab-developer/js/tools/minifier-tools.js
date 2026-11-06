import { transformTool } from './lib/ui.js';
import * as M from './lib/minifiers.js';

const mk = (o) => () => transformTool({ showSize: true, action: 'ui.minify', ...o });

export const tools = {
  'html-minifier': mk({ inLang: 'html', outLang: 'html', ext: 'min.html', mime: 'text/html', accept: '.html,.htm,.txt',
    sample: '<!doctype html>\n<html lang="ms">\n  <head>\n    <meta charset="utf-8">\n    <title>CodeLab</title>\n    <style>\n      body { margin: 0; color: #111111; }\n    </style>\n  </head>\n  <body>\n    <!-- komen dibuang -->\n    <h1>Selamat   datang</h1>\n    <p>Alat    pembangun web <b>percuma</b>.</p>\n  </body>\n</html>',
    run: (s) => M.minifyHtml(s) }),
  'css-minifier': mk({ inLang: 'css', outLang: 'css', ext: 'min.css', mime: 'text/css', accept: '.css,.txt',
    sample: '/* kad */\n.card {\n  display: flex;\n  padding: 16px 24px;\n  background: rgba(255, 255, 255, 0.9);\n  margin: 0.5rem 0;\n}\n\n.card:hover > a {\n  color: #4f46e5 !important;\n}\n\n@media (max-width: 600px) {\n  .card { flex-direction: column; }\n}',
    run: (s) => M.minifyCss(s) }),
  'js-minifier': mk({ inLang: 'js', outLang: 'js', ext: 'min.js', mime: 'text/javascript', accept: '.js,.mjs,.txt',
    options: [{ key: 'mangle', type: 'checkbox', label: 'ui.mangle', value: true }],
    sample: '// jumlahkan senarai\nfunction jumlahkan(senarai) {\n  let jumlah = 0;\n  for (const nilai of senarai) {\n    jumlah += nilai;\n  }\n  return jumlah;\n}\nconsole.log(jumlahkan([1, 2, 3]));',
    run: (s, o) => M.minifyJs(s, { mangle: o.mangle }) }),
  'json-minifier': mk({ inLang: 'json', outLang: 'json', ext: 'min.json', mime: 'application/json', accept: '.json,.txt',
    sample: '{\n  "nama": "CodeLab Developer",\n  "alat": [\n    "formatter",\n    "minifier"\n  ],\n  "aktif": true\n}',
    run: (s) => M.minifyJson(s) }),
  'svg-minifier': () => transformTool({ showSize: true, action: 'ui.minify', inLang: 'svg', outLang: 'svg', ext: 'min.svg', mime: 'image/svg+xml', accept: '.svg,.txt',
    options: [{ key: 'precision', type: 'range', label: 'ui.precision', min: 0, max: 6, value: 3 }],
    sample: '<?xml version="1.0" encoding="UTF-8"?>\n<!-- dijana editor -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">\n  <metadata>editor</metadata>\n  <path d="M12.000000 2.500000 L21.500000 12.000000 L12.000000 21.500000 L2.500000 12.000000 Z" fill="#4f46e5"/>\n</svg>',
    run: (s, o) => M.minifySvg(s, { precision: o.precision }) }),
};

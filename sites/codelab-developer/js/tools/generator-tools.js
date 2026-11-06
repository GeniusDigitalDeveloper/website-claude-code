import { h, icon, btn, field, controls, outputPane, errorBox, formTool, downloadBlob, ToolError, toast } from './lib/ui.js';
import { makeZip } from '../utils/io.js';
import { parseHex } from './lib/color.js';
import { dayKey } from '../statistics/kl-time.js';
import { clear } from '../utils/dom.js';

// ---- pembantu ----
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = (id, label, value, extra = {}) => ({ key: id, type: 'text', label, value, dir: 'ltr', ...extra });
const TXT = (id, label, value, extra = {}) => ({ key: id, type: 'text', label, value, ...extra });
const TA = (id, label, value, rows = 4, extra = {}) => ({ key: id, type: 'textarea', label, value, rows, dir: 'ltr', wide: true, ...extra });
const CK = (id, label, value) => ({ key: id, type: 'checkbox', label, value });
const SEL = (id, label, value, opts) => ({ key: id, type: 'select', label, value, options: opts.map((o) => (Array.isArray(o) ? { v: o[0], l: o[1] } : { v: o, l: o, raw: true })) });
const NUM = (id, label, value, min, max, step = 1) => ({ key: id, type: 'number', label, value, min, max, step });
const COL = (id, label, value) => ({ key: id, type: 'color', label, value });
const isHttpUrl = (s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
const safePath = (s) => !/["<>\s]|^\s*javascript:/i.test(s);
const lines = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const err = (key, args) => ({ key, args });

const RESETS = {
  modern: `/* Modern CSS reset */\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n* {\n  margin: 0;\n}\n\nhtml {\n  -webkit-text-size-adjust: 100%;\n}\n\nbody {\n  line-height: 1.5;\n  -webkit-font-smoothing: antialiased;\n}\n\nimg,\npicture,\nvideo,\ncanvas,\nsvg {\n  display: block;\n  max-width: 100%;\n}\n\ninput,\nbutton,\ntextarea,\nselect {\n  font: inherit;\n  color: inherit;\n}\n\np,\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  overflow-wrap: break-word;\n}\n`,
  minimal: `*,\n*::before,\n*::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n`,
  meyer: `/* Berdasarkan Eric Meyer's Reset (domain awam) */\nhtml, body, div, span, applet, object, iframe,\nh1, h2, h3, h4, h5, h6, p, blockquote, pre,\na, abbr, acronym, address, big, cite, code,\ndel, dfn, em, img, ins, kbd, q, s, samp,\nsmall, strike, strong, sub, sup, tt, var,\nb, u, i, center,\ndl, dt, dd, ol, ul, li,\nfieldset, form, label, legend,\ntable, caption, tbody, tfoot, thead, tr, th, td,\narticle, aside, canvas, details, embed,\nfigure, figcaption, footer, header, hgroup,\nmenu, nav, output, ruby, section, summary,\ntime, mark, audio, video {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font: inherit;\n  vertical-align: baseline;\n}\narticle, aside, details, figcaption, figure,\nfooter, header, hgroup, menu, nav, section {\n  display: block;\n}\nbody {\n  line-height: 1;\n}\nol, ul {\n  list-style: none;\n}\nblockquote, q {\n  quotes: none;\n}\nblockquote:before, blockquote:after,\nq:before, q:after {\n  content: '';\n  content: none;\n}\ntable {\n  border-collapse: collapse;\n  border-spacing: 0;\n}\n`,
};

export const tools = {
  'html-boilerplate': () => formTool({ zipName: 'html-boilerplate.zip',
    fields: [SEL('lang', 'ui.docLang', 'ms', [['ms', 'Bahasa Melayu (ms)'], ['en', 'English (en)'], ['ar', 'العربية (ar)']].map(([v, l]) => ({ v, l, raw: true }))), TXT('title', 'ui.pageTitle', 'Tajuk Halaman Saya'), TXT('desc', 'ui.metaDesc', 'Penerangan ringkas halaman.', { wide: true }),
      T('css', 'ui.cssPath', 'css/style.css'), T('js', 'ui.jsPath', 'js/main.js'), T('icon', 'ui.faviconPath', 'favicon.svg'), CK('viewport', 'ui.viewportMeta', true), CK('og', 'ui.includeOg', false), CK('noscript', 'ui.includeNoscript', false), CK('defer', 'ui.deferScript', true)],
    build: (v) => {
      const errors = [];
      if (!v.title.trim()) errors.push(err('val.titleRequired'));
      for (const [k, p] of [['css', v.css], ['js', v.js], ['icon', v.icon]]) if (p && !safePath(p)) errors.push(err('val.badPath', { field: k }));
      if (errors.length) return { errors, files: [] };
      const dir = v.lang === 'ar' ? ' dir="rtl"' : '';
      const body = [`<!DOCTYPE html>`, `<html lang="${v.lang}"${dir}>`, `<head>`, `  <meta charset="UTF-8">`, v.viewport ? `  <meta name="viewport" content="width=device-width, initial-scale=1">` : null, `  <title>${escHtml(v.title)}</title>`, v.desc ? `  <meta name="description" content="${escHtml(v.desc)}">` : null,
        v.og ? `  <meta property="og:title" content="${escHtml(v.title)}">\n  <meta property="og:description" content="${escHtml(v.desc)}">\n  <meta property="og:type" content="website">` : null, v.icon ? `  <link rel="icon" href="${escHtml(v.icon)}">` : null, v.css ? `  <link rel="stylesheet" href="${escHtml(v.css)}">` : null, `</head>`, `<body>`,
        v.noscript ? `  <noscript>JavaScript diperlukan untuk halaman ini.</noscript>` : null, `  <header>\n    <h1>${escHtml(v.title)}</h1>\n  </header>`, `  <main>\n    <p>Kandungan anda di sini.</p>\n  </main>`, `  <footer>\n    <small>&copy; 2026</small>\n  </footer>`, v.js ? `  <script src="${escHtml(v.js)}"${v.defer ? ' defer' : ''}></script>` : null, `</body>`, `</html>`].filter((x) => x !== null).join('\n');
      return { files: [{ name: 'index.html', content: body + '\n', lang: 'html', mime: 'text/html' }] };
    } }),

  'css-reset': () => formTool({
    fields: [SEL('style', 'ui.resetStyle', 'modern', [['modern', 'ui.rs_modern'], ['minimal', 'ui.rs_minimal'], ['meyer', 'ui.rs_meyer']]), CK('focus', 'ui.focusVisible', true), CK('motion', 'ui.reducedMotion', true), CK('smooth', 'ui.smoothScroll', false), CK('rootvars', 'ui.rootVars', false)],
    build: (v) => {
      let css = RESETS[v.style];
      if (v.focus) css += `\n:focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}\n`;
      if (v.smooth) css += `\nhtml {\n  scroll-behavior: smooth;\n}\n`;
      if (v.motion) css += `\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}\n`;
      if (v.rootvars) css = `:root {\n  --color-text: #0f172a;\n  --color-bg: #ffffff;\n  --radius: 12px;\n}\n\n` + css;
      return { files: [{ name: 'reset.css', content: css, lang: 'css', mime: 'text/css' }] };
    } }),

  'meta-tag': () => formTool({
    fields: [TXT('title', 'ui.pageTitle', 'CodeLab Developer — Alat Pembangun Web Percuma'), TXT('desc', 'ui.metaDesc', 'Koleksi lengkap alat pembangun web: format, minify, penjana CSS dan banyak lagi. Percuma dan berjalan dalam pelayar.', { wide: true, type: 'textarea', rows: 3 }), TXT('keywords', 'ui.keywords', 'alat web, formatter, minifier, css generator'), TXT('author', 'ui.author', 'Genius Digital'),
      T('canonical', 'ui.canonicalUrl', 'https://contoh.my/'), SEL('robots', 'ui.robots', 'index, follow', ['index, follow', 'noindex, follow', 'index, nofollow', 'noindex, nofollow']), COL('theme', 'ui.themeColor', '#4f46e5'), CK('viewport', 'ui.viewportMeta', true), CK('charset', 'ui.charsetMeta', true), CK('tcolor', 'ui.includeThemeColor', true)],
    build: (v) => {
      const errors = [], warnings = [];
      if (!v.title.trim()) errors.push(err('val.titleRequired'));
      if (v.canonical && !isHttpUrl(v.canonical)) errors.push(err('val.badUrl', { field: 'canonical' }));
      if (v.title.length > 60) warnings.push(err('val.titleLong', { n: v.title.length }));
      if (v.desc.length > 160) warnings.push(err('val.descLong', { n: v.desc.length }));
      if (errors.length) return { errors, files: [] };
      const out = [v.charset ? '<meta charset="UTF-8">' : null, v.viewport ? '<meta name="viewport" content="width=device-width, initial-scale=1">' : null, `<title>${escHtml(v.title)}</title>`, v.desc ? `<meta name="description" content="${escHtml(v.desc)}">` : null, v.keywords ? `<meta name="keywords" content="${escHtml(v.keywords)}">` : null, v.author ? `<meta name="author" content="${escHtml(v.author)}">` : null, `<meta name="robots" content="${v.robots}">`, v.tcolor ? `<meta name="theme-color" content="${v.theme}">` : null, v.canonical ? `<link rel="canonical" href="${escHtml(v.canonical)}">` : null].filter(Boolean).join('\n');
      return { files: [{ name: 'meta-tags.html', content: out + '\n', lang: 'html', mime: 'text/html' }], warnings };
    } }),

  'og-meta': () => formTool({
    fields: [TXT('title', 'ui.ogTitle', 'CodeLab Developer'), { ...TXT('desc', 'ui.ogDesc', 'Pusat alat pembangun web serba lengkap — percuma, pantas dan selamat.'), type: 'textarea', rows: 3, wide: true }, T('url', 'ui.ogUrl', 'https://contoh.my/'), T('image', 'ui.ogImage', 'https://contoh.my/og-image.png'), TXT('site', 'ui.siteName', 'CodeLab Developer'),
      SEL('type', 'ui.ogType', 'website', ['website', 'article', 'product', 'profile']), SEL('locale', 'ui.ogLocale', 'ms_MY', ['ms_MY', 'en_US', 'en_GB', 'ar_AR']), SEL('card', 'ui.twitterCard', 'summary_large_image', ['summary', 'summary_large_image']), T('handle', 'ui.twitterHandle', '', { ph: '@akaun' })],
    // Pratonton tidak memuatkan imej luar (CSP + privasi): hanya ruang letak imej.
    preview: (v) => h('div', { class: 'og-card' }, h('div', { class: 'og-img' }, icon('image', 32)),
      h('div', { class: 'og-body' }, h('small', {}, (() => { try { return new URL(v.url).hostname; } catch { return '—'; } })()), h('strong', {}, v.title || '—'), h('p', {}, v.desc || ''))),
    build: (v) => {
      const errors = [];
      if (!v.title.trim()) errors.push(err('val.titleRequired'));
      if (!isHttpUrl(v.url)) errors.push(err('val.badUrl', { field: 'og:url' }));
      if (v.image && !isHttpUrl(v.image)) errors.push(err('val.badUrl', { field: 'og:image' }));
      if (v.handle && !/^@\w{1,15}$/.test(v.handle)) errors.push(err('val.badHandle'));
      if (errors.length) return { errors, files: [] };
      const m = (a, b, c) => (c ? `<meta ${a}="${b}" content="${escHtml(c)}">` : null);
      const out = [m('property', 'og:title', v.title), m('property', 'og:description', v.desc), m('property', 'og:type', v.type), m('property', 'og:url', v.url), m('property', 'og:image', v.image), m('property', 'og:site_name', v.site), m('property', 'og:locale', v.locale), m('name', 'twitter:card', v.card), m('name', 'twitter:title', v.title), m('name', 'twitter:description', v.desc), m('name', 'twitter:image', v.image), m('name', 'twitter:site', v.handle)].filter(Boolean).join('\n');
      return { files: [{ name: 'og-meta.html', content: out + '\n', lang: 'html', mime: 'text/html' }] };
    } }),

  'favicon-generator': () => favicon(),

  'robots-txt': () => formTool({
    fields: [SEL('preset', 'ui.preset', 'allow', [['allow', 'ui.rb_allow'], ['block', 'ui.rb_block'], ['custom', 'ui.rb_custom'], ['noai', 'ui.rb_noai']]), T('agent', 'ui.userAgent', '*'), TA('disallow', 'ui.disallowPaths', '/admin/\n/private/', 4), TA('allow', 'ui.allowPaths', '', 3), NUM('delay', 'ui.crawlDelay', 0, 0, 120), T('sitemap', 'ui.sitemapUrl', 'https://contoh.my/sitemap.xml')],
    build: (v) => {
      const errors = [], warnings = [];
      const agents = v.agent.split(',').map((x) => x.trim()).filter(Boolean);
      if (v.preset === 'custom' && !agents.length) errors.push(err('val.agentRequired'));
      const dis = lines(v.disallow), alw = lines(v.allow);
      for (const p of [...dis, ...alw]) if (!/^(\/|\*)/.test(p)) errors.push(err('val.pathSlash', { path: p }));
      if (v.sitemap && !isHttpUrl(v.sitemap)) errors.push(err('val.badUrl', { field: 'Sitemap' }));
      if (errors.length) return { errors, files: [] };
      let txt = '';
      if (v.preset === 'allow') txt = 'User-agent: *\nAllow: /\n';
      else if (v.preset === 'block') { txt = 'User-agent: *\nDisallow: /\n'; warnings.push(err('val.blockAll')); }
      else {
        if (v.preset === 'noai') txt += ['GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Bytespider'].map((a) => `User-agent: ${a}\nDisallow: /\n`).join('\n') + '\n';
        txt += (agents.length ? agents : ['*']).map((a) => `User-agent: ${a}`).join('\n') + '\n';
        txt += dis.map((p) => `Disallow: ${p}`).join('\n') + (dis.length ? '\n' : (alw.length ? '' : 'Disallow:\n'));
        txt += alw.map((p) => `Allow: ${p}`).join('\n') + (alw.length ? '\n' : '');
        if (v.delay > 0) txt += `Crawl-delay: ${v.delay}\n`;
      }
      if (v.sitemap) txt += `\nSitemap: ${v.sitemap}\n`;
      warnings.push(err('val.robotsNote'));
      return { files: [{ name: 'robots.txt', content: txt, lang: 'txt', mime: 'text/plain' }], warnings };
    } }),

  'sitemap-xml': () => formTool({
    fields: [T('base', 'ui.baseUrl', 'https://contoh.my'), TA('urls', 'ui.urlList', '/\n/alat/format\n/alat/minify\nhttps://contoh.my/tentang', 6), SEL('freq', 'ui.changefreq', 'weekly', ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']), NUM('prio', 'ui.priority', 0.8, 0, 1, 0.1), CK('lastmod', 'ui.includeLastmod', true), T('date', 'ui.lastmodDate', dayKey())],
    build: (v) => {
      const errors = [];
      if (v.base && !isHttpUrl(v.base)) errors.push(err('val.badUrl', { field: 'base' }));
      if (v.lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) errors.push(err('val.badDate'));
      const list = [...new Set(lines(v.urls).map((u) => { try { return new URL(u, v.base || undefined).href; } catch { errors.push(err('val.badUrlLine', { url: u.slice(0, 60) })); return null; } }).filter(Boolean))];
      if (!list.length && !errors.length) errors.push(err('val.noUrls'));
      if (list.length > 50000) errors.push(err('val.tooManyUrls'));
      if (v.prio < 0 || v.prio > 1) errors.push(err('val.badPriority'));
      if (errors.length) return { errors, files: [] };
      const x = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const body = list.map((u) => `  <url>\n    <loc>${x(u)}</loc>\n${v.lastmod ? `    <lastmod>${v.date}</lastmod>\n` : ''}    <changefreq>${v.freq}</changefreq>\n    <priority>${Number(v.prio).toFixed(1)}</priority>\n  </url>`).join('\n');
      return { files: [{ name: 'sitemap.xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, lang: 'xml', mime: 'application/xml' }] };
    } }),

  'htaccess': () => formTool({
    fields: [CK('https', 'ui.ht_https', true), SEL('www', 'ui.ht_www', 'none', [['none', 'ui.ht_wwwNone'], ['remove', 'ui.ht_wwwRemove'], ['add', 'ui.ht_wwwAdd']]), CK('gzip', 'ui.ht_gzip', true), CK('cache', 'ui.ht_cache', true), CK('headers', 'ui.ht_headers', true), CK('noindex', 'ui.ht_noListing', true), CK('spa', 'ui.ht_spa', false), T('e404', 'ui.ht_404', '', { ph: '/404.html' }), T('hotlink', 'ui.ht_hotlink', '', { ph: 'contoh.my' }), TA('redirects', 'ui.ht_redirects', '/lama /baru', 3)],
    build: (v) => {
      const errors = [];
      if (v.e404 && !/^\/[\w./-]*$/.test(v.e404)) errors.push(err('val.badPath', { field: '404' }));
      if (v.hotlink && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v.hotlink)) errors.push(err('val.badDomain'));
      const reds = lines(v.redirects).map((l) => l.split(/\s+/));
      for (const r of reds) if (r.length !== 2 || !r[0].startsWith('/') || !(/^\//.test(r[1]) || isHttpUrl(r[1])) || /[\s"']/.test(r.join(''))) errors.push(err('val.badRedirect', { line: r.join(' ').slice(0, 50) }));
      if (errors.length) return { errors, files: [] };
      const s = ['# Dijana oleh CodeLab Developer — Genius Digital', '# Untuk Apache (mod_rewrite). Tidak berfungsi di GitHub Pages / Nginx.'];
      if (v.noindex) s.push('', 'Options -Indexes');
      if (v.e404) s.push('', `ErrorDocument 404 ${v.e404}`);
      const rw = [];
      if (v.https) rw.push('RewriteCond %{HTTPS} off', 'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]');
      if (v.www === 'remove') rw.push('RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]', 'RewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]');
      if (v.www === 'add') rw.push('RewriteCond %{HTTP_HOST} !^www\\. [NC]', 'RewriteRule ^ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]');
      reds.forEach(([a, b]) => rw.push(`RewriteRule ^${a.replace(/^\//, '').replace(/[.+*?^$()[\]{}|\\]/g, '\\$&')}/?$ ${b} [L,R=301]`));
      if (v.hotlink) rw.push('RewriteCond %{HTTP_REFERER} !^$', `RewriteCond %{HTTP_REFERER} !^https?://(www\\.)?${v.hotlink.replace(/\./g, '\\.')} [NC]`, 'RewriteRule \\.(jpg|jpeg|png|gif|webp|svg)$ - [F,NC,L]');
      if (v.spa) rw.push('RewriteCond %{REQUEST_FILENAME} !-f', 'RewriteCond %{REQUEST_FILENAME} !-d', 'RewriteRule ^ /index.html [L]');
      if (rw.length) s.push('', '<IfModule mod_rewrite.c>', '  RewriteEngine On', ...rw.map((x) => '  ' + x), '</IfModule>');
      if (v.gzip) s.push('', '<IfModule mod_deflate.c>', '  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json image/svg+xml', '</IfModule>');
      if (v.cache) s.push('', '<IfModule mod_expires.c>', '  ExpiresActive On', '  ExpiresByType image/webp "access plus 1 year"', '  ExpiresByType image/png "access plus 1 year"', '  ExpiresByType image/svg+xml "access plus 1 year"', '  ExpiresByType text/css "access plus 1 month"', '  ExpiresByType application/javascript "access plus 1 month"', '  ExpiresByType text/html "access plus 0 seconds"', '</IfModule>');
      if (v.headers) s.push('', '<IfModule mod_headers.c>', '  Header always set X-Content-Type-Options "nosniff"', '  Header always set X-Frame-Options "SAMEORIGIN"', '  Header always set Referrer-Policy "strict-origin-when-cross-origin"', '  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"', '</IfModule>');
      return { files: [{ name: '.htaccess', content: s.join('\n') + '\n', lang: 'txt', mime: 'text/plain' }] };
    } }),

  'web-manifest': () => formTool({
    fields: [TXT('name', 'ui.appName', 'CodeLab Developer'), TXT('short', 'ui.shortName', 'CodeLab'), TXT('desc', 'ui.metaDesc', 'Pusat alat pembangun web serba lengkap.', { wide: true }), T('start', 'ui.startUrl', '/'), T('scope', 'ui.scope', '/'), SEL('display', 'ui.display', 'standalone', ['standalone', 'fullscreen', 'minimal-ui', 'browser']), SEL('orient', 'ui.orientation', 'any', ['any', 'portrait', 'landscape']),
      COL('theme', 'ui.themeColor', '#4f46e5'), COL('bg', 'ui.bgColor', '#ffffff'), SEL('lang', 'ui.docLang', 'ms', [['ms', 'ms'], ['en', 'en'], ['ar', 'ar']].map(([v, l]) => ({ v, l, raw: true }))), T('icons', 'ui.iconBase', '/icons/'), CK('maskable', 'ui.maskable', true)],
    build: (v) => {
      const errors = [], warnings = [];
      if (!v.name.trim()) errors.push(err('val.nameRequired'));
      if (!/^\/?[\w./-]*$/.test(v.start) || !/^\/?[\w./-]*$/.test(v.scope)) errors.push(err('val.badPath', { field: 'start_url / scope' }));
      if (!/^\/?[\w./-]*$/.test(v.icons)) errors.push(err('val.badPath', { field: 'icons' }));
      if (!parseHex(v.theme) || !parseHex(v.bg)) errors.push(err('val.badColor'));
      if (v.short.length > 12) warnings.push(err('val.shortLong'));
      if (errors.length) return { errors, files: [] };
      const base = v.icons.endsWith('/') ? v.icons : v.icons + '/';
      const icons = [{ src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' }];
      if (v.maskable) icons.push({ src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' });
      const m = { name: v.name, short_name: v.short || v.name, description: v.desc, start_url: v.start, scope: v.scope, display: v.display, orientation: v.orient, theme_color: v.theme, background_color: v.bg, lang: v.lang, dir: v.lang === 'ar' ? 'rtl' : 'ltr', icons };
      return { files: [{ name: 'manifest.webmanifest', content: JSON.stringify(m, null, 2) + '\n', lang: 'json', mime: 'application/manifest+json' }, { name: 'snippet.html', content: `<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="${v.theme}">\n`, lang: 'html', mime: 'text/html' }], warnings };
    } }),

  'schema-markup': () => schemaTool(),
};

// ---------- Favicon (canvas → PNG/ICO/ZIP) ----------
function favicon() {
  const SIZES = [16, 32, 48, 180, 192, 512];
  const ctl = controls([SEL('mode', 'ui.fv_mode', 'text', [['text', 'ui.fv_text'], ['image', 'ui.fv_image']]), TXT('text', 'ui.fv_chars', 'CL', { dir: 'ltr' }), COL('bg', 'ui.background', '#4f46e5'), COL('fg', 'ui.foreground', '#ffffff'), SEL('shape', 'ui.fv_shape', 'rounded', [['square', 'ui.fv_square'], ['rounded', 'ui.fv_rounded'], ['circle', 'ui.fv_circle']]), { key: 'size', type: 'range', label: 'ui.fv_fontScale', min: 40, max: 90, value: 62, unit: '%' }], () => render());
  const e = errorBox(); const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const prev = h('div', { class: 'fav-previews' }); const snippet = outputPane({ lang: 'html', filename: 'favicon-snippet.html', mime: 'text/html', label: 'ui.htmlSnippet' });
  let img = null; const canvases = new Map();
  function paint(size) {
    const v = ctl.values(); const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
    x.save(); x.beginPath();
    const r = v.shape === 'circle' ? size / 2 : v.shape === 'rounded' ? size * 0.22 : 0;
    x.roundRect ? x.roundRect(0, 0, size, size, r) : x.rect(0, 0, size, size); x.clip();
    if (v.mode === 'image' && img) { const s = Math.min(img.width, img.height); x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size); }
    else { x.fillStyle = v.bg; x.fillRect(0, 0, size, size); x.fillStyle = v.fg; x.textAlign = 'center'; x.textBaseline = 'middle'; const txt = [...(v.text || '?')].slice(0, 2).join(''); x.font = `800 ${Math.round(size * (v.size / 100) * (txt.length > 1 ? 0.8 : 1.1))}px system-ui, "Segoe UI", sans-serif`; x.fillText(txt, size / 2, size / 2 + size * 0.04); }
    x.restore(); return c;
  }
  function render() {
    e.hide(); canvases.clear(); clear(prev);
    SIZES.forEach((s) => { const c = paint(s); canvases.set(s, c); const disp = h('canvas', { width: s, height: s, role: 'img', 'aria-label': `${s}x${s}`, style: `width:${Math.min(s, 96)}px;height:${Math.min(s, 96)}px` }); disp.getContext('2d').drawImage(c, 0, 0); prev.append(h('figure', {}, disp, h('figcaption', {}, `${s}×${s}`))); });
    snippet.set(`<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="${ctl.values().bg}">\n`);
  }
  const blob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
  const bytes = async (c) => new Uint8Array(await (await blob(c)).arrayBuffer());
  async function ico() {
    const sizes = [16, 32, 48]; const pngs = await Promise.all(sizes.map((s) => bytes(canvases.get(s))));
    const head = new Uint8Array(6 + 16 * sizes.length); const dv = new DataView(head.buffer); dv.setUint16(2, 1, true); dv.setUint16(4, sizes.length, true);
    let off = head.length; sizes.forEach((s, i) => { const o = 6 + i * 16; head[o] = s; head[o + 1] = s; dv.setUint16(o + 4, 1, true); dv.setUint16(o + 6, 32, true); dv.setUint32(o + 8, pngs[i].length, true); dv.setUint32(o + 12, off, true); off += pngs[i].length; });
    return new Blob([head, ...pngs], { type: 'image/x-icon' });
  }
  const dl = async () => {
    try {
      const [p16, p32, p180, p192, p512] = await Promise.all([16, 32, 180, 192, 512].map((s) => bytes(canvases.get(s))));
      const ic = new Uint8Array(await (await ico()).arrayBuffer());
      const v = ctl.values(); const manifest = JSON.stringify({ name: '', short_name: '', icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }, { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }], theme_color: v.bg, background_color: '#ffffff', display: 'standalone' }, null, 2);
      downloadBlob(makeZip([{ name: 'favicon.ico', data: ic }, { name: 'favicon-16x16.png', data: p16 }, { name: 'favicon-32x32.png', data: p32 }, { name: 'apple-touch-icon.png', data: p180 }, { name: 'android-chrome-192x192.png', data: p192 }, { name: 'android-chrome-512x512.png', data: p512 }, { name: 'site.webmanifest', data: manifest }, { name: 'favicon-snippet.html', data: snippet.get() }]), 'favicon-pack.zip'); toast('toast.downloaded');
    } catch { e.show(new ToolError('err.generic')); }
  };
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 10 * 1024 * 1024) { e.show(new ToolError(f.size > 10485760 ? 'err.fileTooLarge' : 'err.notImage')); return; }
    const url = URL.createObjectURL(f); const im = new Image();
    im.onload = () => { img = im; ctl.set({ mode: 'image' }); render(); URL.revokeObjectURL(url); }; im.onerror = () => e.show(new ToolError('err.notImage')); im.src = url;
  });
  const el = h('div', { class: 'tool' }, ctl.el, h('div', { class: 'toolbar' }, btn('upload', 'ui.uploadImage', { onclick: () => file.click() }), file, btn('file-down', 'ui.downloadZip', { variant: 'primary', onclick: dl })), h('p', { class: 'muted', i18n: 'ui.localOnly' }), e.el, h('div', { class: 'pane' }, prev), snippet.el);
  render(); return el;
}

// ---------- Schema.org JSON-LD ----------
function schemaTool() {
  const url = (k, l, v = '') => T(k, l, v); const txt = (k, l, v = '') => TXT(k, l, v, { dir: undefined });
  const S = {
    Organization: { f: [txt('name', 'ui.sc_name', 'Genius Digital'), url('url', 'ui.sc_url', 'https://contoh.my'), url('logo', 'ui.sc_logo', 'https://contoh.my/logo.png'), url('email', 'ui.sc_email', 'hello@contoh.my'), url('phone', 'ui.sc_phone', '+60123456789'), TA('sameAs', 'ui.sc_sameAs', 'https://github.com/contoh', 3)], req: ['name', 'url'],
      b: (v) => ({ '@type': 'Organization', name: v.name, url: v.url, logo: v.logo || undefined, email: v.email || undefined, telephone: v.phone || undefined, sameAs: lines(v.sameAs).length ? lines(v.sameAs) : undefined }) },
    WebSite: { f: [txt('name', 'ui.sc_name', 'CodeLab Developer'), url('url', 'ui.sc_url', 'https://contoh.my'), url('search', 'ui.sc_searchTpl', 'https://contoh.my/?q={search_term_string}')], req: ['name', 'url'],
      b: (v) => ({ '@type': 'WebSite', name: v.name, url: v.url, potentialAction: v.search ? { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: v.search }, 'query-input': 'required name=search_term_string' } : undefined }) },
    Article: { f: [txt('headline', 'ui.sc_headline', 'Cara menggunakan CodeLab Developer'), txt('author', 'ui.sc_author', 'Genius Digital'), url('image', 'ui.sc_image', 'https://contoh.my/gambar.jpg'), T('date', 'ui.sc_datePublished', dayKey()), txt('publisher', 'ui.sc_publisher', 'Genius Digital'), { ...txt('desc', 'ui.sc_desc', ''), type: 'textarea', rows: 3, wide: true }], req: ['headline', 'author', 'date'],
      b: (v) => ({ '@type': 'Article', headline: v.headline, author: { '@type': 'Person', name: v.author }, image: v.image || undefined, datePublished: v.date, publisher: v.publisher ? { '@type': 'Organization', name: v.publisher } : undefined, description: v.desc || undefined }) },
    Product: { f: [txt('name', 'ui.sc_name', 'Pakej Pro'), url('image', 'ui.sc_image', ''), txt('brand', 'ui.sc_brand', 'Genius Digital'), T('sku', 'ui.sc_sku', 'SKU-001'), NUM('price', 'ui.sc_price', 99, 0, 1e9, 0.01), T('currency', 'ui.sc_currency', 'MYR'), SEL('avail', 'ui.sc_availability', 'InStock', ['InStock', 'OutOfStock', 'PreOrder']), { ...txt('desc', 'ui.sc_desc', ''), type: 'textarea', rows: 3, wide: true }], req: ['name', 'currency'],
      b: (v) => ({ '@type': 'Product', name: v.name, image: v.image || undefined, description: v.desc || undefined, sku: v.sku || undefined, brand: v.brand ? { '@type': 'Brand', name: v.brand } : undefined, offers: { '@type': 'Offer', price: String(v.price), priceCurrency: v.currency.toUpperCase(), availability: `https://schema.org/${v.avail}` } }) },
    FAQPage: { f: [TA('qa', 'ui.sc_faq', 'S: Adakah CodeLab percuma?\nJ: Ya, semua alat percuma.\nS: Adakah data saya dihantar ke pelayan?\nJ: Tidak, semuanya berjalan dalam pelayar.', 8, { dir: undefined })], req: ['qa'],
      b: (v) => { const mainEntity = []; let q = null; lines(v.qa).forEach((l) => { const m = /^([SJQAسج])\s*[:：]\s*(.+)$/i.exec(l); if (!m) { if (q) q.a += ' ' + l; return; } if (/[SQس]/i.test(m[1])) { q = { q: m[2], a: '' }; mainEntity.push(q); } else if (q) q.a += (q.a ? ' ' : '') + m[2]; }); return { '@type': 'FAQPage', mainEntity: mainEntity.filter((x) => x.a).map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }; } },
    LocalBusiness: { f: [txt('name', 'ui.sc_name', 'Kedai Contoh'), url('url', 'ui.sc_url', 'https://contoh.my'), txt('street', 'ui.sc_street', 'Jalan Contoh 1'), txt('city', 'ui.sc_city', 'Kuala Lumpur'), T('postcode', 'ui.sc_postcode', '50000'), T('country', 'ui.sc_country', 'MY'), T('phone', 'ui.sc_phone', '+60312345678'), T('hours', 'ui.sc_hours', 'Mo-Fr 09:00-18:00'), T('price', 'ui.sc_priceRange', 'RM')], req: ['name'],
      b: (v) => ({ '@type': 'LocalBusiness', name: v.name, url: v.url || undefined, telephone: v.phone || undefined, priceRange: v.price || undefined, openingHours: v.hours || undefined, address: { '@type': 'PostalAddress', streetAddress: v.street, addressLocality: v.city, postalCode: v.postcode, addressCountry: v.country } }) },
    BreadcrumbList: { f: [TA('items', 'ui.sc_breadcrumb', 'Utama | https://contoh.my/\nAlat | https://contoh.my/alat\nFormatter | https://contoh.my/alat/formatter', 5, { dir: undefined })], req: ['items'],
      b: (v) => ({ '@type': 'BreadcrumbList', itemListElement: lines(v.items).map((l, i) => { const [n, u] = l.split('|').map((x) => x.trim()); return { '@type': 'ListItem', position: i + 1, name: n, item: u }; }) }) },
  };
  const typeSel = field({ key: 'type', type: 'select', label: 'ui.sc_type', value: 'Organization', options: Object.keys(S).map((k) => ({ v: k, l: k, raw: true })) });
  const host = h('div'), errBox = h('ul', { class: 'alert alert-error', hidden: true }), out = outputPane({ lang: 'html', filename: 'schema.json.html', mime: 'text/html', label: 'ui.output' });
  let ctl;
  function mount() { ctl = controls(S[typeSel.get()].f, update); host.replaceChildren(ctl.el); update(); }
  function update() {
    const def = S[typeSel.get()], v = ctl.values(), errs = [];
    def.req.forEach((k) => { if (!String(v[k] ?? '').trim()) errs.push(err('val.required', { field: k })); });
    ['url', 'logo', 'image', 'search'].forEach((k) => { if (v[k] && !isHttpUrl(String(v[k]).replace('{search_term_string}', 'x'))) errs.push(err('val.badUrl', { field: k })); });
    if (v.date && !/^\d{4}-\d{2}-\d{2}/.test(v.date)) errs.push(err('val.badDate'));
    if (typeSel.get() === 'FAQPage' && !errs.length && !def.b(v).mainEntity.length) errs.push(err('val.faqEmpty'));
    if (typeSel.get() === 'BreadcrumbList' && lines(v.items).some((l) => !isHttpUrl((l.split('|')[1] || '').trim()))) errs.push(err('val.breadcrumbFmt'));
    errBox.hidden = !errs.length; errBox.replaceChildren(...errs.map((e) => h('li', { i18n: e.key, i18nArgs: e.args })));
    if (errs.length) { out.set(''); return; }
    const json = JSON.stringify({ '@context': 'https://schema.org', ...def.b(v) }, null, 2).replace(/</g, '\\u003c');
    out.set(`<script type="application/ld+json">\n${json}\n</script>\n`);
  }
  typeSel.input.addEventListener('change', mount);
  const el = h('div', { class: 'tool tool-form' }, h('div', { class: 'form-grid' }, h('div', { class: 'form-side pane' }, h('div', { class: 'pane-head' }, h('h3', { i18n: 'ui.settings' })), h('div', { class: 'controls' }, typeSel.el), host), h('div', { class: 'form-main' }, errBox, out.el)));
  mount(); return el;
}

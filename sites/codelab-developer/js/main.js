// Titik masuk panel AWAM. Panel Admin berasingan di /admin/.
import { initI18n, onLangChange, t, applyI18n } from './i18n/i18n.js';
import { h } from './utils/dom.js';
import { createHeader } from './components/header.js';
import { createSidebar } from './components/sidebar.js';
import { createFooter } from './components/footer.js';
import * as P from './pages.js';
import { toolById } from './registry.js';
import { trackVisit, provider } from './statistics/stats.js';
import { applyDisabled } from './registry.js';
import { SITE } from './config.js';
import { registerSW } from './components/install.js';

const main = h('main', { id: 'main', tabindex: '-1' });
let overlay;

function openDrawer(v) {
  document.body.classList.toggle('drawer-open', v);
  overlay.hidden = !v;
}

const ROUTES = [
  [/^\/?$/, () => P.homePage(), null],
  [/^\/tools$/, () => P.allToolsPage(), 'nav.allTools'],
  [/^\/category\/([\w-]+)$/, (m) => P.categoryPage(m[1]), (m) => `cat.${m[1]}.name`],
  [/^\/tool\/([\w-]+)$/, (m) => P.toolPage(m[1]), (m) => (toolById(m[1]) ? `tool.${m[1]}.name` : null)],
  [/^\/favorites$/, () => P.favoritesPage(), 'side.favorites'],
  [/^\/history$/, () => P.historyPage(), 'side.history'],
  [/^\/guide$/, () => P.guidePage(), 'page.guide.title'],
  [/^\/about$/, () => P.textPage('about'), 'page.about.title'],
  [/^\/privacy$/, () => P.textPage('privacy'), 'page.privacy.title'],
  [/^\/terms$/, () => P.textPage('terms'), 'page.terms.title'],
  [/^\/contact$/, () => P.contactPage(), 'page.contact.title'],
];

let titleKey = null;
function setTitle() { document.title = titleKey ? `${t(titleKey)} · ${SITE.name}` : t('meta.title'); }

let navSeq = 0;
async function route() {
  const my = ++navSeq;
  const path = location.hash.replace(/^#/, '') || '/';
  let node = null; titleKey = null;
  for (const [re, fn, tk] of ROUTES) {
    const m = re.exec(path);
    if (m) { node = await fn(m); titleKey = typeof tk === 'function' ? tk(m) : tk; break; }
  }
  if (my !== navSeq) return;
  main.replaceChildren(node || P.notFound());
  setTitle();
  document.querySelectorAll('[data-route]').forEach((a) => {
    const r = a.dataset.route.replace(/^#/, '');
    const on = r === '/' ? path === '/' : path === r || path.startsWith(r + '/') || (r.startsWith('/category/') && path === r) || (path.startsWith('/tool/') && toolCategoryRoute(path) === r);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  openDrawer(false);
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}
const toolCategoryRoute = (path) => { const t0 = toolById(path.split('/')[2]); return t0 ? `/category/${t0.cat}` : ''; };

async function boot() {
  const app = document.getElementById('app');
  try {
    await initI18n();
  } catch (e) {
    app.replaceChildren(h('div', { class: 'boot-error', role: 'alert' }, h('h1', {}, SITE.name), h('p', {}, 'Tidak dapat memuatkan fail terjemahan (locales/*.json). Buka laman melalui pelayan HTTP (cth. GitHub Pages atau `python3 -m http.server`), bukan terus dari fail.'), h('p', {}, 'Could not load locale files. Please serve the site over HTTP.')));
    console.error(e); return;
  }
  // Konfigurasi alat daripada admin (had masa 2.5s; jika gagal, semua alat kekal aktif)
  try { applyDisabled(await Promise.race([provider.getDisabledTools(), new Promise((_, r) => setTimeout(r, 2500))])); } catch { /* kekal */ }
  overlay = h('div', { class: 'drawer-overlay', hidden: true, onclick: () => openDrawer(false) });
  const skip = h('a', { class: 'skip-link', href: '#main', i18n: 'a11y.skip' });
  app.replaceChildren(skip, createHeader({ onMenu: () => openDrawer(!document.body.classList.contains('drawer-open')) }), createSidebar(), overlay, main, createFooter());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openDrawer(false); });
  window.addEventListener('hashchange', route);
  onLangChange(() => { applyI18n(); setTitle(); });
  applyI18n();
  await route();
  document.documentElement.classList.add('ready');
  trackVisit();
}
registerSW();
boot();

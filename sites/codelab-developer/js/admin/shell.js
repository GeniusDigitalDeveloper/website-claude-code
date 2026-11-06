// Kerangka kongsi semua halaman admin (pengepala, bar sisi, banner amaran, pengawal akses UX).
import { initI18n, onLangChange, applyI18n, t, LANGS, getLang, setLang } from '../i18n/i18n.js';
import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { logo } from '../components/ui-parts.js';
import { guard, auth } from './auth.js';
import { SITE } from '../config.js';

export const NAV = [
  ['dashboard', 'adm.nav.dashboard', 'layout-dashboard'], ['tools', 'adm.nav.tools', 'wrench'], ['statistics', 'adm.nav.statistics', 'chart-column'],
  ['users', 'adm.nav.users', 'users'], ['content', 'adm.nav.content', 'file-text'], ['settings', 'adm.nav.settings', 'settings'],
];

export async function bootAdmin(pageId, render) {
  const app = document.getElementById('app');
  try { await initI18n(); } catch (e) { app.textContent = 'Locale load failed — serve over HTTP.'; return; }
  const state = await guard();
  const open = pageId === 'login' || pageId === 'index';
  if (pageId === 'index') { location.replace(state.mode === 'ok' ? 'dashboard.html' : 'login.html'); return; }
  if (state.mode === 'anon' && !open) { location.replace('login.html'); return; }
  if (state.mode === 'ok' && pageId === 'login') { location.replace('dashboard.html'); return; }
  const footerEl = () => h('footer', { class: 'site-footer admin-footer' }, h('div', { class: 'footer-copy' }, h('p', { i18n: 'footer.copyright', i18nArgs: { brand: SITE.brand, year: SITE.year } })));
  const mkLangs = () => { const el = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' }, Object.entries(LANGS).map(([c, l]) => h('button', { type: 'button', class: 'lang-btn', lang: c, 'aria-pressed': String(c === getLang()), onclick: () => setLang(c) }, l.label))); onLangChange((l) => el.querySelectorAll('.lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.lang === l)))); return el; };
  if (pageId === 'login') {
    document.body.classList.add('auth-page');
    app.replaceChildren(h('div', { class: 'auth-wrap' }, h('div', { class: 'auth-top' }, h('a', { class: 'btn btn-ghost btn-sm', href: '../index.html' }, icon('globe', 16), h('span', { i18n: 'adm.backPublic' })), mkLangs()),
      h('main', { id: 'main', class: 'auth-main' }, await render(state)), footerEl()));
    onLangChange(() => { applyI18n(); document.title = `${t('adm.login.title')} · ${SITE.name}`; });
    applyI18n(); document.title = `${t('adm.login.title')} · ${SITE.name}`; return;
  }
  const menu = h('button', { type: 'button', class: 'icon-btn menu-btn', aria: 'nav.menu', onclick: () => { document.body.classList.toggle('drawer-open'); overlay.hidden = !document.body.classList.contains('drawer-open'); } }, icon('menu', 22));
  const overlay = h('div', { class: 'drawer-overlay', hidden: true, onclick: () => { document.body.classList.remove('drawer-open'); overlay.hidden = true; } });
  const langs = mkLangs();
  const header = h('header', { class: 'site-header', id: 'header' }, menu,
    h('a', { class: 'brand', href: 'dashboard.html' }, logo(38), h('span', { class: 'brand-text' }, h('strong', {}, SITE.name), h('small', { i18n: 'adm.panelName' }))), h('span', { class: 'spacer' }), langs);
  const side = h('aside', { class: 'sidebar', id: 'sidebar' }, h('nav', {}, h('ul', {},
    NAV.map(([id, key, ic]) => h('li', {}, h('a', { href: `${id}.html`, 'aria-current': id === pageId ? 'page' : null }, icon(ic, 20), h('span', { class: 'label', i18n: key })))),
    h('li', { class: 'sep' }, h('a', { href: '../index.html' }, icon('globe', 20), h('span', { class: 'label', i18n: 'adm.backPublic' }))))),
    state.user ? h('div', { class: 'account-card' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, (state.user.email || '?')[0].toUpperCase()), h('div', { class: 'acc-text' }, h('strong', { i18n: state.mode === 'ok' ? 'adm.role.admin' : 'adm.mode.denied' }), h('small', { dir: 'ltr' }, state.user.email)),
      h('button', { type: 'button', class: 'icon-btn', aria: 'adm.signOut', tip: 'adm.signOut', onclick: async () => { await auth.signOut(); location.replace('login.html'); } }, icon('log-in', 18))) : null);
  const banner = state.mode === 'denied' ? h('div', { class: 'alert alert-error admin-banner', role: 'alert' }, icon('circle-alert', 18),
    h('div', {}, h('strong', { i18n: 'adm.denied.title' }), h('p', { i18n: 'adm.denied.text' }))) : null;
  if (state.mode === 'denied' && !open) { app.replaceChildren(header, side, overlay, h('main', { id: 'main' }, h('div', { class: 'page' }, banner)), footerEl()); applyI18n(); return; }
  const body = h('div', { class: 'page-body' }, h('div', { class: 'loading', role: 'status' }, icon('refresh-cw', 20, 'spin'), h('span', { i18n: 'common.loading' })));
  const main = h('main', { id: 'main', tabindex: '-1' }, h('div', { class: 'page' }, banner, h('div', { class: 'admin-title' }, h('h1', { class: 'page-title', i18n: `adm.nav.${pageId}` })), body));
  app.replaceChildren(header, side, overlay, main, footerEl());
  applyI18n();
  try { body.replaceChildren(await render(state)); } catch (e) { console.error(e); body.replaceChildren(h('div', { class: 'alert alert-error', role: 'alert' }, icon('triangle-alert', 16), h('span', { i18n: 'common.loadError' }))); }
  onLangChange(() => { applyI18n(); document.title = `${t(`adm.nav.${pageId}`)} · ${t('adm.panelName')}`; });
  applyI18n(); document.title = `${t(`adm.nav.${pageId}`)} · ${t('adm.panelName')}`;
}

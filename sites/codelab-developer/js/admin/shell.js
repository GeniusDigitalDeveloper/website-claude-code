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
  const menu = h('button', { type: 'button', class: 'icon-btn menu-btn', aria: 'nav.menu', onclick: () => { document.body.classList.toggle('drawer-open'); overlay.hidden = !document.body.classList.contains('drawer-open'); } }, icon('menu', 22));
  const overlay = h('div', { class: 'drawer-overlay', hidden: true, onclick: () => { document.body.classList.remove('drawer-open'); overlay.hidden = true; } });
  const langs = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' }, Object.entries(LANGS).map(([c, l]) => h('button', { type: 'button', class: 'lang-btn', lang: c, 'aria-pressed': String(c === getLang()), onclick: () => setLang(c) }, l.label)));
  onLangChange((l) => langs.querySelectorAll('.lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.lang === l))));
  const header = h('header', { class: 'site-header', id: 'header' }, menu,
    h('a', { class: 'brand', href: 'index.html' }, logo(38), h('span', { class: 'brand-text' }, h('strong', {}, SITE.name), h('small', { i18n: 'adm.panelName' }))),
    h('span', { class: 'admin-pill' }, icon('shield', 14), h('span', { i18n: state.mode === 'ok' ? 'adm.mode.ok' : 'adm.mode.preview' })), langs);
  const side = h('aside', { class: 'sidebar', id: 'sidebar' }, h('nav', {}, h('ul', {},
    NAV.map(([id, key, ic]) => h('li', {}, h('a', { href: `${id}.html`, 'aria-current': id === pageId ? 'page' : null }, icon(ic, 20), h('span', { class: 'label', i18n: key })))),
    h('li', { class: 'sep' }, h('a', { href: '../index.html' }, icon('globe', 20), h('span', { class: 'label', i18n: 'adm.backPublic' }))))));
  const banner = state.mode === 'ok' ? null : h('div', { class: 'alert alert-warn admin-banner', role: 'note' }, icon('triangle-alert', 18),
    h('div', {}, h('strong', { i18n: 'adm.banner.title' }), h('p', { i18n: 'adm.banner.text' })));
  const main = h('main', { id: 'main', tabindex: '-1' }, h('div', { class: 'page' }, banner, h('h1', { class: 'page-title', i18n: `adm.nav.${pageId}` }), await render(state)));
  const footer = h('footer', { class: 'site-footer admin-footer' }, h('div', { class: 'footer-copy' }, h('p', { i18n: 'footer.copyright', i18nArgs: { brand: SITE.brand, year: SITE.year } })));
  app.replaceChildren(header, side, overlay, main, footer);
  onLangChange(() => { applyI18n(); document.title = `${t(`adm.nav.${pageId}`)} · ${t('adm.panelName')}`; });
  applyI18n(); document.title = `${t(`adm.nav.${pageId}`)} · ${t('adm.panelName')}`;
  void auth;
}

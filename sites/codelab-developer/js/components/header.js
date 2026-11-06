import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { logo } from './ui-parts.js';
import { createSearch } from './search.js';
import { LANGS, getLang, setLang, onLangChange } from '../i18n/i18n.js';
import { SITE } from '../config.js';

export function createHeader({ onMenu }) {
  const menu = h('button', { type: 'button', class: 'icon-btn menu-btn', aria: 'nav.menu', 'aria-controls': 'sidebar', onclick: onMenu }, icon('menu', 22));
  const nav = h('nav', { class: 'top-nav', 'aria-label': 'Main' },
    [['#/', 'nav.home', 'home'], ['#/tools', 'nav.allTools', 'layout-grid'], ['#/favorites', 'nav.favorites', 'heart'], ['#/guide', 'nav.guide', 'book-open'], ['#/about', 'nav.about', 'info']]
      .map(([href, key, ic]) => h('a', { href, dataset: { route: href } }, icon(ic, 16), h('span', { i18n: key }))));
  const langs = h('div', { class: 'lang-switch', role: 'group', 'aria-label': 'Language' },
    Object.entries(LANGS).map(([code, l]) => h('button', { type: 'button', class: 'lang-btn', lang: code, 'aria-pressed': String(code === getLang()), title: l.name, onclick: () => setLang(code) }, l.label)));
  onLangChange((l) => langs.querySelectorAll('.lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.lang === l))));
  const brand = h('a', { class: 'brand', href: '#/', 'aria-label': SITE.name }, logo(38), h('span', { class: 'brand-text' }, h('strong', {}, SITE.name), h('small', {}, SITE.brand)));
  return h('header', { class: 'site-header', id: 'header' }, menu, brand, nav, createSearch(), langs);
}

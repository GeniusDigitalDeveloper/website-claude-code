import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { CATEGORIES, toolsByCat } from '../registry.js';
import { store } from '../utils/storage.js';

export function createSidebar() {
  const items = [
    { href: '#/', key: 'side.home', ic: 'house' },
    { href: '#/tools', key: 'nav.allTools', ic: 'layout-grid' },
    ...CATEGORIES.map((c) => ({ href: `#/category/${c.id}`, key: `cat.${c.id}.name`, ic: c.icon, count: toolsByCat(c.id).length })),
    { href: '#/favorites', key: 'side.favorites', ic: 'heart', sep: true },
    { href: '#/history', key: 'side.history', ic: 'history' },
    { href: '#/guide', key: 'side.guide', ic: 'book-open' },
  ];
  const collapse = h('button', { type: 'button', class: 'collapse-btn', 'aria-pressed': 'false', aria: 'side.collapse', tip: 'side.collapse' }, icon('panel-left', 18), h('span', { i18n: 'side.collapse' }));
  const aside = h('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Sidebar' },
    h('nav', {}, h('ul', {}, items.map((it) => h('li', { class: it.sep ? 'sep' : '' }, h('a', { href: it.href, dataset: { route: it.href }, tip: it.key }, icon(it.ic, 20), h('span', { class: 'label', i18n: it.key }), it.count ? h('em', { class: 'count' }, String(it.count)) : null))))),
    collapse);
  const set = (v) => { document.body.classList.toggle('sidebar-collapsed', v); collapse.setAttribute('aria-pressed', String(v)); store.set('sidebarCollapsed', v); };
  collapse.addEventListener('click', () => set(!document.body.classList.contains('sidebar-collapsed')));
  if (store.get('sidebarCollapsed', false)) set(true);
  return aside;
}

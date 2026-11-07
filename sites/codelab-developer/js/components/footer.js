import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { logo } from './ui-parts.js';
import { SITE } from '../config.js';
import { loadSummary, trackVisit } from '../statistics/stats.js';
import { fmtNum } from '../i18n/i18n.js';

export function createFooter() {
  const card = (key, ic) => { const v = h('strong', { class: 'stat-value', dir: 'ltr' }, '—'); return { v, el: h('div', { class: 'fstat' }, icon(ic, 18), v, h('span', { class: 'fstat-label', i18n: key })) }; };
  const users = card('stats.users', 'users'), today = card('stats.today', 'activity'), month = card('stats.month', 'calendar-clock'), total = card('stats.total', 'chart-column');
  const link = (href, key) => h('a', { href }, h('span', { i18n: key }));
  const footer = h('footer', { class: 'site-footer', id: 'footer' },
    h('div', { class: 'footer-stats', role: 'group', 'aria-label': 'Statistik' }, users.el, today.el, month.el, total.el),
    h('div', { class: 'footer-main' },
      h('div', { class: 'footer-brand' }, h('div', { class: 'brand-row' }, logo(40), h('div', {}, h('strong', {}, SITE.name), h('small', {}, SITE.brand))), h('p', { class: 'slogan', i18n: 'footer.slogan' })),
      h('nav', { class: 'footer-links', 'aria-label': 'Footer' }, link('#/about', 'footer.about'), link('#/privacy', 'footer.privacy'), link('#/terms', 'footer.terms'), link('#/contact', 'footer.contact'), link('#/guide', 'footer.guide'))),
    h('div', { class: 'footer-copy' }, h('p', { i18n: 'footer.copyright', i18nArgs: { brand: SITE.brand, year: SITE.year } })));
  const set = (c, n) => { c.v.textContent = n === null || n === undefined ? '—' : fmtNum(n); };
  // Baca selepas lawatan dicatat supaya angka tidak bercampur dengan tulisan tertunda.
  trackVisit().catch(() => {}).then(() => loadSummary()).then((s) => { set(users, s.registeredUsers); set(today, s.today); set(month, s.month); set(total, s.total); });
  return footer;
}

import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { logo } from './ui-parts.js';
import { SITE } from '../config.js';
import { loadSummary } from '../statistics/stats.js';
import { dayKey, monthKey, msUntilNextDay, msUntilNextMonth, nextMonthStart, fmtCountdown } from '../statistics/kl-time.js';
import { fmtNum } from '../i18n/i18n.js';
import { setT } from '../utils/dom.js';

export function createFooter() {
  const card = (key, ic) => { const v = h('strong', { class: 'stat-value', dir: 'ltr' }, '—'); return { v, el: h('div', { class: 'fstat' }, h('span', { class: 'fstat-ico' }, icon(ic, 20)), h('div', {}, v, h('span', { class: 'fstat-label', i18n: key }))) }; };
  const users = card('stats.users', 'users'), today = card('stats.today', 'activity'), month = card('stats.month', 'calendar-clock'), total = card('stats.total', 'chart-column');
  const status = h('p', { class: 'stats-status' });
  const dayInfo = h('span', { dir: 'ltr' }), monthInfo = h('span', { dir: 'ltr' }), dayKeyEl = h('span', { dir: 'ltr' });
  const rules = h('ul', { class: 'stats-rules' },
    h('li', {}, icon('clock', 16), h('span', { i18n: 'stats.ruleDay' }), ' ', dayInfo),
    h('li', {}, icon('calendar-clock', 16), h('span', { i18n: 'stats.ruleMonth' }), ' ', monthInfo),
    h('li', {}, icon('chart-column', 16), h('span', { i18n: 'stats.ruleTotal' })));
  const link = (href, key) => h('a', { href }, h('span', { i18n: key }));
  const footer = h('footer', { class: 'site-footer', id: 'footer' },
    h('div', { class: 'footer-stats' },
      h('div', { class: 'footer-stats-head' }, h('h2', { i18n: 'stats.title' }), h('span', { class: 'tz-badge' }, icon('globe', 14), h('span', { i18n: 'stats.tz' }), ' ', dayKeyEl)),
      h('div', { class: 'fstat-grid' }, users.el, today.el, month.el, total.el), status, rules),
    h('div', { class: 'footer-main' },
      h('div', { class: 'footer-brand' }, h('div', { class: 'brand-row' }, logo(40), h('div', {}, h('strong', {}, SITE.name), h('small', {}, SITE.brand))), h('p', { class: 'slogan', i18n: 'footer.slogan' })),
      h('nav', { class: 'footer-links', 'aria-label': 'Footer' }, link('#/about', 'footer.about'), link('#/privacy', 'footer.privacy'), link('#/terms', 'footer.terms'), link('#/contact', 'footer.contact'), link('#/guide', 'footer.guide'))),
    h('div', { class: 'footer-copy' }, h('p', { i18n: 'footer.copyright', i18nArgs: { brand: SITE.brand, year: SITE.year } })));

  const setVal = (c, n, connected) => { c.v.textContent = n === null || n === undefined ? '—' : fmtNum(n); c.v.title = connected ? '' : ''; };
  async function refresh() {
    const s = await loadSummary();
    setVal(users, s.registeredUsers); setVal(today, s.today); setVal(month, s.month); setVal(total, s.total);
    setT(status, s.connected ? 'stats.connected' : 'stats.notConnected');
    status.className = `stats-status ${s.connected ? 'on' : 'off'}`;
  }
  function tick() {
    const now = new Date();
    dayKeyEl.textContent = `${dayKey(now)} MYT`;
    dayInfo.textContent = `(${fmtCountdown(msUntilNextDay(now))})`;
    const nm = nextMonthStart(now);
    monthInfo.textContent = `(${monthKey(nm)}-01 00:00 MYT · ${fmtCountdown(msUntilNextMonth(now))})`;
  }
  tick(); setInterval(tick, 1000); refresh();
  return footer;
}

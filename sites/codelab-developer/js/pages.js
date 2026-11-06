// Halaman awam (panel awam sahaja — tiada fungsi pentadbiran di sini).
import { h, clear } from './utils/dom.js';
import { icon } from './utils/icons.js';
import { CATEGORIES, TOOLS, toolById, catById, toolsByCat, loadTool } from './registry.js';
import { toolCard, favButton } from './components/ui-parts.js';
import { favorites, history, usage, onUserDataChange } from './utils/storage.js';
import { t, getLang, LANGS } from './i18n/i18n.js';
import { SITE } from './config.js';

const POPULAR = ['json-formatter', 'css-gradient', 'password-generator', 'color-palette', 'html-formatter', 'js-minifier', 'base64-encode', 'regex-tester'];
const BADGES = ['free', 'noVps', 'inBrowser', 'fast', 'safe'];
const section = (titleKey, ...kids) => h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', { i18n: titleKey })), ...kids);
const grid = (tools, opts) => h('div', { class: 'tool-grid' }, tools.map((x) => toolCard(x, opts)));
const emptyState = (ic, key, hint) => h('div', { class: 'empty' }, icon(ic, 40), h('p', { i18n: key }), hint ? h('a', { class: 'btn btn-primary', href: '#/tools' }, h('span', { i18n: hint })) : null);

export function homePage() {
  const heroText = h('div', { class: 'hero-content' },
    h('span', { class: 'eyebrow' }, icon('sparkles', 14), h('span', { i18n: 'hero.eyebrow' })),
    h('h1', {}, SITE.name),
    h('p', { class: 'hero-sub', i18n: 'hero.subtitle' }),
    h('p', { class: 'hero-desc', i18n: 'hero.desc' }),
    h('ul', { class: 'badges', 'aria-label': 'Features' }, BADGES.map((b) => h('li', {}, icon('circle-check', 16), h('span', { i18n: `badge.${b}` })))),
    h('div', { class: 'hero-cta' }, h('a', { class: 'btn btn-primary btn-lg', href: '#/tools' }, icon('layout-grid', 18), h('span', { i18n: 'hero.cta' })), h('a', { class: 'btn btn-glass btn-lg', href: '#/guide' }, icon('book-open', 18), h('span', { i18n: 'hero.cta2' }))));
  const hero = h('section', { class: 'hero' }, h('div', { class: 'hero-bg', role: 'img', 'aria-label': 'Banner CodeLab Developer' }), h('div', { class: 'hero-overlay' }), heroText);

  const recent = history.all().slice(0, 4).map((x) => toolById(x.id)).filter(Boolean);
  const cats = h('div', { class: 'cat-grid' }, CATEGORIES.map((c) => h('a', { class: `cat-card c-${c.color}`, href: `#/category/${c.id}` },
    h('span', { class: 'tool-ico' }, icon(c.icon, 24)), h('strong', { i18n: `cat.${c.id}.name` }), h('p', { i18n: `cat.${c.id}.desc` }), h('span', { class: 'cat-count' }, h('span', {}, String(toolsByCat(c.id).length)), ' ', h('span', { i18n: 'common.tools' })))));
  const stat = (n, key) => h('div', { class: 'hero-stat' }, h('strong', {}, String(n)), h('span', { i18n: key }));
  return h('div', { class: 'page home' }, hero,
    h('div', { class: 'hero-stats' }, stat(TOOLS.length, 'common.tools'), stat(CATEGORIES.length, 'common.categories'), stat(3, 'common.languages'), stat(0, 'common.apiKeys')),
    section('home.categories', cats),
    section('home.popular', h('p', { class: 'muted note', i18n: 'home.popularNote' }), grid(POPULAR.map(toolById).filter(Boolean))),
    recent.length ? section('home.recent', grid(recent, { compact: true })) : null);
}

export function allToolsPage() {
  const q = h('input', { type: 'search', class: 'filter-input', ph: 'search.placeholder', aria: 'search.label' });
  const chips = h('div', { class: 'chips', role: 'group' });
  let cat = 'all';
  const list = h('div', { class: 'tool-grid' });
  const searchAll = (s) => { const terms = s.trim().toLowerCase().split(/\s+/); return TOOLS.filter((x) => { const hay = `${t(`tool.${x.id}.name`)} ${t(`cat.${x.cat}.name`)} ${x.kw} ${x.id}`.toLowerCase(); return terms.every((w) => hay.includes(w)); }).map((x) => x.id); };
  const paint = () => {
    const ids = q.value.trim() ? searchAll(q.value) : null;
    const items = TOOLS.filter((x) => (!ids || ids.includes(x.id)) && (cat === 'all' || x.cat === cat));
    clear(list);
    if (!items.length) list.append(h('p', { class: 'muted', i18n: 'search.none' }));
    items.forEach((x) => list.append(toolCard(x)));
  };
  const mkChip = (id, key) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(id === 'all'), onclick: () => { cat = id; chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); paint(); } }, h('span', { i18n: key })); return b; };
  chips.append(mkChip('all', 'common.all'), ...CATEGORIES.map((c) => mkChip(c.id, `cat.${c.id}.name`)));
  q.addEventListener('input', paint); paint();
  return h('div', { class: 'page' }, h('h1', { class: 'page-title', i18n: 'nav.allTools' }), h('p', { class: 'page-sub', i18n: 'page.allTools.sub' }), h('div', { class: 'filters' }, q, chips), list);
}

export function categoryPage(id) {
  const c = catById(id); if (!c) return notFound();
  return h('div', { class: `page c-${c.color}` }, h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/', i18n: 'nav.home' }), icon('chevron-right', 14, 'flip-rtl'), h('span', { i18n: `cat.${id}.name` })),
    h('div', { class: 'page-hero' }, h('span', { class: 'tool-ico lg' }, icon(c.icon, 30)), h('div', {}, h('h1', { class: 'page-title', i18n: `cat.${id}.name` }), h('p', { class: 'page-sub', i18n: `cat.${id}.desc` }))), grid(toolsByCat(id)));
}

export async function toolPage(id) {
  const tool = toolById(id); if (!tool) return notFound();
  const c = catById(tool.cat);
  const body = h('div', { class: 'tool-body' }, h('div', { class: 'loading', role: 'status' }, icon('refresh-cw', 20, 'spin'), h('span', { i18n: 'common.loading' })));
  const page = h('div', { class: `page tool-page c-${c.color}` },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/', i18n: 'nav.home' }), icon('chevron-right', 14, 'flip-rtl'), h('a', { href: `#/category/${c.id}`, i18n: `cat.${c.id}.name` }), icon('chevron-right', 14, 'flip-rtl'), h('span', { i18n: `tool.${id}.name` })),
    h('div', { class: 'page-hero' }, h('span', { class: 'tool-ico lg' }, icon(tool.icon, 30)), h('div', { class: 'grow' }, h('h1', { class: 'page-title', i18n: `tool.${id}.name` }), h('p', { class: 'page-sub', i18n: `cat.${c.id}.desc` })), favButton(id)),
    h('p', { class: 'privacy-note' }, icon('shield-check', 16), h('span', { i18n: 'tool.privacyNote' })), body);
  history.add(id); usage.hit(id);
  try {
    const build = await loadTool(id);
    if (!build) throw new Error('missing');
    body.replaceChildren(build());
  } catch (e) {
    console.error(e);
    body.replaceChildren(h('div', { class: 'alert alert-error', role: 'alert' }, icon('triangle-alert', 16), h('span', { i18n: 'common.loadError' })));
  }
  return page;
}

export function favoritesPage() {
  const host = h('div');
  const paint = () => { const items = favorites.all().map(toolById).filter(Boolean); host.replaceChildren(items.length ? grid(items) : emptyState('heart', 'fav.empty', 'fav.browse')); };
  const off = onUserDataChange(() => { if (!host.isConnected) { off(); return; } paint(); });
  paint();
  return h('div', { class: 'page' }, h('h1', { class: 'page-title', i18n: 'side.favorites' }), h('p', { class: 'page-sub', i18n: 'fav.sub' }), host);
}

export function historyPage() {
  const host = h('div');
  const fmt = new Intl.DateTimeFormat(LANGS[getLang()].locale + '-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' });
  const paint = () => {
    const items = history.all().map((x) => ({ tool: toolById(x.id), at: x.at })).filter((x) => x.tool);
    host.replaceChildren(items.length ? h('ul', { class: 'history-list' }, items.map(({ tool, at }) => h('li', {}, h('a', { href: `#/tool/${tool.id}` }, icon(tool.icon, 18), h('strong', { i18n: `tool.${tool.id}.name` })), h('time', { dir: 'ltr' }, fmt.format(new Date(at)))))) : emptyState('history', 'hist.empty', 'fav.browse'));
  };
  const off = onUserDataChange(() => { if (!host.isConnected) { off(); return; } paint(); });
  paint();
  return h('div', { class: 'page' }, h('div', { class: 'page-hero' }, h('div', { class: 'grow' }, h('h1', { class: 'page-title', i18n: 'side.history' }), h('p', { class: 'page-sub', i18n: 'hist.sub' })),
    h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => history.clear() }, icon('trash-2', 16), h('span', { i18n: 'hist.clear' }))), host);
}

const has = (k) => t(k) !== k;
export function textPage(name, extra) {
  const paras = []; for (let i = 1; has(`page.${name}.p${i}`); i++) paras.push(h('p', { i18n: `page.${name}.p${i}` }));
  const heads = [];
  for (let i = 1; has(`page.${name}.h${i}`); i++) heads.push(h('section', {}, h('h2', { i18n: `page.${name}.h${i}` }), h('p', { i18n: `page.${name}.hp${i}` })));
  return h('div', { class: 'page prose' }, h('h1', { class: 'page-title', i18n: `page.${name}.title` }), ...paras, ...heads, extra || null);
}

export function contactPage() {
  const c = SITE.contact; const rows = [];
  if (c.email) rows.push(h('li', {}, icon('mail', 18), h('a', { href: `mailto:${encodeURIComponent(c.email).replace('%40', '@')}` }, c.email)));
  if (c.whatsapp && /^\d{8,15}$/.test(c.whatsapp)) rows.push(h('li', {}, icon('send', 18), h('a', { href: `https://wa.me/${c.whatsapp}`, rel: 'noopener noreferrer', target: '_blank' }, `WhatsApp +${c.whatsapp}`)));
  if (c.website && /^https?:\/\//.test(c.website)) rows.push(h('li', {}, icon('globe', 18), h('a', { href: c.website, rel: 'noopener noreferrer', target: '_blank' }, c.website)));
  return textPage('contact', rows.length ? h('ul', { class: 'contact-list' }, rows) : h('div', { class: 'alert alert-warn' }, icon('info', 16), h('span', { i18n: 'page.contact.empty' })));
}

export function guidePage() {
  const steps = [1, 2, 3, 4].map((i) => h('li', {}, h('strong', { i18n: `guide.s${i}.t` }), h('p', { i18n: `guide.s${i}.d` })));
  const faq = [1, 2, 3, 4, 5].map((i) => h('details', {}, h('summary', { i18n: `guide.q${i}` }), h('p', { i18n: `guide.a${i}` })));
  return h('div', { class: 'page prose' }, h('h1', { class: 'page-title', i18n: 'page.guide.title' }), h('p', { class: 'page-sub', i18n: 'page.guide.p1' }),
    h('h2', { i18n: 'guide.stepsTitle' }), h('ol', { class: 'steps' }, steps), h('h2', { i18n: 'guide.shortcuts' }), h('p', {}, h('kbd', {}, '/'), ' — ', h('span', { i18n: 'guide.shortcutSearch' })),
    h('h2', { i18n: 'guide.faqTitle' }), h('div', { class: 'faq' }, faq));
}

export function notFound() {
  return h('div', { class: 'page' }, emptyState('circle-alert', 'common.notFound', 'common.backHome'));
}

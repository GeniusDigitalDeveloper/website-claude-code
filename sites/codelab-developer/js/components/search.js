// Carian global segera: nama alat (bahasa semasa), kategori dan fungsi (kata kunci).
import { h, clear } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { TOOLS, catById } from '../registry.js';
import { t, onLangChange } from '../i18n/i18n.js';

export function searchTools(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const terms = s.split(/\s+/);
  return TOOLS.map((tool) => {
    const name = t(`tool.${tool.id}.name`).toLowerCase(), cat = t(`cat.${tool.cat}.name`).toLowerCase();
    const hay = `${name} ${cat} ${tool.kw} ${tool.id.replace(/-/g, ' ')}`;
    if (!terms.every((x) => hay.includes(x))) return null;
    let score = 1;
    if (name.startsWith(s)) score = 10; else if (name.includes(s)) score = 6; else if (cat.includes(s)) score = 3;
    return { tool, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8).map((x) => x.tool);
}

export function createSearch() {
  const input = h('input', { type: 'search', id: 'global-search', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'search-list', 'aria-autocomplete': 'list', ph: 'search.placeholder', aria: 'search.label', autocomplete: 'off', spellcheck: 'false' });
  const list = h('ul', { id: 'search-list', class: 'search-list', role: 'listbox', hidden: true });
  const wrap = h('div', { class: 'search' }, icon('search', 18), input, list);
  let items = [], active = -1;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const paint = () => {
    clear(list); items = searchTools(input.value);
    if (!input.value.trim()) { close(); return; }
    if (!items.length) list.append(h('li', { class: 'search-empty', i18n: 'search.none' }));
    items.forEach((tool, i) => list.append(h('li', { role: 'option', id: `sr-${i}`, 'aria-selected': 'false' },
      h('a', { href: `#/tool/${tool.id}`, onclick: () => { input.value = ''; close(); } }, icon(tool.icon, 18), h('span', { class: 'sr-name', i18n: `tool.${tool.id}.name` }), h('small', { i18n: `cat.${tool.cat}.name` })))));
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
  };
  const mark = () => items.forEach((_, i) => { const li = list.children[i]; li.setAttribute('aria-selected', String(i === active)); li.classList.toggle('active', i === active); if (i === active) input.setAttribute('aria-activedescendant', li.id); });
  input.addEventListener('input', paint);
  input.addEventListener('focus', paint);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); mark(); }
    else if (e.key === 'Enter' && items.length) { location.hash = `#/tool/${items[Math.max(active, 0)].id}`; input.value = ''; close(); input.blur(); }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); input.focus(); } });
  onLangChange(() => { if (!list.hidden) paint(); });
  return wrap;
}

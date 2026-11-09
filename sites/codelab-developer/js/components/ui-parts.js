// Komponen kongsi: logo, butang kegemaran, kad alat.
import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { favorites, onUserDataChange } from '../utils/storage.js';
import { catById } from '../registry.js';

const LOGO = new URL('../../assets/icons/icon-192.png?v=3', import.meta.url).href;
/** Logo jenama (imej rasmi pengguna). */
export function logo(size = 36) {
  return h('img', { class: 'logo-mark', src: LOGO, width: size, height: size, alt: 'CodeLab Developer', decoding: 'async' });
}

export function favButton(id) {
  const b = h('button', { type: 'button', class: 'fav-btn', aria: 'ui.toggleFavorite' });
  const paint = () => { const on = favorites.has(id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.replaceChildren(icon('heart', 18)); };
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); favorites.toggle(id); });
  paint();
  const off = onUserDataChange(() => { if (!b.isConnected) { off(); return; } paint(); });
  return b;
}

export function toolCard(tool, { compact = false } = {}) {
  const cat = catById(tool.cat);
  return h('div', { class: `tool-card c-${cat.color} ${compact ? 'compact' : ''}` },
    h('a', { class: 'tool-card-link', href: `#/tool/${tool.id}` },
      h('span', { class: 'tool-ico' }, icon(tool.icon, 22)),
      h('span', { class: 'tool-meta' }, h('strong', { i18n: `tool.${tool.id}.name` }), compact ? null : h('small', { i18n: `cat.${tool.cat}.name` }))),
    favButton(tool.id));
}

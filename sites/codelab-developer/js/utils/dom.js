// Pembantu DOM kecil. Semua teks dimasukkan sebagai text node → selamat daripada XSS.
import { icon } from './icons.js';
import { t } from '../i18n/i18n.js';

/**
 * h('div', {class:'x', i18n:'key', onclick:fn}, ...children)
 * props khas: class, i18n (kunci terjemahan untuk textContent), i18nArgs, ph (placeholder i18n),
 *             aria (aria-label i18n), title (i18n), dataset, html TIDAK disokong.
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'i18n') { node.dataset.i18n = v; node.textContent = t(v, props.i18nArgs); }
    else if (k === 'i18nArgs') node.dataset.i18nArgs = JSON.stringify(v);
    else if (k === 'ph') { node.dataset.i18nPh = v; node.setAttribute('placeholder', t(v)); }
    else if (k === 'aria') { node.dataset.i18nAria = v; node.setAttribute('aria-label', t(v)); }
    else if (k === 'tip') { node.dataset.i18nTitle = v; node.setAttribute('title', t(v)); }
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'value') node.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') node[k] = !!v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Span dengan ikon + teks i18n */
export function iconText(name, key, size = 18) {
  return h('span', { class: 'icon-text' }, icon(name, size), h('span', { i18n: key }));
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const uid = (() => { let n = 0; return (p = 'id') => `${p}-${++n}`; })();

/** Tetapkan teks terjemahan dinamik (dikemas kini automatik bila bahasa ditukar). */
export function setT(node, key, args) {
  node.dataset.i18n = key;
  if (args) node.dataset.i18nArgs = JSON.stringify(args); else delete node.dataset.i18nArgs;
  node.textContent = t(key, args);
  return node;
}

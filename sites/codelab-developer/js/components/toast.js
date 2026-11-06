import { h } from '../utils/dom.js';
import { t } from '../i18n/i18n.js';

let host;
export function toast(key, args, kind = 'ok') {
  if (!host) {
    host = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const node = h('div', { class: `toast toast-${kind}` }, t(key, args));
  host.append(node);
  setTimeout(() => { node.classList.add('out'); setTimeout(() => node.remove(), 250); }, 2200);
}

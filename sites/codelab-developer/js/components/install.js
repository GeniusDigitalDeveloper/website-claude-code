// Pemasangan PWA: Android/Chrome/Edge (beforeinstallprompt) dan panduan iPhone/iPad (Safari).
import { h } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

let deferred = null;
const subs = new Set();
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const notify = () => subs.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

function iosDialog() {
  const dlg = h('dialog', { class: 'dlg pwa-dlg' },
    h('h2', { class: 'h3', i18n: 'pwa.iosTitle' }),
    h('ol', { class: 'steps-compact' }, [1, 2, 3].map((i) => h('li', { i18n: `pwa.iosStep${i}` }))),
    h('form', { method: 'dialog' }, h('button', { class: 'btn btn-primary', i18n: 'adm.close' })));
  document.body.append(dlg); return dlg;
}

/** Butang "Pasang Apl". Hanya kelihatan jika boleh dipasang dan belum dipasang. */
export function installButton(cls = 'btn btn-glass') {
  const btn = h('button', { type: 'button', class: cls, hidden: true }, icon('smartphone', 18), h('span', { i18n: 'pwa.install' }));
  let dlg;
  const paint = () => { btn.hidden = standalone() || !(deferred || isIOS()); };
  btn.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; notify(); }
    else { dlg ||= iosDialog(); dlg.showModal(); }
  });
  subs.add(() => { if (btn.isConnected) paint(); }); paint();
  return btn;
}

export function registerSW() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}));
}

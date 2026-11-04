// Ikon mata untuk tunjuk / sembunyi kata laluan. Bungkus input dalam <div class="pw"> dengan <button class="eye">.
import { icon } from './icons.js';
import { t } from './i18n.js';

export function setupPwToggles(root = document) {
  root.querySelectorAll('.pw').forEach((w) => {
    if (w.dataset.done) return;
    w.dataset.done = '1';
    const input = w.querySelector('input'), btn = w.querySelector('.eye');
    const paint = () => {
      const shown = input.type === 'text';
      btn.innerHTML = icon(shown ? 'eyeOff' : 'eye');
      btn.setAttribute('aria-label', t(shown ? 'pw_hide' : 'pw_show'));
      btn.setAttribute('aria-pressed', String(shown));
    };
    btn.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; paint(); input.focus(); });
    document.addEventListener('langchange', paint);
    paint();
  });
}

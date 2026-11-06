// Sistem terjemahan: kamus JSON berasingan (/locales/ms|en|ar.json), bahasa disimpan dalam localStorage.
import { store } from '../utils/storage.js';

export const LANGS = {
  ms: { label: 'BM', name: 'Bahasa Melayu', dir: 'ltr', locale: 'ms-MY' },
  en: { label: 'EN', name: 'English', dir: 'ltr', locale: 'en-GB' },
  ar: { label: 'AR', name: 'العربية', dir: 'rtl', locale: 'ar' },
};
export const DEFAULT_LANG = 'ms';

const dicts = {};
let current = DEFAULT_LANG;
const subscribers = new Set();
export const onLangChange = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };

const localesBase = () => new URL('../../locales/', import.meta.url);

async function loadDict(lang) {
  if (dicts[lang]) return dicts[lang];
  const res = await fetch(new URL(`${lang}.json`, localesBase()));
  if (!res.ok) throw new Error(`Gagal memuatkan locales/${lang}.json`);
  dicts[lang] = await res.json();
  return dicts[lang];
}

export const getLang = () => current;
export const isRTL = () => LANGS[current].dir === 'rtl';

export function t(key, args) {
  let s = dicts[current]?.[key] ?? dicts[DEFAULT_LANG]?.[key] ?? key;
  if (args) s = s.replace(/\{(\w+)\}/g, (_, k) => (args[k] !== undefined ? args[k] : `{${k}}`));
  return s;
}

/** Nombor mengikut locale semasa (digit Latin dikekalkan untuk kod/teknikal). */
export const fmtNum = (n, opts) => new Intl.NumberFormat(LANGS[current].locale + '-u-nu-latn', opts).format(n);

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => {
    const args = n.dataset.i18nArgs ? JSON.parse(n.dataset.i18nArgs) : undefined;
    n.textContent = t(n.dataset.i18n, args);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((n) => n.setAttribute('placeholder', t(n.dataset.i18nPh)));
  root.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-title]').forEach((n) => n.setAttribute('title', t(n.dataset.i18nTitle)));
}

function applyDocument() {
  const l = LANGS[current];
  document.documentElement.lang = current;
  document.documentElement.dir = l.dir;
  document.title = t('meta.title');
  const d = document.querySelector('meta[name="description"]');
  if (d) d.setAttribute('content', t('meta.description'));
  applyI18n();
}

export async function initI18n() {
  const saved = store.get('lang', null);
  current = saved in LANGS ? saved : DEFAULT_LANG;
  await loadDict(DEFAULT_LANG);
  if (current !== DEFAULT_LANG) await loadDict(current).catch(() => { current = DEFAULT_LANG; });
  applyDocument();
}

export async function setLang(lang) {
  if (!(lang in LANGS)) return;
  await loadDict(lang);
  current = lang;
  store.set('lang', lang);
  applyDocument();
  subscribers.forEach((f) => f(lang));
}

"use client";
/**
 * Bilingual UI (English default, Bahasa Melayu optional).
 * Components are written in Malay; when the language is English, a DOM translator swaps
 * every UI text node and the aria-label / title / placeholder attributes using the EN
 * dictionary. Song, artist, album and user content is marked translate="no" and never touched.
 * Switching back to Malay restores the original text instantly (no reload).
 */
import { EN, EN_PATTERNS } from "./en";

export type Lang = "en" | "ms";
let lang: Lang = "en";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const DICT = new Map(Object.entries(EN).map(([k, v]) => [norm(k), v]));

/** Translate a Malay UI string into the current language (no-op for Malay). */
export function tr(s: string): string {
  if (lang === "ms" || !s) return s;
  const key = norm(s);
  if (!key || !/[a-zA-Z]/.test(key)) return s;
  const hit = DICT.get(key);
  let out: string | undefined = hit;
  if (out === undefined)
    for (const [re, rep] of EN_PATTERNS) {
      if (re.test(key)) {
        out = key.replace(re, (...m) => rep.replace(/\$(\d)/g, (_, i) => tr(String(m[Number(i)]))));
        break;
      }
    }
  if (out === undefined) return s;
  // keep the original leading/trailing whitespace (JSX text nodes rely on it)
  const lead = s.match(/^\s*/)?.[0] ?? "";
  const trail = s.match(/\s*$/)?.[0] ?? "";
  return lead + out + trail;
}

const ATTRS = ["aria-label", "title", "placeholder", "aria-valuetext"] as const;
const origText = new WeakMap<Text, string>();
const origAttr = new WeakMap<Element, Record<string, string>>();
const SKIP = "script,style,noscript,textarea,code,[translate=no],[data-no-i18n]";

function skip(el: Element | null) {
  return !el || !!el.closest(SKIP);
}

function doText(n: Text) {
  const parent = n.parentElement;
  if (skip(parent)) return;
  const cur = n.nodeValue ?? "";
  const known = origText.get(n);
  // React (or anything) wrote a new value: that is the new Malay source
  const source = known !== undefined && cur === tr(known) ? known : cur;
  origText.set(n, source);
  const want = lang === "en" ? tr(source) : source;
  if (want !== cur) n.nodeValue = want;
}

function doAttrs(el: Element) {
  if (skip(el)) return;
  let rec = origAttr.get(el);
  for (const a of ATTRS) {
    const cur = el.getAttribute(a);
    if (cur == null) continue;
    rec ??= {};
    const known = rec[a];
    const source = known !== undefined && cur === tr(known) ? known : cur;
    rec[a] = source;
    const want = lang === "en" ? tr(source) : source;
    if (want !== cur) el.setAttribute(a, want);
  }
  if (rec) origAttr.set(el, rec);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (skip(el)) return;
  doAttrs(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let n: Node | null;
  while ((n = w.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
  }
}

let observer: MutationObserver | null = null;
let applying = false;

export function setLang(next: Lang) {
  lang = next;
  if (typeof document === "undefined") return;
  document.documentElement.lang = next === "en" ? "en" : "ms";
  applying = true;
  walk(document.body);
  applying = false;
  document.documentElement.classList.remove("i18n-wait");
  if (!observer) {
    observer = new MutationObserver((muts) => {
      if (applying) return;
      applying = true;
      for (const m of muts) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
      applying = false;
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
  }
}

export const getLang = () => lang;

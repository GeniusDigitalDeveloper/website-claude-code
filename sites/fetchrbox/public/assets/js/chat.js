import { $, esc, reduced } from './ui.js';
import { sfx } from './sfx.js';
import { t, pick, getLang } from './i18n.js';

const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['yang', 'dan', 'atau', 'ke', 'di', 'dengan', 'untuk', 'ini', 'itu', 'the', 'a', 'is', 'to', 'of', 'nak', 'boleh', 'tak', 'ada', 'macam', 'mana', 'apa', 'kenapa', 'saya', 'aku', 'i', 'how', 'can', 'do', 'what', 'في', 'من', 'على', 'هل', 'ما']);

function score(query, f) {
  const q = norm(query);
  const toks = q.split(' ').filter((x) => x && !STOP.has(x));
  let s = 0;
  for (const k of f.keywords || []) {
    const nk = norm(k);
    if (nk && q.includes(nk)) s += 2 + nk.length / 8;
  }
  const qt = new Set([...Object.values(f.q || {})].flatMap((x) => norm(x).split(' ')).filter((x) => x && !STOP.has(x)));
  for (const x of toks) if (qt.has(x)) s += 1;
  return s;
}

/** getFaq: fungsi yang memulangkan senarai FAQ semasa (dikemas kini masa nyata). */
export function initChat(getFaq, { onInsertUrl } = {}) {
  const chat = $('#chat'), fab = $('#fab'), msgs = $('#msgs'), form = $('#chatForm'), input = $('#chatIn');
  let greeted = false;

  const add = (text, who = 'bot', action) => {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    el.innerHTML = esc(text);
    if (action) { const b = document.createElement('button'); b.className = 'btn gold sm act'; b.textContent = action.label; b.addEventListener('click', action.fn); el.append(b); }
    msgs.append(el);
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  };
  const botSay = (text, action) => new Promise((res) => {
    const typing = document.createElement('div');
    typing.className = 'msg bot typing'; typing.innerHTML = '<i></i><i></i><i></i>';
    msgs.append(typing); msgs.scrollTo({ top: msgs.scrollHeight });
    setTimeout(() => { typing.remove(); add(text, 'bot', action); sfx.msg(); res(); }, reduced ? 0 : 450 + Math.min(text.length * 6, 700));
  });

  function answer(text) {
    const url = text.match(/https?:\/\/\S+/)?.[0];
    if (url) return botSay(t('chat_url'), { label: t('chat_put'), fn: () => { onInsertUrl?.(url); close(); } });
    const n = norm(text);
    if (/^(assalamualaikum|salam)/.test(n) || /^(السلام|سلام)/.test(n)) return botSay(t('chat_hello'));
    if (/^(hai|hi|hello|helo|hey|مرحبا|اهلا|أهلا)/.test(n)) return botSay(t('chat_hi'));
    if (/^(terima kasih|tq|thanks|thank you|thx|شكرا|شكراً)/.test(n)) return botSay(t('chat_thanks'));
    const faq = getFaq();
    const ranked = faq.map((f) => ({ f, s: score(text, f) })).sort((a, b) => b.s - a.s);
    if (ranked[0]?.s >= 1.5) return botSay(pick(ranked[0].f.a));
    return botSay(t('chat_unsure') + '\n' + faq.slice(0, 3).map((f) => '• ' + pick(f.q)).join('\n'));
  }
  const send = (text) => { text = text.trim(); if (!text) return; add(text, 'me'); sfx.pop(); answer(text); };

  function paintQuick() {
    const quick = $('#quick');
    quick.innerHTML = '';
    getFaq().slice(0, 6).forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = pick(f.q);
      b.addEventListener('click', () => { add(pick(f.q), 'me'); botSay(pick(f.a)); });
      quick.append(b);
    });
  }
  paintQuick();
  document.addEventListener('langchange', paintQuick);

  function open() {
    chat.classList.add('show'); chat.setAttribute('aria-hidden', 'false'); fab.setAttribute('aria-expanded', 'true');
    sfx.open();
    if (!greeted) { greeted = true; botSay(t('chat_greet')); }
    paintQuick();
    setTimeout(() => input.focus({ preventScroll: true }), 300);
  }
  function close() { chat.classList.remove('show'); chat.setAttribute('aria-hidden', 'true'); fab.setAttribute('aria-expanded', 'false'); sfx.close(); }

  fab.addEventListener('click', () => (chat.classList.contains('show') ? close() : open()));
  $('#chatClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chat.classList.contains('show') && !$('#overlay').classList.contains('show')) close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
  return { paintQuick };
}

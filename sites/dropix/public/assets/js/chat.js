import { $, esc, reduced } from './ui.js';
import { sfx } from './sfx.js';

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['yang', 'dan', 'atau', 'ke', 'di', 'dengan', 'untuk', 'ini', 'itu', 'the', 'a', 'is', 'to', 'of', 'nak', 'boleh', 'tak', 'ada', 'macam', 'mana', 'apa', 'kenapa', 'saya', 'aku', 'i', 'how', 'can', 'do']);

function score(query, f) {
  const q = norm(query);
  const toks = q.split(' ').filter((t) => t && !STOP.has(t));
  let s = 0;
  for (const k of f.keywords || []) {
    const nk = norm(k);
    if (!nk) continue;
    if (q.includes(nk)) s += 2 + nk.length / 8; // frasa/kata kunci tepat
  }
  const qt = new Set(norm(f.q).split(' ').filter((t) => t && !STOP.has(t)));
  for (const t of toks) if (qt.has(t)) s += 1;
  return s;
}

export function initChat(faq, { onInsertUrl } = {}) {
  const chat = $('#chat'), fab = $('#fab'), msgs = $('#msgs'), form = $('#chatForm'), input = $('#chatIn');
  let greeted = false;

  const add = (text, who = 'bot', action) => {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    el.innerHTML = esc(text);
    if (action) { const b = document.createElement('button'); b.className = 'btn gold sm act'; b.textContent = action.label; b.addEventListener('click', action.fn); el.append(b); }
    msgs.append(el);
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    return el;
  };
  const botSay = (text, action) => new Promise((res) => {
    const t = document.createElement('div');
    t.className = 'msg bot typing'; t.innerHTML = '<i></i><i></i><i></i>';
    msgs.append(t); msgs.scrollTo({ top: msgs.scrollHeight });
    setTimeout(() => { t.remove(); add(text, 'bot', action); sfx.msg(); res(); }, reduced ? 0 : 450 + Math.min(text.length * 6, 700));
  });

  function answer(text) {
    const url = text.match(/https?:\/\/\S+/)?.[0];
    if (url) return botSay('Nampak macam pautan video. Saya letak dalam kotak muat turun, tekan Semak untuk teruskan.', { label: 'Letak dalam kotak', fn: () => { onInsertUrl?.(url); close(); } });
    if (/^(hai|hi|hello|helo|salam|assalamualaikum|hey)\b/.test(norm(text))) return botSay('Waalaikumussalam! Saya boleh bantu pasal cara muat turun, format, kualiti dan masalah biasa. Apa yang ustaz nak tahu?');
    if (/^(terima kasih|tq|thanks|thank you|thx)/.test(norm(text))) return botSay('Sama-sama! Kalau ada soalan lain, tanya sahaja.');
    const ranked = faq.map((f) => ({ f, s: score(text, f) })).sort((a, b) => b.s - a.s);
    if (ranked[0]?.s >= 1.5) return botSay(ranked[0].f.a);
    const sugg = faq.slice(0, 3).map((f) => '• ' + f.q).join('\n');
    return botSay('Maaf, saya belum pasti jawapannya. Cuba tanya dengan cara lain, atau pilih salah satu:\n' + sugg);
  }

  function send(text) {
    text = text.trim();
    if (!text) return;
    add(text, 'me'); sfx.pop();
    answer(text);
  }

  const quick = $('#quick');
  quick.innerHTML = '';
  faq.slice(0, 6).forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = f.q;
    b.addEventListener('click', () => { add(f.q, 'me'); botSay(f.a); });
    quick.append(b);
  });

  function open() {
    chat.classList.add('show'); chat.setAttribute('aria-hidden', 'false'); fab.setAttribute('aria-expanded', 'true');
    sfx.open();
    if (!greeted) { greeted = true; botSay('Assalamualaikum! Saya pembantu Dropix. Tanya apa sahaja pasal muat turun video atau MP3, atau pilih soalan di bawah.'); }
    setTimeout(() => input.focus({ preventScroll: true }), 300);
  }
  function close() { chat.classList.remove('show'); chat.setAttribute('aria-hidden', 'true'); fab.setAttribute('aria-expanded', 'false'); sfx.close(); }

  fab.addEventListener('click', () => (chat.classList.contains('show') ? close() : open()));
  $('#chatClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && chat.classList.contains('show') && !$('#overlay').classList.contains('show')) close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
}

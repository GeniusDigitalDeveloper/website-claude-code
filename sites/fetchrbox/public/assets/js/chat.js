import { $, $$, esc, reduced } from './ui.js';
import { sfx } from './sfx.js';
import { t, pick, getLang } from './i18n.js';
import { fb } from './firebase.js';

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
  const chat = $('#chat'), fab = $('#fab'), msgs = $('#msgs'), amsgs = $('#amsgs'), form = $('#chatForm'), input = $('#chatIn');
  let greeted = false, mode = 'bot', user = null, stops = [], aMsgs = [], meta = {}, lastCount = -1;

  const add = (text, who = 'bot', action, cls = '') => {
    const el = document.createElement('div');
    el.className = 'msg ' + who + (cls ? ' ' + cls : '');
    el.innerHTML = esc(text);
    if (action) { const b = document.createElement('button'); b.className = 'btn gold sm act'; b.textContent = action.label; b.addEventListener('click', action.fn); el.append(b); }
    msgs.append(el);
    msgs.scrollTo({ top: msgs.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  };
  const botSay = (text, action, cls) => new Promise((res) => {
    const typing = document.createElement('div');
    typing.className = 'msg bot typing'; typing.innerHTML = '<i></i><i></i><i></i>';
    msgs.append(typing); msgs.scrollTo({ top: msgs.scrollHeight });
    setTimeout(() => { typing.remove(); add(text, 'bot', action, cls); sfx.msg(); res(); }, reduced ? 0 : 450 + Math.min(text.length * 6, 700));
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

  /* ---------- Tab: Pembantu (bot) / Chat Admin ---------- */
  const isOpen = () => chat.classList.contains('show');
  function setMode(m) {
    mode = m;
    $$('#chatTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ct === m)));
    msgs.hidden = m !== 'bot'; amsgs.hidden = m !== 'admin';
    $('#quick').hidden = m !== 'bot'; $('#waBtn').hidden = m !== 'bot';
    input.placeholder = m === 'bot' ? t('chat_ph') : t('chat_ph_admin');
    if (m === 'admin') { paintAdmin(); markRead(); }
    paintDots();
  }
  $$('#chatTabs button').forEach((b) => b.addEventListener('click', () => { setMode(b.dataset.ct); sfx.pop(); }));

  // Balasan admin yang sudah diterjemah ke bahasa pengguna (mengikut bahasa yang pengguna taip) dipaparkan terus.
  function adminText(m) { return m.from === 'admin' && m.trUser ? m.trUser : m.text; }
  // Kesan bahasa daripada teks: skrip Arab = ar; selain itu ikut bahasa antara muka (ar -> en).
  const detectLang = (text) => (/[؀-ۿ]/.test(text) ? 'ar' : getLang() === 'ar' ? 'en' : getLang());
  function paintAdmin() {
    if (!user) { amsgs.innerHTML = `<div class="msg bot">${esc(t('chat_admin_login'))}</div>`; return; }
    amsgs.innerHTML = `<div class="msg bot hint">${esc(t('chat_admin_hint'))}</div>` + aMsgs.map((m) => `<div class="msg ${m.from === 'user' ? 'me' : 'bot'}">${esc(adminText(m))}</div>`).join('');
    amsgs.scrollTo({ top: amsgs.scrollHeight });
  }
  function markRead() { if (user && mode === 'admin' && isOpen() && meta.unreadUser) fb.markChatReadUser(user.uid); }
  function paintDots() {
    const unread = !!meta.unreadUser;
    $('#adminDot').hidden = !(unread && !(mode === 'admin' && isOpen()));
    $('#fabDot').hidden = !(unread && !isOpen());
  }

  async function sendAdmin(text) {
    if (!user) { paintAdmin(); return; }
    input.disabled = true;
    try { await fb.sendToAdmin(user, text.slice(0, 1000), detectLang(text)); sfx.pop(); } catch { sfx.error(); } finally { input.disabled = false; input.focus(); }
  }

  const send = (text) => {
    text = text.trim();
    if (!text) return;
    if (mode === 'admin') return sendAdmin(text);
    add(text, 'me'); sfx.pop(); answer(text);
  };

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
  // WhatsApp admin: 0177977935 (format antarabangsa Malaysia 60177977935), mesej pembuka ikut bahasa.
  const paintWa = () => { $('#waBtn').href = 'https://wa.me/60177977935?text=' + encodeURIComponent(t('wa_text')); };
  paintQuick(); paintWa();
  document.addEventListener('langchange', () => { paintQuick(); paintWa(); if (mode === 'admin') { paintAdmin(); input.placeholder = t('chat_ph_admin'); } });

  function open() {
    chat.classList.add('show'); chat.setAttribute('aria-hidden', 'false'); fab.setAttribute('aria-expanded', 'true');
    sfx.open();
    if (!greeted) { greeted = true; botSay(t('chat_greet')).then(() => botSay(t('chat_warn'), null, 'warn')); }
    paintQuick(); paintDots(); markRead();
    setTimeout(() => input.focus({ preventScroll: true }), 300);
  }
  function close() { chat.classList.remove('show'); chat.setAttribute('aria-hidden', 'true'); fab.setAttribute('aria-expanded', 'false'); sfx.close(); paintDots(); }

  // Gelembung soalan: "Ada apa yang boleh saya bantu?" muncul seketika selepas laman dibuka.
  const teaser = $('#teaser');
  const hideTeaser = (remember) => {
    if (teaser.hidden) return;
    teaser.classList.add('out');
    setTimeout(() => { teaser.hidden = true; teaser.classList.remove('out'); }, 300);
    if (remember) { try { sessionStorage.setItem('fetchrbox:teaser', '1'); } catch { /* abaikan */ } }
  };
  let seen = false;
  try { seen = !!sessionStorage.getItem('fetchrbox:teaser'); } catch { /* abaikan */ }
  if (!seen) {
    setTimeout(() => { if (!isOpen()) { teaser.hidden = false; sfx.msg(); } }, 2500);
    setTimeout(() => hideTeaser(false), 18000);
  }
  $('#teaserOpen').addEventListener('click', () => { hideTeaser(true); open(); });
  $('#teaserClose').addEventListener('click', () => hideTeaser(true));

  fab.addEventListener('click', () => { hideTeaser(true); if (isOpen()) close(); else open(); });
  $('#chatClose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen() && !$('#overlay').classList.contains('show')) close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });

  return {
    paintQuick,
    /** Dipanggil bila pengguna log masuk / keluar: langgan chat admin masa nyata. */
    setUser(u) {
      stops.forEach((s) => s && s()); stops = []; user = u; aMsgs = []; meta = {}; lastCount = -1;
      if (u) {
        stops = [
          fb.watchMyChat(u.uid, (m) => {
            if (lastCount >= 0 && m.length > lastCount && m[m.length - 1]?.from === 'admin') sfx.msg();
            lastCount = m.length; aMsgs = m; if (mode === 'admin') paintAdmin();
          }),
          fb.watchChatMeta(u.uid, (d) => { meta = d; paintDots(); markRead(); }),
        ];
      }
      if (mode === 'admin') paintAdmin();
      paintDots();
    },
  };
}

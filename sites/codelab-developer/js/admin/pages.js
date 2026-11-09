// Pemapar halaman admin. Tiada data sebenar sehingga Firebase disambungkan — semua keadaan kosong dipaparkan jujur.
import { h, clear, setT } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { TOOLS, CATEGORIES, toolById } from '../registry.js';
import { adminData } from './data.js';
import { barChart } from './charts.js';
import { usage, store } from '../utils/storage.js';
import { dayKey, monthKey, msUntilNextDay, msUntilNextMonth, fmtCountdown, nextMonthStart } from '../statistics/kl-time.js';
import { downloadText } from '../utils/io.js';
import { t, getLang, LANGS, fmtNum, onLangChange } from '../i18n/i18n.js';
import { SITE } from '../config.js';
import { toast } from '../components/toast.js';
import { logo } from '../components/ui-parts.js';

const card = (titleKey, ...kids) => h('section', { class: 'pane admin-card' }, h('div', { class: 'pane-head' }, h('h2', { class: 'h3', i18n: titleKey })), ...kids);
const empty = (key, ic = 'database') => h('div', { class: 'empty small' }, icon(ic, 28), h('p', { i18n: key }));
const kpi = (key, ic, val) => h('div', { class: 'kpi' }, h('span', { class: 'fstat-ico' }, icon(ic, 20)), h('div', {}, h('strong', { dir: 'ltr' }, val === null || val === undefined ? '—' : typeof val === 'number' ? fmtNum(val) : val), h('span', { i18n: key })));
const statusRow = (key, on) => h('li', {}, h('span', { class: `dot ${on ? 'on' : 'off'}` }), h('span', { i18n: key }), h('strong', { i18n: on ? 'adm.connected' : 'adm.notConnected' }));
const resetInfo = () => {
  const d = h('code', { dir: 'ltr' }), m = h('code', { dir: 'ltr' });
  const tick = () => { if (!d.isConnected && d._on) return clearInterval(d._t); d._on = true; const n = new Date(); d.textContent = `${dayKey(n)} · ${fmtCountdown(msUntilNextDay(n))}`; m.textContent = `${monthKey(n)} → ${monthKey(nextMonthStart(n))} · ${fmtCountdown(msUntilNextMonth(n))}`; };
  d._t = setInterval(tick, 1000); tick();
  return h('ul', { class: 'status-list' }, h('li', {}, icon('clock', 16), h('span', { i18n: 'adm.dailyKey' }), d), h('li', {}, icon('calendar-clock', 16), h('span', { i18n: 'adm.monthlyKey' }), m), h('li', {}, icon('chart-column', 16), h('span', { i18n: 'stats.ruleTotal' })));
};

export async function dashboard(state) {
  const s = await adminData.summary().catch(() => ({}));
  const acts = await adminData.listActivity(10).catch(() => []);
  const local = Object.entries(usage.all()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const qa = (href, ic, k) => h('a', { class: 'quick', href }, icon(ic, 20), h('span', { i18n: k }));
  return h('div', { class: 'admin-grid' },
    h('section', { class: 'welcome span-all' }, h('div', {}, h('small', { i18n: 'adm.welcome' }), h('h2', { dir: 'ltr' }, (state?.user?.email || '').split('@')[0] || 'Admin'), h('p', { i18n: 'adm.dash.sub' })), h('div', { class: 'quick-row', 'aria-label': 'Quick actions' }, qa('tools.html', 'wrench', 'adm.nav.tools'), qa('statistics.html', 'chart-column', 'adm.nav.statistics'), qa('content.html', 'file-text', 'adm.nav.content'), qa('settings.html', 'settings', 'adm.nav.settings'))),
    h('div', { class: 'kpi-grid span-all' }, kpi('stats.users', 'users', s.registeredUsers), kpi('stats.today', 'activity', s.today), kpi('stats.month', 'calendar-clock', s.month), kpi('stats.total', 'chart-column', s.total)),
    card('adm.dash.popular', local.length ? h('ol', { class: 'rank' }, local.map(([id, n]) => toolById(id) && h('li', {}, h('span', { i18n: `tool.${id}.name` }), h('strong', {}, String(n))))) : empty('adm.dash.noUsage', 'chart-column'), h('p', { class: 'muted small', i18n: 'adm.dash.localNote' })),
    card('adm.dash.system', h('ul', { class: 'status-list' }, statusRow('adm.sys.db', !!s.connected), statusRow('adm.sys.auth', true),
      h('li', {}, h('span', { class: 'dot on' }), h('span', { i18n: 'adm.sys.tools' }), h('strong', {}, `${TOOLS.length} / ${CATEGORIES.length}`)), h('li', {}, h('span', { class: 'dot on' }), h('span', { i18n: 'adm.sys.langs' }), h('strong', {}, 'BM · EN · AR'))), resetInfo()),
    card('adm.dash.activity', acts.length ? h('ul', { class: 'status-list' }, acts.map((a) => h('li', {}, icon('activity', 16), h('code', {}, a.type), h('span', {}, a.detail), h('strong', { dir: 'ltr' }, a.at ? a.at.toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' }) : '')))) : empty('adm.dash.noActivity', 'history')));
}

export async function tools() {
  const cfg = await adminData.getConfig('tools').catch(() => null);
  const draft = new Set((cfg && cfg.disabled) || []);
  const q = h('input', { type: 'search', class: 'filter-input', ph: 'search.placeholder', aria: 'search.label' });
  const cat = h('select', { class: 'filter-input narrow', aria: 'adm.tools.category' }, h('option', { value: 'all', i18n: 'common.all' }), CATEGORIES.map((c) => h('option', { value: c.id, i18n: `cat.${c.id}.name` })));
  const body = h('tbody'); const count = h('p', { class: 'muted small' });
  const saveMsg = h('span', { class: 'muted small' });
  const saveBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true, onclick: async () => { saveBtn.disabled = true; try { await adminData.saveTools([...draft]); dirty(false); setT(saveMsg, 'adm.saved'); toast('adm.saved'); } catch { setT(saveMsg, 'adm.saveFailed'); saveBtn.disabled = false; } } }, icon('send', 16), h('span', { i18n: 'adm.saveDb' }));
  const dirty = (v) => { saveBtn.disabled = !v; if (v) saveMsg.textContent = ''; };
  const dlg = h('dialog', { class: 'dlg' }); document.body.append(dlg);
  const paint = () => {
    const term = q.value.trim().toLowerCase();
    const rows = TOOLS.filter((x) => (cat.value === 'all' || x.cat === cat.value) && (!term || `${t(`tool.${x.id}.name`)} ${x.id} ${x.kw}`.toLowerCase().includes(term)));
    clear(body);
    rows.forEach((x) => {
      const off = draft.has(x.id);
      const sw = h('input', { type: 'checkbox', role: 'switch', checked: !off, aria: 'adm.tools.toggle', onchange: (e) => { if (e.target.checked) draft.delete(x.id); else draft.add(x.id); dirty(true); paint(); } });
      body.append(h('tr', {}, h('td', {}, h('strong', { i18n: `tool.${x.id}.name` }), h('br'), h('code', { class: 'muted' }, x.id)), h('td', { i18n: `cat.${x.cat}.name` }),
        h('td', {}, h('span', { class: `pill ${off ? 'off' : 'on'}`, i18n: off ? 'adm.tools.disabled' : 'adm.tools.enabled' })),
        h('td', {}, h('label', { class: 'switch' }, sw, h('span', { class: 'track' }))),
        h('td', {}, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => info(x) }, icon('info', 16), h('span', { i18n: 'adm.tools.info' })))));
    });
    setT(count, 'adm.tools.count', { n: rows.length, total: TOOLS.length });
  };
  function info(x) {
    dlg.replaceChildren(h('h2', { class: 'h3', i18n: `tool.${x.id}.name` }),
      h('dl', { class: 'dl' }, [['ID', x.id], ['Route', `#/tool/${x.id}`], ['Module', `js/tools/${x.cat === 'css' ? 'css' : x.cat}-tools.js`], ['Keywords', x.kw]].map(([k, v]) => [h('dt', {}, k), h('dd', {}, h('code', {}, v))])),
      h('form', { method: 'dialog' }, h('button', { class: 'btn btn-primary', i18n: 'adm.close' }))); dlg.showModal();
  }
  q.addEventListener('input', paint); cat.addEventListener('change', paint); onLangChange(paint); paint();
  return h('div', {}, h('div', { class: 'alert alert-warn' }, icon('info', 16), h('span', { i18n: 'adm.tools.liveNote' })), h('div', { class: 'filters row' }, q, cat), count,
    h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['adm.tools.col.tool', 'adm.tools.col.cat', 'adm.tools.col.status', 'adm.tools.col.enable', 'adm.tools.col.info'].map((k) => h('th', { scope: 'col', i18n: k })))), body)),
    h('div', { class: 'toolbar' }, saveBtn, saveMsg));
}

export async function statistics() {
  const s = await adminData.summary().catch(() => ({}));
  const series = await adminData.dailySeries(30).catch(() => null);
  const chart = h('div', { class: 'chart-box' });
  const showSample = () => {
    const n = new Date(); const sample = Array.from({ length: 14 }, (_, i) => ({ label: String(i + 1), value: [12, 18, 15, 22, 30, 26, 19, 24, 33, 29, 35, 31, 40, 38][i] }));
    chart.replaceChildren(h('div', { class: 'sample-badge' }, icon('triangle-alert', 14), h('span', { i18n: 'adm.stats.sampleBadge' })), barChart(sample, { label: 'Sample' })); void n;
  };
  if (series && series.length) chart.append(barChart(series.map((x) => ({ label: x.key.slice(-2), value: x.visits })), { label: t('adm.stats.chart') }));
  else chart.append(empty('adm.stats.noChart', 'chart-column'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: showSample }, icon('eye', 16), h('span', { i18n: 'adm.stats.showSample' })));
  const usageRows = Object.entries(usage.all()).sort((a, b) => b[1] - a[1]).filter(([id]) => toolById(id));
  return h('div', { class: 'admin-grid' },
    h('div', { class: 'kpi-grid span-all' }, kpi('adm.stats.today', 'activity', s.today), kpi('adm.stats.monthly', 'calendar-clock', s.month), kpi('adm.stats.overall', 'chart-column', s.total), kpi('stats.users', 'users', s.registeredUsers)),
    card('adm.stats.rules', resetInfo()),
    card('adm.stats.structure', h('pre', { class: 'code-view', dir: 'ltr' }, 'stats/total              { visits, registeredUsers }\nstats_daily/{YYYY-MM-DD}   { visits, toolUses }   // key = tarikh Asia/Kuala_Lumpur\nstats_monthly/{YYYY-MM}    { visits }             // key = bulan Asia/Kuala_Lumpur')),
    h('div', { class: 'span-all' }, card('adm.stats.chart', chart)),
    h('div', { class: 'span-all' }, card('adm.stats.toolLog', usageRows.length ? h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', { i18n: 'adm.tools.col.tool' }), h('th', { i18n: 'adm.stats.count' }))), h('tbody', {}, usageRows.map(([id, n]) => h('tr', {}, h('td', { i18n: `tool.${id}.name` }), h('td', {}, String(n)))))) : empty('adm.dash.noUsage', 'history'), h('p', { class: 'muted small', i18n: 'adm.dash.localNote' }))));
}

export async function users() {
  const rows = await adminData.listUsers().catch(() => []);
  const dis = (ic, k) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: true, 'aria-disabled': 'true', tip: 'adm.needsFirebase' }, icon(ic, 16), h('span', { i18n: k }));
  return h('div', {}, h('div', { class: 'filters row' }, h('input', { type: 'search', class: 'filter-input', ph: 'adm.users.search', aria: 'adm.users.search', disabled: true })),
    h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['adm.users.name', 'adm.users.email', 'adm.users.status', 'adm.users.role', 'adm.users.joined'].map((k) => h('th', { scope: 'col', i18n: k })))),
      h('tbody', {}, rows.length ? rows.map((u) => h('tr', {}, h('td', {}, u.displayName || '—'), h('td', {}, u.email || '—'), h('td', {}, u.status || '—'), h('td', {}, u.role || '—'), h('td', {}, u.createdAt || '—'))) : h('tr', {}, h('td', { colspan: 5 }, empty('adm.users.empty', 'users')))))),
    h('div', { class: 'toolbar' }, dis('user-round', 'adm.users.suspend'), dis('circle-check', 'adm.users.activate'), dis('key-round', 'adm.users.setRole')), h('p', { class: 'muted small', i18n: 'adm.users.note' }));
}

export async function settings() {
  const saved = await adminData.getConfig('site').catch(() => null) || {};
  const def0 = { name: SITE.name, logo: 'assets/icons/icon-192.png?v=3', slogan: t('footer.slogan'), footer: t('footer.copyright', { brand: SITE.brand, year: SITE.year }), langs: ['ms', 'en', 'ar'], defaultLang: 'ms', maintenance: false };
  const def = { ...def0, ...saved, langs: saved.languages || def0.langs };
  const f = (key, label, val, ph) => { const i = h('input', { type: 'text', value: val, id: `s-${key}`, ph }); return { i, el: h('div', { class: 'field' }, h('label', { for: `s-${key}`, i18n: label }), i) }; };
  const name = f('name', 'adm.set.name', def.name), logoF = f('logo', 'adm.set.logo', def.logo), slogan = f('slogan', 'adm.set.slogan', def.slogan), footer = f('footer', 'adm.set.footer', def.footer);
  const langChecks = Object.entries(LANGS).map(([c, l]) => ({ c, el: h('input', { type: 'checkbox', checked: def.langs.includes(c), value: c, 'aria-label': l.name }) }));
  const dlang = h('select', { id: 's-dlang' }, Object.entries(LANGS).map(([c, l]) => h('option', { value: c, selected: c === def.defaultLang }, l.name)));
  const maint = h('input', { type: 'checkbox', checked: !!def.maintenance });
  const msg = h('span', { class: 'muted small' });
  const err = h('ul', { class: 'alert alert-error', hidden: true });
  const collect = () => {
    const errs = [];
    if (!name.i.value.trim()) errs.push('adm.set.errName');
    if (!slogan.i.value.trim()) errs.push('adm.set.errSlogan');
    if (logoF.i.value && !/^(https?:\/\/|[\w./-]+$)/.test(logoF.i.value)) errs.push('adm.set.errLogo');
    const langs = langChecks.filter((x) => x.el.checked).map((x) => x.c);
    if (!langs.length) errs.push('adm.set.errLangs'); else if (!langs.includes(dlang.value)) errs.push('adm.set.errDefaultLang');
    err.hidden = !errs.length; err.replaceChildren(...errs.map((k) => h('li', { i18n: k })));
    return errs.length ? null : { name: name.i.value.trim(), logo: logoF.i.value.trim(), slogan: slogan.i.value.trim(), footer: footer.i.value.trim(), languages: langs, defaultLang: dlang.value, maintenance: maint.checked, brand: SITE.brand };
  };
  return h('form', { class: 'admin-form', onsubmit: (e) => e.preventDefault() },
    h('div', { class: 'alert alert-warn' }, icon('info', 16), h('span', { i18n: 'adm.set.noteLive' })),
    h('div', { class: 'controls' }, name.el, logoF.el, slogan.el, footer.el,
      h('div', { class: 'field' }, h('span', { class: 'lbl', i18n: 'adm.set.langs' }), h('div', { class: 'checks' }, langChecks.map((x) => h('label', { class: 'check' }, x.el, h('span', {}, LANGS[x.c].name))))),
      h('div', { class: 'field' }, h('label', { for: 's-dlang', i18n: 'adm.set.defaultLang' }), dlang), h('label', { class: 'check' }, maint, h('span', { i18n: 'adm.set.maintenance' }))),
    err, h('p', { class: 'muted small' }, icon('shield-check', 14), ' ', h('span', { i18n: 'adm.set.brandLocked' })),
    h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { const v = collect(); if (v) { downloadText(JSON.stringify(v, null, 2), 'site-settings.json', 'application/json'); toast('toast.downloaded'); } } }, icon('download', 16), h('span', { i18n: 'adm.set.export' })),
      h('button', { type: 'button', class: 'btn btn-primary', onclick: async () => { const v = collect(); if (!v) return; try { await adminData.saveSettings(v); setT(msg, 'adm.saved'); toast('adm.saved'); } catch { setT(msg, 'adm.saveFailed'); } } }, icon('send', 16), h('span', { i18n: 'adm.saveDb' })), msg));
}

export async function content() {
  const TYPES = { guide: ['page.guide.title', 'page.guide.p1', 'guide.'], about: ['page.about.'], privacy: ['page.privacy.'], terms: ['page.terms.'], faq: ['guide.q', 'guide.a'] };
  let type = 'about', lang = getLang();
  const host = h('div', { class: 'content-editor' }); const cmsg = h('span', { class: 'muted small' });
  const typeSel = h('select', { class: 'filter-input narrow', aria: 'adm.content.type', onchange: (e) => { type = e.target.value; load(); } }, Object.keys(TYPES).map((k) => h('option', { value: k, i18n: `adm.content.${k}` })));
  const langSel = h('select', { class: 'filter-input narrow', aria: 'adm.content.lang', onchange: (e) => { lang = e.target.value; load(); } }, Object.entries(LANGS).map(([c, l]) => h('option', { value: c, selected: c === lang }, l.name)));
  let current = {};
  async function load() {
    host.replaceChildren(h('p', { class: 'muted' }, '…'));
    const dict = await (await fetch(new URL(`../../locales/${lang}.json`, import.meta.url))).json();
    const pre = TYPES[type]; current = {};
    Object.keys(dict).filter((k) => pre.some((p) => k.startsWith(p))).forEach((k) => { current[k] = dict[k]; });
    const over = await adminData.getContent(type, lang).catch(() => null); if (over) for (const k of Object.keys(current)) if (k in over) current[k] = over[k];
    host.replaceChildren(...Object.entries(current).map(([k, v]) => h('div', { class: 'field field-wide' }, h('label', { for: `c-${k}` }, h('code', {}, k)), h('textarea', { id: `c-${k}`, rows: v.length > 120 ? 4 : 2, dir: LANGS[lang].dir, oninput: (e) => { current[k] = e.target.value; } }, v))));
  }
  load();
  return h('div', {}, h('div', { class: 'alert alert-warn' }, icon('info', 16), h('span', { i18n: 'adm.content.noteLive' })), h('div', { class: 'filters row' }, typeSel, langSel), host,
    h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { downloadText(JSON.stringify(current, null, 2), `content-${type}-${lang}.json`, 'application/json'); toast('toast.downloaded'); } }, icon('download', 16), h('span', { i18n: 'adm.content.export' })),
      h('button', { type: 'button', class: 'btn btn-primary', onclick: async () => { try { await adminData.saveContent(type, lang, current); setT(cmsg, 'adm.saved'); toast('adm.saved'); } catch { setT(cmsg, 'adm.saveFailed'); } } }, icon('send', 16), h('span', { i18n: 'adm.saveDb' })), cmsg));
}

export async function index() {
  const link = (href, ic, k, primary) => h('a', { class: `btn ${primary ? 'btn-primary' : 'btn-ghost'}`, href }, icon(ic, 16), h('span', { i18n: k }));
  return h('div', { class: 'prose' }, h('p', { i18n: 'adm.index.p1' }), h('p', { i18n: 'adm.index.p2' }),
    h('div', { class: 'toolbar' }, link('login.html', 'log-in', 'adm.nav.login', true), link('dashboard.html', 'layout-dashboard', 'adm.nav.dashboard'), link('../index.html', 'globe', 'adm.backPublic')),
    h('ul', { class: 'checklist' }, [1, 2, 3, 4].map((i) => h('li', {}, icon('check', 16), h('span', { i18n: `adm.index.f${i}` })))));
}

export async function login() {
  const { auth } = await import('./auth.js');
  const err = h('div', { class: 'alert alert-error', role: 'alert', hidden: true });
  const email = h('input', { id: 'l-email', type: 'email', required: true, autocomplete: 'username', dir: 'ltr', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false' });
  const pass = h('input', { id: 'l-pass', type: 'password', required: true, autocomplete: 'current-password', dir: 'ltr' });
  const eye = h('button', { type: 'button', class: 'eye', aria: 'adm.showPass', tip: 'adm.showPass', onclick: () => { const on = pass.type === 'password'; pass.type = on ? 'text' : 'password'; eye.replaceChildren(icon(on ? 'eye' : 'lock', 18)); eye.setAttribute('aria-pressed', String(on)); } }, icon('eye', 18));
  const label = h('span', { i18n: 'adm.login.submit' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg block' }, icon('log-in', 18), label);
  const field = (id, key, ic, input, extra) => h('div', { class: 'afield' }, h('label', { for: id, i18n: key }), h('div', { class: 'ainput' }, icon(ic, 18), input, extra));
  const form = h('form', { class: 'auth-form', onsubmit: async (e) => {
    e.preventDefault(); err.hidden = true; btn.disabled = true; setT(label, 'adm.login.wait');
    try { await auth.signIn(email.value.trim(), pass.value); location.replace('dashboard.html'); }
    catch (x) { const code = String(x.code || ''); err.hidden = false; setT(err, /too-many/.test(code) ? 'adm.login.errMany' : /network/.test(code) ? 'adm.login.errNet' : 'adm.login.errCred'); btn.disabled = false; setT(label, 'adm.login.submit'); pass.value = ''; pass.focus(); }
  } }, field('l-email', 'adm.login.email', 'mail', email), field('l-pass', 'adm.login.password', 'lock', pass, eye), err, btn);
  return h('section', { class: 'auth-card' },
    h('div', { class: 'auth-brand' }, logo(64), h('strong', {}, SITE.name), h('span', { class: 'admin-chip' }, icon('shield-check', 14), h('span', { i18n: 'adm.panelName' }))),
    h('h1', { i18n: 'adm.login.title' }), h('p', { class: 'auth-sub', i18n: 'adm.login.sub' }), form,
    h('ul', { class: 'auth-points' }, [1, 2, 3].map((i) => h('li', {}, icon('check', 14), h('span', { i18n: `adm.login.why${i}` })))));
}

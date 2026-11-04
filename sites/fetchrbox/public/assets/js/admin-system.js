// Panel admin: suis hidup/mati keseluruhan sistem dan mesej penyelenggaraan tersuai (BM / EN / AR).
import { fb } from './firebase.js';
import { sfx } from './sfx.js';
import { $, esc, toast, modal } from './ui.js';
import { translate } from './translate.js';

const DEFAULT_MS = 'Kami sedang menaik taraf Fetchr Box supaya lebih pantas dan lebih baik untuk anda. Harap bersabar dan terima kasih kerana menunggu. Kami memohon maaf atas sebarang kesulitan.';
const LANGS = [['ms', 'BM'], ['en', 'EN'], ['ar', 'AR']];
let ctx = { getSite: () => null, rerender: () => {} };
export const initSystem = (c) => { ctx = c; };

const msgOf = (s) => ({ ms: s?.maintenanceMsg?.ms || DEFAULT_MS, en: s?.maintenanceMsg?.en || '', ar: s?.maintenanceMsg?.ar || '' });

export function systemView() {
  const s = ctx.getSite().settings, off = !!s.maintenance, m = msgOf(s);
  return `<h1>Sistem</h1><p class="sub2">Matikan atau hidupkan keseluruhan sistem untuk pengguna. Perubahan sampai serta-merta.</p>
  <div class="settings-card glass sys">
    <div class="sys-status ${off ? 'off' : 'on'}"><span class="pulse" aria-hidden="true"></span><div><b>${off ? 'SISTEM DIMATIKAN' : 'SISTEM AKTIF'}</b><small>${off ? 'Pengguna nampak paparan "sistem sedang dikemas kini" dan tidak boleh guna apa-apa.' : 'Pengguna boleh menggunakan sistem seperti biasa.'}</small></div></div>
    <button class="btn ${off ? 'gold' : 'red'} sys-btn" id="sysToggle" type="button"><span class="ico" data-ico="power"></span><span class="t">${off ? 'Hidupkan sistem' : 'Matikan sistem'}</span></button>
  </div>
  <div class="settings-card glass" style="margin-top:.9rem">
    <h2 style="font-family:var(--strong);font-size:1.02rem;margin-bottom:.2rem">Mesej untuk pengguna</h2>
    <p class="sub2" style="margin:0 0 .6rem">Tulis dalam BM. Terjemahan English dan Arab dijana automatik (boleh disunting).</p>
    ${LANGS.map(([l, n]) => `<div class="f"><label for="sm_${l}"><span class="langtag">${n}</span>Mesej</label><textarea id="sm_${l}" maxlength="400" ${l === 'ar' ? 'dir="rtl"' : ''} placeholder="${l === 'ms' ? '' : 'Kosongkan untuk terjemah automatik'}">${esc(m[l])}</textarea></div>`).join('')}
    <div class="sys-actions">
      <button class="btn ghost" id="sysPreview" type="button"><span class="ico" data-ico="eye"></span><span class="t">Pratonton</span></button>
      <button class="btn ghost" id="sysTr" type="button"><span class="ico" data-ico="sparkle"></span><span class="t">Terjemah automatik</span></button>
      <button class="btn gold" id="sysSave" type="button"><span class="t">Simpan mesej</span></button>
    </div>
  </div>`;
}

const val = (l) => $('#sm_' + l).value.trim();

/** Pastikan EN/AR terisi (terjemah dari BM jika kosong atau dipaksa). Pulang objek mesej tiga bahasa. */
async function fullMessage(force) {
  const ms = val('ms') || DEFAULT_MS, out = { ms, en: val('en'), ar: val('ar') };
  let partial = false;
  for (const l of ['en', 'ar']) {
    if (force || !out[l]) { const tr = await translate(ms, 'ms', l); if (tr) out[l] = tr; else { out[l] = out[l] || ms; partial = true; } }
  }
  if (partial) toast('Sebahagian terjemahan tidak tersedia. Bahagian itu guna BM, sila sunting jika perlu.');
  return out;
}
const busy = (b, on) => { b.disabled = on; };
const guard = async (fn) => { try { await fn(); } catch (e) { toast(e.code === 'permission-denied' ? 'Tiada kebenaran. Log masuk dengan akaun admin.' : 'Gagal menyimpan.'); sfx.error(); } };

export function bindSystem() {
  $('#sysTr').addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true);
    const m = await fullMessage(true);
    $('#sm_en').value = m.en; $('#sm_ar').value = m.ar; busy(b, false); sfx.pop();
  });
  $('#sysSave').addEventListener('click', async (e) => {
    const b = e.currentTarget; busy(b, true);
    await guard(async () => { const m = await fullMessage(false); await fb.saveSite({ settings: { maintenanceMsg: m } }); toast('Mesej disimpan'); sfx.success(); });
    busy(b, false);
  });
  $('#sysPreview').addEventListener('click', () => {
    modal({ icon: 'power', title: 'Sistem Sedang Dikemas Kini', text: val('ms') || DEFAULT_MS, actions: [] });
  });
  $('#sysToggle').addEventListener('click', () => {
    const off = !!ctx.getSite().settings.maintenance;
    if (off) { // hidupkan semula
      guard(async () => { await fb.saveSite({ settings: { maintenance: false } }); toast('Sistem dihidupkan semula'); sfx.success(); });
      return;
    }
    modal({
      icon: 'power', err: true, title: 'Matikan keseluruhan sistem?', text: 'Semua pengguna akan nampak mesej penyelenggaraan dan tidak boleh menggunakan sistem sehingga anda hidupkannya semula.',
      actions: [{ label: 'Ya, matikan', cls: 'danger', onClick: () => guard(async () => { const m = await fullMessage(false); await fb.saveSite({ settings: { maintenance: true, maintenanceMsg: m } }); toast('Sistem dimatikan'); sfx.pop(); }) }],
    });
  });
}

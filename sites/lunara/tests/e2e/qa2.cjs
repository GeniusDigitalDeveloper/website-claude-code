const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'], proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await p.goto('http://localhost:3100/', { waitUntil: 'load' }); await p.evaluate(() => localStorage.setItem('lunara-settings', JSON.stringify({ state: { language: 'ms', languageChosen: true, theme: 'light', colorTheme: 'lunara', fade: { enabled: true, fadeIn: true, fadeOut: true, fadeInSec: 2, fadeOutSec: 2, crossfade: false, crossfadeSec: 6 }, quality: 'high', autoplay: true, keepHistory: true, playbackRate: 1, updatedAt: 1 }, version: 3 }))); await p.reload({ waitUntil: 'load' }); await sleep(4000);
  const A = (fn, ...args) => p.evaluate(fn, ...args);
  // ---- crossfade (independent of pause/resume fade)
  await A(() => window.__lunara.settings.getState().setFade({ crossfade: true, crossfadeSec: 4 }));
  await p.locator('section[aria-label="Nasyid Pilihan"] button[aria-label^="Main "]').first().click();
  await sleep(3000);
  await A(() => window.__lunara.player.getState().seek(23));
  const t0 = await A(() => window.__lunara.player.getState().current().title);
  const samples = [];
  for (let i = 0; i < 16; i++) { samples.push(await A(() => [window.__lunaraEngine.crossfading, window.__lunara.player.getState().index, window.__lunaraEngine.debugGain().toFixed(2), window.__lunaraEngine.position.toFixed(1)])); await sleep(500); }
  console.log('CROSSFADE from', t0, 'samples [xfading,index,activeGain,pos]:', JSON.stringify(samples));
  console.log('now playing:', await A(() => window.__lunara.player.getState().current().title), 'paused', await A(() => window.__lunaraEngine.element.paused));
  await A(() => window.__lunara.settings.getState().setFade({ crossfade: false }));
  // ---- queue ops
  const q = () => A(() => window.__lunara.player.getState().queue.map(t => t.title).slice(0, 5));
  console.log('queue before:', JSON.stringify(await q()), 'index', await A(() => window.__lunara.player.getState().index));
  await A(() => { const s = window.__lunara.player.getState(); s.move(s.index + 1, s.index + 3); });
  await A(() => { const s = window.__lunara.player.getState(); s.removeAt(s.index + 1); });
  await A(() => { const s = window.__lunara.player.getState(); s.playNext([s.queue[s.queue.length - 1]]); });
  console.log('queue after move/remove/playNext:', JSON.stringify(await A(() => { const s = window.__lunara.player.getState(); return s.queue.slice(s.index, s.index + 4).map(t => t.title); })));
  await A(() => window.__lunara.player.getState().toggleShuffle());
  console.log('shuffle on, current kept at index:', await A(() => [window.__lunara.player.getState().index, window.__lunara.player.getState().current().title]));
  await A(() => window.__lunara.player.getState().toggleShuffle());
  await A(() => window.__lunara.player.getState().cycleRepeat());
  console.log('repeat:', await A(() => window.__lunara.player.getState().repeat));
  const plId = await A(() => window.__lunara.player.getState().saveQueueAsPlaylist('Ujian Giliran'));
  // ---- playlist page: rename, reorder via store, duplicate, delete
  await p.goto('http://localhost:3100/playlist?id=' + plId, { waitUntil: 'load' }); await sleep(2500);
  console.log('playlist page shows:', await p.locator('h1').first().textContent(), '| tracks:', await A(() => window.__lunara.library.getState().playlists[0].tracks.length));
  await p.locator('button:has-text("Edit")').first().click(); await sleep(400);
  await p.locator('input[required]').first().fill('Playlist Ujian Dinamakan');
  await p.locator('button[type=submit]:has-text("Simpan")').click(); await sleep(500);
  console.log('renamed:', await p.locator('h1').first().textContent());
  await p.screenshot({ path: '' + (process.env.QA_OUT || "../../.qa/lunara") + '/12-playlist.png' });
  await p.locator('button:has-text("Duplikasi")').click(); await sleep(800);
  console.log('playlists after duplicate:', await A(() => window.__lunara.library.getState().playlists.map(p => p.name)));
  // favourites
  await A(() => { const t = window.__lunara.player.getState().current(); window.__lunara.library.getState().toggleFav(t); });
  await p.goto('http://localhost:3100/favourites', { waitUntil: 'load' }); await sleep(1500);
  console.log('favourites page rows:', await p.locator('main button[aria-label^="Main "]').count());
  await p.locator('button[aria-label="Jeda"]:visible').first().click().catch(() => {});
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });

const { chromium } = require('playwright');
const OUT = '' + (process.env.QA_OUT || "../../.qa/auralyqo") + '';
const AUD = process.argv[2];
const URL = 'http://localhost:3100';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'], proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror@' + page.url() + ': ' + e.message.split('\n').filter(l => /^\s*[+-]|^\s*<[A-Z]/.test(l)).slice(-14).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console@' + page.url() + ': ' + m.text().split('\n').filter(l => /^\s*[+-]|@|<|tree/.test(l)).slice(0,25).join('\n')); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('text=Trending Seluruh Dunia');
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/01-home-bento-1440-dark.png` });

  // ---- play first trending track
  const playBtn = page.locator('section[aria-label="Trending Seluruh Dunia"] button[aria-label^="Main "]').first();
  await playBtn.click();
  const gains = [];
  const t0 = Date.now();
  for (let i = 0; i < 14; i++) { gains.push([Date.now() - t0, await page.evaluate(() => window.__auralyqoEngine.debugGain().toFixed(2))]); await sleep(200); }
  log('FADE-IN samples (ms,gain):', JSON.stringify(gains));
  const playing = await page.evaluate(() => !window.__auralyqoEngine.element.paused);
  log('playing after play:', playing, 'pos', await page.evaluate(() => window.__auralyqoEngine.position.toFixed(2)));
  await page.screenshot({ path: `${OUT}/02-playing-1440.png` });

  // ---- pause -> fade-out, element must stay playing until fade completes
  await page.locator('button[aria-label="Jeda"]:visible').first().click();
  const out = [];
  const t1 = Date.now();
  for (let i = 0; i < 14; i++) { out.push([Date.now() - t1, await page.evaluate(() => [window.__auralyqoEngine.debugGain().toFixed(2), window.__auralyqoEngine.element.paused])]); await sleep(200); }
  log('FADE-OUT samples (ms,[gain,paused]):', JSON.stringify(out));
  const posAfterPause = await page.evaluate(() => window.__auralyqoEngine.position);

  // ---- resume continues from same position
  await page.locator('button[aria-label="Main"]:visible').first().click();
  await sleep(600);
  const posResume = await page.evaluate(() => window.__auralyqoEngine.position);
  log('resume from', posAfterPause.toFixed(2), '->', posResume.toFixed(2), '(should be >= paused pos)');

  // ---- rapid play/pause spam must end in a consistent state
  for (let i = 0; i < 7; i++) { await page.evaluate(() => window.__auralyqoStore?.toggle?.()); }
  for (let i = 0; i < 7; i++) { await page.keyboard.press('Space'); await sleep(60); }
  await sleep(2600);
  log('after 7 rapid toggles: paused=', await page.evaluate(() => window.__auralyqoEngine.element.paused), 'gain=', await page.evaluate(() => window.__auralyqoEngine.debugGain().toFixed(2)));
  await page.keyboard.press('Space'); await sleep(2500);
  log('after one more toggle: paused=', await page.evaluate(() => window.__auralyqoEngine.element.paused), 'gain=', await page.evaluate(() => window.__auralyqoEngine.debugGain().toFixed(2)));

  // ---- next track
  const title1 = await page.locator('button[aria-label="Buka pemain skrin penuh"] span span').first().textContent();
  await page.locator('button[aria-label="Lagu seterusnya"]:visible').first().click();
  await sleep(5000);
  const title2 = await page.locator('button[aria-label="Buka pemain skrin penuh"] span span').first().textContent();
  log('next track:', title1, '->', title2, 'paused=', await page.evaluate(() => window.__auralyqoEngine.element.paused), 'gain=', await page.evaluate(() => window.__auralyqoEngine.debugGain().toFixed(2)));

  // ---- queue drawer
  await page.locator('button[aria-label="Giliran lagu"]').click();
  await sleep(700);
  await page.screenshot({ path: `${OUT}/03-queue-drawer.png` });
  await page.locator('button[aria-label="Tutup giliran"]').click();

  // ---- full player
  await page.locator('button[aria-label="Skrin penuh"]').click();
  await sleep(900);
  await page.screenshot({ path: `${OUT}/04-full-player-1440.png` });
  await page.keyboard.press('Escape'); await sleep(500);
  await page.locator('button[aria-label="Jeda"]:visible').first().click().catch(()=>{});

  // ---- search
  await page.goto(`${URL}/search?q=siti%20nurhaliza`, { waitUntil: 'load' });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/05-search-1440.png` });

  // ---- local import
  await page.goto(`${URL}/local`, { waitUntil: 'load' });
  await page.setInputFiles('input[type=file][multiple]', [`${AUD}/ujian1.mp3`, `${AUD}/ujian2.flac`]);
  await page.waitForSelector('text=Lagu Ujian Satu', { timeout: 15000 });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/06-local-music.png` });
  await page.locator('button[aria-label="Main Lagu Ujian Satu"]').click();
  await sleep(3000);
  log('local playback: paused=', await page.evaluate(() => window.__auralyqoEngine.element.paused), 'src=', (await page.evaluate(() => window.__auralyqoEngine.element.src)).slice(0, 20), 'gain', await page.evaluate(() => window.__auralyqoEngine.debugGain().toFixed(2)));
  await page.keyboard.press('Space'); await sleep(2500);

  // ---- persistence after reload (local library from IndexedDB)
  await page.reload({ waitUntil: 'load' }); await sleep(1200);
  log('local library persisted after reload:', await page.locator('text=Lagu Ujian Satu').count() > 0);

  // ---- settings / studio
  await page.goto(`${URL}/settings#playback`, { waitUntil: 'load' }); await sleep(800);
  await page.screenshot({ path: `${OUT}/07-settings-fade.png`, fullPage: false });
  await page.goto(`${URL}/studio`, { waitUntil: 'load' }); await sleep(800);
  await page.screenshot({ path: `${OUT}/08-studio.png` });
  for (const p of ['Sidebar', 'Cinematic', 'Compact']) {
    await page.goto(`${URL}/studio`, { waitUntil: 'load' });
    await page.locator(`button:has-text("${p}")`).first().click();
    await page.goto(URL, { waitUntil: 'load' }); await sleep(1800);
    await page.screenshot({ path: `${OUT}/09-home-${p.toLowerCase()}.png` });
  }
  // light theme
  await page.goto(`${URL}/settings`, { waitUntil: 'load' });
  await page.locator('button[role=radio]:has-text("Cerah")').click();
  await page.goto(URL, { waitUntil: 'load' }); await sleep(1800);
  await page.screenshot({ path: `${OUT}/10-home-compact-light.png` });
  log('theme attr:', await page.evaluate(() => document.documentElement.dataset.theme));
  // in-place edit mode
  await page.locator('button:has-text("Edit layout")').click(); await sleep(600);
  await page.screenshot({ path: `${OUT}/11-edit-layout.png` });
  await page.locator('button:has-text("Siap")').click();

  // ---- mobile
  const m = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 }, colorScheme: 'dark', isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const mp = await m.newPage(); mp.on('pageerror', e => errors.push('M pageerror@' + mp.url() + ': ' + e.message.slice(0,80)));
  for (const [path, name] of [['/', 'home'], ['/search?q=hindia', 'search'], ['/local', 'local'], ['/settings', 'settings'], ['/login', 'login'], ['/profile', 'profile'], ['/studio', 'studio'], ['/album/302127', 'album']]) {
    await mp.goto(URL + path, { waitUntil: 'load' }); await sleep(1500);
    const sw = await mp.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    log(`mobile ${name}: scrollWidth ${sw[0]} / ${sw[1]}`);
    await mp.screenshot({ path: `${OUT}/m-${name}.png` });
  }
  await mp.goto(URL, { waitUntil: 'load' }); await sleep(1500);
  await mp.locator('section[aria-label="Trending Seluruh Dunia"] button[aria-label^="Main "]').first().click(); await sleep(2500);
  await mp.screenshot({ path: `${OUT}/m-home-playing.png` });
  await mp.locator('button[aria-label="Buka pemain skrin penuh"]').click(); await sleep(900);
  await mp.screenshot({ path: `${OUT}/m-full-player.png` });
  const t = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 768, height: 1024 }, colorScheme: 'dark' });
  const tp = await t.newPage(); tp.on('pageerror', e => errors.push('T@' + tp.url() + e.message.slice(0,60)));
  await tp.goto(URL, { waitUntil: 'load' }); await sleep(1500);
  log('tablet scrollWidth', await tp.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  await tp.screenshot({ path: `${OUT}/t-home.png` });
  const tv = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
  const tvp = await tv.newPage(); tvp.on('pageerror', e => errors.push('TV@' + tvp.url() + e.message.slice(0,60)));
  await tvp.goto(URL + '/tv', { waitUntil: 'load' }); await sleep(1800);
  for (let i = 0; i < 4; i++) await tvp.keyboard.press('ArrowDown');
  await tvp.keyboard.press('ArrowRight'); await sleep(500);
  log('tv focused:', await tvp.evaluate(() => document.activeElement?.textContent?.slice(0, 40)));
  await tvp.screenshot({ path: `${OUT}/tv.png` });
  log('ERRORS:', errors.length ? errors.slice(0, 15).join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });

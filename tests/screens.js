// Adaptación a pantallas: iPhone SE, iPhone 13, Pixel 7 (Android), iPad y teléfono horizontal. Busca desbordes horizontales.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, devices, enter } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8770), br = startBroker({ port: 8882 }), b = await chromium.launch(), errs = [];
  const DEV = { 'iPhone SE': devices['iPhone SE'], 'iPhone 13': devices['iPhone 13'], 'Pixel 7': devices['Pixel 7'], 'iPad': devices['iPad (gen 7)'], 'iPhone 13 horizontal': devices['iPhone 13 landscape'] };
  for (const [name, d] of Object.entries(DEV)) {
    const ctx = await b.newContext({ ...d }); await ctx.addInitScript(() => { window.__NIDO_BROKERS = ['ws://localhost:8882']; });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost:8770/?debug'); await enter(p, 'Ana'); await p.waitForTimeout(600);
    const over = [];
    const check = async label => { const o = await p.evaluate(() => { const w = innerWidth; return [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) && !el.closest('.scen,.tabs,.tblwrap,.sheet-wrap,canvas'); }).length; }); if (o) over.push(label + ':' + o); };
    await check('plaza'); await p.screenshot({ path: process.env.SHOTS + `/s_${name.replace(/ /g, '_')}_plaza.png` });
    for (const w of ['huevo', 'escape', 'bomba', 'detective', 'aventura', 'mini']) { await p.evaluate(id => window.__app.world(id), w); await p.waitForTimeout(350); await check('mundo ' + w); }
    await p.evaluate(() => window.__app.worlds()); await p.waitForTimeout(350); await check('mundos');
    await p.evaluate(() => window.__app.launch('huevo', { level: 'acantilado-1' }, { local: true })); await p.waitForTimeout(1500); { const x = await p.$('.sheet [aria-label="Cerrar"]'); if (x) await x.click(); } await check('juego'); await p.screenshot({ path: process.env.SHOTS + `/s_${name.replace(/ /g, '_')}_juego.png` });
    await p.evaluate(() => window.__app.room.endSession()); await p.waitForTimeout(300);
    await p.evaluate(() => window.__app.launch('detective', { level: 'c2' }, { local: true })); await p.waitForTimeout(800); { const x = await p.$('.sheet [aria-label="Cerrar"]'); if (x) await x.click(); } await p.click('text=Mi expediente'); await check('detectives');
    await p.evaluate(() => window.__app.room.endSession());
    console.log(name.padEnd(22), d.viewport.width + '×' + d.viewport.height, over.length ? 'DESBORDE ' + over.join(' ') : 'sin desbordes');
    await ctx.close();
  }
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

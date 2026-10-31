// Auditoría de interfaz móvil: en cada pantalla revisa todos los elementos interactivos visibles.
//  1) no se mueven al pulsarlos (:active forzado), 2) miden al menos 44 px, 3) nada los tapa.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, devices, enter, auditPage } = require('./helpers');
const DEVS = (process.env.DEVS || 'iPhone SE,iPhone 13,Pixel 7,iPhone 13 landscape').split(',');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8774), br = startBroker({ port: 8886 }), b = await chromium.launch(), errs = []; let total = 0, problems = [];
  for (const dn of DEVS) {
    const mk = async () => { const ctx = await b.newContext({ ...devices[dn] }); await ctx.addInitScript(() => { window.__NIDO_BROKERS = ['ws://localhost:8886']; }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(dn + ': ' + e.message)); return p; };
    const A = await mk(); await A.goto('http://localhost:8774/?debug'); await A.waitForSelector('#nameIn');
    const cdp = await A.context().newCDPSession(A); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const audit = screen => auditPage(A, cdp, screen, dn, problems).then(n => { total += n; });
    await audit('bienvenida');
    await enter(A, 'Ana'); await audit('plaza');
    await A.evaluate(() => window.__app.worlds()); await audit('mundos');
    for (const w of ['huevo', 'escape', 'bomba', 'detective', 'aventura', 'mini']) { await A.evaluate(id => window.__app.world(id), w); await audit('mundo ' + w); }
    await A.evaluate(() => window.__app.home());
    for (const [nav, name] of [['Chat', 'chat'], ['Mi pájaro', 'avatar'], ['Logros', 'logros'], ['Ajustes', 'ajustes']]) { await A.click(`nav >> text=${nav}`); await audit('hoja ' + name); await A.click('.sheet [aria-label="Cerrar"]'); }
    // juegos en un teléfono (los de información asimétrica se revisan con dos teléfonos en bomb_play y games_smoke)
    for (const g of ['huevo', 'detective', 'aventura', 'memoria', 'gato', 'carrera', 'reflejos', 'puzzle']) {
      await A.evaluate(id => window.__app.launch(id, {}, { local: true }), g); await A.waitForTimeout(700);
      const c = await A.$('.sheet [aria-label="Cerrar"]'); if (c) await c.click();
      await audit('juego ' + g); await A.evaluate(() => window.__app.room.endSession()); await A.waitForTimeout(300);
    }
    await A.context().close();
  }
  const uniq = [...new Set(problems)];
  console.log(`${total} elementos revisados en ${DEVS.length} pantallas de dispositivo · ${uniq.length} problemas`);
  uniq.slice(0, 60).forEach(p => console.log(' -', p));
  console.log('errores de página:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close(); srv.close(); await br.close();
  process.exit(uniq.length ? 1 : 0);
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

// Capturas de cada escenario (modo un teléfono) para revisar el aspecto visual.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8766), br = startBroker({ port: 8877 }), b = await chromium.launch(), errs = [];
  const A = await phone(b, { port: 8877, url: 'http://localhost:8766/?debug', errors: errs }); await enter(A, 'Ana');
  const list = (process.env.LEVELS || 'acantilado-2:1,bosque-2:1,hielo-2:0,cavernas-1:1,volcan-1:1,cielo-2:1').split(',');
  for (const item of list) {
    const [id, cp] = item.split(':');
    await A.evaluate(([id, cp]) => window.__app.launch('huevo', { level: id, resume: { level: id, cp: +cp, deaths: 0, time: 0 } }, { local: true }), [id, cp]);
    await A.waitForFunction(id => window.__S && window.__S.level === id, id, { timeout: 8000 });
    await A.waitForTimeout(2600);
    await A.screenshot({ path: process.env.SHOTS + '/lv_' + id + '.png' });
    await A.evaluate(() => window.__app.room.endSession()); await A.waitForTimeout(400);
  }
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message); process.exit(1); });

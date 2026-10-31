// Reconexión: el invitado pierde la red 16 s en plena partida de Huevo a Dos y vuelve.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8769), br = startBroker({ port: 8881 }), b = await chromium.launch(), errs = [], out = [];
  const q = process.env.Q || '?debug&nortc';
  const A = await phone(b, { port: 8881, url: 'http://localhost:8769/' + q, errors: errs }); await enter(A, 'Ana');
  const code = await A.evaluate(() => window.__app.room.code);
  const B = await phone(b, { port: 8881, url: 'http://localhost:8769/' + q + '#' + code, errors: errs }); await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  await A.evaluate(() => window.__app.launch('huevo', { level: 'bosque-1' }));
  await B.waitForSelector('text=Unirme'); await B.click('text=Unirme');
  await A.waitForFunction(() => window.__S && window.__S.st === 'play'); await A.waitForTimeout(1500);
  await B.context().setOffline(true); const t0 = Date.now();
  await A.waitForSelector('text=Tu pareja se desconectó', { timeout: 25000 }).catch(() => {});
  out.push(['el anfitrión detecta la desconexión', (await A.isVisible('text=Tu pareja se desconectó')) + ` (${((Date.now() - t0) / 1000).toFixed(1)} s)`]);
  await A.waitForTimeout(Math.max(0, 16000 - (Date.now() - t0)));
  await B.context().setOffline(false); const t1 = Date.now();
  await A.waitForFunction(() => !document.querySelector('.overlay:not([hidden])'), null, { timeout: 30000 }).catch(() => {});
  out.push(['la partida se reanuda sola', (!(await A.$('.overlay:not([hidden])'))) + ` (${((Date.now() - t1) / 1000).toFixed(1)} s después de volver)`]);
  await A.waitForTimeout(2500);
  const sa = await A.evaluate(() => ({ lvl: window.__S.level, st: window.__S.st, ex: Math.round(window.__S.egg.x), ey: Math.round(window.__S.egg.y) }));
  const sb = await B.evaluate(() => window.__S ? ({ lvl: window.__S.level, st: window.__S.st, ex: Math.round(window.__S.egg.x), ey: Math.round(window.__S.egg.y) }) : null);
  out.push(['estado anfitrión / invitado', JSON.stringify(sa) + ' / ' + JSON.stringify(sb)]);
  for (const [k, v] of out) console.log('·', k + ':', v);
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

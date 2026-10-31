// Prueba de humo: dos teléfonos entran a la misma sala, se ven, uno invita a Huevo a Dos y juegan.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..')), br = startBroker({ port: 8888 }), b = await chromium.launch(), errs = [];
  const A = await phone(b, { url: 'http://localhost:8765/?debug', errors: errs });
  await enter(A, 'Ana');
  const code = await A.evaluate(() => window.__app.room.code);
  console.log('sala', code);
  const B = await phone(b, { url: 'http://localhost:8765/?debug#' + code, errors: errs });
  await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  await B.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  console.log('juntos:', await A.evaluate(() => window.__app.room.partner().name), '/', await B.evaluate(() => window.__app.room.partner().name));
  await A.waitForTimeout(2500);
  console.log('via A:', await A.evaluate(() => window.__app.link.via), 'via B:', await B.evaluate(() => window.__app.link.via));
  await A.evaluate(() => window.__app.world('huevo'));
  await A.click('text=Jugar juntos');
  await B.waitForSelector('text=Unirme', { timeout: 10000 }); await B.click('text=Unirme');
  await A.waitForFunction(() => window.__S && window.__S.st === 'play', null, { timeout: 10000 });
  await B.waitForFunction(() => window.__S && window.__S.st === 'play', null, { timeout: 10000 });
  await A.waitForTimeout(2000);
  const sa = await A.evaluate(() => [window.__S.egg.x, window.__S.egg.y, window.__S.B.x, window.__S.B.y]);
  const sb = await B.evaluate(() => [window.__S.egg.x, window.__S.egg.y, window.__S.B.x, window.__S.B.y, window.__S.D]);
  console.log('anfitrión huevo/B', sa.map(v => v.toFixed(1)).join(' '), '| invitado huevo/B/D', sb.map(v => v.toFixed(1)).join(' '));
  await A.screenshot({ path: process.env.SHOTS + '/a_game.png' }); await B.screenshot({ path: process.env.SHOTS + '/b_game.png' });
  // Tienda: sin monedas no se puede; con monedas se compra, se equipa y la pareja lo ve
  await A.evaluate(() => window.__app.room.endSession()); await A.waitForTimeout(500);
  await A.click('nav >> text=Mi pájaro'); await A.click('text=Gorros'); await A.click('.opt:has-text("Gorra")'); await A.waitForTimeout(300);
  const sinMonedas = await A.evaluate(() => window.__app.store.profile.avatar.hat);
  await A.evaluate(() => window.__app.progress.reward({ coins: 100 })); await A.click('.opt:has-text("Gorra")'); await A.waitForTimeout(1500);
  const compra = await A.evaluate(() => ({ hat: window.__app.store.profile.avatar.hat, monedas: window.__app.store.coins }));
  const loVe = await B.evaluate(() => window.__app.room.partner().avatar.hat);
  console.log('tienda: sin monedas ->', sinMonedas, '| tras comprar ->', JSON.stringify(compra), '| la pareja ve:', loVe);
  // Versión clásica intacta y enlaces viejos (#ABCD)
  const C = await phone(b, { url: 'http://localhost:8765/clasico/', errors: errs }); await C.waitForSelector('#btnLocal'); await C.click('#btnLocal'); await C.waitForTimeout(1500);
  console.log('clásico: juego visible ->', await C.isVisible('#hud'));
  const D = await phone(b, { url: 'http://localhost:8765/?debug#QWER', errors: errs }); await enter(D, 'Viejo');
  console.log('enlace viejo #QWER -> sala', await D.evaluate(() => window.__app.room.code));
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message); process.exit(1); });

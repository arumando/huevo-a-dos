// Persistencia: el anfitrión recarga (y hasta borra el guardado local de la sala) y recupera la partida desde el servidor.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
(async () => {
  let step = 'inicio'; process.on('exit', () => console.log('último paso:', step));
  const srv = serve(path.join(__dirname, '..'), 8768), br = startBroker({ port: 8880 }), b = await chromium.launch(), errs = [], out = [];
  const A = await phone(b, { port: 8880, url: 'http://localhost:8768/?debug', errors: errs }); await enter(A, 'Ana');
  const code = await A.evaluate(() => window.__app.room.code);
  const B = await phone(b, { port: 8880, url: 'http://localhost:8768/?debug#' + code, errors: errs }); await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  step = 'await A.evaluate(() => window.__app.laun'; await A.evaluate(() => window.__app.launch('huevo', { level: 'acantilado-2', mode: 'normal' }));
  await B.waitForSelector('text=Unirme'); await B.click('text=Unirme');
  await A.waitForFunction(() => window.__S && window.__S.st === 'play');
  await A.evaluate(() => { window.__S.setCp(1); window.__app.progress.reward({ xp: 120, coins: 40 }); });
  await A.waitForTimeout(2000); // que se publique en el servidor
  const before = await A.evaluate(() => ({ live: window.__app.store.shared.live, xp: window.__app.store.profile.xp, coins: window.__app.store.coins, pid: window.__app.store.profile.pid }));
  out.push(['guardado antes de recargar', JSON.stringify({ nivel: before.live?.level, bandera: before.live?.cp, xp: before.xp, monedas: before.coins })]);
  // 1) recarga normal
  step = 'await A.reload(); await A.waitForSelecto'; await A.reload(); await A.waitForSelector('.plaza canvas', { timeout: 15000 });
  out.push(['tras recargar: tarjeta "Partida guardada"', await A.isVisible('text=Partida guardada')]);
  await B.waitForSelector('text=Tu pareja se desconectó', { timeout: 15000 }).catch(() => {}); out.push(['B ve que el anfitrión se fue', await B.isVisible('text=Tu pareja se desconectó')]);
  // 2) borrar el guardado local de la sala y del perfil (menos la identidad) y recargar: debe volver desde el servidor
  step = 'await A.evaluate(c => { localStorage.rem'; await A.evaluate(c => { localStorage.removeItem('nido.room.' + c); const p = JSON.parse(localStorage.getItem('nido.profile')); localStorage.setItem('nido.profile', JSON.stringify({ pid: p.pid, name: p.name, room: p.room, avatar: p.avatar })); }, code);
  await A.reload(); await A.waitForSelector('.plaza canvas', { timeout: 15000 }); await A.waitForTimeout(3000);
  const after = await A.evaluate(() => ({ live: window.__app.store.shared.live, xp: window.__app.store.profile.xp, coins: window.__app.store.coins }));
  out.push(['sin datos locales, recuperado del servidor', JSON.stringify({ nivel: after.live?.level, bandera: after.live?.cp, xp: after.xp, monedas: after.coins })]);
  // 3) continuar juntos desde la bandera
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  step = "await A.click('text=Continuar juntos');"; await A.click('text=Continuar juntos');
  await B.waitForSelector('text=Unirme', { timeout: 10000 }); await B.click('text=Unirme');
  await A.waitForFunction(() => window.__S && window.__S.st === 'play', null, { timeout: 10000 });
  out.push(['continúa en', JSON.stringify(await A.evaluate(() => ({ nivel: window.__S.level, bandera: window.__S.cp })))]);
  // 4) código de respaldo en un teléfono nuevo
  step = 'const backup ='; const backup = await A.evaluate(() => window.__app.store.exportBackup());
  const C = await phone(b, { port: 8880, url: 'http://localhost:8768/?debug', errors: errs }); await enter(C, 'Otro');
  await C.evaluate(t => { window.__app.store.importBackup(t); }, backup);
  out.push(['respaldo en otro teléfono', JSON.stringify(await C.evaluate(() => ({ mismo_id: window.__app.store.profile.name, sala: window.__app.store.room, xp: window.__app.store.profile.xp })))]);
  for (const [k, v] of out) console.log('·', k + ':', v);
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(async e => { console.log('FALLÓ', e.message.split('\n')[0]); try { await (await b.contexts()[0].pages()[0]).screenshot({ path: process.env.SHOTS + '/p_fail.png' }); } catch (_) {} process.exit(1); });

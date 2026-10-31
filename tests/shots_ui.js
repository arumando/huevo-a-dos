// Capturas de las pantallas principales de la plataforma con dos teléfonos.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
const SH = process.env.SHOTS;
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8767), br = startBroker({ port: 8879 }), b = await chromium.launch(), errs = []; global.__errs = errs; global.__b = b;
  const A = await phone(b, { port: 8879, url: 'http://localhost:8767/?debug', errors: errs });
  await A.waitForSelector('#nameIn'); await A.screenshot({ path: SH + '/u_welcome.png' });
  await enter(A, 'Ana'); await A.waitForTimeout(800); await A.screenshot({ path: SH + '/u_hub_sola.png' });
  const code = await A.evaluate(() => window.__app.room.code);
  const B = await phone(b, { port: 8879, url: 'http://localhost:8767/?debug#' + code, errors: errs }); await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 }); await A.waitForTimeout(1500);
  await B.evaluate(() => window.__app.room.chat('¿Jugamos?')); await A.waitForTimeout(700);
  await A.screenshot({ path: SH + '/u_hub_juntos.png' });
  await A.evaluate(() => window.__app.worlds()); await A.waitForTimeout(500); await A.screenshot({ path: SH + '/u_mundos.png' });
  await A.evaluate(() => window.__app.store.updateShared(s => { s.huevo.levels['acantilado-1'] = { done: true, medals: 2, bestTime: 241, minEggs: 3 }; }));
  await A.evaluate(() => window.__app.world('huevo')); await A.waitForTimeout(500); await A.screenshot({ path: SH + '/u_huevo.png' });
  await A.evaluate(() => window.__app.world('bomba')); await A.waitForTimeout(400); await A.screenshot({ path: SH + '/u_bomba.png' });
  await A.evaluate(() => window.__app.home()); await A.waitForTimeout(400);
  await A.click('nav >> text=Mi pájaro'); await A.waitForTimeout(400); await A.screenshot({ path: SH + '/u_avatar.png' });
  await A.click('text=Gorros'); await A.waitForTimeout(300); await A.screenshot({ path: SH + '/u_gorros.png' });
  await A.click('[aria-label="Cerrar"]'); await A.click('nav >> text=Logros'); await A.waitForTimeout(400); await A.screenshot({ path: SH + '/u_logros.png' });
  await A.click('[aria-label="Cerrar"]'); await A.click('nav >> text=Ajustes'); await A.waitForTimeout(400); await A.screenshot({ path: SH + '/u_ajustes.png' });
  await A.click('[aria-label="Cerrar"]'); await A.click('nav >> text=Chat'); await A.waitForTimeout(400); await A.screenshot({ path: SH + '/u_chat.png' });
  await A.click('[aria-label="Cerrar"]');
  await B.evaluate(() => window.__app.launch('escape', { level: 'e1', label: 'El taller del relojero' })); await A.waitForTimeout(900); await A.screenshot({ path: SH + '/u_invitacion.png' });
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(async e => { console.log('FALLÓ', e.message.split('\n')[0], 'errores:', global.__errs); try { const pg = global.__b.contexts()[0].pages()[0]; await pg.screenshot({ path: SH + '/u_fail.png' }); } catch (_) {} process.exit(1); });

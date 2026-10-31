// Flujo de uso con toques reales (eventos táctiles): pasos 1–7, 12 y 13 de la lista de pruebas de usabilidad.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8776), br = startBroker({ port: 8889 }), b = await chromium.launch(), errs = [], log = []; global.__b = b;
  const ok = (n, cond, extra = '') => { const l = `${cond ? '✓' : '✗'} ${n}${extra ? ' · ' + extra : ''}`; log.push(l); console.log(l); };
  const tap = async (P, sel) => { const el = typeof sel === 'string' ? await P.waitForSelector(sel, { timeout: 8000 }) : null; if (el) { await el.scrollIntoViewIfNeeded(); await P.waitForTimeout(150); } const bb = el ? await el.boundingBox() : null; const [x, y] = el ? [bb.x + bb.width / 2, bb.y + bb.height / 2] : sel; await P.touchscreen.tap(x, y); await P.waitForTimeout(250); };
  // 1–2. Entrar, escribir nombre y elegir pájaro
  const A = await phone(b, { port: 8889, url: 'http://localhost:8776/?debug', errors: errs });
  await A.waitForSelector('#nameIn'); ok('1. Abre Isla Nido y ve la bienvenida', await A.isVisible('text=Entrar a la isla'));
  await tap(A, '#nameIn'); await A.keyboard.type('Ana'); await tap(A, '.sw >> nth=2'); await tap(A, 'text=Entrar a la isla');
  await A.waitForSelector('.plaza canvas'); ok('2. Nombre y pájaro elegidos', (await A.evaluate(() => window.__app.store.profile.name)) === 'Ana', 'color ' + await A.evaluate(() => window.__app.store.profile.avatar.body));
  // 3–4. Invitar (toque real) y compartir el enlace
  const before = await A.evaluate(() => document.getElementById('btnInvite').getBoundingClientRect().toJSON());
  await tap(A, '#btnInvite'); await A.waitForTimeout(400);
  const after = await A.evaluate(() => document.getElementById('btnInvite')?.getBoundingClientRect().toJSON());
  const toast = (await A.textContent('.toasts')) || '';
  ok('3. «Invitar» responde y no se mueve', toast.length > 0 && Math.abs(before.x - after.x) < 1 && Math.abs(before.y - after.y) < 1, `aviso: «${toast.slice(0, 50)}»`);
  const link = await A.evaluate(() => window.__app.inviteUrl()); ok('4. Enlace para compartir', /#[A-Z]{6}$/.test(link), link.replace('http://localhost:8776', ''));
  // 5. Segundo teléfono entra con el enlace
  const B = await phone(b, { port: 8889, url: link.replace('/#', '/?debug#'), errors: errs });
  await B.waitForSelector('#nameIn'); ok('5a. El segundo teléfono ve «Tu pareja te invitó»', await B.isVisible('text=Tu pareja te invitó'));
  await tap(B, '#nameIn'); await B.keyboard.type('Beto'); await tap(B, 'text=Entrar a la isla'); await B.waitForSelector('.plaza canvas');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  ok('5b. Juntos en la misma sala', await A.isVisible('text=Juntos en la isla') && await B.isVisible('text=Juntos en la isla'));
  // Los botones no se reconstruyen solos mientras están juntos (antes ocurría cada ~3 s con la presencia de la pareja)
  const stable = async (P, sel) => { await P.evaluate(s => { window.__probe = document.querySelector(s); }, sel); await P.waitForTimeout(8000); return P.evaluate(s => !!window.__probe && window.__probe.isConnected && window.__probe === document.querySelector(s), sel); };
  ok('5c. Los botones de la plaza siguen siendo los mismos 8 s después', await stable(A, '.hub-panel .btn'));
  // 6. Abrir los seis mundos: uno caminando por la plaza y el resto desde «Todos los mundos»
  const [px, py] = await A.evaluate(() => window.__hub.portal('bomba')); await A.touchscreen.tap(px, py);
  await A.waitForSelector('.hero', { timeout: 10000 }); ok('6a. Tocar un portal lleva caminando al mundo', (await A.textContent('.hero .htitle')) === 'Desactiva la bomba');
  ok('6c. Los botones del mundo siguen siendo los mismos 8 s después', await stable(A, '.gcard .btn.primary'));
  await tap(A, '[aria-label="Volver a los mundos"]'); await A.waitForSelector('.worlds');
  const names = [];
  for (let i = 0; i < 6; i++) {
    await tap(A, `.wcard >> nth=${i}`); await A.waitForSelector('.hero'); names.push(await A.textContent('.hero .htitle'));
    const help = await A.$('text=Cómo se juega'); if (help) { await tap(A, 'text=Cómo se juega'); await A.waitForSelector('.sheet'); await tap(A, '.sheet [aria-label="Cerrar"]'); }
    await tap(A, '[aria-label="Volver a los mundos"]'); await A.waitForSelector('.worlds');
  }
  ok('6b. Los seis mundos abren con sus instrucciones', names.length === 6, names.join(', '));
  // 7. Iniciar una partida juntos
  await tap(A, '.wcard >> nth=0'); await A.waitForSelector('.hero'); await tap(A, 'text=Jugar juntos');
  await B.waitForSelector('text=Unirme', { timeout: 8000 }); await tap(B, 'text=Unirme');
  await A.waitForSelector('.hv-root'); await B.waitForSelector('.hv-root'); await A.waitForTimeout(300);
  for (const P of [A, B]) { const x = await P.$('.sheet [aria-label="Cerrar"]'); if (x) await tap(P, '.sheet [aria-label="Cerrar"]'); }
  ok('7. Partida iniciada en los dos teléfonos', await A.evaluate(() => window.__S?.st === 'play') && await B.evaluate(() => window.__S?.st === 'play'));
  // 12. Salir de la partida y regresar
  await tap(A, '[aria-label="Pausa y menú"]'); await tap(A, 'text=Salir al mundo'); await A.waitForSelector('.hero'); await B.waitForSelector('.hero', { timeout: 8000 });
  await tap(A, '.nav button:has-text("Plaza")'); await A.waitForSelector('.plaza canvas');
  ok('12. Ambos salen al mundo y se vuelve a la plaza', await B.isVisible('.hero') && await A.isVisible('.plaza canvas'));
  // 13. El progreso se conserva al recargar
  await A.evaluate(() => window.__app.progress.reward({ xp: 50, coins: 25 })); await A.waitForTimeout(1500);
  const p0 = await A.evaluate(() => ({ coins: window.__app.store.coins, room: window.__app.room.code, name: window.__app.store.profile.name }));
  await A.reload(); await A.waitForSelector('.plaza canvas');
  const p1 = await A.evaluate(() => ({ coins: window.__app.store.coins, room: window.__app.room.code, name: window.__app.store.profile.name }));
  ok('13. Progreso y sala conservados tras recargar', JSON.stringify(p0) === JSON.stringify(p1), JSON.stringify(p1));
  console.log('errores de página:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close(); srv.close(); await br.close(); process.exit(log.some(l => l.startsWith('✗')) ? 1 : 0);
})().catch(async e => { console.log('FALLÓ', e.message.split('\n')[0]); try { const pages = global.__b.contexts().map(c => c.pages()[0]); for (let i = 0; i < pages.length; i++) { await pages[i].screenshot({ path: (process.env.SHOTS || '/tmp') + `/flow_fail_${i}.png` }); console.log('pantalla', i, await pages[i].evaluate(() => [...document.querySelectorAll('.screen')].map(s => s.className).join('|') + ' · hojas ' + document.querySelectorAll('.sheet-wrap').length)); } } catch (_) {} process.exit(1); });

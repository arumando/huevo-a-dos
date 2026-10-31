// Abre cada juego con dos teléfonos (invitación + aceptación), hace interacciones básicas y revisa errores.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
const SHOTS = process.env.SHOTS;
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8766), br = startBroker({ port: 8878 }), b = await chromium.launch(), errs = [];
  const A = await phone(b, { port: 8878, url: 'http://localhost:8766/?debug', errors: errs }); await enter(A, 'Ana');
  const code = await A.evaluate(() => window.__app.room.code);
  const B = await phone(b, { port: 8878, url: 'http://localhost:8766/?debug#' + code, errors: errs }); await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  const results = [];
  const open = async (id, opts = {}) => {
    await A.evaluate(([id, o]) => window.__app.launch(id, o), [id, opts]);
    await B.waitForSelector('text=Unirme', { timeout: 8000 }); await B.click('text=Unirme');
    await A.waitForSelector('.game-root', { timeout: 8000 }); await B.waitForSelector('.game-root', { timeout: 8000 });
    await A.waitForTimeout(1200);
  };
  const close = async () => { await A.evaluate(() => window.__app.room.endSession()); await A.waitForTimeout(600); const back = await B.evaluate(() => !document.querySelector('.game-root')); return back; };
  const text = async (P) => (await P.textContent('.game-root')).replace(/\s+/g, ' ').slice(0, 160);
  const check = async (name, fn) => { const before = errs.length; try { const info = await fn(); results.push([name, errs.length === before ? 'ok' : 'errores', info || '']); } catch (e) { results.push([name, 'FALLÓ', e.message.split('\n')[0]]); } };

  await check('bomba', async () => { await open('bomba', { level: 'b2' }); await A.click('text=Yo veo la bomba'); await A.click('text=¡Empezar!'); await A.waitForTimeout(900);
    const a = await A.isVisible('text=Número de serie'), m = await B.isVisible('text=Manual de desactivación'); if (SHOTS) { await A.screenshot({ path: SHOTS + '/g_bomba_a.png' }); await B.screenshot({ path: SHOTS + '/g_bomba_b.png' }); }
    // A confirma palancas con la posición inicial (probablemente error): debe contar un error en ambos
    await A.click('text=Confirmar palancas'); await A.waitForTimeout(700);
    const s = await B.evaluate(() => document.querySelector('.game-root').textContent.includes('●')); return `bomba visible A:${a} manual B:${m} error sincronizado:${s} vuelta:${await close()}`; });
  await check('escape', async () => { await open('escape', { level: 'e1' }); await B.click('text=Yo exploro'); await A.click('text=¡Entrar!'); await A.waitForTimeout(900);
    if (SHOTS) { await A.screenshot({ path: SHOTS + '/g_escape_a.png' }); await B.screenshot({ path: SHOTS + '/g_escape_b.png' }); }
    // el invitado explora: resolvemos la caja fuerte con la respuesta real (calculada con la misma semilla)
    const ans = await A.evaluate(async () => { const m = await import('/js/games/escape/rooms.js'); const st = window.__app.room.session; return null; });
    return `A ve documentos:${await A.isVisible('text=Nota del relojero')} B ve relojes:${await B.isVisible('text=Cerradura 1 de 3')} vuelta:${await close()}`; });
  await check('detective', async () => { await open('detective', { level: 'c1' }); await A.click('text=Mi expediente'); await B.click('text=Mi expediente'); await A.waitForTimeout(400);
    const a = await A.isVisible('text=Declaración de la abuela'), bb = await B.isVisible('text=Interrogatorio a Lucía'), cross = await B.isVisible('text=Declaración de la abuela');
    await A.click('text=Pizarra'); await B.click('text=Pizarra');
    for (const P of [A, B]) { await P.click('button:has-text("Prima Lucía")'); await P.click('button:has-text("Escondido en una caja")'); await P.click('button:has-text("Quería ganar el concurso")'); }
    await A.waitForTimeout(500); await A.click('button:has-text("Acusar")'); await A.waitForTimeout(800);
    if (SHOTS) await B.screenshot({ path: SHOTS + '/g_detective_b.png' });
    return `expedientes distintos:${a && bb && !cross} caso resuelto en ambos:${await A.isVisible('text=¡Caso cerrado!')}/${await B.isVisible('text=¡Caso cerrado!')} vuelta:${await close()}`; });
  await check('aventura', async () => { await open('aventura', { level: 'a1' }); const t0 = await B.evaluate(() => performance.now());
    await B.click('[aria-label="Mover up"]'); const moved = await B.evaluate(() => performance.now()); await A.waitForTimeout(600);
    if (SHOTS) await A.screenshot({ path: SHOTS + '/g_aventura_a.png' });
    return `mapa visible:${await A.isVisible('text=Gemas 0/2')} vuelta:${await close()}`; });
  for (const id of ['memoria', 'gato', 'ppt', 'quiz', 'dibujo', 'carrera', 'reflejos', 'puzzle']) await check(id, async () => {
    await open(id);
    if (id === 'gato') { await A.click('[aria-label="Casilla 5"]'); await A.waitForTimeout(500); }
    if (id === 'ppt') { await A.click('[aria-label="piedra"]'); await B.click('[aria-label="tijera"]'); await A.waitForTimeout(700); }
    if (id === 'quiz') { await A.click('.game-root .list button >> nth=0'); await B.waitForTimeout(600); await B.click('.game-root .list button >> nth=1'); await A.waitForTimeout(600); }
    if (id === 'dibujo') { await A.click('.game-root .list button >> nth=0'); await A.waitForTimeout(500); const c = await A.$('canvas'); const bx = await c.boundingBox(); await A.mouse.move(bx.x + 40, bx.y + 40); await A.mouse.down(); for (let i = 0; i < 10; i++) await A.mouse.move(bx.x + 40 + i * 15, bx.y + 40 + i * 10); await A.mouse.up(); await A.waitForTimeout(700); }
    if (id === 'carrera' || id === 'puzzle') { await A.click(id === 'carrera' ? 'text=Preparados…' : 'text=Empezar'); await A.waitForTimeout(3600); }
    if (id === 'reflejos') { await A.click('text=Empezar'); await A.waitForTimeout(500); }
    if (SHOTS && ['ppt', 'quiz', 'dibujo', 'gato'].includes(id)) { await A.screenshot({ path: SHOTS + `/g_${id}_a.png` }); await B.screenshot({ path: SHOTS + `/g_${id}_b.png` }); }
    const ta = await text(A), tb = await text(B); return `A: ${ta.slice(0, 70)} | B: ${tb.slice(0, 70)} | vuelta:${await close()}`;
  });
  for (const r of results) console.log(r[1].padEnd(8), r[0].padEnd(10), r[2]);
  console.log('errores de página:', errs.length ? errs.slice(0, 8) : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message); process.exit(1); });

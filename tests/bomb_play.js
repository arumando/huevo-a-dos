// Juega una bomba completa por la interfaz con dos teléfonos: B ve la bomba, A lee el manual.
// B "lee" la bomba en pantalla (luces encendidas, palancas, símbolos); las respuestas se calculan con las reglas del manual.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers');
const SH = process.env.SHOTS, LEVEL = process.env.LEVEL || 'b4';
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8773), br = startBroker({ port: 8885 }), b = await chromium.launch(), errs = [], log = [];
  const A = await phone(b, { port: 8885, url: 'http://localhost:8773/?debug', errors: errs }); await enter(A, 'Ana');
  const code = await A.evaluate(() => window.__app.room.code);
  const B = await phone(b, { port: 8885, url: 'http://localhost:8773/?debug#' + code, errors: errs }); await enter(B, 'Beto');
  await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
  await A.evaluate(l => window.__app.launch('bomba', { level: l }), LEVEL);
  await B.waitForSelector('text=Unirme'); await B.click('text=Unirme');
  await B.waitForSelector('.rolecard'); await A.waitForTimeout(600);
  for (const P of [A, B]) { const close = await P.$('.sheet [aria-label="Cerrar"]'); if (close) await close.click(); } // instrucciones de la primera vez
  if (SH) await A.screenshot({ path: SH + '/b_roles.png' });
  await B.click('.rolecard:has-text("Ve la bomba")'); await A.waitForTimeout(400);
  await A.click('text=¡Empezar!'); await B.waitForSelector('.bcase');
  const M = await B.evaluate(() => window.__bomb.bomb);
  log.push('módulos: ' + M.modules.map(m => m.type).join(', ') + ' · serie ' + M.serial);
  const R = await B.evaluate(async () => { const r = await import('/js/games/bomba/modules.js'); const b = window.__bomb.bomb; return b.modules.map(m => m.type === 'palancas' ? r.leverTarget(m) : m.type === 'simbolos' ? r.symbolCode(m) : m.type === 'calculo' ? String(r.calcTarget(m, b.serial, b.modules.length)) : null); });
  const strikes = () => B.evaluate(() => window.__bomb.st.strikes);
  const typeKeys = async digits => { for (const d of digits) await B.click(`.bmod.open .keypad button[aria-label="${d}"]`); await B.click('.bmod.open .keypad button[aria-label="Enviar"]'); };
  let first = true;
  for (let i = 0; i < M.modules.length; i++) {
    const m = M.modules[i];
    await B.waitForFunction(i => window.__bomb.st.focus === i, i, { timeout: 5000 }).catch(async () => { await B.click(`.bmod >> nth=${i} >> .bmod-head`); });
    await B.waitForTimeout(400);
    // el manual de A sigue al módulo abierto
    const manualTitle = await A.textContent('.doc h4');
    log.push(`módulo ${i + 1} (${m.type}): el manual de A muestra «${manualTitle}»`);
    if (SH) { await B.screenshot({ path: `${SH}/b_mod_${m.type}.png` }); await A.screenshot({ path: `${SH}/b_man_${m.type}.png` }); }
    if (m.type === 'palancas') {
      if (first) { first = false; const s0 = await strikes(); await B.click('.bmod.open >> text=Confirmar palancas'); const target = R[i], cur = m.start; if (target.every((v, j) => v === cur[j])) log.push('(la posición inicial ya era correcta)'); else { await B.waitForTimeout(700); log.push(`error a propósito: errores ${s0} → ${await strikes()} (A ve ${await A.evaluate(() => window.__bomb.st.strikes)})`); if (await B.evaluate(i => window.__bomb.st.solved[i], i)) continue; } }
      const cur = await B.evaluate(() => [...document.querySelectorAll('.bmod.open .lever')].map(l => l.getAttribute('aria-pressed') === 'true'));
      for (let j = 0; j < 5; j++) if (cur[j] !== R[i][j]) await B.click(`.bmod.open .lever >> nth=${j}`);
      await B.click('.bmod.open >> text=Confirmar palancas');
    } else if (m.type === 'luces') {
      await B.click('.bmod.open >> text=Ver secuencia');
      const seen = [];
      const t0 = Date.now(); while (Date.now() - t0 < 1300 * m.seq.length + 900) { const lit = await B.evaluate(() => { const b = document.querySelector('.lgrid button.lit'); return b ? [+b.dataset.c, b.querySelector('b').textContent] : null; }); if (lit && (!seen.length || seen.at(-1)[0] !== lit[0] || seen.at(-1)[1] !== lit[1] || seen.at(-1).t < Date.now() - 900)) { seen.push(Object.assign(lit, { t: Date.now() })); } await B.waitForTimeout(120); }
      const steps = seen.map(([c, col]) => ({ cell: c, color: { ROJO: 'rojo', AZUL: 'azul', VERDE: 'verde', AMARILLO: 'amarillo' }[col] }));
      log.push(`luces vistas en pantalla: ${steps.map(s => (s.cell + 1) + ' ' + s.color).join(', ')}`);
      const targets = await B.evaluate(async st => { const r = await import('/js/games/bomba/modules.js'); return st.map(s => r.lightTarget(s)); }, steps);
      await B.waitForFunction(() => !document.querySelector('.lgrid button:disabled'));
      for (const t of targets) { await B.click(`.bmod.open .lgrid button[data-c="${t}"]`); await B.waitForTimeout(250); }
    } else await typeKeys(R[i]);
    await B.waitForTimeout(900);
    const ok = await B.evaluate(i => window.__bomb.st.solved[i] || window.__bomb.st.status === 'win', i);
    log.push(`  → ${ok ? 'desactivado' : 'NO desactivado'}`);
  }
  await A.waitForSelector('text=¡Bomba desactivada!', { timeout: 6000 }).catch(() => {});
  log.push(`resultado A: ${await A.isVisible('text=¡Bomba desactivada!')} · B: ${await B.isVisible('text=¡Bomba desactivada!')} · errores finales ${await strikes()}`);
  if (SH) await B.screenshot({ path: SH + '/b_win.png' });
  // salir y comprobar progreso guardado
  await A.click('text=Volver al mundo'); await A.waitForTimeout(800);
  log.push('progreso guardado: ' + JSON.stringify(await A.evaluate(() => window.__app.store.shared.games?.bomba)));
  log.forEach(l => console.log('·', l)); console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

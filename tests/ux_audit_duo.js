// Auditoría de interfaz en juegos de dos teléfonos (cada rol), en iPhone 13 e iPhone SE.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, devices, enter, auditPage } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8775), br = startBroker({ port: 8887 }), b = await chromium.launch(), errs = [], problems = []; let total = 0;
  for (const dn of ['iPhone 13', 'iPhone SE']) {
    const mk = async () => { const ctx = await b.newContext({ ...devices[dn] }); await ctx.addInitScript(() => { window.__NIDO_BROKERS = ['ws://localhost:8887']; }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); return { p, cdp }; };
    const { p: A, cdp: ca } = await mk(); await A.goto('http://localhost:8775/?debug'); await enter(A, 'Ana');
    const code = await A.evaluate(() => window.__app.room.code);
    const { p: B, cdp: cb } = await mk(); await B.goto('http://localhost:8775/?debug#' + code); await enter(B, 'Beto');
    await A.waitForFunction(() => window.__app.room.together, null, { timeout: 15000 });
    const audit = async (P, c, s) => { total += await auditPage(P, c, s, dn, problems); };
    const closeHelp = async () => { for (const P of [A, B]) { const x = await P.$('.sheet [aria-label="Cerrar"]'); if (x) await x.click(); } };
    const open = async (id, opts = {}) => { await A.evaluate(([id, o]) => window.__app.launch(id, o), [id, opts]); await B.waitForSelector('text=Unirme'); await audit(B, cb, 'invitación'); await B.click('text=Unirme'); await A.waitForSelector('.game-root'); await B.waitForSelector('.game-root'); await A.waitForTimeout(700); await closeHelp(); };
    const close = async () => { await A.evaluate(() => window.__app.room.endSession()); await A.waitForTimeout(500); };
    await open('bomba', { level: 'b4' }); await audit(A, ca, 'bomba roles');
    await B.click('.rolecard:has-text("Ve la bomba")'); await A.click('text=¡Empezar!'); await B.waitForSelector('.bcase');
    for (let i = 0; i < 4; i++) { if (i) await B.click(`.bmod >> nth=${i} >> .bmod-head`); await B.waitForTimeout(400); await audit(B, cb, 'bomba módulo ' + (i + 1)); await audit(A, ca, 'manual módulo ' + (i + 1)); }
    await close();
    await open('escape', { level: 'e1' }); await B.click('text=Yo exploro'); await A.click('text=¡Entrar!'); await B.waitForTimeout(600); await audit(B, cb, 'escape explora'); await audit(A, ca, 'escape archiva'); await close();
    await open('detective', { level: 'c1' }); await audit(A, ca, 'detective caso'); await A.click('text=Pizarra'); await audit(A, ca, 'detective pizarra'); await close();
    for (const g of ['quiz', 'dibujo', 'ppt', 'memoria']) { await open(g); await audit(A, ca, g + ' A'); await audit(B, cb, g + ' B'); await close(); }
    await A.context().close(); await B.context().close();
  }
  const uniq = [...new Set(problems)];
  console.log(`${total} elementos revisados · ${uniq.length} problemas`); uniq.slice(0, 50).forEach(p => console.log(' -', p));
  console.log('errores de página:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close(); srv.close(); await br.close(); process.exit(uniq.length ? 1 : 0);
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

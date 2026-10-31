// Reproduce el error del botón «Invitar a mi pareja»: mide su posición antes y durante la pulsación táctil
// y comprueba que la acción se ejecuta. Revisa también todos los botones visibles de la plaza.
const path = require('path'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, devices, phone, enter } = require('./helpers');
(async () => {
  const srv = serve(path.join(__dirname, '..'), 8772), br = startBroker({ port: 8884 }), b = await chromium.launch(), errs = [];
  for (const dev of ['iPhone 13', 'Pixel 7']) {
    const ctx = await b.newContext({ ...devices[dev] }); await ctx.addInitScript(() => { window.__NIDO_BROKERS = ['ws://localhost:8884']; window.__shared = 0; });
    const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message));
    await A.goto('http://localhost:8772/?debug'); await enter(A, 'Ana'); await A.waitForTimeout(600);
    const cdp = await ctx.newCDPSession(A);
    // Medir cada botón visible: rectángulo antes y mientras el dedo está apoyado
    const results = await A.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height && getComputedStyle(b).visibility !== 'hidden'; }).map((b, i) => { b.dataset.probe = i; const r = b.getBoundingClientRect(); return { i, text: b.textContent.trim().slice(0, 24) || b.getAttribute('aria-label'), x: r.x + r.width / 2, y: r.y + r.height / 2, r: [r.x, r.y, r.width, r.height] }; }));
    const moved = [];
    // Forzar el estado :active (lo que Safari aplica al apoyar el dedo) y medir de nuevo
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (const it of results) {
      if (it.y < 0 || it.y > (await A.evaluate(() => innerHeight))) continue;
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-probe="${it.i}"]` });
      if (!nodeId) continue;
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] });
      const r2 = await A.evaluate(i => { const r = document.querySelector(`[data-probe="${i}"]`).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, it.i);
      const under = await A.evaluate(([x, y, i]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest(`[data-probe="${i}"]`); }, [it.x, it.y, it.i]);
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      const dx = Math.abs(r2[0] - it.r[0]), dy = Math.abs(r2[1] - it.r[1]);
      if (dx > 3 || dy > 4 || !under) moved.push(`«${it.text}» se movió ${dx.toFixed(0)},${dy.toFixed(0)} px${under ? '' : ' y el dedo queda fuera'}`);
    }
    // Tocar de verdad el botón de invitar y ver si ejecuta la acción
    const inv = await A.$('#btnInvite'); let acted = 'no visible';
    if (inv) { const bb = await inv.boundingBox(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }] }); await A.waitForTimeout(120); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await A.waitForTimeout(500); acted = (await A.textContent('.toasts')) || '(sin respuesta)'; }
    console.log(`${dev}: ${results.length} botones revisados · ${moved.length ? 'SE MUEVEN: ' + moved.join(' | ') : 'ninguno se mueve'} · al tocar Invitar: ${acted.slice(0, 70)}`);
    await ctx.close();
  }
  console.log('errores:', errs.length ? errs : 'ninguno');
  await b.close(); srv.close(); await br.close();
})().catch(e => { console.log('FALLÓ', e.message.split('\n')[0]); process.exit(1); });

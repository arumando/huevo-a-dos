// Mide la sincronización de Huevo a Dos (v2) con red simulada. Compara con la línea base de la v1.
// VIA=mqtt  -> fuerza el servidor MQTT con retraso emulado en el broker (comparación directa con la v1)
// VIA=p2p   -> canal directo con retraso/jitter/pérdida simulados en la app (?netsim)
const path = require('path'), fs = require('fs'); const serve = require('./serve'); const startBroker = require('./broker'); const { chromium, phone, enter } = require('./helpers'); const { analyze } = require('./metrics');
const VIA = process.env.VIA || 'mqtt', REP = +(process.env.REP || 2);
const CONDS = { ideal: { delay: 0, jitter: 0 }, wifi: { delay: 30, jitter: 20 }, celular: { delay: 60, jitter: 60 }, celular_picos: { delay: 60, jitter: 60, spikeP: .03, spikeMs: 250 }, celular_perdida: { delay: 60, jitter: 60, loss: 0.05 } };
const only = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(CONDS).filter(k => VIA === 'p2p' || k !== 'celular_perdida');
const motion = who => `(() => { let T0 = Date.now(), prev = 'play'; setInterval(() => { const S = window.__S; if (!S) return; if (S.st === 'play' && prev !== 'play') T0 = Date.now(); prev = S.st; const t = (Date.now() - T0) / 1000;
  const b = S['${who}'], ph = '${who}' === 'A' ? 0 : 0.5, bx = '${who}' === 'A' ? 120 : 240;
  b.tx = bx + 14 * Math.sin(t * 1.1 + ph); b.ty = 70 + Math.min(t, 8) * 18 + 9 * Math.sin(t * 0.8 + ph * 0.4); }, 16); })()`;
const recorder = `(() => { window.__rec = []; (function loop() { const S = window.__S; if (S) window.__rec.push([Date.now(), S.egg.x, S.egg.y, S.A.x, S.A.y, S.B.x, S.B.y, S.st]); requestAnimationFrame(loop); })(); })()`;
(async () => {
  const srv = serve(path.join(__dirname, '..')), b = await chromium.launch(), out = {}; let port = 8890;
  for (const name of only) for (let rep = 0; rep < REP; rep++) try {
    const c = CONDS[name];
    port++; const br = startBroker({ port, ...(VIA === 'mqtt' ? c : {}) });
    const q = VIA === 'mqtt' ? '?debug&nortc' : `?debug&netsim=${2 * c.delay},${2 * c.jitter},${c.loss || 0}`;
    const A = await phone(b, { port, url: 'http://localhost:8765/' + q }); await enter(A, 'Ana');
    const code = await A.evaluate(() => window.__app.room.code);
    const B = await phone(b, { port, url: 'http://localhost:8765/' + q + '#' + code }); await enter(B, 'Beto');
    await A.waitForFunction(() => window.__app.room.together, null, { timeout: 20000 });
    if (VIA === 'p2p') await A.waitForFunction(() => window.__app.link.via === 'p2p', null, { timeout: 20000 });
    await A.waitForTimeout(1500);
    await A.evaluate(() => window.__app.launch('huevo', { level: 'acantilado-1' }));
    await B.waitForSelector('text=Unirme', { timeout: 15000 }); await B.click('text=Unirme');
    await A.waitForFunction(() => window.__S && window.__S.st === 'play'); await B.waitForFunction(() => window.__S && window.__S.st === 'play');
    await A.waitForTimeout(1000);
    await A.evaluate(recorder); await B.evaluate(recorder);
    if (process.env.TRACE) for (const P of [A, B]) await P.evaluate(() => { window.__trace = []; setInterval(() => { const S = window.__S; window.__trace.push([Math.round(performance.now()), S.st, S.rs, S.remoteRs, S.myRs, Math.round(S.B.x), Math.round(S.B.y)]); }, 250); }); await A.evaluate(motion('A')); await B.evaluate(motion('B'));
    const s0 = await A.evaluate(() => ({ ...window.__app.link.stats })), s0b = await B.evaluate(() => ({ ...window.__app.link.stats }));
    await A.waitForTimeout(16000);
    if (process.env.TRACE) { console.log('host', JSON.stringify(await A.evaluate(() => window.__trace))); console.log('guest', JSON.stringify(await B.evaluate(() => window.__trace))); }
    const H = await A.evaluate(() => window.__rec), G = await B.evaluate(() => window.__rec);
    const s1 = await A.evaluate(() => ({ ...window.__app.link.stats })), s1b = await B.evaluate(() => ({ ...window.__app.link.stats }));
    const msgs = ((s1.fast + s1.rel - s0.fast - s0.rel) + (s1b.fast + s1b.rel - s0b.fast - s0b.rel)) / 16;
    out[name + '#' + rep] = { ...analyze(H, G), huevos_rotos: await A.evaluate(() => window.__S.deaths), cracks: await A.evaluate(() => window.__cracks || []), msgs_por_s: +msgs.toFixed(1), via: await A.evaluate(() => window.__app.link.via), D: Math.round(await B.evaluate(() => window.__S.D)) };
    console.log(name + '#' + rep, JSON.stringify(out[name + '#' + rep]));
    await A.context().close(); await B.context().close(); await br.close(); await new Promise(r => setTimeout(r, 1200));
  } catch (e) { console.log('run failed', name, rep, e.message.split('\n')[0]); for (const c of b.contexts()) await c.close().catch(() => {}); await new Promise(r => setTimeout(r, 1500)); }
  fs.writeFileSync(process.env.OUT || ('bench_v2_' + VIA + '.json'), JSON.stringify(out, null, 1));
  await b.close(); srv.close();
})();

// Broker MQTT local para pruebas, con latencia y jitter por dirección.
// Las entregas salen de una cola ordenada (como TCP: puede retrasarse, nunca desordenarse).
const aedesF = require('aedes'); const { WebSocketServer } = require('ws'); const { Duplex } = require('stream');
function orderedDelay(send) {
  const q = []; let timer = null, last = 0;
  const pump = () => { timer = null; const t = Date.now(); while (q.length && q[0].at <= t) send(q.shift().d); if (q.length) timer = setTimeout(pump, Math.max(0, q[0].at - Date.now())); };
  return (d, lag) => { last = Math.max(last, Date.now() + lag); q.push({ at: last, d }); if (!timer) timer = setTimeout(pump, Math.max(0, q[0].at - Date.now())); };
}
module.exports = function startBroker(o = {}) {
  const cfg = Object.assign({ port: 8888, delay: 0, jitter: 0, spikeP: 0, spikeMs: 0 }, o);
  const aedes = aedesF(); const stats = { pubs: 0, bytes: 0, byClient: {}, m: 0 };
  aedes.on('publish', (p, c) => { if (!c) return; if (p.topic.endsWith('/m')) stats.m++; stats.pubs++; stats.bytes += p.payload.length; stats.byClient[c.id] = (stats.byClient[c.id] || 0) + 1; });
  const wss = new WebSocketServer({ port: cfg.port });
  const lag = () => cfg.delay + Math.random() * cfg.jitter + (Math.random() < cfg.spikeP ? cfg.spikeMs : 0);
  wss.on('connection', ws => {
    const down = orderedDelay(chunk => { if (ws.readyState === 1) ws.send(chunk); });
    const d = new Duplex({ read() {}, write(chunk, enc, cb) { down(chunk, lag()); cb(); }, final(cb) { setTimeout(() => ws.close(), 10); cb(); } });
    const up = orderedDelay(m => { if (!d.destroyed) d.push(m); });
    ws.on('message', m => up(Buffer.from(m), lag()));
    ws.on('close', () => d.destroy()); ws.on('error', () => d.destroy());
    aedes.handle(d);
  });
  return { cfg, stats, close: () => new Promise(r => { for (const c of wss.clients) c.terminate(); wss.close(() => aedes.close(r)); }) };
};

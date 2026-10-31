// Verificación automática de niveles: puntos de aparición libres, anchura mínima de paso, nido libre
// y que el huevo no se rompa solo al aparecer (3 s quieto en cada bandera).
import { LEVELS } from '../js/games/huevo/levels.js';
import { compileLevel, newWorld, step, spawn, K, bridgeSegs, moverRect, sawPos, fireballPos } from '../js/games/huevo/engine.js';
const overlapRect = (x, y, r, w) => { const cx = Math.max(w.x, Math.min(x, w.x + w.w)), cy = Math.max(w.y, Math.min(y, w.y + w.h)); return Math.hypot(x - cx, y - cy) < r; };
const segDist = (x, y, s) => { const abx = s.x2 - s.x1, aby = s.y2 - s.y1, L2 = abx * abx + aby * aby || 1; const u = Math.max(0, Math.min(1, ((x - s.x1) * abx + (y - s.y1) * aby) / L2)); return Math.hypot(x - (s.x1 + abx * u), y - (s.y1 + aby * u)); };
let fails = 0;
for (const L of LEVELS) {
  const lv = compileLevel(L), issues = [];
  const solids = [...lv.walls, ...lv.hidden], hazards = [...lv.spikes, ...lv.lava];
  const segs = [...lv.slopes, ...lv.bridges.flatMap(b => bridgeSegs(b, 0))];
  const blockedAt = (x, y, r, withHaz) => solids.some(w => overlapRect(x, y, r, w)) || segs.some(s => segDist(x, y, s) < r + 3) || (withHaz && hazards.some(w => overlapRect(x, y, r, w)));
  // 1) aparición en cada bandera
  lv.cps.forEach((c, i) => { const y = c.y + 70; for (const [x, yy, r] of [[c.x - 60, y, K.BR], [c.x + 60, y, K.BR], [c.x, y + K.ER + 3, K.ER]]) {
    if (blockedAt(x, yy, r + 2, true)) issues.push(`bandera ${i}: aparición bloqueada en (${x},${yy})`);
    for (let t = 0; t < 8; t += 0.05) {
      if (lv.movers.some(m => overlapRect(x, yy, r + 2, moverRect(m, t))) || lv.saws.some(s2 => { const [sx, sy] = sawPos(s2, t); return Math.hypot(x - sx, yy - sy) < s2.r + r + 4; }) || lv.fireballs.some(f => { const [fx, fy] = fireballPos(f, t); return Math.hypot(x - fx, yy - fy) < f.r + r + 4; })) { issues.push(`bandera ${i}: un obstáculo móvil pasa por la aparición (${x},${yy})`); break; }
    } } });
  // 2) anchura mínima por altura (solo obstáculos fijos)
  let minSolid = 999, minSolidY = 0, minHaz = 999, minHazY = 0;
  for (let y = 20; y < L.nest.y - 30; y += 4) {
    // pájaros: cada uno puede rodear un obstáculo por un lado distinto -> suma de huecos de al menos 30
    let run = 0, best = 0, runH = 0, bestH = 0;
    const close = () => { if (run >= 30) best += run; run = 0; };
    for (let x = 0; x <= 360; x += 2) {
      if (!blockedAt(x, y, 1, false)) run += 2; else close();
      if (!blockedAt(x, y, 1, true)) { runH += 2; bestH = Math.max(bestH, runH); } else runH = 0;
    }
    close();
    if (best < minSolid) { minSolid = best; minSolidY = y; }
    if (bestH < minHaz) { minHaz = bestH; minHazY = y; }
  }
  if (minSolid < 90) issues.push(`paso demasiado estrecho para los pájaros: ${minSolid} en y=${minSolidY}`);
  if (minHaz < 44) issues.push(`paso demasiado estrecho para el huevo: ${minHaz} en y=${minHazY}`);
  // 3) nido libre
  const nb = lv.nestBox; if (blockedAt((nb.x0 + nb.x1) / 2, (nb.y0 + nb.y1) / 2, 10, true)) issues.push('nido bloqueado');
  // 4) estabilidad al aparecer en cada bandera (3 s sin mover los pájaros)
  for (let i = 0; i < lv.cps.length; i++) {
    const w = newWorld(lv, 'normal'); w.cp = i; spawn(w); w.events.length = 0;
    for (let k = 0; k < 360; k++) step(w, K.DT);
    if (w.deaths) issues.push(`bandera ${i}: el huevo se rompe solo al aparecer (${w.events.find(e => e.k === 'crack')?.why})`);
    if (!Number.isFinite(w.egg.x + w.egg.y)) issues.push(`bandera ${i}: valores inválidos`);
  }
  if (issues.length) fails++;
  console.log((issues.length ? '✗ ' : '✓ ') + L.id.padEnd(14) + ` paso mín. pájaros ${minSolid} (y=${minSolidY}) · huevo ${minHaz} (y=${minHazY})` + (issues.length ? '\n   - ' + issues.join('\n   - ') : ''));
}
console.log(fails ? `${fails} niveles con problemas` : 'Todos los niveles pasan la verificación');
process.exit(fails ? 1 : 0);

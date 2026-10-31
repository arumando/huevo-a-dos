// Verifica que cada mapa de Aventuras se pueda completar (búsqueda en anchura sobre todos los estados).
import { MAPS, initState, move, won } from '../js/games/aventura/maps.js';
let bad = 0;
for (const m of MAPS) {
  const s0 = initState(m), key = s => s.p.flat().join(',') + '|' + s.b.map(b => b.join(',')).sort().join(';') + '|' + s.keys + '|' + s.g.join('');
  const seen = new Set([key(s0)]); let q = [s0], found = null, steps = 0;
  while (q.length && !found && steps < 200) {
    const nq = [];
    for (const s of q) { for (const i of [0, 1]) for (const d of ['up', 'down', 'left', 'right']) { const n = move(s, i, d); if (!n) continue; const k = key(n); if (seen.has(k)) continue; seen.add(k); if (won(n)) { found = n; break; } nq.push(n); } if (found) break; }
    q = nq; steps++;
  }
  console.log((found ? '✓ ' : '✗ ') + m.name.padEnd(12) + (found ? `se resuelve en ${found.moves} movimientos (mínimo)` : 'SIN SOLUCIÓN') + ` · estados explorados ${seen.size}`);
  if (!found) bad++;
}
process.exit(bad ? 1 : 0);

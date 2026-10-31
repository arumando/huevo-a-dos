// Aventuras cooperativas por casillas. Reglas puras (sin dibujo ni red): las usan el juego y el verificador.
// # muro · . suelo · ~ agua (una roca la rellena) · r solo jugador 1 · u solo jugador 2 · p/q placas · P/Q rejas (abiertas si su placa está pisada)
// k llave · L cerradura (gasta una llave) · g gema · O roca empujable · E salida · A/B inicio de cada jugador
export const MAPS = [
  { id: 'a1', name: 'La isla', diff: 'Fácil', story: 'Dos náufragos, dos gemas y una salida. Cada quien puede pisar lugares que la otra persona no.', grid: [
    '#########',
    '#A..#.rg#',
    '#...#..r#',
    '#.p.Q...#',
    '#...#.q.#',
    '#.u.P...#',
    '#ugu#...#',
    '#Bu.#.EE#',
    '#########'] },
  { id: 'a2', name: 'La mansión', diff: 'Media', story: 'Una llave, una cerradura y una reja que solo se queda abierta si algo pesado pisa la placa.', grid: [
    '###########',
    '#A..#k..#g#',
    '#...#...#r#',
    '#.......L.#',
    '###.#####.#',
    '#...#.....#',
    '#.u.#..O..#',
    '#ugu#.p.###',
    '#.u.###P###',
    '#B...#E.E.#',
    '###########'] },
  { id: 'a3', name: 'El templo', diff: 'Difícil', story: 'Un abismo de agua, dos rocas antiguas y una reja pesada. Construyan un puente y no desperdicien ninguna roca.', grid: [
    '###########',
    '#A.....k.g#',
    '#..O.O....#',
    '#~~~~~#####',
    '#.....#...#',
    '#..q..Q...#',
    '#u###.#.#.#',
    '#.....#.#L#',
    '#.###.#.#.#',
    '#Bugu.##EE#',
    '###########'] }
];

export function initState(map) {
  const g = map.grid.map(r => r.split('')), p = [null, null], boulders = [];
  let gems = 0;
  g.forEach((row, r) => row.forEach((ch, c) => {
    if (ch === 'A') { p[0] = [r, c]; row[c] = '.'; } else if (ch === 'B') { p[1] = [r, c]; row[c] = '.'; }
    else if (ch === 'O') { boulders.push([r, c]); row[c] = '.'; } else if (ch === 'g') gems++;
  }));
  return { g: g.map(r => r.join('')), p, b: boulders, keys: 0, got: 0, total: gems, moves: 0 };
}
const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const at = (st, r, c) => st.g[r]?.[c] ?? '#';
const set = (g, r, c, ch) => { const row = g[r]; g[r] = row.slice(0, c) + ch + row.slice(c + 1); };
const hasB = (st, r, c) => st.b.some(b => b[0] === r && b[1] === c);
const hasP = (st, r, c, skip) => st.p.some((q, i) => i !== skip && q[0] === r && q[1] === c);
function plateOn(st, plate, skip) {
  for (let r = 0; r < st.g.length; r++) for (let c = 0; c < st.g[r].length; c++) if (st.g[r][c] === plate && (hasB(st, r, c) || hasP(st, r, c, skip))) return true;
  return false;
}
export function gateOpen(st, gate, skip = -1, r, c) { return plateOn(st, gate.toLowerCase(), skip) || (r != null && hasP(st, r, c, skip)); }
const floorFor = ch => ['.', 'p', 'q', 'E', 'r', 'u'].includes(ch);

// Mueve al jugador i en una dirección. Devuelve el estado nuevo o null si no se puede.
export function move(st, i, dir) {
  const d = DIRS[dir]; if (!d) return null;
  const [r0, c0] = st.p[i], r = r0 + d[0], c = c0 + d[1], ch = at(st, r, c);
  if (ch === '#' || ch === '~' || hasP(st, r, c, i)) return null;
  if (ch === 'r' && i !== 0) return null;
  if (ch === 'u' && i !== 1) return null;
  if ((ch === 'P' || ch === 'Q') && !gateOpen(st, ch, i, r, c)) return null;
  if (ch === 'L' && st.keys < 1) return null;
  const n = { g: st.g.slice(), p: st.p.map(q => q.slice()), b: st.b.map(q => q.slice()), keys: st.keys, got: st.got, total: st.total, moves: st.moves + 1 };
  if (hasB(st, r, c)) {
    const r2 = r + d[0], c2 = c + d[1], ch2 = at(st, r2, c2);
    if (hasB(st, r2, c2) || hasP(st, r2, c2, -1)) return null;
    const bi = n.b.findIndex(b => b[0] === r && b[1] === c);
    if (ch2 === '~') { set(n.g, r2, c2, '.'); n.b.splice(bi, 1); }
    else if (floorFor(ch2)) n.b[bi] = [r2, c2];
    else return null;
  }
  if (ch === 'L') { n.keys--; set(n.g, r, c, '.'); }
  if (ch === 'k') { n.keys++; set(n.g, r, c, '.'); }
  if (ch === 'g') { n.got++; set(n.g, r, c, '.'); }
  n.p[i] = [r, c];
  return n;
}
export const won = st => st.got === st.total && st.p.every(([r, c]) => st.g[r][c] === 'E');

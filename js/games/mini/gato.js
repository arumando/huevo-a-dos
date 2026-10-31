// Tres en raya. Quien empieza se alterna en cada partida.
import { h, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish, other } from './common.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Tres en raya'), S = ctx.session; let finished = -1;
  const fresh = (first, score, round) => ({ b: Array(9).fill(''), turn: first, first, score, round, status: 'play', win: null, line: null });
  const sync = createSync(ctx, {
    init: () => fresh('host', { host: 0, guest: 0 }, 1),
    reduce(st, a, by) {
      if (a.k === 'again' && st.status === 'end') return fresh(other(st.first), st.score, st.round + 1);
      if (a.k !== 'put' || st.status !== 'play' || (S.role !== 'local' && by !== st.turn)) return null;
      if (!Number.isInteger(a.i) || st.b[a.i]) return null;
      const b = st.b.slice(); b[a.i] = st.turn === 'host' ? 'X' : 'O';
      const line = LINES.find(l => b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]);
      if (line) return { ...st, b, status: 'end', win: st.turn, line, score: { ...st.score, [st.turn]: st.score[st.turn] + 1 } };
      if (b.every(Boolean)) return { ...st, b, status: 'end', win: 'tie' };
      return { ...st, b, turn: other(st.turn) };
    },
    onState: render
  });
  function render(st) {
    if (!st) return;
    const n = players(ctx), myTurn = S.role === 'local' || st.turn === S.role;
    setKids(ui.body, scoreRow(ctx, st.score, st.status === 'play' ? st.turn : null),
      h('p', { class: 'note', style: { textAlign: 'center' } }, `${n.host} juega con X · ${n.guest} con O`),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '330px', margin: '0 auto', width: '100%' } }, st.b.map((v, i) =>
        h('button', { class: 'btn', style: { aspectRatio: '1', fontSize: '48px', fontFamily: 'var(--display)', padding: 0, color: v === 'X' ? 'var(--coral)' : 'var(--teal)', background: st.line?.includes(i) ? 'var(--plum)' : '' }, 'aria-label': 'Casilla ' + (i + 1) + (v ? ' ' + v : ''), disabled: !myTurn || !!v || st.status !== 'play', onclick: () => { sfx.tap(); sync.dispatch({ k: 'put', i }); } }, v))),
      st.status === 'play' ? h('p', { class: 'lead', style: { textAlign: 'center' } }, myTurn && S.role !== 'local' ? 'Te toca' : 'Turno de ' + n[st.turn]) :
        h('div', { class: 'list' }, h('h3', { style: { textAlign: 'center' } }, st.win === 'tie' ? 'Empate' : 'Ganó ' + n[st.win]), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'again' }) }, 'Otra partida'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')));
    if (st.status === 'end' && finished !== st.round) {
      finished = st.round; const result = S.role === 'local' ? 'coop' : st.win === 'tie' ? 'tie' : st.win === S.role ? 'win' : 'lose';
      miniFinish(ctx, { id: 'gato', title: 'Tres en raya', result, detail: st.win === 'tie' ? 'Empate' : 'Ganó ' + n[st.win] });
      (result === 'lose' ? sfx.lose : sfx.win)();
    }
  }
  return { destroy() { sync.destroy(); ui.destroy(); } };
}

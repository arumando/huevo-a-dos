// Memoria por turnos: encuentren parejas; si aciertas, sigues.
import { h, rng, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish, other } from './common.js';

const FACES = ['🐣', '🌙', '⭐', '🍓', '🌵', '🎈', '🐙', '🍩'];
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Memoria'), S = ctx.session; let hideT = 0, done = '';
  const deal = seed => rng(seed).shuffle([...FACES.keys(), ...FACES.keys()]);
  const fresh = (seed, first = 'host') => ({ seed, cards: deal(seed), open: [], matched: [], turn: first, score: { host: 0, guest: 0 }, status: 'play', round: 1 });
  const sync = createSync(ctx, {
    init: () => fresh(S.id),
    reduce(st, a, by) {
      if (a.k === 'again') return { ...fresh(st.seed + 'x', other(st.turn)), round: st.round + 1 };
      if (a.k === 'hide' && by === 'host' && st.open.length === 2) return { ...st, open: [], turn: other(st.turn) };
      if (a.k !== 'flip' || st.status !== 'play' || st.open.length >= 2) return null;
      if (S.role !== 'local' && by !== st.turn) return null;
      const i = a.i; if (!Number.isInteger(i) || i < 0 || i > 15 || st.open.includes(i) || st.matched.includes(i)) return null;
      const open = [...st.open, i];
      if (open.length === 2 && st.cards[open[0]] === st.cards[open[1]]) {
        const matched = [...st.matched, ...open], score = { ...st.score, [st.turn]: st.score[st.turn] + 1 };
        return { ...st, open: [], matched, score, status: matched.length === 16 ? 'end' : 'play' };
      }
      return { ...st, open };
    },
    onState: render
  });
  function render(st) {
    if (!st) return;
    clearTimeout(hideT);
    if (st.open.length === 2 && sync.isHost) hideT = setTimeout(() => sync.dispatch({ k: 'hide' }), 1000);
    const n = players(ctx), myTurn = S.role === 'local' || st.turn === S.role;
    setKids(ui.body, scoreRow(ctx, st.score, st.status === 'play' ? st.turn : null),
      h('p', { class: 'note', style: { textAlign: 'center' } }, st.status === 'end' ? '' : myTurn ? (S.role === 'local' ? 'Turno de ' + n[st.turn] : 'Te toca: voltea dos cartas') : 'Turno de ' + n[st.turn]),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' } }, st.cards.map((f, i) => {
        const up = st.open.includes(i) || st.matched.includes(i);
        return h('button', { class: 'btn', style: { aspectRatio: '1', fontSize: '30px', padding: 0, background: st.matched.includes(i) ? 'var(--plum)' : up ? 'var(--shell)' : 'var(--dusk)' }, 'aria-label': up ? 'Carta ' + FACES[f] : 'Carta boca abajo', disabled: !myTurn || up || st.status !== 'play', onclick: () => { sfx.tap(); sync.dispatch({ k: 'flip', i }); } }, up ? FACES[f] : '');
      })));
    if (st.status === 'end' && done !== st.seed) {
      done = st.seed; const s = st.score, win = s.host === s.guest ? 'tie' : s.host > s.guest ? 'host' : 'guest';
      const result = S.role === 'local' ? 'coop' : win === 'tie' ? 'tie' : win === S.role ? 'win' : 'lose';
      const g = miniFinish(ctx, { id: 'memoria', title: 'Memoria', result, detail: `${s.host} a ${s.guest}` });
      (result === 'lose' ? sfx.lose : sfx.win)();
      ui.show(h('h2', null, win === 'tie' ? '¡Empate!' : '¡Ganó ' + n[win] + '!'), h('p', { class: 'lead' }, `${n.host} ${s.host} · ${n.guest} ${s.guest}`), h('p', { class: 'reward' }, `+${g.xp} XP · +${g.coins} monedas`),
        h('button', { class: 'btn primary', onclick: () => { ui.hide(); sync.dispatch({ k: 'again' }); } }, 'Otra partida'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir'));
    } else if (st.status === 'play') ui.hide();
  }
  return { destroy() { clearTimeout(hideT); sync.destroy(); ui.destroy(); } };
}

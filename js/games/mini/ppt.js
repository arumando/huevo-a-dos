// Piedra, papel o tijera: eligen al mismo tiempo; el anfitrión guarda las elecciones en secreto hasta que ambos eligen.
import { h, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish } from './common.js';

const OPT = { piedra: '✊', papel: '✋', tijera: '✌️' }, BEATS = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Piedra, papel o tijera'), S = ctx.session; let secret = {}, done = -1;
  const fresh = (game = 1) => ({ game, round: 1, picked: { host: false, guest: false }, last: null, score: { host: 0, guest: 0 }, status: 'play' });
  const sync = createSync(ctx, {
    init: () => fresh(),
    reduce(st, a, by) {
      if (a.k === 'again' && st.status === 'end') { secret = {}; return fresh(st.game + 1); }
      if (a.k !== 'pick' || st.status !== 'play' || !OPT[a.v] || st.picked[by]) return null;
      secret[by] = a.v; const picked = { ...st.picked, [by]: true };
      if (!picked.host || !picked.guest) return { ...st, picked };
      const h1 = secret.host, g1 = secret.guest, win = h1 === g1 ? 'tie' : BEATS[h1] === g1 ? 'host' : 'guest';
      const score = { ...st.score }; if (win !== 'tie') score[win]++;
      secret = {};
      return { ...st, picked: { host: false, guest: false }, last: { host: h1, guest: g1, win }, score, round: st.round + 1, status: score.host >= 3 || score.guest >= 3 ? 'end' : 'play' };
    },
    onState: render
  });
  function render(st) {
    if (!st) return;
    const n = players(ctx), mine = st.picked[S.role], L = st.last;
    setKids(ui.body, scoreRow(ctx, st.score), h('p', { class: 'note', style: { textAlign: 'center' } }, 'Gana quien llegue a 3. Elijan al mismo tiempo.'),
      L ? h('div', { class: 'panel', style: { textAlign: 'center' } }, h('div', { style: { fontSize: '54px' } }, OPT[L.host] + '  ' + OPT[L.guest]), h('b', null, L.win === 'tie' ? 'Empate' : 'Punto para ' + n[L.win])) : null,
      st.status === 'play' ? h('div', { class: 'list' },
        h('p', { class: 'lead', style: { textAlign: 'center' } }, mine ? 'Elegiste. Esperando a ' + n[S.role === 'host' ? 'guest' : 'host'] + '…' : 'Ronda ' + st.round + ': elige'),
        h('div', { class: 'row' }, Object.entries(OPT).map(([k, e]) => h('button', { class: 'btn', style: { flex: 1, minHeight: '96px', fontSize: '44px', flexDirection: 'column' }, disabled: mine, 'aria-label': k, onclick: () => { sfx.tap(); sync.dispatch({ k: 'pick', v: k }); } }, e, h('small', { style: { fontSize: '13px' } }, k)))))
        : h('div', { class: 'list' }, h('h3', { style: { textAlign: 'center' } }, '¡Ganó ' + n[st.score.host >= 3 ? 'host' : 'guest'] + '!'), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'again' }) }, 'Revancha'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')));
    if (st.status === 'end' && done !== st.game) { done = st.game; const w = st.score.host >= 3 ? 'host' : 'guest'; miniFinish(ctx, { id: 'ppt', title: 'Piedra, papel o tijera', result: w === S.role ? 'win' : 'lose', detail: `${st.score.host} a ${st.score.guest}` }); (w === S.role ? sfx.win : sfx.lose)(); }
  }
  return { destroy() { sync.destroy(); ui.destroy(); } };
}

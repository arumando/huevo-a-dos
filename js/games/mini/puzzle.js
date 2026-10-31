// Rompecabezas deslizante en carrera: el mismo revoltijo en ambos teléfonos y salida sincronizada.
import { h, now, rng, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish } from './common.js';

const N = 3, SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];
function scramble(seed) { const r = rng(seed); let b = SOLVED.slice(), z = 8, prev = -1; for (let i = 0; i < 80; i++) { const opts = [z - 3, z + 3, z % 3 ? z - 1 : -1, z % 3 < 2 ? z + 1 : -1].filter(j => j >= 0 && j < 9 && j !== prev); const j = r.pick(opts); [b[z], b[j]] = [b[j], b[z]]; prev = z; z = j; } return b; }
const inPlace = b => b.filter((v, i) => v && v === SOLVED[i]).length;
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Rompecabezas'), S = ctx.session; let board = null, race = -1, done = -1, finT = 0, sent = false;
  const fresh = (r = 1, score = { host: 0, guest: 0 }) => ({ r, phase: 'ready', seed: S.id + ':' + r, at: 0, prog: { host: 0, guest: 0 }, fin: { host: null, guest: null }, win: null, score });
  const sync = createSync(ctx, {
    init: () => fresh(),
    reduce(st, a, by) {
      if (a.k === 'start' && st.phase !== 'run') return { ...fresh(st.phase === 'end' ? st.r + 1 : st.r, st.score), phase: 'run', at: now() + 3000 };
      if (st.phase !== 'run') return null;
      if (a.k === 'prog' && Number.isInteger(a.n)) return { ...st, prog: { ...st.prog, [by]: a.n } };
      if (a.k === 'fin' && Number.isFinite(a.ms) && st.fin[by] == null) {
        const fin = { ...st.fin, [by]: a.ms };
        if (S.role === 'local' || (fin.host != null && fin.guest != null)) { const win = S.role === 'local' ? 'host' : fin.host <= fin.guest ? 'host' : 'guest'; return { ...st, fin, phase: 'end', win, score: { ...st.score, [win]: st.score[win] + 1 } }; }
        return { ...st, fin };
      }
      if (a.k === 'giveup' && by === 'host') { const fin = { host: st.fin.host ?? 99999999, guest: st.fin.guest ?? 99999999 }, win = fin.host <= fin.guest ? 'host' : 'guest'; return { ...st, fin, phase: 'end', win, score: { ...st.score, [win]: st.score[win] + 1 } }; }
      return null;
    },
    onState: render
  });
  const startLocal = st => (S.role === 'guest' ? S.toLocalTime(st.at) ?? st.at : st.at);
  function slide(i) {
    const st = sync.state; if (!st || st.phase !== 'run' || now() < startLocal(st) || sent) return;
    const z = board.indexOf(0), adj = (Math.abs(i - z) === 3) || (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3));
    if (!adj) return; [board[z], board[i]] = [board[i], board[z]]; sfx.tick();
    const p = inPlace(board);
    if (p === 8) { sent = true; sync.dispatch({ k: 'fin', ms: Math.round(now() - startLocal(st)) }); } else sync.dispatch({ k: 'prog', n: p });
    render(sync.state);
  }
  function render(st) {
    if (!st) return;
    if (st.r !== race && st.phase === 'run') { race = st.r; board = scramble(st.seed); sent = false; }
    const n = players(ctx), me = S.role === 'local' ? 'host' : S.role, other = me === 'host' ? 'guest' : 'host';
    let main;
    if (st.phase === 'ready') main = [h('p', { class: 'lead' }, 'Ordenen los números del 1 al 8 deslizando las fichas. Los dos tienen el mismo revoltijo; gana quien termine primero.'), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, 'Empezar')];
    else if (st.phase === 'run') {
      const left = Math.ceil((startLocal(st) - now()) / 1000); if (left > 0) setTimeout(() => render(sync.state), 200);
      main = [S.role !== 'local' ? h('p', { class: 'note' }, `${n[other]} lleva ${st.prog[other]} de 8 en su lugar`) : null,
        left > 0 ? h('h2', { style: { textAlign: 'center' } }, String(left)) : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxWidth: '330px', width: '100%', margin: '0 auto' } }, board.map((v, i) => h('button', { class: 'btn', style: { aspectRatio: '1', fontSize: '34px', fontFamily: 'var(--display)', padding: 0, visibility: v ? 'visible' : 'hidden', background: v === SOLVED[i] ? 'var(--plum)' : '' }, 'aria-label': v ? 'Ficha ' + v : 'Hueco', onclick: () => slide(i) }, v || ''))),
        sent ? h('p', { class: 'waiting' }, h('span', { class: 'dot' }), '¡Listo! Esperando a ' + n[other] + '…') : null];
    } else main = [h('h3', { style: { textAlign: 'center' } }, S.role === 'local' ? `¡Listo en ${(st.fin.host / 1000).toFixed(1)} s!` : '¡Ganó ' + n[st.win] + '!'), S.role !== 'local' ? h('p', { class: 'note', style: { textAlign: 'center' } }, `${n.host}: ${st.fin.host > 9e6 ? 'no terminó' : (st.fin.host / 1000).toFixed(1) + ' s'} · ${n.guest}: ${st.fin.guest > 9e6 ? 'no terminó' : (st.fin.guest / 1000).toFixed(1) + ' s'}`) : null, h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, 'Otra vez'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')];
    setKids(ui.body, S.role === 'local' ? h('span') : scoreRow(ctx, st.score), ...main);
    if (st.phase === 'end' && done !== st.r) { done = st.r; const result = S.role === 'local' ? 'coop' : st.win === S.role ? 'win' : 'lose'; miniFinish(ctx, { id: 'puzzle', title: 'Rompecabezas', result, detail: S.role === 'local' ? (st.fin.host / 1000).toFixed(1) + ' s' : 'Ganó ' + n[st.win] }); (result === 'lose' ? sfx.lose : sfx.win)(); }
    if (st.phase === 'run' && sync.isHost) { clearTimeout(finT); if (st.fin.host != null || st.fin.guest != null) finT = setTimeout(() => sync.dispatch({ k: 'giveup' }), 45000); }
  }
  return { destroy() { clearTimeout(finT); sync.destroy(); ui.destroy(); } };
}

// Reflejos: la señal aparece al mismo tiempo en ambos teléfonos (reloj compartido); cada quien mide su reacción.
import { h, now, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish } from './common.js';

const ROUNDS = 5;
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Reflejos'), S = ctx.session, local = S.role === 'local'; let timer = 0, mine = {}, done = -1, game = 0;
  const fresh = (g = 1) => ({ g, round: 0, phase: 'ready', at: 0, res: { host: null, guest: null }, score: { host: 0, guest: 0 }, last: null });
  const sync = createSync(ctx, {
    init: () => fresh(),
    reduce(st, a, by) {
      if (a.k === 'go' && (st.phase === 'ready' || st.phase === 'result')) return { ...st, phase: 'wait', round: st.round + 1, at: now() + 1800 + Math.random() * 3200, res: { host: null, guest: null } };
      if (a.k === 'again' && st.phase === 'end') return fresh(st.g + 1);
      const who = local ? a.p : by;
      if (a.k === 'tap' && st.phase === 'wait' && st.res[who] == null && Number.isFinite(a.ms)) {
        const res = { ...st.res, [who]: a.ms };
        if (res.host == null || res.guest == null) return { ...st, res };
        const val = v => (v < 0 ? 1e6 : v), win = val(res.host) === val(res.guest) ? 'tie' : val(res.host) < val(res.guest) ? 'host' : 'guest';
        const score = { ...st.score }; if (win !== 'tie') score[win]++;
        return { ...st, res, score, last: win, phase: st.round >= ROUNDS ? 'end' : 'result' };
      }
      return null;
    },
    onState: render
  });
  const localAt = st => (S.role === 'guest' ? S.toLocalTime(st.at) ?? st.at : st.at);
  function press(who) {
    const st = sync.state; if (!st || st.phase !== 'wait' || mine[who + st.round] != null) return;
    const ms = Math.round(now() - localAt(st)); mine[who + st.round] = ms;
    sfx.tap(); sync.dispatch({ k: 'tap', ms: ms < 0 ? -1 : ms, p: who }); render(st);
  }
  const fmt = v => (v == null ? '…' : v < 0 ? 'antes de tiempo' : v + ' ms');
  function render(st) {
    if (!st) return;
    clearTimeout(timer);
    const n = players(ctx);
    const zone = (who, live) => h('button', { class: 'btn', style: { flex: 1, minHeight: '200px', fontSize: '26px', background: live ? 'var(--ok)' : 'var(--danger)', color: 'var(--night)', touchAction: 'manipulation' }, onpointerdown: e => { e.preventDefault(); press(who); } }, (local ? n[who] + '\n' : '') + (mine[who + st.round] != null ? fmt(mine[who + st.round]) : live ? '¡TOCA!' : 'Espera…'));
    let main;
    if (st.phase === 'ready') main = [h('p', { class: 'lead' }, `${ROUNDS} rondas. Cuando el botón se ponga verde, tócalo lo más rápido que puedas. Si tocas antes, pierdes la ronda.`), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'go' }) }, 'Empezar')];
    else if (st.phase === 'wait') {
      const live = now() >= localAt(st);
      if (!live) timer = setTimeout(() => { sfx.ok(); render(sync.state); }, Math.max(0, localAt(st) - now()));
      main = [h('p', { class: 'lbl', style: { textAlign: 'center' } }, 'Ronda ' + st.round + ' de ' + ROUNDS), h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, local ? [zone('host', live), zone('guest', live)] : zone(S.role, live))];
    } else main = [h('div', { class: 'panel' }, h('b', null, st.last === 'tie' ? 'Empate' : 'Ronda para ' + n[st.last]), h('span', { class: 'note' }, `${n.host}: ${fmt(st.res.host)} · ${n.guest}: ${fmt(st.res.guest)}`)),
      st.phase === 'end' ? h('h3', { style: { textAlign: 'center' } }, st.score.host === st.score.guest ? '¡Empate!' : '¡Ganó ' + n[st.score.host > st.score.guest ? 'host' : 'guest'] + '!') : null,
      st.phase === 'end' ? h('button', { class: 'btn primary', onclick: () => { mine = {}; sync.dispatch({ k: 'again' }); } }, 'Jugar otra vez') : h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'go' }) }, 'Siguiente ronda'), st.phase === 'end' ? h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir') : null];
    setKids(ui.body, scoreRow(ctx, st.score), ...main);
    if (st.phase === 'end' && done !== st.g) { done = st.g; const w = st.score.host === st.score.guest ? 'tie' : st.score.host > st.score.guest ? 'host' : 'guest'; const result = local ? 'coop' : w === 'tie' ? 'tie' : w === S.role ? 'win' : 'lose'; miniFinish(ctx, { id: 'reflejos', title: 'Reflejos', result, detail: `${st.score.host} a ${st.score.guest}` }); (result === 'lose' ? sfx.lose : sfx.win)(); }
  }
  return { destroy() { clearTimeout(timer); sync.destroy(); ui.destroy(); } };
}

// Carrera de toques: el arranque se programa en el reloj compartido y cada teléfono mide su propio tiempo,
// así la latencia de la red no le da ventaja a nadie.
import { h, now, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, scoreRow, miniFinish } from './common.js';

const GOAL = 50;
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Carrera de toques'), S = ctx.session, local = S.role === 'local'; let done = -1, taps = { host: 0, guest: 0 }, finT = 0, raceId = -1, progT = 0;
  const fresh = (race = 1, score = { host: 0, guest: 0 }) => ({ race, phase: 'ready', at: 0, prog: { host: 0, guest: 0 }, fin: { host: null, guest: null }, win: null, score });
  const sync = createSync(ctx, {
    init: () => fresh(),
    reduce(st, a, by) {
      if (a.k === 'start' && (st.phase === 'ready' || st.phase === 'end')) return { ...fresh(st.phase === 'end' ? st.race + 1 : st.race, st.score), phase: 'run', at: now() + 3000 };
      if (st.phase !== 'run') return null;
      const who = local ? a.p : by;
      if (a.k === 'prog' && Number.isInteger(a.n)) return { ...st, prog: { ...st.prog, [who]: Math.min(GOAL, a.n) } };
      if (a.k === 'fin' && Number.isFinite(a.ms) && st.fin[who] == null) {
        const fin = { ...st.fin, [who]: a.ms }, prog = { ...st.prog, [who]: GOAL };
        if (fin.host != null && fin.guest != null) { const win = fin.host === fin.guest ? 'tie' : fin.host < fin.guest ? 'host' : 'guest'; const score = { ...st.score }; if (win !== 'tie') score[win]++; return { ...st, fin, prog, phase: 'end', win, score }; }
        return { ...st, fin, prog };
      }
      if (a.k === 'giveup' && by === 'host') { const fin = { host: st.fin.host ?? 99999, guest: st.fin.guest ?? 99999 }; const win = fin.host < fin.guest ? 'host' : 'guest'; return { ...st, fin, phase: 'end', win, score: { ...st.score, [win]: st.score[win] + 1 } }; }
      return null;
    },
    onState: render
  });
  const startLocal = st => (S.role === 'guest' ? S.toLocalTime(st.at) ?? st.at : st.at);
  function tap(who) {
    const st = sync.state; if (!st || st.phase !== 'run' || now() < startLocal(st) || st.fin[who] != null || taps[who] >= GOAL) return;
    taps[who]++; sfx.tick();
    if (taps[who] >= GOAL) sync.dispatch({ k: 'fin', ms: Math.round(now() - startLocal(st)), p: who });
    else if (now() - progT > 120) { progT = now(); sync.dispatch({ k: 'prog', n: taps[who], p: who }); }
    paint();
  }
  const track = (who, n) => h('div', { class: 'panel' }, h('span', { class: 'lbl' }, players(ctx)[who]), h('div', { class: 'bar', style: { height: '14px' } }, h('i', { style: { width: Math.round(100 * n / GOAL) + '%', background: who === 'host' ? 'var(--coral)' : 'var(--teal)' } })));
  let tracks = h('div');
  function paint() { const st = sync.state; if (!st) return; const p = { host: local || S.role === 'host' ? taps.host : st.prog.host, guest: local || S.role === 'guest' ? taps.guest : st.prog.guest }; setKids(tracks, track('host', p.host), track('guest', p.guest)); }
  function render(st) {
    if (!st) return;
    if (st.race !== raceId && st.phase === 'run') { raceId = st.race; taps = { host: 0, guest: 0 }; }
    const n = players(ctx), btn = who => h('button', { class: 'btn ' + (who === 'host' ? 'coral' : 'primary'), style: { flex: 1, minHeight: '150px', fontSize: '22px', touchAction: 'manipulation' }, onpointerdown: e => { e.preventDefault(); tap(who); } }, local ? n[who] + ': ¡toca!' : '¡Toca!');
    tracks = h('div', { class: 'list' }); paint();
    let main;
    if (st.phase === 'ready') main = [h('p', { class: 'lead' }, `Gana quien toque ${GOAL} veces primero. La salida es al mismo tiempo en los dos teléfonos.`), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, 'Preparados…')];
    else if (st.phase === 'run') { const left = Math.ceil((startLocal(st) - now()) / 1000); main = [h('h2', { style: { textAlign: 'center' } }, left > 0 ? String(left) : '¡Ya!'), h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, local ? [btn('host'), btn('guest')] : btn(S.role))]; if (left > 0) setTimeout(() => render(sync.state), 200); }
    else main = [h('h3', { style: { textAlign: 'center' } }, st.win === 'tie' ? '¡Empate exacto!' : '¡Ganó ' + n[st.win] + '!'), h('p', { class: 'note', style: { textAlign: 'center' } }, `${n.host}: ${(st.fin.host / 1000).toFixed(2)} s · ${n.guest}: ${(st.fin.guest / 1000).toFixed(2)} s`), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, 'Otra carrera'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')];
    setKids(ui.body, scoreRow(ctx, st.score), tracks, ...main);
    if (st.phase === 'end' && done !== st.race) { done = st.race; const result = local ? 'coop' : st.win === 'tie' ? 'tie' : st.win === S.role ? 'win' : 'lose'; miniFinish(ctx, { id: 'carrera', title: 'Carrera de toques', result, detail: st.win === 'tie' ? 'Empate' : 'Ganó ' + n[st.win] }); (result === 'lose' ? sfx.lose : sfx.win)(); }
    if (st.phase === 'run' && sync.isHost) { clearTimeout(finT); if (st.fin.host != null || st.fin.guest != null) finT = setTimeout(() => sync.dispatch({ k: 'giveup' }), 15000); }
  }
  return { destroy() { clearTimeout(finT); sync.destroy(); ui.destroy(); } };
}

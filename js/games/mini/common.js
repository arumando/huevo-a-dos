// Utilidades de minijuegos: marcador, nombres y cierre de partida.
import { h } from '../../core/util.js';

export function players(ctx) {
  const S = ctx.session, me = ctx.store.profile.name || 'Tú', p = S.partner?.name || 'Tu pareja';
  if (S.role === 'local') return { host: 'Jugador 1', guest: 'Jugador 2', me: 'host' };
  return { host: S.role === 'host' ? me : p, guest: S.role === 'guest' ? me : p, me: S.role };
}
export function scoreRow(ctx, score, turn) {
  const n = players(ctx);
  const cell = k => h('div', { style: { flex: 1, background: turn === k ? 'var(--plum)' : 'var(--dusk)', borderRadius: '14px', padding: '8px 10px', display: 'grid', border: turn === k ? '2px solid var(--gold)' : '2px solid transparent' } },
    h('span', { class: 'lbl' }, n[k] + (ctx.session.role !== 'local' && n.me === k ? ' (tú)' : '')), h('b', { style: { fontSize: '24px', fontVariantNumeric: 'tabular-nums' } }, score?.[k] ?? 0));
  return h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, cell('host'), cell('guest'));
}
// Cierra un minijuego: estadísticas, misión semanal, historial y recompensa (más monedas si ganaste).
export function miniFinish(ctx, { id, title, result, detail }) {
  ctx.store.updateShared(s => { s.games = s.games || {}; const g = s.games.mini || (s.games.mini = {}); g.done = g.done || {}; g.done[id] = true; g.plays = (g.plays || 0) + 1; });
  ctx.progress.stat('mini', 1); ctx.progress.stat('games', 1); if (result === 'win') ctx.progress.stat('wins', 1);
  ctx.progress.mission('mini', 1);
  ctx.progress.record({ id: ctx.session.id + '.' + id + '.' + Math.floor(Date.now() / 5000), game: 'mini', title, result, detail });
  return ctx.progress.reward({ xp: 30, coins: result === 'win' || result === 'coop' ? 15 : 8 });
}
export const other = r => (r === 'host' ? 'guest' : 'host');

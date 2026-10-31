// Base para juegos de interfaz (bomba, escape, detectives, aventuras, minijuegos):
// pantalla con barra superior, temporizador compartido y estado con autoridad del anfitrión.
import { h, now, fmtTime, setKids } from '../core/util.js';
import { sfx } from '../core/audio.js';

// Pantalla estándar: barra superior (salir, título, temporizador) + cuerpo con scroll + capa para resultados.
export function shell(root, ctx, title) {
  const titleEl = h('span', { class: 'title' }, title), timer = h('span', { class: 'timer', hidden: true }), extra = h('span');
  const body = h('div', { class: 'wrap' }), overlay = h('div', { class: 'overlay', hidden: true });
  const conn = h('span', { class: 'chip', hidden: ctx.session.role === 'local' }, h('i'), '');
  const el = h('div', { class: 'gscreen' },
    h('div', { class: 'gtop' }, h('button', { class: 'icon-btn', 'aria-label': 'Salir del juego', onclick: () => confirmExit() }, '✕'), titleEl, extra, timer),
    h('div', { style: { padding: '4px max(12px, env(safe-area-inset-left, 0px)) 0' } }, conn),
    h('div', { class: 'scroll' }, body), overlay);
  root.append(el);
  function confirmExit() {
    show(h('h2', null, '¿Salir del juego?'), h('p', { class: 'note' }, ctx.session.role === 'local' ? 'Se pierde la partida en curso.' : 'Tu pareja vuelve al mundo también.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => ctx.exit() }, 'Salir'), h('button', { class: 'btn primary', onclick: hide }, 'Seguir jugando')));
  }
  function show(...kids) { setKids(overlay, h('div', { class: 'card' }, ...kids)); overlay.hidden = false; }
  function hide() { overlay.hidden = true; setKids(overlay, ); }
  // Si se cae la conexión con la pareja, aviso de espera; desaparece cuando vuelve.
  const wait = h('div', { class: 'overlay', hidden: true }, h('div', { class: 'card' }, h('h2', null, 'Tu pareja se desconectó'), h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Esperando a que vuelva…'), h('p', { class: 'note' }, 'La partida sigue guardada aquí. Si vuelve a abrir la isla, entra solo.'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')));
  el.append(wait);
  const S = ctx.session, offs = [S.onEvent('partner-left', d => { if (d) wait.hidden = false; }), S.onEvent('host-left', d => { if (d) wait.hidden = false; }), S.onEvent('partner-back', () => { wait.hidden = true; }), S.onEvent('rejoin', () => { wait.hidden = true; })];
  const iv = setInterval(() => {
    if (ctx.session.role === 'local') return;
    const p = ctx.session.partner; conn.className = 'chip ' + (p ? 'ok' : 'bad');
    conn.lastChild.textContent = p ? `Con ${p.name}` + (ctx.session.rtt() ? ' · ' + Math.round(ctx.session.rtt()) + ' ms' : '') : 'Tu pareja se desconectó';
  }, 500);
  return {
    el, body, overlay, show, hide, extra,
    setTitle: t => { titleEl.textContent = t; },
    setTimer(sec) { if (sec == null) { timer.hidden = true; return; } timer.hidden = false; timer.textContent = fmtTime(sec); timer.classList.toggle('low', sec <= 30); },
    destroy() { clearInterval(iv); offs.forEach(f => f()); }
  };
}

// Estado compartido con autoridad del anfitrión.
//  init(): estado inicial (solo anfitrión) · reduce(estado, acción, quien): nuevo estado o null si no aplica.
//  quien = 'host' | 'guest'. En modo local las acciones llegan como 'host'.
export function createSync(ctx, { init, reduce, onState }) {
  const s = ctx.session, isHost = s.role !== 'guest';
  let state = isHost ? init() : null, alive = true;
  const apply = (a, by) => {
    if (!alive || !state) return;
    let next; try { next = reduce(state, a, by); } catch (e) { console.error(e); next = null; }
    if (!next) return;
    state = next; if (s.role === 'host') s.send('state', state); onState(state);
  };
  if (isHost) {
    s.on('act', a => apply(a, 'guest'));
    s.on('hello', () => s.send('state', state));
    s.onEvent('rejoin', () => s.send('state', state));
    queueMicrotask(() => { if (s.role === 'host') s.send('state', state); onState(state); });
  } else {
    s.on('state', st => { if (st && typeof st === 'object') { state = st; onState(st); } });
    s.onEvent('partner-back', () => s.send('hello', {}));
    s.send('hello', {});
  }
  return {
    isHost, role: s.role,
    get state() { return state; },
    dispatch(a) { if (isHost) apply(a, 'host'); else s.send('act', a); },
    destroy() { alive = false; }
  };
}

// Reloj de partida: el anfitrión guarda cuándo empezó (en su reloj) y el invitado lo convierte al suyo.
const firstSeen = new Map();
export function remaining(ctx, st) {
  if (!st || !st.t0 || !st.dur) return null;
  if (!firstSeen.has(st.t0)) firstSeen.set(st.t0, now());
  const start = ctx.session.role === 'guest' ? ctx.session.toLocalTime(st.t0) ?? firstSeen.get(st.t0) : st.t0;
  return Math.max(0, st.dur - (now() - start) / 1000 - (st.penalty || 0));
}

export function resultCard(ui, { win, title, lines = [], reward, onAgain, onNext, nextLabel, onExit }) {
  (win ? sfx.win : sfx.lose)();
  ui.show(h('p', { class: 'eyebrow' }, win ? 'Lo lograron' : 'Esta vez no'), h('h2', null, title),
    ...lines.map(l => h('p', { class: 'lead' }, l)),
    reward && (reward.xp || reward.coins) ? h('p', { class: 'reward' }, `+${reward.xp} XP · +${reward.coins} monedas`) : null,
    onNext && h('button', { class: 'btn primary', onclick: onNext }, nextLabel || 'Siguiente'),
    onAgain && h('button', { class: 'btn', onclick: onAgain }, 'Jugar otra vez'),
    h('button', { class: 'btn ghost', onclick: onExit }, 'Salir al mundo'));
}

// Registra una partida terminada en el guardado compartido.
export function finishMatch(ctx, { game, level, win, title, detail, xp, coins, mission, ach }) {
  ctx.store.updateShared(s => {
    s.games = s.games || {}; const g = s.games[game] || (s.games[game] = {});
    g.plays = (g.plays || 0) + 1; if (win) { g.wins = (g.wins || 0) + 1; g.done = g.done || {}; if (level) g.done[level] = true; }
  });
  ctx.progress.stat('games', 1); if (win) ctx.progress.stat('wins', 1);
  if (win && mission) ctx.progress.mission(mission, 1);
  if (win && ach) [].concat(ach).forEach(a => ctx.progress.unlock(a));
  ctx.progress.record({ id: ctx.session.id + '.' + game + '.' + (level || '') + '.' + Math.floor(Date.now() / 60000), game, title, result: win ? 'win' : 'lose', detail });
  return win ? ctx.progress.reward({ xp, coins }) : ctx.progress.reward({ xp: Math.round(xp / 4), coins: 0 });
}

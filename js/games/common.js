// Base para juegos de interfaz (bomba, escape, detectives, aventuras, minijuegos):
// pantalla con barra superior, temporizador compartido y estado con autoridad del anfitrión.
import { h, now, fmtTime, setKids } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { svgIcon } from '../ui/icons.js';
import { celebrate } from '../ui/fx.js';
import { gameById } from './registry.js';
import { helpContent } from '../ui/worlds.js';

// Pantalla estándar: barra superior (salir, título, temporizador) + cuerpo con scroll + capa para resultados.
export function shell(root, ctx, title) {
  const S = ctx.session, gid = S.game, info = gameById(gid), color = info?.world.color || '#ffcf4a';
  const titleEl = h('span', { class: 'title' }, title), timer = h('span', { class: 'timer', hidden: true }), extra = h('span');
  const body = h('div', { class: 'wrap' }, h('p', { class: 'waiting', style: { marginTop: '30px' } }, h('span', { class: 'dot' }), S.role === 'guest' ? 'Conectando con tu pareja…' : 'Preparando…'));
  const overlay = h('div', { class: 'overlay', hidden: true });
  const conn = h('span', { class: 'chip', hidden: S.role === 'local' }, h('i'), '');
  const helpBtn = h('button', { class: 'icon-btn', 'aria-label': 'Cómo se juega', onclick: () => openHelp() }, svgIcon('help'));
  const el = h('div', { class: 'gscreen', style: { '--accent': color, '--accent-dk': dk(color) } },
    h('div', { class: 'gtop' }, h('button', { class: 'icon-btn', 'aria-label': 'Salir del juego', onclick: () => confirmExit() }, svgIcon('close')), titleEl, extra, timer, helpBtn),
    h('div', { class: 'gsub' }, conn),
    h('div', { class: 'scroll' }, body), overlay);
  root.append(el);
  function openHelp() { ctx.ui.sheet('Cómo se juega', () => helpContent(gid), { ephemeral: true }); }
  // La primera vez que alguien abre este juego, se muestran las instrucciones.
  if (!ctx.store.profile.seenHelp?.[gid] && helpContent(gid).length) { openHelp(); ctx.store.updateProfile(p => { p.seenHelp = { ...(p.seenHelp || {}), [gid]: 1 }; }); }
  function confirmExit() {
    show(h('h2', null, '¿Salir del juego?'), h('p', { class: 'note' }, ctx.session.role === 'local' ? 'Se pierde la partida en curso.' : 'Tu pareja vuelve al mundo también.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => ctx.exit() }, 'Salir'), h('button', { class: 'btn primary', onclick: hide }, 'Seguir jugando')));
  }
  function show(...kids) { setKids(overlay, h('div', { class: 'card' }, ...kids)); overlay.hidden = false; }
  function hide() { overlay.hidden = true; setKids(overlay, ); }
  // Si se cae la conexión con la pareja, aviso de espera; desaparece cuando vuelve.
  const wait = h('div', { class: 'overlay', hidden: true }, h('div', { class: 'card' }, h('h2', null, 'Tu pareja se desconectó'), h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Esperando a que vuelva…'), h('p', { class: 'note' }, 'La partida sigue guardada aquí. Si vuelve a abrir la isla, entra solo.'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir')));
  el.append(wait);
  const offs = [S.onEvent('partner-left', d => { if (d) wait.hidden = false; }), S.onEvent('host-left', d => { if (d) wait.hidden = false; }), S.onEvent('partner-back', () => { wait.hidden = true; }), S.onEvent('rejoin', () => { wait.hidden = true; })];
  const iv = setInterval(() => {
    if (ctx.session.role === 'local') return;
    const p = ctx.session.partner; conn.className = 'chip ' + (p ? 'ok' : 'bad');
    conn.lastChild.textContent = p ? `Con ${p.name}` + (ctx.session.rtt() ? ' · ' + Math.round(ctx.session.rtt()) + ' ms' : '') : 'Tu pareja se desconectó';
  }, 500);
  return {
    el, body, overlay, show, hide, extra,
    setTitle: t => { titleEl.textContent = t; },
    setTimer(sec) { if (sec == null) { timer.hidden = true; return; } timer.hidden = false; setKids(timer, svgIcon('timer', 18), fmtTime(sec)); timer.classList.toggle('low', sec <= 30); },
    destroy() { clearInterval(iv); offs.forEach(f => f()); }
  };
}

const dk = hex => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * 0.62); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

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
  (win ? sfx.win : sfx.lose)(); if (win) celebrate('big');
  ui.show(h('div', { style: { display: 'grid', placeItems: 'center' } }, h('span', { style: { width: '64px', height: '64px', borderRadius: '22px', display: 'grid', placeItems: 'center', background: win ? 'var(--green)' : 'var(--red)', color: '#120d26', boxShadow: '0 4px 0 rgba(0,0,0,.3)' } }, svgIcon(win ? 'check' : 'close', 34))),
    h('p', { class: 'eyebrow', style: { textAlign: 'center' } }, win ? 'Lo lograron' : 'Esta vez no'), h('h2', { style: { textAlign: 'center' } }, title),
    ...lines.map(l => h('p', { class: 'lead' }, l)),
    reward && (reward.xp || reward.coins) ? h('p', { class: 'reward' }, `+${reward.xp} XP · +${reward.coins} monedas`) : null,
    onNext && h('button', { class: 'btn primary', onclick: onNext }, svgIcon('play', 18), nextLabel || 'Siguiente'),
    onAgain && h('button', { class: 'btn', onclick: onAgain }, svgIcon('refresh', 18), 'Jugar otra vez'),
    h('button', { class: 'btn ghost', onclick: onExit }, svgIcon('back', 18), 'Volver al mundo'));
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

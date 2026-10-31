// Aventuras cooperativas por casillas. El anfitrión arbitra; cada teléfono predice su propio movimiento
// para que se sienta inmediato, y se corrige con el estado del anfitrión (con número de secuencia).
import { h, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync, resultCard, finishMatch } from '../common.js';
import { avatarCanvas } from '../../ui/avatar.js';
import { svgIcon } from '../../ui/icons.js';
import { MAPS, initState, move, won, gateOpen } from './maps.js';

const TEAL = { body: '#3cc9b5', belly: '#b5f0e6' }, CORAL = { body: '#ff7a59', belly: '#ffc2ad' };

export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Aventuras'), S = ctx.session, local = S.role === 'local', myIdx = S.role === 'guest' ? 1 : 0;
  const startIdx = Math.max(0, MAPS.findIndex(m => m.id === S.opts.level));
  let pending = [], seq = 0, lastStatus = '', rewarded = '', view = null, lastGot = 0;
  const fresh = i => ({ idx: i, s: initState(MAPS[i]), seq: 0, status: 'play', resets: 0 });
  const sync = createSync(ctx, {
    init: () => fresh(startIdx),
    reduce(st, a, by) {
      if (a.k === 'next' && st.status === 'win') return fresh(Math.min(MAPS.length - 1, st.idx + 1));
      if (a.k === 'again') return { ...fresh(st.idx), resets: st.resets + 1 };
      if (st.status !== 'play' || a.k !== 'move') return null;
      const who = local ? (a.p === 1 ? 1 : 0) : by === 'guest' ? 1 : 0;
      const n = move(st.s, who, a.dir);
      const next = { ...st, seq: by === 'guest' && Number.isInteger(a.seq) ? Math.max(st.seq, a.seq) : st.seq };
      if (!n) return by === 'guest' ? next : null;
      return { ...next, s: n, status: won(n) ? 'win' : 'play' };
    },
    onState: st => { if (!st) return; pending = pending.filter(p => p.seq > st.seq); render(); }
  });
  // Estado a dibujar: el del anfitrión más mis movimientos que aún no confirma.
  function displayState() {
    const st = sync.state; if (!st) return null;
    let s = st.s; if (S.role === 'guest') for (const p of pending) s = move(s, 1, p.dir) || s;
    return { ...st, s };
  }
  function doMove(dir, p = myIdx) {
    const st = sync.state; if (!st || st.status !== 'play') return;
    sfx.tap();
    if (S.role === 'guest') { const s = ++seq; pending.push({ seq: s, dir }); sync.dispatch({ k: 'move', dir, seq: s }); render(); }
    else sync.dispatch({ k: 'move', dir, p });
  }
  const avs = () => { const mine = ctx.store.profile.avatar, other = S.partner?.avatar || TEAL; const a0 = local ? mine : S.role === 'host' ? mine : other, a1 = local ? (mine.body === TEAL.body ? CORAL : TEAL) : S.role === 'host' ? other : mine; return [a0, a1.body === a0.body ? (a0.body === TEAL.body ? CORAL : TEAL) : a1]; };
  const names = () => { const me = ctx.store.profile.name || 'Tú', p = S.partner?.name || 'Pareja'; return local ? ['Jugador 1', 'Jugador 2'] : S.role === 'host' ? [me, p] : [p, me]; };
  function tile(ch, r, c, st, av) {
    const s = st.s, base = { aspectRatio: '1', borderRadius: '5px', display: 'grid', placeItems: 'center', fontSize: '15px', fontWeight: 900, position: 'relative' };
    let bg = '#d8c08e', txt = '', col = '#1a1430';
    if (ch === '#') { bg = '#4b3c5e'; }
    else if (ch === '~') { bg = '#3a7fd0'; txt = '≈'; col = '#bfe0ff'; }
    else if (ch === 'r') { bg = av[0].body; txt = '1'; }
    else if (ch === 'u') { bg = av[1].body; txt = '2'; }
    else if (ch === 'p' || ch === 'q') { const on = s.b.some(b => b[0] === r && b[1] === c) || s.p.some(q => q[0] === r && q[1] === c); bg = on ? '#ffcf5c' : '#bfa66e'; txt = ch.toUpperCase() === 'P' ? '◉' : '◎'; }
    else if (ch === 'P' || ch === 'Q') { const open = gateOpen(s, ch, -1, r, c); bg = open ? '#d8c08e' : '#5b5470'; txt = open ? '' : '▥'; col = '#e8d3a2'; base.outline = '2px dashed ' + (ch === 'P' ? '#ff9a3d' : '#a07cf0'); }
    else if (ch === 'k') { txt = svgIcon('key', 20); col = '#8a5a00'; }
    else if (ch === 'L') { bg = '#8a5a35'; txt = svgIcon('lock', 18); col = '#ffcf4a'; }
    else if (ch === 'g') { txt = svgIcon('gem', 20); col = '#7a3fd0'; }
    else if (ch === 'E') { bg = '#5fd38a'; txt = svgIcon('door', 18); col = '#0b3a20'; }
    const el = h('div', { style: { ...base, background: bg, color: col } }, txt);
    if (ch === 'P' || ch === 'p') el.style.boxShadow = 'inset 0 0 0 2px #ff9a3d'; if (ch === 'Q' || ch === 'q') el.style.boxShadow = 'inset 0 0 0 2px #a07cf0';
    if (s.b.some(b => b[0] === r && b[1] === c)) setKids(el, h('div', { style: { width: '80%', height: '80%', borderRadius: '40%', background: '#8f8299', boxShadow: 'inset -3px -3px 0 #5b5470' } }));
    s.p.forEach((q, i) => { if (q[0] === r && q[1] === c) setKids(el, avatarCanvas(av[i], 30, { face: i ? -1 : 1 })); });
    return el;
  }
  function pad(p, label) {
    const b = (dir, ic, area) => h('button', { class: 'btn', style: { gridArea: area, minHeight: '60px', padding: 0 }, 'aria-label': label + ' ' + dir, onclick: () => doMove(dir, p) }, svgIcon(ic, 28));
    return h('div', { style: { display: 'grid', gridTemplateAreas: '". u ." "l . r" ". d ."', gridTemplateColumns: 'repeat(3, 64px)', gap: '8px', justifyContent: 'center' } }, b('up', 'arrowUp', 'u'), b('left', 'arrowLeft', 'l'), b('right', 'arrowRight', 'r'), b('down', 'arrowDown', 'd'));
  }
  function render() {
    const st = displayState(); if (!st) return;
    const M = MAPS[st.idx], av = avs(), nm = names();
    ui.setTitle(M.name);
    if (st.s.got > lastGot) { sfx.coin(); } lastGot = st.s.got;
    if (st.status !== lastStatus) { lastStatus = st.status; if (st.status === 'win') showEnd(st); else ui.hide(); }
    const cols = st.s.g[0].length;
    setKids(ui.body, 
      h('p', { class: 'note' }, M.story),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, `Gemas ${st.s.got}/${st.s.total} · llaves ${st.s.keys}`), h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'again' }) }, svgIcon('refresh', 16), 'Reiniciar mapa')),
      h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '2px', background: '#2e2148', padding: '4px', borderRadius: '12px' }, role: 'img', 'aria-label': 'Mapa' }, st.s.g.flatMap((row, r) => row.split('').map((ch, c) => tile(ch, r, c, st, av)))),
      h('div', { class: 'tags' },
        h('span', { class: 'chip' }, h('i', { style: { background: av[0].body } }), '1: solo ' + nm[0]), h('span', { class: 'chip' }, h('i', { style: { background: av[1].body } }), '2: solo ' + nm[1]),
        h('span', { class: 'chip' }, svgIcon('gem', 14), 'Gema'), h('span', { class: 'chip' }, svgIcon('key', 14), 'Llave'), h('span', { class: 'chip' }, svgIcon('lock', 14), 'Cerradura'), h('span', { class: 'chip' }, svgIcon('door', 14), 'Salida')),
      h('p', { class: 'note' }, 'Las rejas punteadas se abren mientras alguien o una roca pisa la placa del mismo color. Las rocas se empujan y rellenan el agua.'),
      local ? h('div', { class: 'row', style: { justifyContent: 'space-around' } }, h('div', null, h('p', { class: 'lbl', style: { textAlign: 'center' } }, nm[0]), pad(0, nm[0])), h('div', null, h('p', { class: 'lbl', style: { textAlign: 'center' } }, nm[1]), pad(1, nm[1]))) : pad(myIdx, 'Mover'));
  }
  const kd = e => { const d = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key.toLowerCase()]; if (!d) return; e.preventDefault(); doMove(d, local && 'wasd'.includes(e.key.toLowerCase()) ? 0 : local ? 1 : myIdx); };
  addEventListener('keydown', kd);
  function showEnd(st) {
    const M = MAPS[st.idx], key = st.idx + ':' + st.resets;
    let reward = null;
    if (rewarded !== key) { rewarded = key; reward = finishMatch(ctx, { game: 'aventura', level: M.id, win: true, title: 'Aventura: ' + M.name, detail: st.s.moves + ' movimientos', xp: 90 + st.idx * 30, coins: 25 + st.idx * 10, mission: 'aventura', ach: 'aventureros' }); }
    resultCard(ui, { win: true, title: '¡Aventura completada!', lines: [`${M.name} en ${st.s.moves} movimientos.`], reward, onNext: st.idx < MAPS.length - 1 ? () => sync.dispatch({ k: 'next' }) : null, nextLabel: 'Siguiente aventura', onAgain: () => sync.dispatch({ k: 'again' }), onExit: () => ctx.exit() });
  }
  return { destroy() { removeEventListener('keydown', kd); sync.destroy(); ui.destroy(); } };
}

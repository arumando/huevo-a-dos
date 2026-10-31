// Dibuja y adivina: una persona dibuja una palabra y la otra la adivina escribiendo. Juegan en equipo.
import { h, rng, now, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync, remaining } from '../common.js';
import { players, miniFinish, other } from './common.js';
import { normalize } from '../escape/rooms.js';

const WORDS = ['gato', 'casa', 'sol', 'luna', 'árbol', 'pez', 'barco', 'flor', 'pizza', 'guitarra', 'corazón', 'nube', 'montaña', 'bicicleta', 'reloj', 'paraguas', 'helado', 'avión', 'tren', 'zapato', 'lentes', 'llave', 'castillo', 'cohete', 'tortuga', 'conejo', 'volcán', 'faro', 'globo', 'pastel', 'taza', 'mariposa', 'serpiente', 'dragón', 'robot', 'piña', 'sombrero', 'caracol', 'ancla', 'estrella'];
const ROUNDS = 6, TIME = 80, COLS = ['#1a1430', '#ff5470', '#3a6fd0', '#3fae5a', '#ffb02e'];
export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Dibuja y adivina'), S = ctx.session; let secret = null, done = '', lastRound = -1, lastSfx = -1, color = COLS[0], strokes = [];
  const fresh = seed => ({ seed, round: 0, drawer: 'host', phase: 'choose', options: rng(seed + ':0').shuffle(WORDS).slice(0, 3), t0: 0, dur: TIME, guesses: [], points: 0, word: null, status: 'play', clear: 0 });
  const sync = createSync(ctx, {
    init: () => fresh(S.id),
    reduce(st, a, by) {
      if (a.k === 'again' && st.status === 'end') return fresh(st.seed + 'x');
      if (st.status !== 'play') return null;
      if (a.k === 'choose' && st.phase === 'choose' && by === st.drawer && st.options.includes(a.w)) { secret = a.w; return { ...st, phase: 'draw', t0: now(), guesses: [] }; }
      if (a.k === 'guess' && st.phase === 'draw' && by !== st.drawer && typeof a.w === 'string') {
        const ok = normalize(a.w) === normalize(secret);
        return { ...st, guesses: [...st.guesses, { w: a.w.slice(0, 30), ok }].slice(-6), phase: ok ? 'reveal' : 'draw', word: ok ? secret : null, points: st.points + (ok ? 1 : 0) };
      }
      if (a.k === 'timeout' && by === 'host' && st.phase === 'draw') return { ...st, phase: 'reveal', word: secret };
      if (a.k === 'clear' && by === st.drawer) return { ...st, clear: st.clear + 1 };
      if (a.k === 'next' && st.phase === 'reveal') { const round = st.round + 1; secret = null; return round >= ROUNDS ? { ...st, status: 'end' } : { ...st, round, drawer: other(st.drawer), phase: 'choose', options: rng(st.seed + ':' + round).shuffle(WORDS).slice(0, 3), word: null, guesses: [], clear: 0 }; }
      return null;
    },
    onState: render
  });
  // ---- lienzo compartido: trazos normalizados (0..1) por mensajes fiables ----
  const cv = h('canvas', { style: { width: '100%', aspectRatio: '1', background: '#fffaf0', borderRadius: '16px', touchAction: 'none', display: 'block' }, 'aria-label': 'Lienzo de dibujo' });
  const cx = cv.getContext('2d');
  const fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (r.width && cv.width !== Math.round(r.width * d)) { cv.width = cv.height = Math.round(r.width * d); redraw(); } };
  const seg = (a, b, c) => { cx.strokeStyle = c; cx.lineWidth = cv.width * 0.012; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(a[0] * cv.width, a[1] * cv.height); cx.lineTo(b[0] * cv.width, b[1] * cv.height); cx.stroke(); };
  function redraw() { cx.clearRect(0, 0, cv.width, cv.height); for (const s of strokes) for (let i = 1; i < s.p.length; i++) seg(s.p[i - 1], s.p[i], s.c); }
  let cur = null, batch = [], sendT = 0;
  const flush = () => { if (batch.length) { S.send('stroke', { id: cur?.id, c: cur?.c, p: batch }); batch = []; } };
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))].map(v => Math.round(v * 1000) / 1000); };
  cv.addEventListener('pointerdown', e => { const st = sync.state; if (!st || st.phase !== 'draw' || st.drawer !== S.role) return; cv.setPointerCapture(e.pointerId); const p = pos(e); cur = { id: Math.random().toString(36).slice(2, 8), c: color, p: [p] }; strokes.push(cur); batch = [p]; });
  cv.addEventListener('pointermove', e => { if (!cur) return; const p = pos(e), l = cur.p[cur.p.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 0.004) return; cur.p.push(p); batch.push(p); seg(l, p, cur.c); if (now() - sendT > 60) { sendT = now(); flush(); batch = [p]; } });
  const end = () => { if (cur) { flush(); cur = null; } }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  S.on('stroke', m => { if (!m || !Array.isArray(m.p)) return; let s = strokes.find(x => x.id === m.id); if (!s) { s = { id: m.id, c: COLS.includes(m.c) ? m.c : COLS[0], p: [] }; strokes.push(s); } const before = s.p.length; for (const p of m.p) if (Array.isArray(p) && p.every(Number.isFinite)) s.p.push(p); for (let i = Math.max(1, before); i < s.p.length; i++) seg(s.p[i - 1], s.p[i], s.c); });
  let lastClear = 0;
  function render(st) {
    if (!st) return;
    if (st.round !== lastRound || st.clear !== lastClear) { lastRound = st.round; lastClear = st.clear; strokes = []; cx.clearRect(0, 0, cv.width, cv.height); }
    const n = players(ctx), drawer = st.drawer === S.role;
    if (st.status === 'end') {
      ui.setTimer(null);
      setKids(ui.body, h('h2', null, `Adivinaron ${st.points} de ${ROUNDS}`), h('p', { class: 'lead' }, st.points >= 5 ? '¡Artistas!' : 'Buen intento. ¿Otra?'), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'again' }) }, 'Jugar otra vez'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir'));
      if (done !== st.seed) { done = st.seed; miniFinish(ctx, { id: 'dibujo', title: 'Dibuja y adivina', result: 'coop', detail: `${st.points}/${ROUNDS}` }); sfx.win(); }
      return;
    }
    const head = h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, `Ronda ${st.round + 1} de ${ROUNDS} · dibuja ${n[st.drawer]}`), h('span', { class: 'lbl' }, `Puntos ${st.points}`));
    let kids = [];
    if (st.phase === 'choose') kids = drawer ? [h('p', { class: 'lead' }, 'Elige qué vas a dibujar:'), h('div', { class: 'list' }, st.options.map(w => h('button', { class: 'btn', onclick: () => sync.dispatch({ k: 'choose', w }) }, w)))] : [h('p', { class: 'waiting' }, h('span', { class: 'dot' }), n[st.drawer] + ' está eligiendo una palabra…')];
    else if (st.phase === 'draw') {
      if (drawer) kids = [h('p', { class: 'lead' }, 'Dibuja: ', h('b', null, secretWordFor(st))), cv, h('div', { class: 'row' }, COLS.map(c => h('button', { class: 'sw', style: { background: c, width: '36px', height: '36px' }, 'aria-label': 'Color', 'aria-pressed': String(c === color), onclick: e => { color = c; render(sync.state); } })), h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'clear' }) }, 'Borrar todo'))];
      else { const inp = h('input', { class: 'field', id: 'guessIn', placeholder: '¿Qué es?', autocomplete: 'off', enterkeyhint: 'send' }); const go = () => { if (inp.value.trim()) { sync.dispatch({ k: 'guess', w: inp.value }); inp.value = ''; } }; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        kids = [cv, h('div', { class: 'row' }, inp, h('button', { class: 'btn primary small', style: { flex: '0 0 auto' }, onclick: go }, 'Adivinar'))]; }
      kids.push(h('div', { class: 'quick' }, st.guesses.map(g => h('span', { class: 'chip ' + (g.ok ? 'ok' : 'bad') }, h('i'), g.w))));
    } else kids = [cv, h('h3', null, st.guesses.some(g => g.ok) ? '¡Adivinado! Era «' + st.word + '»' : 'Se acabó el tiempo: era «' + st.word + '»'), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'next' }) }, 'Siguiente ronda')];
    setKids(ui.body, head, ...kids); requestAnimationFrame(fit);
    if (st.phase === 'reveal' && lastSfx !== st.round) { lastSfx = st.round; (st.guesses.some(g => g.ok) ? sfx.ok : sfx.bad)(); }
  }
  // La palabra la conoce quien dibuja porque la eligió (en este teléfono).
  let chosen = null; const secretWordFor = st => (sync.isHost ? secret : chosen) || '…';
  const origDispatch = sync.dispatch; sync.dispatch = a => { if (a.k === 'choose') chosen = a.w; origDispatch(a); };
  const tick = setInterval(() => { const st = sync.state; if (!st || st.phase !== 'draw') { ui.setTimer(null); return; } const left = remaining(ctx, st); ui.setTimer(left); if (sync.isHost && left !== null && left <= 0) origDispatch({ k: 'timeout' }); }, 500);
  return { destroy() { clearInterval(tick); sync.destroy(); ui.destroy(); } };
}

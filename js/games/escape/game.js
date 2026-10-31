// Escape Room cooperativo: quien explora ve la habitación y quien archiva tiene los documentos.
import { h, now, code as rcode, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync, remaining, resultCard, finishMatch } from '../common.js';
import { ROOMS, COLORS, ICONS, makeRoom, normalize } from './rooms.js';

const S_ = (inner, size = 40, color) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', 'none'); s.setAttribute('stroke', color || 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = inner; return s; };
const SYM = { luna: '<path d="M16 3a9 9 0 1 0 5 14 7 7 0 0 1-5-14z"/>', nube: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11-1A4.5 4.5 0 0 0 7 18z"/>', sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', estrella: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>' };
const RIDDLE = { luna: 'lo que cambia de forma cada noche', nube: 'lo que trae la lluvia', sol: 'lo que calienta el día', estrella: 'lo que guía a los marineros' };
const GLY = { sol: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>', luna: '<path d="M15 4a8 8 0 1 0 0 16 6 6 0 0 1 0-16z"/>', agua: '<path d="M4 6h16L12 20z"/>', fuego: '<path d="M12 4l8 14H4z"/>', tierra: '<path d="M4 6h16L12 20z"/><path d="M7 11h10"/>', aire: '<path d="M12 4l8 14H4z"/><path d="M7 13h10"/>', sal: '<circle cx="12" cy="12" r="7"/><path d="M5 12h14"/>', plomo: '<path d="M12 3v18M7 8h10"/><path d="M12 21a3 3 0 0 0 3-3"/>' };
const ICO = { frasco_roto: ['<path d="M9 3h6M10 3v5l-5 10a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-10V3"/><path d="M9 13l3 2-2 3"/>', '#d9c6ff'], tubo_azul: ['<rect x="9" y="3" width="6" height="18" rx="3"/><path d="M9 13h6"/>', '#4aa8ff'], tubo_rojo: ['<rect x="9" y="3" width="6" height="18" rx="3"/><path d="M9 13h6"/>', '#ff5470'], libro_abierto: ['<path d="M3 6c3-1 6-1 9 1 3-2 6-2 9-1v12c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 7v12"/>', '#e8d3a2'], vela: ['<rect x="9" y="9" width="6" height="12"/><path d="M12 3c2 2 1 4 0 5-1-1-2-3 0-5z"/>', '#ffcf5c'], llave: ['<circle cx="7" cy="12" r="4"/><path d="M11 12h10M17 12v4M20 12v3"/>', '#c9c4d6'] };

export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Escape Room'), S = ctx.session, me = S.role === 'guest' ? 'guest' : 'host', other = by => (by === 'host' ? 'guest' : 'host');
  const startIdx = Math.max(0, ROOMS.findIndex(r => r.id === S.opts.level));
  let room = null, roomKey = '', local = {}, lastStatus = '', lastBad = 0, rewarded = '', hintSeen = {};
  const fresh = i => ({ idx: i, seed: rcode(8), phase: 'roles', explorer: 'host', step: 0, t0: 0, dur: ROOMS[i].dur, penalty: 0, hints: {}, status: 'roles', bad: 0 });
  const sync = createSync(ctx, {
    init: () => ({ ...fresh(startIdx), seed: S.id }),
    reduce(st, a, by) {
      if (a.k === 'role' && st.phase === 'roles') return { ...st, explorer: a.me === 'room' ? by : other(by) };
      if (a.k === 'start' && st.phase === 'roles') return { ...st, phase: 'play', status: 'play', t0: now() };
      if (a.k === 'next' && st.phase === 'end') return fresh(st.status === 'win' ? Math.min(ROOMS.length - 1, st.idx + 1) : st.idx);
      if (a.k === 'again' && st.phase === 'end') return fresh(st.idx);
      if (st.phase !== 'play') return null;
      if (a.k === 'timeout' && by === 'host') return { ...st, phase: 'end', status: 'lose' };
      if (a.k === 'hint' && !st.hints[st.step]) return { ...st, hints: { ...st.hints, [st.step]: true }, penalty: st.penalty + 60 };
      if (a.k === 'answer' && by === st.explorer && a.step === st.step) {
        const p = makeRoom(st.seed, st.idx).puzzles[st.step];
        if (normalize(a.value) === normalize(p.answer)) { const step = st.step + 1, done = step >= 3; return { ...st, step, phase: done ? 'end' : 'play', status: done ? 'win' : 'play', end: done ? now() : 0 }; }
        return { ...st, penalty: st.penalty + 10, bad: st.bad + 1 };
      }
      return null;
    },
    onState: render
  });
  function render(st) {
    if (!st) return;
    const key = st.seed + ':' + st.idx; if (key !== roomKey) { roomKey = key; room = makeRoom(st.seed, st.idx); local = { seq: [], text: '', sliders: {}, sw: [false, false, false, false], code: '', tile: null }; }
    if (st.bad > lastBad) { lastBad = st.bad; sfx.bad(); ctx.ui.toast('No era eso: −10 segundos'); }
    if (st.step > (local.lastStep ?? 0)) { local.lastStep = st.step; local.seq = []; local.text = ''; local.code = ''; local.tile = null; if (st.step < 3) { sfx.ok(); ctx.ui.toast('¡Se abrió! Siguiente cerradura.'); } }
    ui.setTitle(ROOMS[st.idx].name);
    if (st.phase === 'roles') return renderRoles(st);
    if (st.status !== lastStatus) { lastStatus = st.status; if (st.phase === 'end') showEnd(st); else ui.hide(); }
    if (st.phase === 'end') return;
    const isEx = st.explorer === me, p = room.puzzles[st.step];
    setKids(ui.body, 
      h('div', { class: 'role' }, isEx ? 'Exploras la habitación. Cuéntale a tu pareja lo que ves.' : 'Tienes los documentos. Pregunta qué hay en la habitación.'),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, 'Cerradura ' + (st.step + 1) + ' de 3'),
        st.hints[st.step] ? null : h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'hint' }) }, 'Pedir pista (−1 min)')),
      st.hints[st.step] ? h('p', { class: 'panel note' }, 'Pista: ' + p.hint) : null,
      isEx ? explorerView(p, st) : archiveView(p, st));
  }
  function renderRoles(st) {
    lastStatus = 'roles'; ui.hide(); ui.setTimer(ROOMS[st.idx].dur);
    const R = ROOMS[st.idx], iEx = st.explorer === me, partner = S.partner?.name || 'tu pareja';
    setKids(ui.body, h('p', { class: 'eyebrow' }, 'Habitación ' + (st.idx + 1) + ' · ' + R.diff), h('h2', null, R.name), h('p', { class: 'lead' }, R.story),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Roles'), h('b', null, iEx ? 'Tú exploras · ' + partner + ' archiva' : 'Tú archivas · ' + partner + ' explora'),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'role', me: 'room' }) }, 'Yo exploro'), h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'role', me: 'docs' }) }, 'Yo archivo'))),
      h('p', { class: 'note' }, `Tienen ${R.dur / 60} minutos y tres cerraduras. Cada respuesta equivocada resta 10 segundos y cada pista, un minuto.`),
      h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, '¡Entrar!'));
  }
  const send = v => sync.dispatch({ k: 'answer', step: sync.state.step, value: v });
  const keypad = (len, onDone) => h('div', { class: 'list' }, h('div', { class: 'display' }, local.code.padEnd(len, '·')),
    h('div', { class: 'keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(k => h('button', { 'aria-label': k === '⌫' ? 'Borrar' : k === '✓' ? 'Probar' : k, onclick: () => { sfx.tap(); if (k === '⌫') local.code = local.code.slice(0, -1); else if (k === '✓') { if (local.code.length === len) { onDone(local.code); local.code = ''; } } else if (local.code.length < len) local.code += k; render(sync.state); } }, k))));
  const textLock = (len, label) => { const inp = h('input', { class: 'field', maxlength: len, value: local.text, autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', 'aria-label': label, style: { textAlign: 'center', letterSpacing: '.3em', fontSize: '24px', textTransform: 'uppercase' }, oninput: e => { local.text = e.target.value; } }); return h('div', { class: 'row' }, inp, h('button', { class: 'btn primary', style: { flex: '0 0 auto' }, onclick: () => { if (local.text.trim()) send(local.text); } }, 'Probar')); };
  function clockFace(c) {
    const a = (c.hour % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    return S_(`<circle cx="12" cy="12" r="10" stroke="${COLORS[c.color]}" stroke-width="2.5" fill="#fff1d6"/><path d="M12 12L${(12 + Math.cos(a) * 5).toFixed(2)} ${(12 + Math.sin(a) * 5).toFixed(2)}" stroke="#1a1430" stroke-width="2"/><path d="M12 12V4.5" stroke="#1a1430" stroke-width="1.2"/>` + [...Array(12).keys()].map(i => { const b = i / 12 * Math.PI * 2; return `<circle cx="${(12 + Math.cos(b) * 8.3).toFixed(2)}" cy="${(12 + Math.sin(b) * 8.3).toFixed(2)}" r=".5" fill="#1a1430" stroke="none"/>`; }).join(''), 88, '#1a1430');
  }
  function explorerView(p) {
    switch (p.kind) {
      case 'relojes': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'En la pared hay tres relojes con marcos de colores. Debajo, una caja fuerte de 3 cifras.'), h('div', { class: 'row', style: { justifyContent: 'space-around' } }, p.clocks.map(clockFace)), keypad(3, send));
      case 'musica': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'La caja fuerte tenía una caja de música con cuatro botones. Hay que tocarlos en el orden correcto.'),
        h('div', { class: 'row', style: { justifyContent: 'space-around' } }, p.buttons.map(s => h('button', { class: 'btn', style: { width: '70px', height: '70px', padding: 0 }, 'aria-label': 'Botón', onclick: () => { sfx.tick(); local.seq.push(s); if (local.seq.length === 4) { send(local.seq.join(',')); local.seq = []; } render(sync.state); } }, S_(SYM[s], 36)))),
        h('p', { class: 'note', style: { textAlign: 'center' } }, 'Tocados: ' + '●'.repeat(local.seq.length) + '○'.repeat(4 - local.seq.length)), h('button', { class: 'btn ghost', onclick: () => { local.seq = []; render(sync.state); } }, 'Empezar de nuevo'));
      case 'libros': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'Una estantería con seis libros. La puerta tiene un candado de 4 letras.'),
        h('div', { class: 'list' }, p.books.map(b => h('div', { class: 'li', style: { borderLeft: '10px solid ' + COLORS[b.color] } }, h('b', { style: { fontFamily: 'Georgia, serif' } }, b.title)))), textLock(4, 'Candado de letras'));
      case 'pociones': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'Cuatro frascos vacíos y una mesa de mezclas. Ajusta cuántos mililitros lleva cada uno.'),
        p.present.map(c => { const v = local.sliders[c] ?? 0; return h('div', { class: 'li' }, h('span', { style: { width: '26px', height: '40px', borderRadius: '6px 6px 12px 12px', background: COLORS[c], flex: 'none' }, 'aria-label': 'Frasco ' + c }), h('div', { class: 'grow' }, h('input', { type: 'range', min: 0, max: 100, step: 10, value: v, 'aria-label': 'Mililitros del frasco ' + c, oninput: e => { local.sliders[c] = +e.target.value; e.target.nextSibling.textContent = e.target.value + ' ml'; } }), h('b', null, v + ' ml'))); }),
        h('button', { class: 'btn primary', onclick: () => send(p.present.map(c => local.sliders[c] ?? 0).join(',')) }, 'Mezclar'));
      case 'glifos': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'Un panel muestra un símbolo grabado. Hay cuatro interruptores (A, B, C, D) y una palanca.'),
        h('div', { class: 'panel', style: { placeItems: 'center' } }, S_(GLY[p.shown], 90, '#ffcf5c')),
        h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, 'ABCD'.split('').map((l, i) => h('button', { class: 'btn', style: { flex: 1, minHeight: '80px', flexDirection: 'column', background: local.sw[i] ? 'var(--ok)' : '', color: local.sw[i] ? 'var(--night)' : '' }, 'aria-pressed': String(local.sw[i]), onclick: () => { local.sw[i] = !local.sw[i]; sfx.tick(); render(sync.state); } }, h('b', null, l), h('small', null, local.sw[i] ? 'encendido' : 'apagado')))),
        h('button', { class: 'btn primary', onclick: () => send(local.sw.map(Number).join('')) }, 'Bajar la palanca'));
      case 'conteo': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'Una repisa llena de cosas. La puerta pide 3 cifras.'),
        h('div', { class: 'panel', style: { gridTemplateColumns: 'repeat(6, 1fr)', justifyItems: 'center' } }, p.items.map(it => S_(ICO[it][0], 34, ICO[it][1]))), keypad(3, send));
      case 'mapa': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'El piso de arena tiene 5×5 baldosas. En dos hay un ancla y un barril. Toca la baldosa donde hay que cavar.'),
        h('div', { class: 'keypad', style: { gridTemplateColumns: 'repeat(5, 1fr)' } }, [...Array(25).keys()].map(i => h('button', { style: { minHeight: '54px', background: local.tile === i ? 'var(--gold)' : '#c9a86a', color: '#1a1430', borderColor: '#8a6a3a' }, 'aria-label': 'Baldosa', onclick: () => { local.tile = i; render(sync.state); } }, i === p.anchor ? '⚓' : i === p.barrel ? '🛢' : ''))),
        h('button', { class: 'btn primary', disabled: local.tile == null, onclick: () => send(String(local.tile)) }, 'Cavar aquí'));
      case 'cifrado': return h('div', { class: 'list' }, h('p', { class: 'note' }, 'En la pared hay letras talladas. Parece un mensaje en clave; escribe la palabra descifrada.'),
        h('div', { class: 'display', style: { color: '#e8d3a2', background: '#2a2140', fontFamily: 'Georgia, serif' } }, p.enc), textLock(5, 'Palabra descifrada'));
      case 'faro': {
        const lamp = h('div', { class: 'panel', style: { placeItems: 'center', minHeight: '110px' } }, h('div', { style: { width: '70px', height: '70px', borderRadius: '50%', background: '#3a3354', transition: 'background .05s' } }));
        const play = () => { const L = lamp.firstChild; let t = 300; p.signals.forEach(sig => { for (const ch of sig) { const d = ch === '·' ? 250 : 750; setTimeout(() => { L.style.background = '#ffe27a'; L.style.boxShadow = '0 0 40px #ffe27a'; }, t); setTimeout(() => { L.style.background = '#3a3354'; L.style.boxShadow = 'none'; }, t + d); t += d + 300; } t += 1100; }); };
        return h('div', { class: 'list' }, h('p', { class: 'note' }, 'La lámpara del faro parpadea en tres grupos de destellos cortos y largos. La salida pide 3 cifras.'), lamp, h('button', { class: 'btn', onclick: play }, 'Ver las señales'), keypad(3, send));
      }
    }
  }
  function archiveView(p) {
    const doc = (...k) => h('div', { class: 'doc' }, ...k);
    switch (p.kind) {
      case 'relojes': return doc(h('h4', null, 'Nota del relojero'), h('p', null, '«La caja se abre con las horas que marcan mis relojes, en este orden:'), h('p', null, h('b', null, p.order.join(', ') + '.»')), h('p', null, 'Pregunta qué hora marca cada reloj según el color de su marco.'));
      case 'musica': return doc(h('h4', null, 'Página del diario'), h('p', null, '«Mi caja de música solo suena así:'), h('ol', null, p.order.map(s => h('li', null, 'Primero… luego… ' + RIDDLE[s]))), h('p', null, '»'), h('p', null, 'Los botones tienen dibujos; quien explora sabe en qué orden están.'));
      case 'libros': return doc(h('h4', null, 'Fotografía antigua'), h('p', null, 'Mi nieta marcó cuatro libros con números. Sus iniciales, en ese orden, abren la puerta.'), h('div', { class: 'row', style: { gap: '6px' } }, p.marked.map((c, i) => h('div', { style: { width: '44px', height: '90px', background: COLORS[c], borderRadius: '6px', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: '22px', color: '#1a1430' } }, i + 1))), h('p', null, 'En la foto no se leen los títulos.'));
      case 'pociones': return doc(h('h4', null, 'Fórmula'), h('p', null, 'Cantidad de cada color en la mezcla:'), h('table', null, h('tr', null, h('th', null, 'Color'), h('th', null, 'Mililitros')), Object.entries(p.ml).map(([c, v]) => h('tr', null, h('td', null, h('span', { style: { display: 'inline-block', width: '12px', height: '12px', background: COLORS[c], borderRadius: '3px', marginRight: '6px' } }), c), h('td', null, v + ' ml')))), h('p', null, 'Solo cuentan los colores que haya en la mesa.'));
      case 'glifos': return doc(h('h4', null, 'Tabla de energía'), h('p', null, 'Cada símbolo enciende ciertos interruptores:'), h('div', { class: 'tblwrap' }, h('table', null, h('tr', null, h('th', null, 'Símbolo'), ...'ABCD'.split('').map(l => h('th', null, l))), Object.entries(p.table).map(([g, pat]) => h('tr', null, h('td', null, S_(GLY[g], 30, '#5b3a22')), ...pat.map(v => h('td', null, v ? 'Encendido' : '—')))))));
      case 'conteo': return doc(h('h4', null, 'Nota en la puerta'), h('p', null, '«El código es: primero cuántos ' + ICONS[p.ask[0]] + ', luego cuántos ' + ICONS[p.ask[1]] + ' y al final cuántos ' + ICONS[p.ask[2]] + ' hay en la repisa.»'));
      case 'mapa': return doc(h('h4', null, 'Mapa del farero'), h('p', null, 'La X marca dónde enterró la llave. Quien explora ve el ancla y el barril, pero no la X.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' } }, [...Array(25).keys()].map(i => h('div', { style: { aspectRatio: '1', background: '#e2cfa0', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 900, color: '#a3201a' } }, i === p.anchor ? '⚓' : i === p.barrel ? '🛢' : i === p.x ? '✕' : ''))));
      case 'cifrado': return doc(h('h4', null, 'Fotografía y nota'), h('p', null, h('i', null, 'Al reverso de la foto: «Recuerdo del día ' + p.shift + ' de marzo».')), h('p', null, '«Para leer mis mensajes, retrocede cada letra tantos lugares en el abecedario como el día de esta foto. Después de la A sigue la Z.»'), h('p', { class: 'mono' }, 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'));
      case 'faro': return doc(h('h4', null, 'Código del farero'), h('p', null, '· destello corto · – destello largo'), h('div', { class: 'tblwrap' }, h('table', null, h('tr', null, h('th', null, 'Señal'), h('th', null, 'Cifra')), p.book.map((sig, d) => h('tr', null, h('td', { class: 'mono', style: { fontSize: '20px' } }, sig), h('td', null, d))))));
    }
  }
  function showEnd(st) {
    const win = st.status === 'win', R = ROOMS[st.idx], key = st.seed + st.idx;
    let reward = null;
    if (rewarded !== key) { rewarded = key; reward = finishMatch(ctx, { game: 'escape', level: R.id, win, title: 'Escape: ' + R.name, detail: win ? 'Escaparon' : 'Se acabó el tiempo', xp: 100 + st.idx * 30, coins: 30 + st.idx * 10, mission: 'escape', ach: win ? 'escapistas' : [] }); }
    resultCard(ui, { win, title: win ? '¡Escaparon!' : 'Se acabó el tiempo', lines: [win ? 'Abrieron las tres cerraduras de ' + R.name + '.' : 'La puerta quedó cerrada. Pueden intentarlo con acertijos nuevos.'], reward,
      onNext: win && st.idx < ROOMS.length - 1 ? () => sync.dispatch({ k: 'next' }) : null, nextLabel: 'Siguiente habitación', onAgain: () => sync.dispatch({ k: 'again' }), onExit: () => ctx.exit() });
  }
  const tick = setInterval(() => { const st = sync.state; if (!st || st.phase !== 'play') return; const left = remaining(ctx, st); ui.setTimer(left); if (sync.isHost && left !== null && left <= 0) sync.dispatch({ k: 'timeout' }); }, 1000);
  return { destroy() { clearInterval(tick); sync.destroy(); ui.destroy(); } };
}

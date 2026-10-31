// Desactiva la bomba: una persona ve la bomba y la otra tiene el manual. Solo hablando la desactivan.
import { h, now, code as rcode, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync, remaining, resultCard, finishMatch } from '../common.js';
import { LEVELS, COLORS, SYMBOLS, SYMBOL_VALUES, SHAPES, makeBomb, leverTarget, lightTarget, symbolCode, calcTarget } from './modules.js';

const svg = (inner, size = 34) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = inner; return s; };
const shapeSvg = sh => svg({ 'triángulo': '<path d="M12 3l9 17H3z"/>', 'cuadrado': '<rect x="4" y="4" width="16" height="16"/>', 'círculo': '<circle cx="12" cy="12" r="9"/>', 'rombo': '<path d="M12 2l9 10-9 10-9-10z"/>' }[sh], 40);

export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Desactiva la bomba'), S = ctx.session, other = by => (by === 'host' ? 'guest' : 'host');
  const startIdx = Math.max(0, LEVELS.findIndex(l => l.id === S.opts.level));
  const me = S.role === 'guest' ? 'guest' : 'host';
  let bomb = null, bombKey = '', local = { lev: [], code: '', calc: '', luz: 0 }, lastStatus = '', rewarded = '', tick = 0;

  const newLevel = (i, seed) => ({ lv: i, seed: seed || rcode(8), phase: 'roles', viewer: 'host', strikes: 0, solved: [], prog: [], t0: 0, dur: LEVELS[i].dur, penalty: 0, status: 'roles', flash: 0 });
  const sync = createSync(ctx, {
    init: () => newLevel(startIdx, S.id),
    reduce(st, a, by) {
      const b = makeBomb(st.seed, st.lv);
      if (a.k === 'role' && st.phase === 'roles') return { ...st, viewer: a.me === 'bomb' ? by : other(by) };
      if (a.k === 'start' && st.phase === 'roles') return { ...st, phase: 'play', status: 'play', t0: now(), solved: b.modules.map(() => false), prog: b.modules.map(() => 0) };
      if (a.k === 'next' && st.phase === 'end') return newLevel(Math.min(LEVELS.length - 1, st.status === 'win' ? st.lv + 1 : st.lv));
      if (a.k === 'again' && st.phase === 'end') return newLevel(st.lv);
      if (st.phase !== 'play') return null;
      if (a.k === 'timeout' && by === 'host') return { ...st, phase: 'end', status: 'boom' };
      if (by !== st.viewer || !Number.isInteger(a.m) || !b.modules[a.m] || st.solved[a.m]) return null;
      const m = b.modules[a.m]; let ok = null;
      if (a.k === 'pal' && m.type === 'palancas' && Array.isArray(a.pos)) ok = leverTarget(m).every((v, i) => !!a.pos[i] === v);
      else if (a.k === 'sim' && m.type === 'simbolos') ok = String(a.code) === symbolCode(m);
      else if (a.k === 'calc' && m.type === 'calculo') ok = +a.val === calcTarget(m, b.serial, b.modules.length);
      else if (a.k === 'luz' && m.type === 'luces' && Number.isInteger(a.cell)) {
        const p = st.prog[a.m];
        if (lightTarget(m.seq[p]) === a.cell) { const prog = st.prog.slice(); prog[a.m] = p + 1; if (p + 1 < m.seq.length) return { ...st, prog, flash: st.flash + 1 }; ok = true; st = { ...st, prog }; }
        else { ok = false; const prog = st.prog.slice(); prog[a.m] = 0; st = { ...st, prog }; }
      }
      if (ok === null) return null;
      if (ok) { const solved = st.solved.slice(); solved[a.m] = true; const win = solved.every(Boolean); return { ...st, solved, flash: st.flash + 1, phase: win ? 'end' : 'play', status: win ? 'win' : 'play', end: win ? now() : 0 }; }
      const strikes = st.strikes + 1;
      return { ...st, strikes, penalty: st.penalty + 15, flash: st.flash + 1, phase: strikes >= 3 ? 'end' : 'play', status: strikes >= 3 ? 'boom' : 'play', lastBad: (st.lastBad || 0) + 1 };
    },
    onState: render
  });

  let lastBad = 0;
  function render(st) {
    if (!st) return;
    const key = st.seed + ':' + st.lv; if (key !== bombKey) { bombKey = key; bomb = makeBomb(st.seed, st.lv); local = { lev: bomb.modules.map(m => (m.type === 'palancas' ? m.start.slice() : null)), code: '', calc: '', luz: 0 }; }
    if ((st.lastBad || 0) > lastBad) { lastBad = st.lastBad; sfx.bad(); if (navigator.vibrate) navigator.vibrate(200); }
    ui.setTitle(LEVELS[st.lv].name);
    if (st.phase === 'roles') return renderRoles(st);
    if (st.status !== lastStatus) { lastStatus = st.status; if (st.phase === 'end') showEnd(st); else ui.hide(); }
    const viewer = st.viewer === me;
    setKids(ui.body, 
      h('div', { class: 'role' }, viewer ? 'Tú ves la bomba. Describe lo que ves; tu pareja tiene el manual.' : 'Tú tienes el manual. Pregunta qué ve tu pareja y dile qué hacer.'),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, 'Errores ' + '●'.repeat(st.strikes) + '○'.repeat(3 - st.strikes)), h('span', { class: 'lbl' }, st.solved.filter(Boolean).length + '/' + bomb.modules.length + ' módulos')),
      viewer ? bombView(st) : manualView(st));
  }
  function renderRoles(st) {
    lastStatus = 'roles'; ui.hide(); ui.setTimer(LEVELS[st.lv].dur);
    const iSee = st.viewer === me, partner = S.partner?.name || 'tu pareja';
    setKids(ui.body, 
      h('p', { class: 'eyebrow' }, 'Bomba ' + (st.lv + 1) + ' de ' + LEVELS.length + ' · ' + LEVELS[st.lv].diff),
      h('h2', null, LEVELS[st.lv].name),
      h('p', { class: 'lead' }, `${bomb.modules.length} ${bomb.modules.length === 1 ? 'módulo' : 'módulos'} y ${Math.round(LEVELS[st.lv].dur / 60 * 10) / 10} minutos. Con 3 errores, explota. Cada error resta 15 segundos.`),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Roles'), h('b', null, iSee ? 'Tú ves la bomba · ' + partner + ' lee el manual' : 'Tú lees el manual · ' + partner + ' ve la bomba'),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'role', me: 'bomb' }) }, 'Yo veo la bomba'), h('button', { class: 'btn small', onclick: () => sync.dispatch({ k: 'role', me: 'manual' }) }, 'Yo leo el manual'))),
      h('p', { class: 'note' }, 'Hablen por llamada o usen el chat de la isla. Quien lee el manual no puede ver la bomba, y quien ve la bomba no tiene el manual.'),
      h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'start' }) }, '¡Empezar!'));
  }
  function moduleCard(st, i, title, ...kids) {
    return h('div', { class: 'panel', style: { borderLeft: '6px solid ' + (st.solved[i] ? 'var(--ok)' : 'var(--danger)') } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, title), h('span', { class: 'chip ' + (st.solved[i] ? 'ok' : 'bad') }, h('i'), st.solved[i] ? 'Desactivado' : 'Activo')), ...(st.solved[i] ? [] : kids));
  }
  function keypad(onKey) { return h('div', { class: 'keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(k => h('button', { 'aria-label': k === '⌫' ? 'Borrar' : k === '✓' ? 'Enviar' : k, onclick: () => { sfx.tap(); onKey(k); } }, k))); }
  function bombView(st) {
    return h('div', { class: 'list' },
      h('div', { class: 'panel', style: { background: '#2a2a33' } }, h('span', { class: 'lbl' }, 'Número de serie'), h('b', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '24px', letterSpacing: '.15em' } }, bomb.serial)),
      bomb.modules.map((m, i) => {
        if (m.type === 'palancas') return moduleCard(st, i, 'Palancas',
          h('div', { class: 'row' }, h('span', { style: { width: '30px', height: '30px', borderRadius: '50%', background: COLORS[m.light], boxShadow: '0 0 14px ' + COLORS[m.light] }, 'aria-label': 'Luz ' + m.light }), h('div', { class: 'display', style: { flex: 1 } }, m.code.join(''))),
          h('div', { class: 'row', style: { flexWrap: 'nowrap', gap: '6px' } }, local.lev[i].map((up, j) => h('button', { class: 'btn', style: { flex: 1, minHeight: '86px', padding: '4px', flexDirection: 'column' }, 'aria-label': `Palanca ${j + 1} ${up ? 'arriba' : 'abajo'}`, onclick: () => { local.lev[i][j] = !local.lev[i][j]; sfx.tick(); render(sync.state); } }, h('span', { style: { fontSize: '26px' } }, up ? '▲' : '▼'), h('small', null, j + 1)))),
          h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'pal', m: i, pos: local.lev[i] }) }, 'Confirmar palancas'));
        if (m.type === 'luces') {
          const grid = h('div', { class: 'keypad' }, Array.from({ length: 9 }, (_, c) => h('button', { 'data-c': c, style: { minHeight: '64px' }, 'aria-label': 'Casilla ' + (c + 1), onclick: () => { sfx.tick(); sync.dispatch({ k: 'luz', m: i, cell: c }); } }, '')));
          const play = () => { m.seq.forEach((s, k) => { setTimeout(() => { const b = grid.querySelector(`[data-c="${s.cell}"]`); if (!b) return; b.style.background = COLORS[s.color]; sfx.tone?.(); setTimeout(() => { b.style.background = ''; }, 550); }, 300 + k * 800); }); };
          return moduleCard(st, i, 'Panel de luces', h('p', { class: 'note' }, 'Pulsa "Ver secuencia". Luego presiona las casillas que diga el manual, en orden. Avance: ' + st.prog[i] + '/' + m.seq.length), grid, h('button', { class: 'btn', onclick: play }, 'Ver secuencia'));
        }
        if (m.type === 'simbolos') return moduleCard(st, i, 'Símbolos',
          h('div', { class: 'row', style: { background: m.bg === 'dorado' ? '#c9a24a' : '#a9b2c4', borderRadius: '14px', padding: '10px', justifyContent: 'space-around', color: '#1a1430' } }, m.syms.map(s => svg(SYMBOLS[s]))),
          h('div', { class: 'display' }, local.code.padEnd(4, '·')),
          keypad(k => { if (k === '⌫') local.code = local.code.slice(0, -1); else if (k === '✓') { if (local.code.length === 4) { sync.dispatch({ k: 'sim', m: i, code: local.code }); local.code = ''; } } else if (local.code.length < 4) local.code += k; render(sync.state); }));
        return moduleCard(st, i, 'Cálculo',
          h('div', { class: 'row', style: { justifyContent: 'center', gap: '18px' } }, shapeSvg(m.shape), h('b', { style: { fontSize: '44px', fontFamily: 'ui-monospace, Menlo, monospace' } }, m.n)),
          h('div', { class: 'display' }, local.calc || '·'),
          keypad(k => { if (k === '⌫') local.calc = local.calc.slice(0, -1); else if (k === '✓') { if (local.calc) { sync.dispatch({ k: 'calc', m: i, val: +local.calc }); local.calc = ''; } } else if (local.calc.length < 4) local.calc += k; render(sync.state); }));
      }));
  }
  let page = 'intro';
  function manualView(st) {
    const tab = (id, l) => h('button', { 'aria-pressed': String(page === id), onclick: () => { page = id; render(sync.state); } }, l);
    const pages = {
      intro: h('div', { class: 'doc' }, h('h4', null, 'Manual de desactivación'), h('p', null, 'La bomba tiene uno o varios módulos. Cada módulo se desactiva por separado. Tu pareja ve la bomba; tú no. Pídele que te describa cada módulo con detalle.'), h('p', null, 'Algunas reglas usan el número de serie: está escrito en la carcasa de la bomba. Pídelo al principio.'), h('p', null, 'Tres errores y explota. Cada error también resta 15 segundos.')),
      palancas: h('div', { class: 'doc' }, h('h4', null, 'Palancas'), h('p', null, 'Hay 5 palancas numeradas del 1 al 5, una luz de color y una pantalla con un código de 3 cifras. Deja las palancas así y pulsa "Confirmar":'),
        h('table', null, h('tr', null, h('th', null, 'Luz'), h('th', null, 'Posición correcta')),
          h('tr', null, h('td', null, 'Roja'), h('td', null, 'Arriba solo las palancas cuyo número aparece en el código.')),
          h('tr', null, h('td', null, 'Verde'), h('td', null, 'Arriba solo las palancas cuyo número NO aparece en el código.')),
          h('tr', null, h('td', null, 'Azul'), h('td', null, 'Todas arriba menos una: suma las cifras del código y divide entre 5; el residuo es la palanca que va abajo (si el residuo es 0, la 5).')),
          h('tr', null, h('td', null, 'Amarilla'), h('td', null, 'Cambia todas: las que estén arriba, abajo; las que estén abajo, arriba. Pregunta cómo están antes de mover nada.')))),
      luces: h('div', { class: 'doc' }, h('h4', null, 'Panel de luces'), h('p', null, 'Es una cuadrícula de 3×3. Al ver la secuencia se encienden varias casillas de colores, una por una. Por cada luz, en el mismo orden, hay que presionar otra casilla:'),
        h('table', null, h('tr', null, h('th', null, 'Color'), h('th', null, 'Casilla a presionar')),
          h('tr', null, h('td', null, 'Rojo'), h('td', null, 'La opuesta respecto al centro (esquina contraria; el centro se queda en el centro).')),
          h('tr', null, h('td', null, 'Azul'), h('td', null, 'La misma casilla.')),
          h('tr', null, h('td', null, 'Verde'), h('td', null, 'La de abajo. Si ya está en la fila de abajo, la de arriba del todo en esa columna.')),
          h('tr', null, h('td', null, 'Amarillo'), h('td', null, 'La de la derecha. Si ya está a la derecha, la de la izquierda del todo en esa fila.'))),
        h('p', null, 'Si se equivocan, el panel vuelve a empezar desde la primera luz.')),
      simbolos: h('div', { class: 'doc' }, h('h4', null, 'Símbolos'), h('p', null, 'Hay 4 símbolos sobre un fondo dorado o plateado. Escribe el número de cada símbolo, en el mismo orden, y envía las 4 cifras.'),
        h('div', { class: 'tblwrap' }, h('table', null, h('tr', null, h('th', null, 'Símbolo'), h('th', null, 'Dorado'), h('th', null, 'Plateado')), Object.keys(SYMBOLS).map(s => h('tr', null, h('td', null, svg(SYMBOLS[s], 26)), h('td', null, SYMBOL_VALUES[s][0]), h('td', null, SYMBOL_VALUES[s][1])))))),
      calculo: h('div', { class: 'doc' }, h('h4', null, 'Cálculo'), h('p', null, 'Hay una figura y un número de dos cifras (N). Calcula y escribe el resultado:'),
        h('table', null, h('tr', null, h('th', null, 'Figura'), h('th', null, 'Operación')),
          h('tr', null, h('td', null, 'Triángulo'), h('td', null, 'N × 3, menos la última cifra del número de serie.')),
          h('tr', null, h('td', null, 'Cuadrado'), h('td', null, 'Invierte las cifras de N (47 → 74) y suma 7.')),
          h('tr', null, h('td', null, 'Círculo'), h('td', null, 'Suma las dos cifras de N y multiplica por el número de módulos de la bomba.')),
          h('tr', null, h('td', null, 'Rombo'), h('td', null, '99 menos N, más la primera cifra del número de serie.'))))
    };
    return h('div', { class: 'list' }, h('div', { class: 'tabs', role: 'group' }, tab('intro', 'Inicio'), tab('palancas', 'Palancas'), tab('luces', 'Luces'), tab('simbolos', 'Símbolos'), tab('calculo', 'Cálculo')), pages[page]);
  }
  function showEnd(st) {
    const win = st.status === 'win', L = LEVELS[st.lv], key = st.seed + st.lv;
    let reward = null;
    if (rewarded !== key) { rewarded = key; reward = finishMatch(ctx, { game: 'bomba', level: L.id, win, title: 'Bomba: ' + L.name, detail: win ? st.strikes + ' errores' : 'Explotó', xp: 80 + st.lv * 25, coins: 20 + st.lv * 10, mission: 'bomba', ach: win ? ['artificieros'].concat(st.strikes === 0 ? ['sin-errores'] : []) : [] }); }
    if (!win) sfx.boom();
    resultCard(ui, { win, title: win ? '¡Bomba desactivada!' : '¡BUM!', lines: [win ? `Con ${st.strikes} ${st.strikes === 1 ? 'error' : 'errores'}.` : 'Se acabó el tiempo o hubo 3 errores.'], reward,
      onNext: win && st.lv < LEVELS.length - 1 ? () => sync.dispatch({ k: 'next' }) : null, nextLabel: 'Siguiente bomba', onAgain: () => sync.dispatch({ k: 'again' }), onExit: () => ctx.exit() });
  }
  tick = setInterval(() => {
    const st = sync.state; if (!st || st.phase !== 'play') return;
    const left = remaining(ctx, st); ui.setTimer(left);
    if (left !== null && left <= 10 && left > 0) sfx.tick();
    if (sync.isHost && left !== null && left <= 0) sync.dispatch({ k: 'timeout' });
  }, 1000);
  return { destroy() { clearInterval(tick); sync.destroy(); ui.destroy(); } };
}

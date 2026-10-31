// Desactiva la bomba: una persona ve la bomba y la otra tiene el manual. Solo hablando la desactivan.
// El módulo abierto se comparte: el manual de la otra persona salta a esa página.
import { h, now, setKids, DEBUG } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { svgIcon } from '../../ui/icons.js';
import { celebrate } from '../../ui/fx.js';
import { shell, createSync, remaining, resultCard, finishMatch } from '../common.js';
import { LEVELS, COLORS, SYMBOLS, MODULE_INFO, makeBomb, leverTarget, lightTarget, symbolCode, calcTarget } from './modules.js';
import { manualPage, miniGrid, leverRow, sym, shapeSvg } from './manual.js';

const COLOR_NAME = { rojo: 'ROJO', azul: 'AZUL', verde: 'VERDE', amarillo: 'AMARILLO' };

export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Desactiva la bomba'), S = ctx.session, other = by => (by === 'host' ? 'guest' : 'host');
  const startIdx = Math.max(0, LEVELS.findIndex(l => l.id === S.opts.level));
  const me = S.role === 'guest' ? 'guest' : 'host';
  let bomb = null, bombKey = '', local = {}, lastStatus = '', rewarded = '', tick = 0, page = 'intro', followFocus = true;
  let seen = { bad: 0, ok: 0, focus: -1 }, playing = null;

  const newLevel = (i, seed) => ({ lv: i, seed: seed || Math.random().toString(36).slice(2, 10), phase: 'roles', viewer: 'host', strikes: 0, solved: [], prog: [], t0: 0, dur: LEVELS[i].dur, penalty: 0, status: 'roles', focus: 0, bad: 0, ok: 0, okM: -1, badM: -1 });
  const sync = createSync(ctx, {
    init: () => newLevel(startIdx, S.id),
    reduce(st, a, by) {
      const b = makeBomb(st.seed, st.lv);
      if (a.k === 'role' && st.phase === 'roles') return { ...st, viewer: a.me === 'bomb' ? by : other(by) };
      if (a.k === 'start' && st.phase === 'roles') return { ...st, phase: 'play', status: 'play', t0: now(), solved: b.modules.map(() => false), prog: b.modules.map(() => 0), focus: 0 };
      if (a.k === 'next' && st.phase === 'end') return newLevel(Math.min(LEVELS.length - 1, st.status === 'win' ? st.lv + 1 : st.lv));
      if (a.k === 'again' && st.phase === 'end') return newLevel(st.lv);
      if (st.phase !== 'play') return null;
      if (a.k === 'timeout' && by === 'host') return { ...st, phase: 'end', status: 'boom' };
      if (by !== st.viewer || !Number.isInteger(a.m) || !b.modules[a.m]) return null;
      if (a.k === 'focus') return st.focus === a.m ? null : { ...st, focus: a.m };
      if (st.solved[a.m]) return null;
      const m = b.modules[a.m]; let ok = null;
      if (a.k === 'pal' && m.type === 'palancas' && Array.isArray(a.pos)) ok = leverTarget(m).every((v, i) => !!a.pos[i] === v);
      else if (a.k === 'sim' && m.type === 'simbolos') ok = String(a.code) === symbolCode(m);
      else if (a.k === 'calc' && m.type === 'calculo') ok = +a.val === calcTarget(m, b.serial, b.modules.length);
      else if (a.k === 'luz' && m.type === 'luces' && Number.isInteger(a.cell)) {
        const p = st.prog[a.m];
        if (lightTarget(m.seq[p]) === a.cell) { const prog = st.prog.slice(); prog[a.m] = p + 1; if (p + 1 < m.seq.length) return { ...st, prog, step: (st.step || 0) + 1 }; ok = true; st = { ...st, prog }; }
        else { ok = false; const prog = st.prog.slice(); prog[a.m] = 0; st = { ...st, prog }; }
      }
      if (ok === null) return null;
      if (ok) {
        const solved = st.solved.slice(); solved[a.m] = true; const win = solved.every(Boolean), nextF = solved.findIndex(x => !x);
        return { ...st, solved, ok: st.ok + 1, okM: a.m, focus: nextF < 0 ? st.focus : nextF, phase: win ? 'end' : 'play', status: win ? 'win' : 'play' };
      }
      const strikes = st.strikes + 1;
      return { ...st, strikes, penalty: st.penalty + 15, bad: st.bad + 1, badM: a.m, phase: strikes >= 3 ? 'end' : 'play', status: strikes >= 3 ? 'boom' : 'play' };
    },
    onState: render
  });

  function render(st) {
    if (!st) return;
    const key = st.seed + ':' + st.lv;
    if (key !== bombKey) { bombKey = key; bomb = makeBomb(st.seed, st.lv); local = { lev: bomb.modules.map(m => (m.type === 'palancas' ? m.start.slice() : null)), code: {}, calc: {} }; seen = { bad: st.bad, ok: st.ok, focus: -1 }; page = 'intro'; followFocus = true; }
    const viewer = st.viewer === me;
    // confirmaciones visibles en los dos teléfonos
    if (st.bad > seen.bad) { seen.bad = st.bad; local.badAt = Date.now(); sfx.bad(); try { navigator.vibrate?.(200); } catch (e) {} ctx.ui.toast(`Error en ${MODULE_INFO[bomb.modules[st.badM]?.type]?.name || 'un módulo'}: ${st.strikes} de 3 · −15 s`, 'bad'); }
    if (st.ok > seen.ok) { seen.ok = st.ok; sfx.ok(); if (st.phase !== 'end') { celebrate('small'); ctx.ui.toast(`¡${MODULE_INFO[bomb.modules[st.okM]?.type]?.name} desactivado!`, 'good'); } }
    if (st.phase === 'play' && st.focus !== seen.focus) { if (!viewer && followFocus) page = bomb.modules[st.focus]?.type || page; seen.focus = st.focus; }
    ui.setTitle(LEVELS[st.lv].name);
    if (st.phase === 'roles') return renderRoles(st);
    if (st.status !== lastStatus) { lastStatus = st.status; if (st.phase === 'end') showEnd(st); else ui.hide(); }
    setKids(ui.body,
      statusBar(st),
      h('div', { class: 'role' }, svgIcon(viewer ? 'eye' : 'book', 20), h('span', null, viewer ? 'Ves la bomba. Abre un módulo y descríbelo; tu pareja te dice qué hacer.' : 'Tienes el manual. Tu pareja te describe la bomba; tú le dices qué hacer.')),
      viewer ? bombView(st) : manualView(st));
  }
  function statusBar(st) {
    return h('div', { class: 'bstatus' },
      h('div', null, h('span', { class: 'lbl' }, 'Errores'), h('div', { class: 'leds', 'aria-label': st.strikes + ' de 3 errores' }, [0, 1, 2].map(i => h('i', { class: i < st.strikes ? 'on' : '' })))),
      h('div', null, h('span', { class: 'lbl' }, 'Módulos'), h('div', { class: 'steps' }, bomb.modules.map((m, i) => h('i', { class: st.solved[i] ? 'on' : '', title: MODULE_INFO[m.type].name })))));
  }
  function renderRoles(st) {
    lastStatus = 'roles'; ui.hide(); ui.setTimer(LEVELS[st.lv].dur);
    const iSee = st.viewer === me, partner = S.partner?.name || 'tu pareja';
    const roleCard = (mine, ic, title, desc, val) => h('button', { class: 'rolecard' + (mine ? ' sel' : ''), 'aria-pressed': String(mine), onclick: () => sync.dispatch({ k: 'role', me: val }) }, svgIcon(ic, 30), h('b', null, title), h('span', null, desc), h('em', null, mine ? 'Tú' : partner));
    setKids(ui.body,
      h('p', { class: 'eyebrow' }, 'Bomba ' + (st.lv + 1) + ' de ' + LEVELS.length + ' · ' + LEVELS[st.lv].diff),
      h('h2', null, LEVELS[st.lv].name),
      h('div', { class: 'tags' }, bomb.modules.map(m => h('span', { class: 'chip' }, svgIcon(MODULE_INFO[m.type].icon, 16), MODULE_INFO[m.type].name)), h('span', { class: 'chip' }, svgIcon('timer', 16), Math.round(LEVELS[st.lv].dur / 6) / 10 + ' min')),
      h('p', { class: 'lead' }, 'Elijan quién ve la bomba y quién lee el manual. Toca una tarjeta para cambiar.'),
      h('div', { class: 'roles' }, roleCard(iSee, 'eye', 'Ve la bomba', 'Abre los módulos, describe lo que ve y toca lo que le digan.', 'bomb'), roleCard(!iSee, 'book', 'Lee el manual', 'Escucha la descripción, busca la regla y dice qué hacer.', 'manual')),
      h('p', { class: 'note' }, 'Con 3 errores, explota. Cada error resta 15 segundos. Hablen por llamada o usen el chat.'),
      h('button', { class: 'btn primary block', onclick: () => sync.dispatch({ k: 'start' }) }, svgIcon('play', 18), '¡Empezar!'));
  }
  // ---------------- vista de la bomba ----------------
  function moduleCard(st, i, body) {
    const m = bomb.modules[i], I = MODULE_INFO[m.type], open = st.focus === i && !st.solved[i];
    return h('section', { class: 'bmod' + (st.solved[i] ? ' done' : '') + (open ? ' open' : '') + (st.badM === i && st.bad === seen.bad && Date.now() - (local.badAt || 0) < 600 ? ' shake' : '') },
      h('button', { class: 'bmod-head', 'aria-expanded': String(open), onclick: () => { if (!st.solved[i]) sync.dispatch({ k: 'focus', m: i }); } },
        h('span', { class: 'bico' }, svgIcon(st.solved[i] ? 'check' : I.icon, 22)), h('b', null, I.name), h('span', { class: 'chip ' + (st.solved[i] ? 'ok' : 'bad') }, h('i'), st.solved[i] ? 'Desactivado' : open ? 'Abierto' : 'Tocar para abrir')),
      open ? h('div', { class: 'bmod-body' }, h('p', { class: 'say' }, svgIcon('chat', 18), h('span', null, 'Dile a tu pareja ' + I.say)), body()) : null);
  }
  // Teclado: len = cifras exactas (símbolos) o {min, max} (cálculo, para no delatar cuántas cifras tiene el resultado).
  function keypad(len, val, set, submit, label) {
    const min = typeof len === 'number' ? len : len.min, max = typeof len === 'number' ? len : len.max;
    return h('div', { class: 'list' },
      h('div', { class: 'digits', 'aria-label': label + ': ' + (val || 'vacío') }, Array.from({ length: max }, (_, i) => h('span', { class: val[i] != null ? 'f' : '' }, val[i] ?? ''))),
      h('div', { class: 'keypad' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(k => h('button', {
        'aria-label': k === '⌫' ? 'Borrar' : k === '✓' ? 'Enviar' : k, class: k === '✓' ? 'go' : '', disabled: k === '✓' && val.length < min,
        onclick: () => { sfx.tap(); if (k === '⌫') set(val.slice(0, -1)); else if (k === '✓') { if (val.length >= min) submit(val); } else if (val.length < max) set(val + k); }
      }, k === '⌫' ? svgIcon('backspace', 24) : k === '✓' ? svgIcon('check', 26) : k))));
  }
  function bombView(st) {
    const digits = bomb.serial.split('').map(ch => h('span', { class: /\d/.test(ch) ? 'd' : '' }, ch));
    return h('div', { class: 'list' },
      h('div', { class: 'bcase' }, h('span', { class: 'lbl' }, 'Número de serie'), h('div', { class: 'serial' }, digits), h('span', { class: 'note' }, 'Las cifras están en amarillo.')),
      bomb.modules.map((m, i) => moduleCard(st, i, () => {
        if (m.type === 'palancas') return h('div', { class: 'list' },
          h('div', { class: 'row', style: { flexWrap: 'nowrap', gap: '12px' } },
            h('div', { class: 'light', style: { '--c': COLORS[m.light] } }, h('i'), h('b', null, 'LUZ ' + COLOR_NAME[m.light])),
            h('div', { style: { flex: 1, minWidth: 0 } }, h('span', { class: 'lbl' }, 'Código'), h('div', { class: 'digits small' }, m.code.map(d => h('span', { class: 'f' }, d))))),
          leverRow(local.lev[i], j => { local.lev[i][j] = !local.lev[i][j]; sfx.tick(); render(sync.state); }),
          h('button', { class: 'btn primary block', onclick: () => sync.dispatch({ k: 'pal', m: i, pos: local.lev[i] }) }, svgIcon('check', 18), 'Confirmar palancas'));
        if (m.type === 'luces') {
          const grid = h('div', { class: 'lgrid' }, Array.from({ length: 9 }, (_, c) => h('button', { 'data-c': c, 'aria-label': 'Casilla ' + (c + 1), disabled: !!playing, onclick: e => { sfx.tick(); const b = e.currentTarget; b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 180); sync.dispatch({ k: 'luz', m: i, cell: c }); } }, h('small', null, c + 1), h('b'))));
          const stepLbl = h('span', { class: 'lbl' }, playing ? '' : 'Pulsa «Ver secuencia» para ver las luces');
          const play = () => {
            if (playing) return; playing = true; render(sync.state);
            const cells = () => [...document.querySelectorAll('.lgrid button')];
            m.seq.forEach((s, k) => {
              setTimeout(() => { const b = cells()[s.cell]; if (!b) return; b.style.setProperty('--c', COLORS[s.color]); b.classList.add('lit'); b.querySelector('b').textContent = COLOR_NAME[s.color]; const l = document.querySelector('.lstep'); if (l) l.textContent = `Luz ${k + 1} de ${m.seq.length}: casilla ${s.cell + 1}, ${COLOR_NAME[s.color].toLowerCase()}`; sfx.tick(); }, 400 + k * 1300);
              setTimeout(() => { const b = cells()[s.cell]; if (!b) return; b.classList.remove('lit'); b.querySelector('b').textContent = ''; }, 400 + k * 1300 + 950);
            });
            setTimeout(() => { playing = null; render(sync.state); }, 400 + m.seq.length * 1300);
          };
          return h('div', { class: 'list' },
            h('p', { class: 'lstep' }, playing ? 'Mira las luces…' : `Secuencia de ${m.seq.length} luces. Puedes verla las veces que quieras.`),
            grid,
            h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, 'Presionadas'), h('div', { class: 'steps' }, m.seq.map((_, k) => h('i', { class: k < st.prog[i] ? 'on' : '' })))),
            h('button', { class: 'btn block', disabled: !!playing, onclick: play }, svgIcon('eye', 18), playing ? 'Mostrando…' : 'Ver secuencia'),
            h('p', { class: 'note' }, 'Después, presiona las casillas que te diga tu pareja, en orden. Si fallas, el panel vuelve a empezar.'));
        }
        if (m.type === 'simbolos') return h('div', { class: 'list' },
          h('div', { class: 'symbg ' + m.bg }, h('span', { class: 'lbl' }, 'Fondo ' + (m.bg === 'dorado' ? 'DORADO' : 'PLATEADO')), h('div', { class: 'symrow' }, m.syms.map((s, k) => h('div', null, h('small', null, k + 1 + 'º'), sym(s, 40))))),
          keypad(4, local.code[i] || '', v => { local.code[i] = v; render(sync.state); }, v => { sync.dispatch({ k: 'sim', m: i, code: v }); local.code[i] = ''; }, 'Código de 4 cifras'));
        return h('div', { class: 'list' },
          h('div', { class: 'calc' }, h('div', null, shapeSvg(m.shape, 54), h('b', null, m.shape.toUpperCase())), h('strong', null, m.n)),
          keypad({ min: 1, max: 4 }, local.calc[i] || '', v => { local.calc[i] = v; render(sync.state); }, v => { sync.dispatch({ k: 'calc', m: i, val: +v }); local.calc[i] = ''; }, 'Resultado'));
      })));
  }
  // ---------------- vista del manual ----------------
  function manualView(st) {
    const types = [...new Set(bomb.modules.map(m => m.type))], cur = bomb.modules[st.focus];
    const tab = (id, l, ic, solved) => h('button', { 'aria-pressed': String(page === id), onclick: () => { page = id; followFocus = id === cur?.type; render(sync.state); } }, svgIcon(ic, 16), l, solved ? svgIcon('check', 16) : null);
    return h('div', { class: 'list' },
      cur && !st.solved[st.focus] ? h('div', { class: 'focusbar' }, svgIcon('eye', 18), h('span', null, 'Tu pareja tiene abierto: ', h('b', null, MODULE_INFO[cur.type].name)), page !== cur.type ? h('button', { class: 'btn small', onclick: () => { page = cur.type; followFocus = true; render(sync.state); } }, 'Ir') : null) : null,
      h('div', { class: 'tabs', role: 'group', 'aria-label': 'Páginas del manual' }, tab('intro', 'Inicio', 'book'), types.map(t => tab(t, MODULE_INFO[t].name, MODULE_INFO[t].icon, bomb.modules.every((m, i) => m.type !== t || st.solved[i])))),
      manualPage(page, bomb));
  }
  function showEnd(st) {
    const win = st.status === 'win', L = LEVELS[st.lv], key = st.seed + st.lv;
    let reward = null;
    if (rewarded !== key) { rewarded = key; reward = finishMatch(ctx, { game: 'bomba', level: L.id, win, title: 'Bomba: ' + L.name, detail: win ? st.strikes + ' errores' : 'Explotó', xp: 80 + st.lv * 25, coins: 20 + st.lv * 10, mission: 'bomba', ach: win ? ['artificieros'].concat(st.strikes === 0 ? ['sin-errores'] : []) : [] }); }
    if (!win) sfx.boom();
    resultCard(ui, { win, title: win ? '¡Bomba desactivada!' : '¡BUM!', lines: [win ? `Con ${st.strikes} ${st.strikes === 1 ? 'error' : 'errores'}.` : st.strikes >= 3 ? 'Hubo 3 errores.' : 'Se acabó el tiempo.'], reward,
      onNext: win && st.lv < LEVELS.length - 1 ? () => sync.dispatch({ k: 'next' }) : null, nextLabel: 'Siguiente bomba', onAgain: () => sync.dispatch({ k: 'again' }), onExit: () => ctx.exit() });
  }
  tick = setInterval(() => {
    const st = sync.state; if (!st || st.phase !== 'play') return;
    const left = remaining(ctx, st); ui.setTimer(left);
    if (left !== null && left <= 10 && left > 0) sfx.tick();
    if (sync.isHost && left !== null && left <= 0) sync.dispatch({ k: 'timeout' });
  }, 1000);
  if (DEBUG) window.__bomb = { get st() { return sync.state; }, get bomb() { return bomb; } };
  return { destroy() { clearInterval(tick); sync.destroy(); ui.destroy(); if (DEBUG) delete window.__bomb; } };
}

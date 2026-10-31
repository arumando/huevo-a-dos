// Manual de desactivación: una página por tipo de módulo con explicación, lo que ve tu pareja, procedimiento,
// ejemplo y cuándo se completa. Incluye diagramas de la cuadrícula y una práctica interactiva para las luces.
import { h } from '../../core/util.js';
import { svgIcon } from '../../ui/icons.js';
import { COLORS, SYMBOLS, SYMBOL_VALUES, SYMBOL_NAMES, MODULE_INFO, lightTarget } from './modules.js';

const COLOR_NAME = { rojo: 'Rojo', azul: 'Azul', verde: 'Verde', amarillo: 'Amarillo' };
export const sym = (k, size = 30) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = SYMBOLS[k]; return s; };
export const shapeSvg = (sh, size = 40) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.innerHTML = { 'triángulo': '<path d="M12 3l9 17H3z"/>', 'cuadrado': '<rect x="4" y="4" width="16" height="16"/>', 'círculo': '<circle cx="12" cy="12" r="9"/>', 'rombo': '<path d="M12 2l9 10-9 10-9-10z"/>' }[sh]; return s; };

// Cuadrícula pequeña numerada. marks: { índice: {fill, ring, label} }
export function miniGrid(marks = {}, size = 32) {
  return h('div', { class: 'mgrid', style: { gridTemplateColumns: `repeat(3, ${size}px)` }, role: 'img', 'aria-label': 'Cuadrícula de 3 por 3' }, Array.from({ length: 9 }, (_, i) => {
    const m = marks[i] || {};
    return h('span', { style: { width: size + 'px', height: size + 'px', background: m.fill || '', boxShadow: m.ring ? `inset 0 0 0 3px ${m.ring}` : '', color: m.fill ? '#140f2a' : '' } }, m.label ?? i + 1);
  }));
}
const pair = (color, from) => { const to = lightTarget({ cell: from, color }); return h('div', { class: 'mpair' }, miniGrid({ [from]: { fill: COLORS[color] } }, 26), svgIcon('arrowRight', 20), miniGrid({ [to]: { ring: '#140f2a', fill: '#fff' } }, 26), h('small', null, `${from + 1} → ${to + 1}`)); };
const section = (title, ...kids) => [h('h5', null, title), ...kids];

export function manualPage(type, bomb) {
  const I = MODULE_INFO[type];
  if (type === 'intro') return h('div', { class: 'doc' }, h('h4', null, 'Antes de empezar'),
    h('p', null, 'Tu pareja ve la bomba; tú no. Tú tienes las reglas; tu pareja no. Solo hablando la desactivan.'),
    ...section('Primero', h('ol', null, h('li', null, 'Pide el ', h('b', null, 'número de serie'), ' (está en la carcasa). Lo usa el módulo de Cálculo.'), h('li', null, 'Cuando tu pareja abra un módulo, este manual salta a su página.'), h('li', null, 'Usen siempre los números de casilla del 1 al 9:'))),
    miniGrid({}, 34),
    ...section('Errores', h('p', null, 'Con 3 errores, explota. Cada error resta además 15 segundos. Si dudan, pregunten de nuevo antes de tocar.')));
  if (type === 'luces') {
    const tryState = { color: 'rojo', from: null }, demo = h('div');
    const draw = () => demo.replaceChildren(
      h('div', { class: 'tabs' }, Object.keys(COLORS).map(c => h('button', { 'aria-pressed': String(tryState.color === c), style: { boxShadow: `inset 0 0 0 3px ${COLORS[c]}` }, onclick: () => { tryState.color = c; draw(); } }, COLOR_NAME[c]))),
      h('div', { class: 'mpair' },
        h('div', { class: 'mgrid tap', style: { gridTemplateColumns: 'repeat(3, 40px)' } }, Array.from({ length: 9 }, (_, i) => h('button', { 'aria-label': 'Casilla ' + (i + 1), style: { background: tryState.from === i ? COLORS[tryState.color] : '' }, onclick: () => { tryState.from = i; draw(); } }, i + 1))),
        svgIcon('arrowRight', 22),
        miniGrid(tryState.from == null ? {} : { [lightTarget({ cell: tryState.from, color: tryState.color })]: { fill: '#fff', ring: '#140f2a' } }, 40)),
      h('p', { style: { fontWeight: 800 } }, tryState.from == null ? 'Toca una casilla para ver cuál hay que presionar.' : `Luz ${COLOR_NAME[tryState.color].toLowerCase()} en ${tryState.from + 1} → presionar la ${lightTarget({ cell: tryState.from, color: tryState.color }) + 1}.`));
    draw();
    return h('div', { class: 'doc' }, h('h4', null, I.name),
      ...section('Qué es', h('p', null, 'Una cuadrícula de 3×3. Al pulsar «Ver secuencia» se encienden varias luces de colores, una por una (3 o 4). Por cada luz hay que presionar una casilla, en el mismo orden.')),
      ...section('Lo que ve tu pareja', h('div', { class: 'mpair' }, miniGrid({ 3: { fill: COLORS.rojo, label: '4' } }, 32), h('p', null, 'Ejemplo: «Luz 1 de 3: casilla 4, roja».'))),
      ...section('Regla por color', h('div', { class: 'mrules' },
        h('div', null, h('b', { style: { color: '#c0283a' } }, 'Rojo: la opuesta'), h('span', null, 'Gira la cuadrícula media vuelta. Las esquinas van a la esquina contraria; el 5 se queda.'), pair('rojo', 0), pair('rojo', 3)),
        h('div', null, h('b', { style: { color: '#2a6fc0' } }, 'Azul: la misma'), h('span', null, 'Se presiona la misma casilla que se encendió.'), pair('azul', 6)),
        h('div', null, h('b', { style: { color: '#2a8a4a' } }, 'Verde: la de abajo'), h('span', null, 'Una fila hacia abajo. Desde la fila de abajo, vuelve a la de arriba.'), pair('verde', 1), pair('verde', 7)),
        h('div', null, h('b', { style: { color: '#9a6a00' } }, 'Amarillo: la de la derecha'), h('span', null, 'Una casilla a la derecha. Desde la columna derecha, vuelve a la izquierda.'), pair('amarillo', 3), pair('amarillo', 5)))),
      ...section('Pruébalo', demo),
      ...section('Procedimiento', h('ol', null, h('li', null, 'Pide que pulse «Ver secuencia» y te diga cada luz: casilla y color.'), h('li', null, 'Para cada luz, busca la regla de su color y di qué casilla presionar.'), h('li', null, 'Tu pareja presiona en el mismo orden. Si se equivocan, el panel vuelve a empezar.'))),
      ...section('Se completa cuando', h('p', null, 'Se presionan todas las casillas correctas en orden.')));
  }
  if (type === 'palancas') return h('div', { class: 'doc' }, h('h4', null, I.name),
    ...section('Qué es', h('p', null, 'Cinco palancas numeradas del 1 al 5, una luz de color y una pantalla con un código de 3 cifras (cada cifra va del 1 al 5).')),
    ...section('Regla por color de la luz', h('div', { class: 'tblwrap' }, h('table', null, h('tr', null, h('th', null, 'Luz'), h('th', null, 'Así deben quedar')),
      h('tr', null, h('td', null, h('b', { style: { color: '#c0283a' } }, 'Roja')), h('td', null, 'Arriba solo las palancas cuyo número está en el código. Las demás, abajo.')),
      h('tr', null, h('td', null, h('b', { style: { color: '#2a8a4a' } }, 'Verde')), h('td', null, 'Arriba solo las palancas cuyo número NO está en el código.')),
      h('tr', null, h('td', null, h('b', { style: { color: '#2a6fc0' } }, 'Azul')), h('td', null, 'Todas arriba menos una: suma las 3 cifras y divide entre 5. El residuo es la palanca que va abajo (residuo 0 = la 5).')),
      h('tr', null, h('td', null, h('b', { style: { color: '#9a6a00' } }, 'Amarilla')), h('td', null, 'Todas al revés de como están ahora. Pregunta primero cómo están.'))))),
    ...section('Ejemplo', h('div', { class: 'ex' }, h('p', null, h('b', null, 'Luz azul, código 3 2 1.'), ' Suma: 3 + 2 + 1 = 6. 6 ÷ 5 deja residuo 1. Resultado: ', h('b', null, 'la 1 abajo; 2, 3, 4 y 5 arriba.')),
      leverRow([false, true, true, true, true]))),
    ...section('Procedimiento', h('ol', null, h('li', null, 'Pregunta el color de la luz y el código.'), h('li', null, 'Calcula cuáles van arriba y cuáles abajo.'), h('li', null, 'Díctalas una por una: «1 abajo, 2 arriba…». Tu pareja pulsa «Confirmar».'))),
    ...section('Se completa cuando', h('p', null, 'Al confirmar, todas las palancas están en la posición correcta.')));
  if (type === 'simbolos') return h('div', { class: 'doc' }, h('h4', null, I.name),
    ...section('Qué es', h('p', null, 'Cuatro símbolos sobre un fondo dorado o plateado, y un teclado. Hay que escribir una cifra por símbolo, en el mismo orden.')),
    ...section('Tabla de valores', h('div', { class: 'tblwrap' }, h('table', { class: 'symtable' }, h('tr', null, h('th', null, 'Símbolo'), h('th', null, 'Fondo dorado'), h('th', null, 'Fondo plateado')),
      Object.keys(SYMBOLS).map(k => h('tr', null, h('td', null, h('span', { class: 'symcell' }, sym(k, 28), h('b', null, SYMBOL_NAMES[k]))), h('td', { class: 'big' }, SYMBOL_VALUES[k][0]), h('td', { class: 'big' }, SYMBOL_VALUES[k][1])))))),
    ...section('Ejemplo', h('div', { class: 'ex' }, h('p', null, h('b', null, 'Fondo plateado: luna, rayo, gota, ancla.'), ' Se escribe ', h('b', null, `${SYMBOL_VALUES.luna[1]}${SYMBOL_VALUES.rayo[1]}${SYMBOL_VALUES.gota[1]}${SYMBOL_VALUES.ancla[1]}`), '.'))),
    ...section('Procedimiento', h('ol', null, h('li', null, 'Pregunta el color del fondo: decide qué columna usar.'), h('li', null, 'Pide que describa cada símbolo de izquierda a derecha y búscalo por su dibujo.'), h('li', null, 'Dicta las 4 cifras. Tu pareja las escribe y pulsa el botón verde.'))),
    ...section('Se completa cuando', h('p', null, 'Se envían las 4 cifras correctas.')));
  return h('div', { class: 'doc' }, h('h4', null, I.name),
    ...section('Qué es', h('p', null, 'Una figura y un número grande de dos cifras (lo llamamos N). Hay que escribir el resultado de una operación.')),
    ...section('Operación por figura', h('div', { class: 'tblwrap' }, h('table', null, h('tr', null, h('th', null, 'Figura'), h('th', null, 'Operación')),
      h('tr', null, h('td', null, h('span', { class: 'symcell' }, shapeSvg('triángulo', 26), 'Triángulo')), h('td', null, 'N × 3, menos la ', h('b', null, 'última'), ' cifra del número de serie.')),
      h('tr', null, h('td', null, h('span', { class: 'symcell' }, shapeSvg('cuadrado', 26), 'Cuadrado')), h('td', null, 'Voltea las cifras de N (47 → 74) y suma 7.')),
      h('tr', null, h('td', null, h('span', { class: 'symcell' }, shapeSvg('círculo', 26), 'Círculo')), h('td', null, 'Suma las dos cifras de N y multiplica por el número de módulos de la bomba.')),
      h('tr', null, h('td', null, h('span', { class: 'symcell' }, shapeSvg('rombo', 26), 'Rombo')), h('td', null, '99 menos N, más la ', h('b', null, 'primera'), ' cifra del número de serie.'))))),
    ...section('Cifras del número de serie', h('p', null, 'Solo cuentan los números, de izquierda a derecha. En ', h('b', { class: 'mono' }, 'SE32P1'), ' las cifras son 3, 2 y 1: la primera es ', h('b', null, '3'), ' y la última es ', h('b', null, '1'), '.')),
    ...section('Ejemplos', h('div', { class: 'ex' }, h('p', null, 'Serie SE32P1, ', h('b', null, 'triángulo 25'), ': 25 × 3 = 75; 75 − 1 = ', h('b', null, '74'), '.'), h('p', null, 'Serie SE32P1, ', h('b', null, 'rombo 40'), ': 99 − 40 = 59; 59 + 3 = ', h('b', null, '62'), '.'))),
    ...section('Se completa cuando', h('p', null, 'Se envía el resultado correcto.')));
}
export function leverRow(pos, onToggle) {
  return h('div', { class: 'levers' }, pos.map((up, j) => {
    const inner = [h('small', null, j + 1), h('span', { class: 'lv ' + (up ? 'up' : 'down') }, h('i')), h('b', null, up ? 'Arriba' : 'Abajo')];
    return onToggle ? h('button', { class: 'lever', 'aria-label': `Palanca ${j + 1}: ${up ? 'arriba' : 'abajo'}`, 'aria-pressed': String(up), onclick: () => onToggle(j) }, inner) : h('div', { class: 'lever' }, inner);
  }));
}

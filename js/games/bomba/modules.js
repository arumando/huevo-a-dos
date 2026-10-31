// Desactiva la bomba: generación de bombas (con semilla, igual en ambos teléfonos), reglas y manual.
import { rng } from '../../core/util.js';

export const LEVELS = [
  { id: 'b1', name: 'Primera bomba', mods: ['palancas'], dur: 180, diff: 'Fácil' },
  { id: 'b2', name: 'Doble cerrojo', mods: ['palancas', 'simbolos'], dur: 210, diff: 'Fácil' },
  { id: 'b3', name: 'Luces de alarma', mods: ['luces', 'simbolos', 'calculo'], dur: 240, diff: 'Media' },
  { id: 'b4', name: 'El maletín', mods: ['palancas', 'luces', 'simbolos', 'calculo'], dur: 270, diff: 'Difícil' },
  { id: 'b5', name: 'Cuenta regresiva', mods: ['luces', 'calculo', 'palancas', 'simbolos'], dur: 220, diff: 'Muy difícil', hard: true }
];
export const COLORS = { rojo: '#ff5470', verde: '#5fd38a', azul: '#4aa8ff', amarillo: '#ffcf5c' };
export const SYMBOLS = {
  luna: '<path d="M16 3a9 9 0 1 0 5 14 7 7 0 0 1-5-14z"/>',
  estrella: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  ola: '<path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-3 4-2"/><path d="M2 18c3-3 5-3 8 0s5 3 8 0"/>',
  ojo: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  rayo: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
  hoja: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19L14 10"/>',
  llave: '<circle cx="7" cy="12" r="4"/><path d="M11 12h10M17 12v4M20 12v3"/>',
  corona: '<path d="M3 18h18M4 18L3 7l5 4 4-6 4 6 5-4-1 11"/>',
  ancla: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13c0 4 3 7 7 7s7-3 7-7M8 11h8"/>',
  espiral: '<path d="M12 12a1 1 0 1 1 1 1 3 3 0 1 1-3-3 5 5 0 1 1-5 5 7.5 7.5 0 1 1 7.5 7.5"/>',
  gota: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>',
  flecha: '<path d="M4 12h15M13 6l6 6-6 6"/>'
};
// Tabla del manual: valor de cada símbolo según el color del módulo.
export const SYMBOL_VALUES = { luna: [3, 8], estrella: [7, 1], ola: [0, 5], ojo: [9, 2], rayo: [4, 6], hoja: [1, 9], llave: [6, 0], corona: [2, 7], ancla: [8, 3], espiral: [5, 4], gota: [7, 6], flecha: [0, 1] };
export const SHAPES = ['triángulo', 'cuadrado', 'círculo', 'rombo'];
export const SYMBOL_NAMES = { luna: 'Luna', estrella: 'Estrella', ola: 'Olas', ojo: 'Ojo', rayo: 'Rayo', hoja: 'Hoja', llave: 'Llave', corona: 'Corona', ancla: 'Ancla', espiral: 'Espiral', gota: 'Gota', flecha: 'Flecha' };
export const MODULE_INFO = {
  palancas: { name: 'Palancas', icon: 'flag', say: 'el color de la luz, las tres cifras del código y cómo están ahora las palancas (arriba o abajo).' },
  luces: { name: 'Panel de luces', icon: 'bulb', say: 'en orden, el número de casilla (1 a 9) y el color de cada luz que se enciende.' },
  simbolos: { name: 'Símbolos', icon: 'star', say: 'el color del fondo (dorado o plateado) y cómo es cada símbolo, de izquierda a derecha.' },
  calculo: { name: 'Cálculo', icon: 'dice', say: 'la figura, el número grande y las cifras del número de serie.' }
};

export function makeBomb(seed, lvIndex) {
  const L = LEVELS[lvIndex], r = rng(seed + ':' + lvIndex), A = 'ABCDEFGHJKLMNPQRSTUVWXZ';
  const serial = r.pick(A) + r.pick(A) + r.int(1, 9) + r.int(0, 9) + r.pick(A) + r.int(1, 9);
  const modules = L.mods.map(type => {
    if (type === 'palancas') { const code = r.shuffle([1, 2, 3, 4, 5]).slice(0, 3); return { type, light: r.pick(Object.keys(COLORS)), code, start: [0, 1, 2, 3, 4].map(() => r() < 0.5) }; }
    if (type === 'luces') { const n = L.hard ? 4 : 3; return { type, seq: Array.from({ length: n }, () => ({ cell: r.int(0, 8), color: r.pick(Object.keys(COLORS)) })) }; }
    if (type === 'simbolos') return { type, bg: r.pick(['dorado', 'plateado']), syms: r.shuffle(Object.keys(SYMBOLS)).slice(0, 4) };
    return { type: 'calculo', n: r.int(12, 98), shape: r.pick(SHAPES) };
  });
  return { serial, modules, dur: L.dur, name: L.name };
}
const digits = s => s.replace(/\D/g, '').split('').map(Number);
export function leverTarget(m) {
  const sum = m.code.reduce((a, b) => a + b, 0), k = (sum % 5) || 5;
  return [1, 2, 3, 4, 5].map((i, j) => m.light === 'rojo' ? m.code.includes(i) : m.light === 'verde' ? !m.code.includes(i) : m.light === 'azul' ? i !== k : !m.start[j]);
}
export function lightTarget(step) {
  const row = Math.floor(step.cell / 3), col = step.cell % 3;
  if (step.color === 'rojo') return 8 - step.cell;
  if (step.color === 'azul') return step.cell;
  if (step.color === 'verde') return ((row + 1) % 3) * 3 + col;
  return row * 3 + ((col + 1) % 3);
}
export function symbolCode(m) { return m.syms.map(s => SYMBOL_VALUES[s][m.bg === 'dorado' ? 0 : 1]).join(''); }
export function calcTarget(m, serial, nMods) {
  const d = digits(serial), N = m.n, t = Math.floor(N / 10), u = N % 10;
  if (m.shape === 'triángulo') return N * 3 - d[d.length - 1];
  if (m.shape === 'cuadrado') return u * 10 + t + 7;
  if (m.shape === 'círculo') return (t + u) * nMods;
  return 99 - N + d[0];
}

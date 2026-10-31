// Escape Room: habitaciones con acertijos generados con semilla. Quien explora ve la habitación;
// quien archiva tiene los documentos. Ninguno puede resolverlo sin la otra persona.
import { rng } from '../../core/util.js';

export const ROOMS = [
  { id: 'e1', name: 'El taller del relojero', diff: 'Fácil', dur: 600, story: 'El viejo relojero dejó su taller cerrado con tres cerraduras. Quien explora está dentro; quien archiva encontró su cuaderno.' },
  { id: 'e2', name: 'El laboratorio', diff: 'Media', dur: 720, story: 'Una alquimista guardó su fórmula detrás de tres mecanismos. Sus notas están en el archivo.' },
  { id: 'e3', name: 'La casa del faro', diff: 'Difícil', dur: 840, story: 'El farero desapareció y dejó señales. Hay que salir antes de que suba la marea.' }
];
export const COLORS = { rojo: '#ff5470', verde: '#5fd38a', azul: '#4aa8ff', amarillo: '#ffcf5c', morado: '#a07cf0', naranja: '#ff9a3d' };
const WORDS4 = ['NIDO', 'LUNA', 'BESO', 'CASA', 'MIEL', 'ROSA', 'AMOR', 'FARO', 'RISA', 'MAPA', 'GATO', 'SOLA'];
const WORDS5 = ['FAROL', 'NUBES', 'PLAYA', 'PERLA', 'BARCO', 'ARENA', 'BRISA', 'CONCHA', 'ROCAS', 'VELAS'].filter(w => w.length === 5);
const TITLES = { A: ['Atlas de mareas', 'Arañas del jardín', 'Almanaque viejo'], B: ['Barcos de papel', 'Bosques del norte', 'Botánica menor'], C: ['Cartas a nadie', 'Cometas', 'Cuentos de reloj'], D: ['Diario del mar', 'Dibujos de humo'], E: ['Engranajes', 'Estrellas fugaces'], F: ['Flores secas', 'Fábulas'], G: ['Geografía íntima', 'Galletas y té'], I: ['Islas perdidas', 'Inventos'], L: ['Lluvia de verano', 'Libro de horas', 'Linternas'], M: ['Mapas del cielo', 'Música de agua', 'Mecánica fina'], N: ['Noches largas', 'Navegantes', 'Nubes'], O: ['Ópticas', 'Océanos', 'Ostras'], P: ['Péndulos', 'Poemas breves', 'Piratas'], R: ['Relojes de arena', 'Recetas', 'Ríos'], S: ['Silencios', 'Sueños', 'Sombras'], T: ['Tormentas', 'Tinta azul'], V: ['Viajes', 'Velas'] };
export const ICONS = { frasco_roto: 'frascos rotos', tubo_azul: 'tubos azules', tubo_rojo: 'tubos rojos', libro_abierto: 'libros abiertos', vela: 'velas', llave: 'llaves' };
const GLYPHS = ['sol', 'luna', 'agua', 'fuego', 'tierra', 'aire', 'sal', 'plomo'];
const MORSE = ['·', '–', '··', '·–', '–·', '––', '···', '··–', '·–·', '–··', '·––', '–·–'];

export function makeRoom(seed, idx) {
  const r = rng(seed + ':esc:' + idx);
  if (idx === 0) {
    const cols = r.shuffle(['rojo', 'verde', 'azul']), hours = { rojo: r.int(1, 9), verde: r.int(1, 9), azul: r.int(1, 9) }, order = r.shuffle(['rojo', 'verde', 'azul']);
    const syms = ['luna', 'nube', 'sol', 'estrella'], symOrder = r.shuffle(syms), symPos = r.shuffle(syms);
    const word = r.pick(WORDS4), bookCols = r.shuffle(Object.keys(COLORS));
    const marked = bookCols.slice(0, 4);
    const books = marked.map((c, i) => ({ color: c, title: r.pick(TITLES[word[i]] || ['Sin título']) }));
    const decoyL = Object.keys(TITLES).filter(l => !word.includes(l));
    books.push({ color: bookCols[4], title: r.pick(TITLES[r.pick(decoyL)]) }, { color: bookCols[5], title: r.pick(TITLES[r.pick(decoyL)]) });
    return { puzzles: [
      { kind: 'relojes', clocks: cols.map(c => ({ color: c, hour: hours[c] })), order, answer: order.map(c => hours[c]).join(''), hint: 'Cada reloj marca una hora en punto: la manecilla corta señala el número.' },
      { kind: 'musica', buttons: symPos, order: symOrder, answer: symOrder.join(','), hint: 'Los acertijos describen: la luna, la nube, el sol y una estrella.' },
      { kind: 'libros', books: r.shuffle(books), marked, answer: word, hint: 'Usen solo la primera letra de cada título marcado, en el orden de la foto.' }
    ] };
  }
  if (idx === 1) {
    const all = Object.keys(COLORS), present = r.shuffle(all).slice(0, 4), ml = Object.fromEntries(all.map(c => [c, r.int(1, 9) * 10]));
    const glyphs = r.shuffle(GLYPHS).slice(0, 6), table = Object.fromEntries(glyphs.map(g => [g, [0, 1, 2, 3].map(() => r() < 0.5)]));
    const shown = r.pick(glyphs); if (!table[shown].some(Boolean)) table[shown][r.int(0, 3)] = true;
    const cats = Object.keys(ICONS), counts = Object.fromEntries(cats.map(c => [c, r.int(1, 6)])), ask = r.shuffle(cats).slice(0, 3);
    return { puzzles: [
      { kind: 'pociones', present, ml, answer: present.map(c => ml[c]).join(','), hint: 'Cada frasco tiene un color. La fórmula dice cuántos mililitros lleva cada color.' },
      { kind: 'glifos', table, shown, answer: table[shown].map(Number).join(''), hint: 'Quien explora describe el símbolo del panel; quien archiva busca ese símbolo en la tabla.' },
      { kind: 'conteo', counts, ask, items: r.shuffle(cats.flatMap(c => Array(counts[c]).fill(c))), answer: ask.map(c => counts[c]).join(''), hint: 'Cuenten con calma: algunos objetos se parecen.' }
    ] };
  }
  const land = r.shuffle([...Array(25).keys()]), anchor = land[0], barrel = land[1], x = land[2];
  const word = r.pick(WORDS5), shift = r.int(2, 6), enc = word.split('').map(ch => String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + shift) % 26))).join('');
  const book = r.shuffle(MORSE).slice(0, 10), digits = [r.int(0, 9), r.int(0, 9), r.int(0, 9)];
  return { puzzles: [
    { kind: 'mapa', anchor, barrel, x, answer: String(x), hint: 'Usen el ancla o el barril como punto de partida y cuenten casillas.' },
    { kind: 'cifrado', enc, shift, answer: word, hint: 'Cada letra del mensaje está adelantada en el abecedario. Hay que retrocederla.' },
    { kind: 'faro', book, digits, signals: digits.map(d => book[d]), answer: digits.join(''), hint: '· es un destello corto y – uno largo. Entre cada grupo hay una pausa.' }
  ] };
}
export const normalize = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

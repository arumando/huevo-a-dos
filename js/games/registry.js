// Catálogo de mundos y juegos. Para añadir un juego: crear js/games/<carpeta>/<archivo>.js con mount(root, ctx) y registrarlo aquí.
import { ROOMS } from './escape/rooms.js';
import { LEVELS as BOMBS } from './bomba/modules.js';
import { CASES } from './detective/cases.js';
import { MAPS } from './aventura/maps.js';

export const WORLDS = [
  { id: 'huevo', name: 'Huevo a Dos', tag: 'Suban el huevo hasta el nido', color: '#ffcf5c',
    desc: 'Nuestro juego original. Dos pájaros, una cuerda y un huevo muy frágil, ahora en seis escenarios con mecánicas nuevas.',
    games: [{ id: 'huevo', name: 'Huevo a Dos', module: 'huevo/game', local: true, desc: 'Cooperativo de precisión. Cada quien mueve su pájaro arrastrando el dedo.', diff: 'Media a muy alta', levelsUi: 'huevo' }] },
  { id: 'escape', name: 'Escape Room', tag: 'Acertijos con información distinta', color: '#c9a45c',
    desc: 'Una persona está dentro de la habitación y la otra tiene los documentos. Hablen, descifren y abran las tres cerraduras antes de que se acabe el tiempo. Los acertijos cambian en cada partida.',
    games: [{ id: 'escape', name: 'Escape Room', module: 'escape/game', local: false, desc: 'Cooperativo de comunicación. Necesitan los dos teléfonos.', diff: 'Fácil a difícil', levels: ROOMS.map(r => ({ id: r.id, name: r.name, diff: r.diff })) }] },
  { id: 'bomba', name: 'Desactiva la bomba', tag: 'Uno ve la bomba, otro el manual', color: '#ff5470',
    desc: 'Quien ve la bomba no tiene el manual, y quien tiene el manual no ve la bomba. Palancas, luces, símbolos y cálculos. Tres errores y explota.',
    games: [{ id: 'bomba', name: 'Desactiva la bomba', module: 'bomba/game', local: false, desc: 'Cooperativo bajo presión. Cada bomba se genera al azar.', diff: 'Fácil a muy difícil', levels: BOMBS.map(l => ({ id: l.id, name: l.name, diff: l.diff })) }] },
  { id: 'detective', name: 'Detectives', tag: 'Casos de misterio con dos expedientes', color: '#e8d3a2',
    desc: 'Declaraciones, interrogatorios, fotografías y documentos repartidos entre los dos. Comparen pistas, descarten sospechosos y acusen juntos: tienen dos intentos.',
    games: [{ id: 'detective', name: 'Detectives', module: 'detective/game', local: true, localLabel: 'En un teléfono (con los dos expedientes)', desc: 'Cooperativo de deducción, sin prisa.', diff: 'Fácil a difícil', levels: CASES.map(c => ({ id: c.id, name: c.name, diff: c.diff })) }] },
  { id: 'aventura', name: 'Aventuras', tag: 'Islas, mansiones y templos', color: '#2fa3a0',
    desc: 'Cada quien tiene su personaje. Hay casillas que solo uno puede pisar, rejas que se abren con placas, llaves, gemas y rocas que rellenan el agua. Solo juntos llegan a la salida.',
    games: [{ id: 'aventura', name: 'Aventuras cooperativas', module: 'aventura/game', local: true, desc: 'Rompecabezas cooperativo por casillas.', diff: 'Fácil a difícil', levels: MAPS.map(m => ({ id: m.id, name: m.name, diff: m.diff })) }] },
  { id: 'mini', name: 'Minijuegos', tag: 'Partidas rápidas', color: '#a07cf0',
    desc: 'Ocho juegos cortos para jugar en cualquier momento. Algunos son en equipo y otros, de competencia.',
    games: [
      { id: 'dibujo', name: 'Dibuja y adivina', module: 'mini/dibujo', local: false, desc: 'Una persona dibuja y la otra adivina la palabra. En equipo.', diff: 'Fácil' },
      { id: 'quiz', name: '¿Qué tanto me conoces?', module: 'mini/quiz', local: false, desc: 'Preguntas sobre ustedes: una persona responde en secreto y la otra adivina.', diff: 'Fácil' },
      { id: 'memoria', name: 'Memoria', module: 'mini/memoria', local: true, desc: 'Encuentren parejas por turnos. Si aciertas, sigues.', diff: 'Fácil' },
      { id: 'gato', name: 'Tres en raya', module: 'mini/gato', local: true, desc: 'El clásico de X y O. Quien empieza se alterna.', diff: 'Fácil' },
      { id: 'ppt', name: 'Piedra, papel o tijera', module: 'mini/ppt', local: false, desc: 'Al mejor de cinco. Eligen al mismo tiempo.', diff: 'Suerte' },
      { id: 'carrera', name: 'Carrera de toques', module: 'mini/carrera', local: true, desc: 'Toca 50 veces antes que tu pareja. Salida sincronizada.', diff: 'Rápido' },
      { id: 'reflejos', name: 'Reflejos', module: 'mini/reflejos', local: true, desc: 'Toca en cuanto se ponga verde. Cinco rondas.', diff: 'Rápido' },
      { id: 'puzzle', name: 'Rompecabezas', module: 'mini/puzzle', local: true, desc: 'El mismo rompecabezas deslizante para los dos. Gana quien lo arme primero.', diff: 'Media' }
    ] }
];
export const worldById = id => WORLDS.find(w => w.id === id);
export const gameById = id => { for (const w of WORLDS) for (const g of w.games) if (g.id === id) return { world: w, game: g }; return null; };
export async function loadGame(game) { return import('./' + game.module + '.js'); }

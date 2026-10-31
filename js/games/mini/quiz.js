// ¿Qué tanto me conoces? Una persona responde en secreto sobre sí misma y la otra adivina. Suman juntos.
import { h, rng, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync } from '../common.js';
import { players, miniFinish, other } from './common.js';

const BANK = [
  ['¿Qué plan prefiero un domingo?', ['Dormir hasta tarde', 'Salir a pasear', 'Ver series', 'Cocinar algo rico']],
  ['¿Qué comida elegiría siempre?', ['Tacos', 'Pizza', 'Sushi', 'Algo casero']],
  ['¿Qué superpoder querría?', ['Volar', 'Teletransportarme', 'Leer mentes', 'Detener el tiempo']],
  ['¿Cómo prefiero viajar?', ['Playa', 'Montaña', 'Ciudad', 'Pueblo pequeño']],
  ['Si tengo un mal día, ¿qué me ayuda más?', ['Un abrazo', 'Hablarlo', 'Estar a solas', 'Comer algo dulce']],
  ['¿Qué mascota tendría?', ['Perro', 'Gato', 'Ave', 'Ninguna']],
  ['¿A qué hora soy más feliz?', ['En la mañana', 'A mediodía', 'En la tarde', 'En la noche']],
  ['¿Qué bebida elijo?', ['Café', 'Té', 'Agua fresca', 'Refresco']],
  ['¿Qué tipo de película escojo?', ['Comedia', 'Terror', 'Romance', 'Acción']],
  ['¿Qué haría con un día libre sorpresa?', ['Dormir', 'Ver a alguien que quiero', 'Hacer ejercicio', 'Un proyecto pendiente']],
  ['¿Qué me da más miedo?', ['Las alturas', 'Los bichos', 'La oscuridad', 'Hablar en público']],
  ['¿Qué regalo me gusta más?', ['Algo hecho a mano', 'Una experiencia', 'Algo útil', 'Una carta']],
  ['¿Qué estación del año prefiero?', ['Primavera', 'Verano', 'Otoño', 'Invierno']],
  ['¿Qué música pongo para manejar?', ['Pop', 'Rock', 'Regional', 'Lo que salga']],
  ['¿Qué postre elijo?', ['Pastel de chocolate', 'Helado', 'Flan', 'Fruta']],
  ['¿Cómo me gusta celebrar mi cumpleaños?', ['Fiesta grande', 'Cena tranquila', 'Viaje', 'Que no se note']],
  ['¿Qué hago primero al despertar?', ['Ver el celular', 'Estirarme', 'Ir por café', 'Seguir en la cama']],
  ['¿Qué me cuesta más?', ['Levantarme temprano', 'Decidir qué comer', 'Pedir ayuda', 'Esperar']]
];
const ROUNDS = 8;
export function mount(root, ctx) {
  const ui = shell(root, ctx, '¿Qué tanto me conoces?'), S = ctx.session; let secret = null, done = '', lastReveal = -1;
  const order = seed => rng(seed).shuffle([...BANK.keys()]).slice(0, ROUNDS);
  const fresh = seed => ({ seed, qs: order(seed), round: 0, subject: 'host', phase: 'answer', guess: null, answer: null, points: 0, status: 'play' });
  const sync = createSync(ctx, {
    init: () => fresh(S.id),
    reduce(st, a, by) {
      if (a.k === 'again' && st.status === 'end') return fresh(st.seed + 'x');
      if (st.status !== 'play') return null;
      const q = BANK[st.qs[st.round]];
      if (a.k === 'answer' && st.phase === 'answer' && by === st.subject && q[1][a.v]) { secret = a.v; return { ...st, phase: 'guess' }; }
      if (a.k === 'guess' && st.phase === 'guess' && by !== st.subject && q[1][a.v]) { const ok = a.v === secret; return { ...st, phase: 'reveal', guess: a.v, answer: secret, points: st.points + (ok ? 1 : 0) }; }
      if (a.k === 'next' && st.phase === 'reveal') { secret = null; const round = st.round + 1; return round >= ROUNDS ? { ...st, status: 'end' } : { ...st, round, subject: other(st.subject), phase: 'answer', guess: null, answer: null }; }
      return null;
    },
    onState: render
  });
  function render(st) {
    if (!st) return;
    const n = players(ctx), q = BANK[st.qs[st.round]], me = S.role, subj = st.subject === me, partnerName = n[other(me)];
    if (st.status === 'end') {
      setKids(ui.body, h('h2', null, `Se conocen ${st.points} de ${ROUNDS}`), h('p', { class: 'lead' }, st.points >= 6 ? 'Se leen la mente.' : st.points >= 4 ? 'Nada mal. Hay cosas por descubrir.' : 'Tienen mucho de qué platicar.'),
        h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'again' }) }, 'Otra ronda de preguntas'), h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir'));
      if (done !== st.seed) { done = st.seed; miniFinish(ctx, { id: 'quiz', title: '¿Qué tanto me conoces?', result: 'coop', detail: `${st.points}/${ROUNDS}` }); sfx.win(); }
      return;
    }
    const head = h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, `Pregunta ${st.round + 1} de ${ROUNDS}`), h('span', { class: 'lbl' }, `Aciertos ${st.points}`));
    const optBtns = (k, mark) => h('div', { class: 'list' }, q[1].map((o, i) => h('button', { class: 'btn', style: { justifyContent: 'flex-start', borderColor: mark?.[i] || '' }, onclick: () => { sfx.tap(); sync.dispatch({ k, v: i }); } }, o)));
    let body;
    if (st.phase === 'answer') body = subj ? [h('p', { class: 'eyebrow' }, 'Responde sobre ti, en secreto'), h('h3', null, q[0]), optBtns('answer')] : [h('p', { class: 'eyebrow' }, partnerName + ' está respondiendo'), h('h3', null, q[0]), h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Espera tu turno para adivinar')];
    else if (st.phase === 'guess') body = !subj ? [h('p', { class: 'eyebrow' }, '¿Qué respondió ' + partnerName + '?'), h('h3', null, q[0]), optBtns('guess')] : [h('p', { class: 'eyebrow' }, partnerName + ' está adivinando'), h('h3', null, q[0]), h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Esperando…')];
    else { const ok = st.guess === st.answer; body = [h('h3', null, q[0]), h('div', { class: 'list' }, q[1].map((o, i) => h('div', { class: 'li', style: { borderLeft: '6px solid ' + (i === st.answer ? 'var(--ok)' : i === st.guess ? 'var(--danger)' : 'transparent') } }, h('div', { class: 'grow' }, h('b', null, o), h('span', { class: 'note' }, [i === st.answer ? 'Respuesta de ' + n[st.subject] : '', i === st.guess ? 'Lo que adivinó ' + n[other(st.subject)] : ''].filter(Boolean).join(' · ')))))), h('p', { class: 'lead', style: { textAlign: 'center' } }, ok ? '¡Acertaron! +1' : 'Casi…'), h('button', { class: 'btn primary', onclick: () => sync.dispatch({ k: 'next' }) }, 'Siguiente pregunta')]; if (lastReveal !== st.round) { lastReveal = st.round; (ok ? sfx.ok : sfx.bad)(); } }
    setKids(ui.body, head, ...body);
  }
  return { destroy() { sync.destroy(); ui.destroy(); } };
}

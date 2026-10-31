// Primera vez: nombre y color del pájaro.
import { h, setKids } from '../core/util.js';
import { ui } from './shell.js';
import { COLORS, avatarCanvas } from './avatar.js';

export function showWelcome(app) {
  const s = app.store; // Color inicial distinto para cada teléfono (así es más probable que la pareja no repita color).
  const free = COLORS.filter(c => !c.cost), seed = [...s.profile.pid].reduce((a, c) => a + c.charCodeAt(0), 0);
  let col = s.profile.name ? (COLORS.find(c => c.body === s.profile.avatar.body) || free[0]) : free[seed % free.length];
  const prev = h('div', { class: 'av-preview' });
  const draw = () => setKids(prev, avatarCanvas({ ...s.profile.avatar, body: col.body, belly: col.belly }, 120));
  const name = h('input', { class: 'field', id: 'nameIn', maxlength: 20, placeholder: 'Tu nombre o apodo', autocomplete: 'nickname', enterkeyhint: 'done' });
  const err = h('p', { class: 'note', role: 'alert' });
  const sw = h('div', { class: 'swatches', role: 'group', 'aria-label': 'Color de tu pájaro' }, COLORS.filter(c => !c.cost).map(c =>
    h('button', { class: 'sw', style: { background: c.body }, 'aria-label': c.id, 'aria-pressed': String(c === col), onclick: e => { col = c; sw.querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } })));
  const go = () => {
    const n = name.value.trim(); if (!n) { err.textContent = 'Escribe un nombre para que tu pareja te reconozca.'; name.focus(); return; }
    s.updateProfile(p => { p.name = n.slice(0, 20); p.avatar.body = col.body; p.avatar.belly = col.belly; });
    app.room.publish(); name.blur(); app.home();
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  draw();
  ui.show(h('section', { class: 'screen' }, h('div', { class: 'scroll' }, h('div', { class: 'wrap' },
    h('p', { class: 'eyebrow' }, app.invited ? 'Tu pareja te invitó' : 'Bienvenida, bienvenido'),
    h('h1', null, 'Isla', h('br'), h('em', null, 'Nido')),
    h('p', { class: 'lead' }, app.invited ? 'Vas a entrar a la sala de tu pareja. Primero elige cómo te verás.' : 'Nuestro parque de juegos para dos. Cada quien entra desde su teléfono y se encuentran en la isla.'),
    prev, h('label', { class: 'lbl', for: 'nameIn' }, 'Tu nombre'), name, err,
    h('span', { class: 'lbl' }, 'Color de tu pájaro'), sw,
    h('button', { class: 'btn primary', onclick: go }, 'Entrar a la isla'),
    h('p', { class: 'note' }, 'No necesitas cuenta. Tu progreso se guarda en este teléfono, en el de tu pareja y en el servidor del juego.')))));
}

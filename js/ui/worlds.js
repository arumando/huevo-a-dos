// Selección de mundos y detalle de cada mundo con sus juegos, niveles, dificultad y progreso.
import { h, setKids } from '../core/util.js';
import { ui, icon } from './shell.js';
import { WORLDS, worldById } from '../games/registry.js';
import { drawWorldArt } from './art.js';
import { navBar } from './hub.js';
import { SCENARIOS, LEVELS, levelsOf } from '../games/huevo/levels.js';

// Progreso 0..1 de un mundo según el guardado compartido.
export function worldProgress(app, w) {
  const s = app.store.shared;
  if (w.id === 'huevo') return LEVELS.filter(l => s.huevo?.levels?.[l.id]?.done).length / LEVELS.length;
  if (w.id === 'mini') return w.games.filter(g => s.games?.mini?.done?.[g.id]).length / w.games.length;
  let total = 0, done = 0;
  for (const g of w.games) { const lv = g.levels || [{ id: 'jugado' }]; total += lv.length; done += lv.filter(l => s.games?.[g.id]?.done?.[l.id]).length; }
  return total ? done / total : 0;
}
function artCanvas(id, cls) { const c = h('canvas', { class: cls || '', 'aria-hidden': 'true' }); requestAnimationFrame(() => drawWorldArt(c, id, 0)); return c; }

export function showWorlds(app) {
  const screen = h('section', { class: 'screen' },
    h('div', { class: 'topbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Volver a la plaza', onclick: () => app.home() }, icon('back')), h('span', { class: 'title' }, 'Mundos'), h('span', { class: 'coins' }, app.store.coins)),
    h('div', { class: 'scroll' }, h('div', { class: 'wrap' },
      h('p', { class: 'note' }, 'Cada mundo tiene sus propios juegos. Elijan uno y la otra persona recibe la invitación en su teléfono.'),
      h('div', { class: 'worlds' }, WORLDS.map(w => { const p = worldProgress(app, w); return h('button', { class: 'wcard', style: { '--wc': w.color }, onclick: () => app.world(w.id) }, artCanvas(w.id), h('div', { class: 'wbody' }, h('span', { class: 'wname' }, w.name), h('span', { class: 'wtag' }, w.tag), h('div', { class: 'wprog', 'aria-label': Math.round(p * 100) + '% completado' }, h('i', { style: { width: Math.round(p * 100) + '%' } })))); })))),
    navBar(app, ''));
  ui.show(screen);
}

export function showWorld(app, id) {
  const w = worldById(id); if (!w) return app.home();
  const body = h('div', { class: 'wrap' });
  const screen = h('section', { class: 'screen' },
    h('div', { class: 'topbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Volver a los mundos', onclick: () => app.worlds() }, icon('back')), h('span', { class: 'title' }, w.name), h('span', { class: 'coins' }, app.store.coins)),
    h('div', { class: 'scroll' }, body), navBar(app, ''));
  const render = () => {
    const together = app.room.together;
    setKids(body, 
      h('div', { class: 'hero' }, artCanvas(w.id)),
      h('p', { class: 'lead' }, w.desc),
      !together && h('div', { class: 'panel' }, h('p', { class: 'note' }, 'Tu pareja no está conectada. Mándale el enlace de la sala para jugar juntos.'), h('button', { class: 'btn coral small', onclick: () => app.share() }, icon('share'), 'Invitar a mi pareja')),
      h('div', { class: 'games' }, w.games.map(g => g.levelsUi === 'huevo' ? huevoCard(app, g, together) : gameCard(app, g, together))));
  };
  render(); ui.show(screen);
  const offs = [app.room.on('players', render), app.store.on('shared', render)];
  screen._destroy = () => offs.forEach(f => f());
}

function playButtons(app, g, together, opts) {
  return h('div', { class: 'row' },
    h('button', { class: 'btn primary', disabled: !together, onclick: () => app.launch(g.id, opts) }, together ? 'Jugar juntos' : 'Jugar juntos (falta tu pareja)'),
    g.local && h('button', { class: 'btn', onclick: () => app.launch(g.id, opts, { local: true }) }, g.localLabel || 'En un teléfono'));
}

function gameCard(app, g, together) {
  const done = app.store.shared.games?.[g.id]?.done || {};
  let sel = (g.levels || []).find(l => !done[l.id]) || (g.levels || [])[0];
  const card = h('div', { class: 'gcard' });
  const render = () => setKids(card, 
    h('div', { class: 'ghead' }, h('h3', null, g.name), h('span', { class: 'diff' }, g.diff || '')),
    h('p', { class: 'note' }, g.desc),
    g.levels && h('div', { class: 'lvls', role: 'group', 'aria-label': 'Niveles' }, g.levels.map((l, i) => {
      const unlocked = i === 0 || done[g.levels[i - 1].id];
      return h('button', { class: 'lvl' + (l === sel ? ' sel' : ''), disabled: !unlocked, 'aria-pressed': String(l === sel), onclick: () => { sel = l; render(); } }, h('span', null, i + 1), h('small', null, l.name), h('span', { class: 'st' }, done[l.id] ? '✓' : unlocked ? '' : '🔒'));
    })),
    sel && sel.diff && h('p', { class: 'note' }, 'Dificultad: ' + sel.diff),
    playButtons(app, g, together, sel ? { level: sel.id, label: sel.name } : {}));
  render(); return card;
}

function huevoCard(app, g, together) {
  const L = app.store.shared.huevo?.levels || {};
  const scenUnlocked = SCENARIOS.map((s, i) => i === 0 || !!L[levelsOf(SCENARIOS[i - 1].id)[0]?.id]?.done);
  const firstOpen = (sc) => { const ls = levelsOf(sc); return ls.find((l, i) => !L[l.id]?.done && (i === 0 || L[ls[i - 1].id]?.done)) || ls[0]; };
  let scen = SCENARIOS[Math.max(0, scenUnlocked.lastIndexOf(true))].id, sel = firstOpen(scen), mode = 'normal';
  const card = h('div', { class: 'gcard' });
  const render = () => {
    const ls = levelsOf(scen), sc = SCENARIOS.find(s => s.id === scen);
    setKids(card, 
      h('div', { class: 'ghead' }, h('h3', null, 'Escenarios'), h('span', { class: 'diff' }, LEVELS.filter(l => L[l.id]?.done).length + '/' + LEVELS.length + ' niveles')),
      h('div', { class: 'scen', role: 'group', 'aria-label': 'Escenarios' }, SCENARIOS.map((s, i) => h('button', { 'aria-pressed': String(s.id === scen), disabled: !scenUnlocked[i], onclick: () => { scen = s.id; sel = firstOpen(scen); render(); } }, (scenUnlocked[i] ? '' : '🔒 ') + s.name))),
      h('p', { class: 'note' }, sc.blurb),
      h('div', { class: 'lvls', role: 'group', 'aria-label': 'Niveles' }, ls.map((l, i) => {
        const r = L[l.id] || {}, unlocked = i === 0 || L[ls[i - 1].id]?.done;
        return h('button', { class: 'lvl' + (l === sel ? ' sel' : ''), disabled: !unlocked, 'aria-pressed': String(l === sel), onclick: () => { sel = l; render(); } },
          h('span', null, 'Nivel ' + (i + 1)), h('small', null, l.name), h('span', { class: 'st', 'aria-label': (r.medals || 0) + ' medallas' }, unlocked ? '★'.repeat(r.medals || 0) + '☆'.repeat(3 - (r.medals || 0)) : '🔒'));
      })),
      sel && L[sel.id]?.done && h('p', { class: 'note' }, `Mejor tiempo ${fmt(L[sel.id].bestTime)} · mínimo de huevos rotos ${L[sel.id].minEggs}`),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Dificultad' },
        h('button', { 'aria-pressed': String(mode === 'normal'), onclick: () => { mode = 'normal'; render(); } }, 'Normal'),
        h('button', { 'aria-pressed': String(mode === 'extremo'), onclick: () => { mode = 'extremo'; render(); } }, 'Eggstremo')),
      h('p', { class: 'note' }, mode === 'normal' ? 'Con banderas: si se rompe, siguen desde la última.' : 'Sin banderas: si se rompe, desde abajo.'),
      playButtons(app, g, together, { level: sel.id, mode, label: sel.name }));
  };
  render(); return card;
}
const fmt = s => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

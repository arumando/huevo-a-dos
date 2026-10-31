// Selección de mundos y detalle de cada mundo con sus juegos, niveles, dificultad y progreso.
import { h, setKids } from '../core/util.js';
import { ui, icon } from './shell.js';
import { WORLDS, worldById } from '../games/registry.js';
import { drawWorldArt } from './art.js';
import { svgIcon } from './icons.js';
import { HELP } from '../games/help.js';
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
      h('div', { class: 'worlds' }, WORLDS.map(w => { const p = worldProgress(app, w); return h('button', { class: 'wcard', style: { '--wc': w.color }, onclick: () => app.world(w.id) }, artCanvas(w.id), h('span', { class: 'wcount' }, w.games.length === 1 ? (w.games[0].levels ? w.games[0].levels.length + ' niveles' : '18 niveles') : w.games.length + ' juegos'), h('div', { class: 'wbody' }, h('span', { class: 'wname' }, w.name), h('span', { class: 'wtag' }, w.tag), h('div', { class: 'wprog', 'aria-label': Math.round(p * 100) + '% completado' }, h('i', { style: { width: Math.round(p * 100) + '%' } })))); })))),
    navBar(app, ''));
  ui.show(screen);
}

export function showWorld(app, id) {
  const w = worldById(id); if (!w) return app.home();
  const body = h('div', { class: 'wrap' });
  const screen = h('section', { class: 'screen', style: { '--accent': w.color, '--accent-dk': darken(w.color) } },
    h('div', { class: 'topbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Volver a los mundos', onclick: () => app.worlds() }, icon('back')), h('span', { class: 'title' }, w.name), h('span', { class: 'coins' }, app.store.coins)),
    h('div', { class: 'scroll' }, body), navBar(app, ''));
  const heroCv = h('canvas', { 'aria-hidden': 'true' }), heroEl = h('div', { class: 'hero' }, heroCv, h('div', { class: 'htitle' }, w.name));
  let raf = 0, alive = true; const anim = t => { if (!alive) return; drawWorldArt(heroCv, w.id, t / 1000); raf = requestAnimationFrame(anim); };
  // Lo que el jugador eligió (escenario, nivel, modo) se conserva aunque la pantalla se redibuje.
  const picks = {}; let lastKey = '';
  const render = () => {
    const together = app.room.together;
    const key = together + '#' + JSON.stringify(id === 'huevo' ? app.store.shared.huevo : w.id === 'mini' ? app.store.shared.games?.mini : w.games.map(g => app.store.shared.games?.[g.id]?.done)); if (key === lastKey) return; lastKey = key;
    setKids(body, 
      heroEl,
      h('p', { class: 'lead' }, w.desc),
      !together && h('div', { class: 'panel' }, h('p', { class: 'note' }, 'Tu pareja no está conectada. Mándale el enlace de la sala para jugar juntos.'), h('button', { class: 'btn coral small', onclick: () => app.share() }, icon('share'), 'Invitar a mi pareja')),
      h('div', { class: 'games' }, w.games.map(g => g.levelsUi === 'huevo' ? huevoCard(app, g, together, picks) : gameCard(app, g, together, picks))));
  };
  render(); ui.show(screen);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(anim); else requestAnimationFrame(() => drawWorldArt(heroCv, w.id, 0));
  const offs = [app.room.on('players', render), app.store.on('shared', render)];
  screen._destroy = () => { alive = false; cancelAnimationFrame(raf); offs.forEach(f => f()); };
}

function playButtons(app, g, together, opts) {
  return h('div', { class: 'list' },
    h('button', { class: 'btn primary block', disabled: !together, onclick: () => app.launch(g.id, opts) }, svgIcon('play', 18), together ? 'Jugar juntos' : 'Falta tu pareja para jugar juntos'),
    h('div', { class: 'row' },
      g.local && h('button', { class: 'btn small', onclick: () => app.launch(g.id, opts, { local: true }) }, svgIcon('users', 18), g.localLabel || 'En un teléfono'),
      HELP[g.id] && h('button', { class: 'btn small', onclick: () => openHelp(g) }, svgIcon('help', 18), 'Cómo se juega')));
}
export function helpContent(id) {
  const H = HELP[id]; if (!H) return [];
  return [h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Objetivo'), h('b', { style: { fontSize: '17px' } }, H.goal)),
    h('div', { class: 'help-steps' }, H.steps.map(t => h('div', null, h('p', { class: 'lead' }, t)))),
    H.tip && h('div', { class: 'role' }, svgIcon('bulb', 20), h('span', null, H.tip))];
}
function openHelp(g) { ui.sheet('Cómo se juega: ' + g.name, () => helpContent(g.id), { ephemeral: true }); }
const darken = hex => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * 0.62); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const GICON = { huevo: 'egg', escape: 'door', bomba: 'bomb', detective: 'search', aventura: 'map', dibujo: 'pen', quiz: 'heart', memoria: 'dice', gato: 'check', ppt: 'users', carrera: 'timer', reflejos: 'bulb', puzzle: 'dice' };

function gameCard(app, g, together, picks = {}) {
  const done = app.store.shared.games?.[g.id]?.done || {};
  let sel = (g.levels || []).find(l => l.id === picks[g.id]) || (g.levels || []).find(l => !done[l.id]) || (g.levels || [])[0];
  const card = h('div', { class: 'gcard' });
  const render = () => setKids(card, 
    h('div', { class: 'ghead' }, h('div', { class: 'row', style: { flexWrap: 'nowrap', minWidth: 0 } }, h('span', { class: 'gico' }, svgIcon(GICON[g.id] || 'play', 24)), h('h3', null, g.name)), h('span', { class: 'diff' }, g.diff || '')),
    h('p', { class: 'note' }, g.desc),
    g.levels && h('div', { class: 'lvls', role: 'group', 'aria-label': 'Niveles' }, g.levels.map((l, i) => {
      const unlocked = i === 0 || done[g.levels[i - 1].id];
      return h('button', { class: 'lvl' + (l === sel ? ' sel' : '') + (done[l.id] ? ' done' : ''), disabled: !unlocked, 'aria-pressed': String(l === sel), onclick: () => { sel = l; picks[g.id] = l.id; render(); } }, h('span', null, i + 1), h('small', null, l.name), h('span', { class: 'st' }, done[l.id] ? '✓' : unlocked ? '' : '🔒'));
    })),
    sel && sel.diff && h('p', { class: 'note' }, 'Dificultad: ' + sel.diff),
    playButtons(app, g, together, sel ? { level: sel.id, label: sel.name } : {}));
  render(); return card;
}

function huevoCard(app, g, together, picks = {}) {
  const L = app.store.shared.huevo?.levels || {};
  const scenUnlocked = SCENARIOS.map((s, i) => i === 0 || !!L[levelsOf(SCENARIOS[i - 1].id)[0]?.id]?.done);
  const firstOpen = (sc) => { const ls = levelsOf(sc); return ls.find((l, i) => !L[l.id]?.done && (i === 0 || L[ls[i - 1].id]?.done)) || ls[0]; };
  const P = picks.huevo || (picks.huevo = {});
  let scen = P.scen || SCENARIOS[Math.max(0, scenUnlocked.lastIndexOf(true))].id, sel = levelsOf(scen).find(l => l.id === P.sel) || firstOpen(scen), mode = P.mode || 'normal';
  const keep = () => { P.scen = scen; P.sel = sel?.id; P.mode = mode; };
  const card = h('div', { class: 'gcard' });
  const render = () => {
    const ls = levelsOf(scen), sc = SCENARIOS.find(s => s.id === scen);
    setKids(card, 
      h('div', { class: 'ghead' }, h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, h('span', { class: 'gico' }, svgIcon('egg', 24)), h('h3', null, 'Escenarios')), h('span', { class: 'diff' }, LEVELS.filter(l => L[l.id]?.done).length + '/' + LEVELS.length + ' niveles')),
      h('div', { class: 'scen', role: 'group', 'aria-label': 'Escenarios' }, SCENARIOS.map((s, i) => h('button', { 'aria-pressed': String(s.id === scen), disabled: !scenUnlocked[i], onclick: () => { scen = s.id; sel = firstOpen(scen); keep(); render(); } }, (scenUnlocked[i] ? '' : '🔒 ') + s.name))),
      h('p', { class: 'note' }, sc.blurb),
      h('div', { class: 'lvls', role: 'group', 'aria-label': 'Niveles' }, ls.map((l, i) => {
        const r = L[l.id] || {}, unlocked = i === 0 || L[ls[i - 1].id]?.done;
        return h('button', { class: 'lvl' + (l === sel ? ' sel' : '') + (r.done ? ' done' : ''), disabled: !unlocked, 'aria-pressed': String(l === sel), onclick: () => { sel = l; keep(); render(); } },
          h('span', null, 'Nivel ' + (i + 1)), h('small', null, l.name), h('span', { class: 'st', 'aria-label': (r.medals || 0) + ' medallas' }, unlocked ? '★'.repeat(r.medals || 0) + '☆'.repeat(3 - (r.medals || 0)) : '🔒'));
      })),
      sel && L[sel.id]?.done && h('p', { class: 'note' }, `Mejor tiempo ${fmt(L[sel.id].bestTime)} · mínimo de huevos rotos ${L[sel.id].minEggs}`),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Dificultad' },
        h('button', { 'aria-pressed': String(mode === 'normal'), onclick: () => { mode = 'normal'; keep(); render(); } }, 'Normal'),
        h('button', { 'aria-pressed': String(mode === 'extremo'), onclick: () => { mode = 'extremo'; keep(); render(); } }, 'Eggstremo')),
      h('p', { class: 'note' }, mode === 'normal' ? 'Con banderas: si se rompe, siguen desde la última.' : 'Sin banderas: si se rompe, desde abajo.'),
      playButtons(app, g, together, { level: sel.id, mode, label: sel.name }));
  };
  render(); return card;
}
const fmt = s => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

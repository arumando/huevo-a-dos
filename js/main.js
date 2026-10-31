// Arranque de Isla Nido: perfil, conexión, sala de la pareja y navegación entre pantallas.
import { h, code as newCode, DEBUG, sleep } from './core/util.js';
import { Store } from './core/store.js';
import { Progress } from './core/progress.js';
import { setSound, sfx } from './core/audio.js';
import { Link } from './net/link.js';
import { Room } from './net/room.js';
import { ui, shareLink } from './ui/shell.js';
import { gameById, loadGame } from './games/registry.js';
import { showWelcome } from './ui/welcome.js';
import { showHub } from './ui/hub.js';
import { showWorld, showWorlds } from './ui/worlds.js';
import { bindChat } from './ui/sheets.js';

const store = new Store();
const link = new Link({ pid: store.profile.pid });
store.attach(link);
const room = new Room(link, store);
const progress = new Progress(store);
setSound(store.profile.settings?.sound !== false);
ui.init();

export const app = {
  store, link, room, progress, ui, lastWorld: 'huevo',
  inviteUrl: () => location.origin + location.pathname + '#' + room.code,
  share() { shareLink(app.inviteUrl(), '¡Ven a jugar conmigo a Isla Nido! Toca el enlace y entras directo a nuestra sala.'); },
  home: () => showHub(app),
  worlds: () => showWorlds(app),
  world: id => { app.lastWorld = id; showWorld(app, id); },
  // Lanzar un juego: con la pareja (invitación) o en este teléfono.
  launch(gameId, opts = {}, { local = false } = {}) {
    if (local) return room.startLocal(gameId, opts);
    if (!room.partner()) { ui.toast('Tu pareja no está conectada. Mándale el enlace de la sala.'); return; }
    room.invite(gameId, opts);
    const g = gameById(gameId);
    const s = ui.sheet('Invitación enviada', () => [
      h('p', { class: 'lead' }, `Le pediste a ${room.partner()?.name || 'tu pareja'} jugar ${g?.game.name || ''}.`),
      h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Esperando su respuesta…'),
      h('button', { class: 'btn ghost', onclick: () => { room.cancelInvite(); s.close(); } }, 'Cancelar')
    ], { modal: true });
    app._waitSheet = s;
  }
};
if (DEBUG) window.__app = app;
bindChat(app);

// ---------- eventos de la sala ----------
room.on('invite', inv => {
  const g = gameById(inv.game); if (!g) return;
  const who = room.partner()?.name || 'Tu pareja';
  sfx.ok();
  const s = ui.sheet(inv.resume ? 'Tu pareja te espera' : 'Invitación', () => [
    h('p', { class: 'lead' }, `${who} quiere jugar `, h('b', null, g.game.name), inv.opts?.label ? ` (${inv.opts.label})` : '', ' contigo.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => { s.close(); room.accept(inv); } }, 'Unirme'),
      h('button', { class: 'btn', onclick: () => { s.close(); room.decline(inv); } }, 'Ahora no'))
  ], { modal: true });
});
room.on('declined', () => { app._waitSheet?.close(); ui.toast('Tu pareja dijo "ahora no".'); });
room.on('session', s => { app._waitSheet?.close(); openGame(s); });
room.on('session-end', s => { const g = gameById(s.game); if (ui.current?.dataset.game) app.world(g ? g.world.id : app.lastWorld); });
room.on('partner-exited', () => ui.toast('Tu pareja salió del juego.'));
room.on('partner-joined', () => { const p = room.partner(); ui.toast(`${p?.name || 'Tu pareja'} llegó a la isla`, 'gold'); sfx.heart(); });
room.on('partner-left', () => ui.toast('Tu pareja salió de la isla'));
progress.on('achievement', a => { ui.toast('Logro: ' + a.name + ' (+' + a.coins + ' monedas)', 'gold'); sfx.coin(); });
progress.on('levelup', l => { ui.toast('¡Subiste al nivel ' + l + '!', 'gold'); sfx.win(); });
progress.on('mission-ready', m => ui.toast('Misión cumplida: ' + m.text + '. Reclámala en Logros.', 'gold'));

async function openGame(s) {
  const g = gameById(s.game); if (!g) { ui.toast('Ese juego no existe en esta versión.'); room.endSession(); return; }
  app.lastWorld = g.world.id; ui.closeSheets();
  const screen = h('section', { class: 'screen game-root', 'data-game': s.game });
  ui.show(screen);
  try {
    const mod = await loadGame(g.game);
    if (room.session !== s) return;
    const inst = mod.mount(screen, { session: s, store, progress, ui, exit: () => room.endSession(), reinvite: () => room._reinvite() });
    screen._destroy = () => inst?.destroy?.();
  } catch (e) { console.error(e); ui.toast('No se pudo abrir el juego. Revisa tu conexión.'); room.endSession(); }
}

// ---------- arranque ----------
async function boot() {
  const msg = document.getElementById('bootMsg');
  const fromHash = /^#([A-Za-z]{4,8})$/.exec(location.hash);
  let code = fromHash ? fromHash[1].toUpperCase() : store.profile.room || newCode(6);
  if (fromHash) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  app.invited = !!fromHash && fromHash[1].toUpperCase() !== store.profile.room;
  if (msg) msg.textContent = 'Conectando con el servidor…';
  const conn = link.connect().catch(() => null);
  await Promise.race([conn, sleep(8000)]);
  if (!link.connected) ui.toast('Sin conexión por ahora. Puedes jugar en este teléfono; seguimos intentando.');
  room.join(code);
  if (!store.profile.name) showWelcome(app); else app.home();
}
boot();

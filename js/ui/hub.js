// Pantalla principal: la plaza de la isla donde aparecen los dos pájaros, portales a los mundos y accesos rápidos.
import { h, clamp, now, setKids } from '../core/util.js';
import { ui, icon } from './shell.js';
import { drawBirdAvatar, avatarCanvas } from './avatar.js';
import { WORLDS } from '../games/registry.js';
import { levelOf } from '../net/room.js';
import { openChat, openAvatar, openProgress, openSettings, chatState } from './sheets.js';
import { levelById } from '../games/huevo/levels.js';

const PW = 360, PH = 520;
const SPOTS = [[96, 120], [264, 120], [58, 270], [302, 270], [100, 420], [260, 420]];
const SPEED = 150;

export function navBar(app, active) {
  const b = (id, ic, label, fn) => h('button', { 'aria-current': String(active === id), onclick: fn }, icon(ic), h('span', null, label), id === 'chat' && chatState.unread ? h('i', { class: 'badge' }, chatState.unread) : null);
  return h('nav', { class: 'nav', 'aria-label': 'Navegación' },
    b('plaza', 'plaza', 'Plaza', () => app.home()), b('chat', 'chat', 'Chat', () => openChat(app)),
    b('bird', 'bird', 'Mi pájaro', () => openAvatar(app)), b('trophy', 'trophy', 'Logros', () => openProgress(app)), b('gear', 'gear', 'Ajustes', () => openSettings(app)));
}
export function coupleChip(app) {
  const p = app.room.partner(), st = app.room.status;
  return h('div', { class: 'couple' }, avatarCanvas(app.store.profile.avatar, 34), p ? avatarCanvas(p.avatar, 34, { face: -1 }) : null,
    h('div', { class: 'who' }, h('b', null, p ? `${app.store.profile.name} y ${p.name}` : app.store.profile.name),
      h('span', { class: 'chip ' + (st === 'together' ? 'ok' : st === 'offline' ? 'bad' : 'warn') }, h('i'), st === 'together' ? 'Juntos en la isla' : st === 'offline' ? 'Sin conexión' : 'Tu pareja no está')));
}

export function showHub(app) {
  const { store, room } = app, portals = WORLDS.map((w, i) => ({ w, x: SPOTS[i][0], y: SPOTS[i][1] }));
  // Cada quien aparece en un lugar distinto de la plaza (según su identificador), para no encimarse.
  const h0 = [...store.profile.pid].reduce((a, c) => a + c.charCodeAt(0), 0), sx = 120 + (h0 % 5) * 30, sy = 320 + (h0 % 3) * 20;
  const me = { x: sx, y: sy, tx: sx, ty: sy, walkTo: null, bubble: null, bubbleT: 0 };
  const pr = store.profile.hub; if (pr && Number.isFinite(pr.x)) { me.x = me.tx = clamp(pr.x, 40, 320); me.y = me.ty = clamp(pr.y, 60, 480); }
  const other = { x: 210, y: 330, tx: 210, ty: 330, seen: false, bubble: null, bubbleT: 0 };
  const cv = h('canvas', { 'aria-label': 'Plaza de la isla. Toca para caminar; toca un portal para entrar a un mundo.' });
  const top = h('div', { class: 'topbar' });
  const panel = h('div', { class: 'scroll hub-panel' });
  const inviteFab = h('button', { class: 'btn coral invite-fab', onclick: () => app.share() }, icon('share'), 'Invitar a mi pareja');
  const plaza = h('div', { class: 'plaza' }, cv, inviteFab, h('div', { class: 'plaza-tip' }, 'Toca para caminar · entra a un portal'));
  const screen = h('section', { class: 'screen' }, top, h('div', { class: 'hub-main' }, plaza, panel), navBar(app, 'plaza'));
  ui.show(screen);

  function renderTop() {
    setKids(top, coupleChip(app), h('span', { style: { flex: 1 } }), h('span', { class: 'coins', 'aria-label': 'Monedas' }, store.coins));
    inviteFab.hidden = room.together;
  }
  function renderPanel() {
    const live = store.shared.live, lvl = levelOf(store.profile.xp), kids = [];
    if (live && live.game === 'huevo' && levelById(live.level)) {
      const L = levelById(live.level);
      kids.push(h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Partida guardada'), h('b', null, `${L.name} · bandera ${live.cp || 0} · ${live.deaths || 0} rotos`),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary small', disabled: !room.together, onclick: () => app.launch('huevo', { level: live.level, mode: live.mode, resume: live, label: L.name }) }, 'Continuar juntos'),
          h('button', { class: 'btn small', onclick: () => app.launch('huevo', { level: live.level, mode: live.mode, resume: live }, { local: true }) }, 'En este teléfono'))));
    }
    const ms = app.progress.activeMissions(), ready = ms.filter(m => m.progress >= m.goal && !m.claimed).length;
    kids.push(h('div', { class: 'panel' },
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'lbl' }, 'Nivel ' + lvl.level), h('span', { class: 'note' }, Object.keys(store.shared.ach || {}).length + ' logros · ' + ready + ' misiones por reclamar')),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': lvl.into, 'aria-valuemax': lvl.need }, h('i', { style: { width: Math.round(100 * lvl.into / lvl.need) + '%' } })),
      ms.map(m => h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'note' }, m.text), h('b', { style: { fontSize: '13px' } }, m.claimed ? 'Hecha' : m.progress + '/' + m.goal)))));
    // Juego destacado del día (cambia cada día, igual para los dos).
    const all = WORLDS.flatMap(w => w.games.map(g => ({ w, g }))), day = Math.floor(Date.now() / 864e5), pick = all[day % all.length];
    kids.push(h('div', { class: 'panel', style: { borderLeft: '6px solid ' + pick.w.color } }, h('span', { class: 'lbl' }, 'Destacado de hoy'), h('b', null, pick.g.name), h('span', { class: 'note' }, pick.g.desc),
      h('button', { class: 'btn small', onclick: () => app.world(pick.w.id) }, 'Ir a ' + pick.w.name)));
    kids.push(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => app.worlds() }, icon('worlds'), 'Todos los mundos')));
    setKids(panel, h('div', { class: 'wrap' }, ...kids));
  }
  renderTop(); renderPanel();

  // ---------- plaza ----------
  const ctx = cv.getContext('2d'); let dpr = 1, cw = 0, ch = 0, sc = 1, ox = 0, oy = 0;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); cw = cv.clientWidth; ch = cv.clientHeight; cv.width = cw * dpr; cv.height = ch * dpr; sc = Math.min(cw / PW, ch / PH); ox = (cw - PW * sc) / 2; oy = (ch - PH * sc) / 2; };
  resize(); addEventListener('resize', resize);
  const inIsland = (x, y) => ((x - 180) / 170) ** 2 + ((y - 270) / 245) ** 2 <= 1;
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - ox) / sc, y = (e.clientY - r.top - oy) / sc;
    const p = portals.find(p => Math.hypot(p.x - x, p.y - y) < 34);
    if (p) { me.tx = p.x; me.ty = p.y + 18; me.walkTo = p; }
    else if (inIsland(x, y)) { me.tx = x; me.ty = y; me.walkTo = null; }
    else return;
    room.hubMove(me.x, me.y, me.tx, me.ty);
  });
  const offs = [
    room.on('hubpos', m => { if (m.from === room.partner()?.pid) { other.tx = clamp(m.tx ?? m.x, 20, 340); other.ty = clamp(m.ty ?? m.y, 20, 500); if (!other.seen || Math.hypot(other.x - m.x, other.y - m.y) > 80) { other.x = m.x; other.y = m.y; } other.seen = true; } }),
    room.on('players', () => { renderTop(); renderPanel(); const p = room.partner(); if (p && !other.seen) { const pr = [...app.link.peers.values()].find(q => q.pid === p.pid)?.presence; if (pr && Number.isFinite(pr.hx)) { other.x = other.tx = pr.hx; other.y = other.ty = pr.hy; other.seen = true; } } if (!p) other.seen = false; }),
    room.on('status', renderTop),
    room.on('chat', m => { const who = m.mine || m.from === store.profile.pid ? me : other; who.bubble = m.text.slice(0, 40); who.bubbleT = 4; }),
    room.on('emote', m => { const who = m.mine || m.from === store.profile.pid ? me : other; who.bubble = { corazon: '♥', risa: 'jajaja', hola: '¡hola!', beso: '😘' }[m.k] || '♥'; who.bubbleT = 3; }),
    store.on('profile', renderTop), store.on('shared', renderPanel)
  ];
  // si la pareja acaba de llegar, que nos vea donde estamos
  const offJoin = room.on('partner-joined', () => room.hubMove(me.x, me.y, me.tx, me.ty));
  let raf = 0, last = now(), alive = true, lastSent = 0;
  function walk(o, dt) { const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy), st = SPEED * dt; if (d <= st) { o.x = o.tx; o.y = o.ty; return true; } o.x += dx / d * st; o.y += dy / d * st; return false; }
  function frame() {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    const arrived = walk(me, dt); walk(other, dt);
    if (arrived && me.walkTo) { const p = me.walkTo; me.walkTo = null; store.updateProfile(q => { q.hub = { x: me.x, y: me.y }; }); app.world(p.w.id); return; }
    if (t - lastSent > 1000 && (me.x !== me.tx || me.y !== me.ty)) { lastSent = t; room.hubMove(me.x, me.y, me.tx, me.ty); }
    if (arrived && t - lastSent > 4000) { lastSent = t; room.publish({ hx: Math.round(me.x), hy: Math.round(me.y) }); }
    me.bubbleT -= dt; other.bubbleT -= dt;
    draw(t / 1000);
  }
  function draw(T) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#1f3a6e'); g.addColorStop(1, '#2a1f52'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(180, 270, 178 + i * 14 + Math.sin(T + i) * 3, 253 + i * 14, 0, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#e8c98a'; ctx.beginPath(); ctx.ellipse(180, 274, 172, 248, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5fae4e'; ctx.beginPath(); ctx.ellipse(180, 268, 160, 236, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    for (const p of portals) { ctx.beginPath(); ctx.moveTo(180, 270); ctx.lineTo(p.x, p.y + 14); ctx.stroke(); }
    ctx.fillStyle = '#4f9a42'; for (const [x, y] of [[40, 200], [320, 200], [180, 70], [30, 360], [330, 360], [180, 480]]) { ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.arc(x + 10, y + 6, 11, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(180, 276, 40 - i * 3, 13 - (i % 2), (i - 3) * 0.05, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.ellipse(180, 262 + Math.sin(T * 2) * 1.5, 14, 18, 0, 0, 7); ctx.fill();
    ctx.font = '400 22px Chango, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#1a1430'; ctx.fillText('Isla Nido', 181, 22); ctx.fillStyle = '#fff1d6'; ctx.fillText('Isla Nido', 180, 20);
    for (const p of portals) {
      const gl = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 44); gl.addColorStop(0, p.w.color + 'aa'); gl.addColorStop(1, p.w.color + '00'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, 44, 0, 7); ctx.fill();
      ctx.fillStyle = '#2e2148'; ctx.beginPath(); ctx.moveTo(p.x - 22, p.y + 18); ctx.lineTo(p.x - 22, p.y - 6); ctx.arc(p.x, p.y - 6, 22, Math.PI, 0); ctx.lineTo(p.x + 22, p.y + 18); ctx.fill();
      ctx.strokeStyle = p.w.color; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = p.w.color; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(T * 2 + p.x); ctx.beginPath(); ctx.moveTo(p.x - 16, p.y + 16); ctx.lineTo(p.x - 16, p.y - 4); ctx.arc(p.x, p.y - 4, 16, Math.PI, 0); ctx.lineTo(p.x + 16, p.y + 16); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = '900 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#1a1430'; ctx.fillText(p.w.name, p.x + 1, p.y + 33); ctx.fillStyle = '#fff1d6'; ctx.fillText(p.w.name, p.x, p.y + 32);
    }
    const partner = room.partner();
    const actors = [[me, store.profile.avatar, store.profile.name || 'Tú', true]]; if (partner && other.seen) actors.push([other, partner.avatar, partner.name, false]);
    actors.sort((a, b) => a[0].y - b[0].y);
    for (const [o, av, name, mine] of actors) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 16, 14, 4, 0, 0, 7); ctx.fill();
      const moving = o.x !== o.tx || o.y !== o.ty;
      drawBirdAvatar(ctx, o.x, o.y - (moving ? Math.abs(Math.sin(T * 12)) * 3 : 0), av, { face: o.tx >= o.x ? 1 : -1, flap: moving ? T * 14 : 0.6, label: name, labelColor: mine ? '#ffcf5c' : '#f7f0fb' });
      if (o.bubble && o.bubbleT > 0) { ctx.font = '800 13px Nunito, system-ui, sans-serif'; const tw = ctx.measureText(o.bubble).width + 16, bx = clamp(o.x - tw / 2, 4, PW - tw - 4), by = o.y - 64; ctx.fillStyle = '#fff1d6'; ctx.globalAlpha = Math.min(1, o.bubbleT); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, tw, 24, 10) : ctx.rect(bx, by, tw, 24); ctx.fill(); ctx.fillStyle = '#1a1430'; ctx.textAlign = 'left'; ctx.fillText(o.bubble, bx + 8, by + 16); ctx.globalAlpha = 1; }
    }
  }
  raf = requestAnimationFrame(frame);
  screen._destroy = () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); offs.forEach(f => f()); offJoin(); };
  setTimeout(() => room.hubMove(me.x, me.y, me.tx, me.ty), 300);
}

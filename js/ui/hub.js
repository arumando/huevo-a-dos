// Pantalla principal: la plaza de la isla donde aparecen los dos pájaros, portales a los mundos y accesos rápidos.
import { h, clamp, now, setKids, DEBUG } from '../core/util.js';
import { ui, icon } from './shell.js';
import { svgIcon } from './icons.js';
import { drawBirdAvatar, avatarCanvas } from './avatar.js';
import { WORLDS } from '../games/registry.js';
import { levelOf } from '../net/room.js';
import { openChat, openAvatar, openProgress, openSettings, chatState } from './sheets.js';
import { levelById } from '../games/huevo/levels.js';

// La isla se dibuja en coordenadas normalizadas (u, v) dentro de una elipse: así se adapta a pantallas altas o anchas
// y las posiciones que se comparten con la pareja significan lo mismo aunque su teléfono esté de lado.
const LAYOUTS = {
  tall: { PW: 360, PH: 500, cx: 180, cy: 262, rx: 158, ry: 226, ang: [-125, -55, 180, 0, 125, 55], fu: 0.74, fv: 0.66 },
  wide: { PW: 500, PH: 360, cx: 250, cy: 194, rx: 222, ry: 150, ang: [-150, -90, -30, 150, 90, 30], fu: 0.7, fv: 0.64 }
};
const SPEED = 0.62; // en radios de isla por segundo

export function navBar(app, active) {
  const b = (id, ic, label, fn) => h('button', { 'aria-current': String(active === id), onclick: fn }, icon(ic), h('span', null, label), id === 'chat' && chatState.unread ? h('i', { class: 'badge' }, chatState.unread) : null);
  return h('nav', { class: 'nav', 'aria-label': 'Navegación' },
    b('plaza', 'plaza', 'Plaza', () => app.home()), b('chat', 'chat', 'Chat', () => openChat(app)),
    b('bird', 'bird', 'Mi pájaro', () => openAvatar(app)), b('trophy', 'trophy', 'Logros', () => openProgress(app)), b('gear', 'gear', 'Ajustes', () => openSettings(app)));
}
export function coupleChip(app) {
  const p = app.room.partner(), st = app.room.status;
  return h('div', { class: 'couple' }, h('div', { class: 'avs' }, avatarCanvas(app.store.profile.avatar, 40), p ? avatarCanvas(p.avatar, 40, { face: -1 }) : null),
    h('div', { class: 'who' }, h('b', null, p ? `${app.store.profile.name} y ${p.name}` : app.store.profile.name),
      h('span', { class: 'chip ' + (st === 'together' ? 'ok' : st === 'offline' ? 'bad' : 'warn') }, h('i'), st === 'together' ? 'Juntos en la isla' : st === 'offline' ? 'Sin conexión' : 'Tu pareja no está')));
}

export function showHub(app) {
  const { store, room } = app;
  const portals = WORLDS.map((w, i) => ({ w, i, u: 0, v: 0 }));
  const setPortals = L => portals.forEach(p => { const a = L.ang[p.i] * Math.PI / 180; p.u = Math.cos(a) * L.fu; p.v = Math.sin(a) * L.fv; });
  // Cada quien aparece en un lugar distinto (según su identificador), para no encimarse.
  const h0 = [...store.profile.pid].reduce((a, c) => a + c.charCodeAt(0), 0), su = -0.3 + (h0 % 5) * 0.15, sv = 0.25 + (h0 % 3) * 0.08;
  const me = { u: su, v: sv, tu: su, tv: sv, walkTo: null, bubble: null, bubbleT: 0 };
  const pr = store.profile.hub; if (pr && Number.isFinite(pr.u)) { me.u = me.tu = clamp(pr.u, -0.85, 0.85); me.v = me.tv = clamp(pr.v, -0.85, 0.85); }
  const other = { u: 0.25, v: 0.3, tu: 0.25, tv: 0.3, seen: false, bubble: null, bubbleT: 0 };
  const cv = h('canvas', { 'aria-label': 'Plaza de la isla. Toca para caminar; toca un portal para entrar a un mundo.' });
  const top = h('div', { class: 'topbar' });
  const panel = h('div', { class: 'scroll hub-panel' });
  const plaza = h('div', { class: 'plaza' }, cv, h('div', { class: 'plaza-tip' }, 'Toca para caminar · entra a un portal'));
  const screen = h('section', { class: 'screen' }, top, h('div', { class: 'hub-main' }, plaza, panel), navBar(app, 'plaza'));
  ui.show(screen);

  let topKey = '', panelKey = '';
  function renderTop() {
    const k = [room.status, store.coins, JSON.stringify(store.profile.avatar), store.profile.name, room._sig].join('#'); if (k === topKey) return; topKey = k;
    setKids(top, coupleChip(app), h('span', { class: 'coins', 'aria-label': store.coins + ' monedas' }, store.coins));

  }
  function renderPanel() {
    const live = store.shared.live, lvl = levelOf(store.profile.xp), kids = [];
    const k = [room.together, JSON.stringify(live), store.profile.xp, JSON.stringify(app.progress.activeMissions().map(m => [m.progress, m.claimed])), Object.keys(store.shared.ach || {}).length].join('#'); if (k === panelKey) return; panelKey = k;
    // Invitar: tarjeta propia en el panel (no flota sobre la plaza ni se mueve al tocarla)
    if (!room.together) kids.push(h('div', { class: 'cta' }, svgIcon('users', 30), h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, 'Invita a tu pareja'), h('span', null, 'Le llega un enlace y entra directo a esta isla.')),
      h('button', { class: 'btn small', id: 'btnInvite', onclick: () => app.share() }, svgIcon('share', 18), 'Invitar')));
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
  const ctx = cv.getContext('2d'); let dpr = 1, cw = 0, ch = 0, sc = 1, ox = 0, oy = 0, L = LAYOUTS.wide, deco = null;
  const X = u => L.cx + u * L.rx, Y = v => L.cy + v * L.ry;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1); cw = cv.clientWidth; ch = cv.clientHeight; cv.width = cw * dpr; cv.height = ch * dpr;
    L = ch > cw * 1.05 ? LAYOUTS.tall : LAYOUTS.wide; setPortals(L); deco = makeDeco();
    sc = Math.min(cw / L.PW, ch / L.PH); ox = (cw - L.PW * sc) / 2; oy = (ch - L.PH * sc) / 2;
  };
  function makeDeco() {
    const near = (u, v) => portals.some(p => Math.hypot(p.u - u, (p.v - v) * 1.2) < 0.28) || Math.hypot(u, v) < 0.3;
    const flowers = []; for (let i = 0; i < 70 && flowers.length < 26; i++) { const u = ((i * 0.618) % 1) * 1.8 - 0.9, v = ((i * 0.381 + 0.13) % 1) * 1.8 - 0.9; if (u * u + v * v < 0.8 && !near(u, v)) flowers.push([u, v, ['#ff6fae', '#ffcf4a', '#fbf6ff', '#9a6bff'][i % 4]]); }
    const palms = [[-0.9, -0.05], [0.9, -0.05], [-0.62, 0.72], [0.62, 0.72], [0, 0.95]].filter(([u, v]) => !near(u, v) || true);
    return { flowers, palms, rocks: [[-0.45, 0.88], [0.45, -0.86], [0.78, 0.6]] };
  }
  resize(); addEventListener('resize', resize);
  if (DEBUG) window.__hub = { portal: id => { const p = portals.find(q => q.w.id === id), r = cv.getBoundingClientRect(); return [r.left + ox + X(p.u) * sc, r.top + oy + Y(p.v) * sc]; } };
  const toUV = (clientX, clientY) => { const r = cv.getBoundingClientRect(), x = (clientX - r.left - ox) / sc, y = (clientY - r.top - oy) / sc; return [(x - L.cx) / L.rx, (y - L.cy) / L.ry]; };
  cv.addEventListener('pointerdown', e => {
    const [u, v] = toUV(e.clientX, e.clientY);
    const p = portals.find(p => Math.hypot((p.u - u) * L.rx, (p.v - v) * L.ry) < 36);
    if (p) { me.tu = p.u; me.tv = p.v + 22 / L.ry; me.walkTo = p; }
    else if (u * u + v * v <= 0.92) { me.tu = u; me.tv = v; me.walkTo = null; }
    else return;
    room.hubMove(me.u, me.v, me.tu, me.tv);
  });
  // Posiciones de la pareja: normalizadas (n: 1). Las de versiones anteriores (en píxeles de 360×520) se convierten.
  const fromMsg = (x, y, n) => (n ? [x, y] : [(x - 180) / 160, (y - 268) / 236]);
  const offs = [
    room.on('hubpos', m => { if (m.from !== room.partner()?.pid) return; const [u, v] = fromMsg(m.x, m.y, m.n), [tu, tv] = fromMsg(m.tx ?? m.x, m.ty ?? m.y, m.n); other.tu = clamp(tu, -1, 1); other.tv = clamp(tv, -1, 1); if (!other.seen || Math.hypot(other.u - u, other.v - v) > 0.5) { other.u = u; other.v = v; } other.seen = true; }),
    room.on('players', () => { renderTop(); renderPanel(); const p = room.partner(); if (p && !other.seen) { const q = [...app.link.peers.values()].find(z => z.pid === p.pid)?.presence; if (q && Number.isFinite(q.hu)) { other.u = other.tu = q.hu; other.v = other.tv = q.hv; other.seen = true; } } if (!p) other.seen = false; }),
    room.on('status', renderTop),
    room.on('chat', m => { const who = m.mine || m.from === store.profile.pid ? me : other; who.bubble = m.text.slice(0, 40); who.bubbleT = 4; }),
    room.on('emote', m => { const who = m.mine || m.from === store.profile.pid ? me : other; who.bubble = { corazon: '♥', risa: 'jajaja', hola: '¡hola!', beso: '😘' }[m.k] || '♥'; who.bubbleT = 3; }),
    store.on('profile', renderTop), store.on('shared', renderPanel)
  ];
  // si la pareja acaba de llegar, que nos vea donde estamos
  const offJoin = room.on('partner-joined', () => room.hubMove(me.u, me.v, me.tu, me.tv));
  let raf = 0, last = now(), alive = true, lastSent = 0;
  function walk(o, dt) { const du = o.tu - o.u, dv = o.tv - o.v, d = Math.hypot(du, dv), st = SPEED * dt; if (d <= st) { o.u = o.tu; o.v = o.tv; return true; } o.u += du / d * st; o.v += dv / d * st; return false; }
  function frame() {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    const arrived = walk(me, dt); walk(other, dt);
    if (arrived && me.walkTo) { const p = me.walkTo; me.walkTo = null; store.updateProfile(q => { q.hub = { u: me.u, v: me.v }; }); app.world(p.w.id); return; }
    if (t - lastSent > 1000 && (me.u !== me.tu || me.v !== me.tv)) { lastSent = t; room.hubMove(me.u, me.v, me.tu, me.tv); }
    if (arrived && t - lastSent > 4000) { lastSent = t; room.publish({ hu: +me.u.toFixed(3), hv: +me.v.toFixed(3) }); }
    me.bubbleT -= dt; other.bubbleT -= dt;
    draw(t / 1000);
  }
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const dot = (x, y, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  function palm(x, y, T) {
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 4, 16, 5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y - 16, x + 3, y - 30); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(x + 3, y - 30); ctx.rotate(i * 1.26 + Math.sin(T * 1.2 + x) * 0.07); ctx.fillStyle = i % 2 ? '#2f8a3a' : '#43b05a'; ctx.beginPath(); ctx.ellipse(13, 0, 15, 4.5, 0.15, 0, 7); ctx.fill(); ctx.restore(); }
    dot(x + 1, y - 28, 2.4, '#7a4a20'); dot(x + 5, y - 27, 2.4, '#7a4a20');
  }
  function portal(p, T) {
    const x = X(p.u), y = Y(p.v), col = p.w.color, id = p.w.id;
    const gl = ctx.createRadialGradient(x, y, 4, x, y, 50); gl.addColorStop(0, col + '99'); gl.addColorStop(1, col + '00'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 50, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 20, 31, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#cdb68a'; ctx.beginPath(); ctx.ellipse(x, y + 18, 29, 7, 0, 0, 7); ctx.fill();
    const arch = (w, h, fill) => { ctx.beginPath(); ctx.moveTo(x - w, y + 18); ctx.lineTo(x - w, y - h + w); ctx.arc(x, y - h + w, w, Math.PI, 0); ctx.lineTo(x + w, y + 18); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const frame = { huevo: '#ffcf4a', escape: '#8a5a35', bomba: '#5a6074', detective: '#3a3354', aventura: '#7a5236', mini: '#5532b0' }[id] || col;
    arch(24, 48, frame);
    const inner = ctx.createLinearGradient(0, y - 36, 0, y + 18); inner.addColorStop(0, col); inner.addColorStop(1, '#1a1438');
    ctx.globalAlpha = 0.75 + 0.2 * Math.sin(T * 2 + x); arch(17, 42, inner); ctx.globalAlpha = 1;
    if (id === 'huevo') { ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.ellipse(x, y - 31 + Math.sin(T * 2) * 1.5, 7, 9, 0, 0, 7); ctx.fill(); }
    else if (id === 'escape') { dot(x + 9, y, 2.5, '#ffcf4a'); ctx.fillStyle = '#1a0f08'; ctx.fillRect(x + 8, y + 3, 2, 5); ctx.strokeStyle = '#6b4224'; ctx.lineWidth = 2; ctx.strokeRect(x - 12, y - 18, 24, 14); }
    else if (id === 'bomba') { dot(x, y - 27, 4, Math.sin(T * 6) > 0 ? '#ff4d5e' : '#5a1a22'); for (let i = -2; i <= 2; i++) dot(x + i * 9, y + 12, 1.6, '#8a90a8'); }
    else if (id === 'detective') { ctx.strokeStyle = '#fff1d6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x - 2, y - 10, 7, 0, 7); ctx.moveTo(x + 3, y - 5); ctx.lineTo(x + 9, y + 1); ctx.stroke(); }
    else if (id === 'aventura') { for (const sx of [-28, 28]) { ctx.strokeStyle = '#5b3a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + sx, y + 18); ctx.lineTo(x + sx, y - 14); ctx.stroke(); const fl = 4 + Math.sin(T * 10 + sx) * 1.5; ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.ellipse(x + sx, y - 18, 3.5, fl, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff6b57'; ctx.beginPath(); ctx.ellipse(x + sx, y - 16, 2, fl * 0.6, 0, 0, 7); ctx.fill(); } }
    else if (id === 'mini') { const cols = ['#ff6b57', '#ffcf4a', '#2ed3b7', '#4ea8ff']; for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; dot(x + Math.cos(a) * 21, y - 24 + Math.sin(a) * 21, 2.2, cols[(i + Math.floor(T * 4)) % 4]); } }
    ctx.font = '900 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(p.w.name).width + 22; rr(x - tw / 2, y + 28, tw, 22, 11); ctx.fillStyle = 'rgba(12,8,30,.85)'; ctx.fill();
    dot(x - tw / 2 + 10, y + 39, 3.5, col); ctx.fillStyle = '#fbf6ff'; ctx.fillText(p.w.name, x + 4, y + 39.5); ctx.textBaseline = 'alphabetic';
  }
  function draw(T) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#163a7a'); g.addColorStop(1, '#241a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    const cx = L.cx, cy = L.cy, rx = L.rx, ry = L.ry;
    ctx.strokeStyle = 'rgba(160,210,255,.16)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + 4, rx + 22 + i * 16 + Math.sin(T * 0.9 + i) * 3, ry + 22 + i * 16 + Math.sin(T * 0.9 + i) * 3, 0, 0, 7); ctx.stroke(); }
    for (let i = 0; i < 14; i++) { const a = (i * 2.4 + T * 0.15) % (Math.PI * 2), k = 1.25 + (i % 4) * 0.12; dot(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, 1.4, `rgba(255,255,255,${0.25 + 0.25 * Math.sin(T * 3 + i)})`); }
    ctx.fillStyle = '#e9cf92'; ctx.beginPath(); ctx.ellipse(cx, cy + 8, rx + 14, ry + 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d7b87a'; ctx.beginPath(); ctx.ellipse(cx, cy + 14, rx + 8, ry + 6, 0, 0, Math.PI); ctx.fill();
    const grass = ctx.createRadialGradient(cx - 10, cy - 40, 30, cx, cy, Math.max(rx, ry) * 1.05); grass.addColorStop(0, '#79cc5c'); grass.addColorStop(1, '#4a9a44');
    ctx.fillStyle = grass; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 60; i++) { const u = ((i * 0.737) % 1) * 2 - 1, v = ((i * 0.419 + 0.2) % 1) * 2 - 1; if (u * u + v * v < 0.9) { const x = X(u), y = Y(v); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.lineTo(x + 4, y); ctx.fill(); } }
    for (const p of portals) { const n = 7, px = X(p.u), py = Y(p.v) + 16; for (let i = 1; i < n; i++) { const u = i / n, x = cx + (px - cx) * u, y = cy + 8 + (py - cy - 8) * u; ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 9, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e2d2a8'; ctx.beginPath(); ctx.ellipse(x, y, 9, 5, 0, 0, 7); ctx.fill(); } }
    for (const [u, v, c] of deco.flowers) { dot(X(u), Y(v), 2.3, c); dot(X(u), Y(v), 0.9, '#fff3b8'); }
    for (const [u, v] of deco.rocks) { const x = X(u), y = Y(v); ctx.fillStyle = '#8a8098'; ctx.beginPath(); ctx.ellipse(x, y, 10, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a69dbb'; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 6, 3, 0, 0, 7); ctx.fill(); }
    const ny = cy - 6, eg = ctx.createRadialGradient(cx, ny, 4, cx, ny, 62); eg.addColorStop(0, 'rgba(255,207,74,.45)'); eg.addColorStop(1, 'rgba(255,207,74,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, ny, 62, 0, 7); ctx.fill();
    ctx.lineWidth = 5; for (let i = 0; i < 7; i++) { ctx.strokeStyle = i % 2 ? '#7a4a20' : '#a8703a'; ctx.beginPath(); ctx.ellipse(cx, ny + 18, 42 - i * 3, 14 - (i % 3), (i - 3) * 0.05, 0, Math.PI); ctx.stroke(); }
    const egg = ctx.createRadialGradient(cx - 5, ny - 8, 2, cx, ny, 20); egg.addColorStop(0, '#fffaf0'); egg.addColorStop(1, '#e7cfa6');
    ctx.fillStyle = egg; ctx.beginPath(); ctx.ellipse(cx, ny + 2 + Math.sin(T * 2) * 1.5, 15, 19, 0, 0, 7); ctx.fill();
    for (const [u, v] of deco.palms) palm(X(u), Y(v), T);
    // letrero de la isla (encima de todo lo del suelo)
    const sy = Math.max(4, cy - ry - 30);
    ctx.font = '400 21px Chango, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rr(cx - 70, sy, 140, 32, 12); ctx.fillStyle = '#5b3a22'; ctx.fill(); rr(cx - 70, sy, 140, 28, 12); ctx.fillStyle = '#8a5a35'; ctx.fill();
    ctx.fillStyle = '#2a170c'; ctx.fillText('Isla Nido', cx + 1, sy + 16); ctx.fillStyle = '#fff1d6'; ctx.fillText('Isla Nido', cx, sy + 14.5); ctx.textBaseline = 'alphabetic';
    for (const p of portals) portal(p, T);
    const partner = room.partner();
    const actors = [[me, store.profile.avatar, store.profile.name || 'Tú', true]]; if (partner && other.seen) actors.push([other, partner.avatar, partner.name, false]);
    actors.sort((a, b) => a[0].v - b[0].v);
    for (const [o, av, name, mine] of actors) {
      const x = X(o.u), y = Y(o.v), moving = o.u !== o.tu || o.v !== o.tv;
      if (moving && av.trail && av.trail !== 'ninguno') { o.trailT = (o.trailT || 0) + 1; if (o.trailT % 5 === 0) (o.trailP = o.trailP || []).push({ x, y: y + 8, life: 1, k: av.trail }); }
      if (o.trailP) for (let i = o.trailP.length - 1; i >= 0; i--) { const q = o.trailP[i]; q.life -= 0.025; q.y -= 0.3; if (q.life <= 0) { o.trailP.splice(i, 1); continue; } ctx.globalAlpha = q.life; if (q.k === 'corazones') { ctx.fillStyle = '#ff6b8a'; ctx.font = '12px sans-serif'; ctx.fillText('♥', q.x, q.y); } else dot(q.x, q.y, 2.4, q.k === 'arcoiris' ? `hsl(${(q.x * 3 + T * 120) % 360},90%,65%)` : '#ffe27a'); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 20, 15, 4.5, 0, 0, 7); ctx.fill();
      const blink = (Math.sin(T * 1.7 + (mine ? 0 : 2)) > 0.985) ? 1 : 0;
      drawBirdAvatar(ctx, x, y - (moving ? Math.abs(Math.sin(T * 12)) * 3 : Math.sin(T * 2) * 0.8), av, { face: o.tu >= o.u ? 1 : -1, flap: moving ? T * 14 : 0.6, label: name, labelColor: mine ? '#ffcf4a' : '#fbf6ff', blink, scale: 1.15 });
      if (o.bubble && o.bubbleT > 0) { ctx.font = '800 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'left'; const tw = ctx.measureText(o.bubble).width + 18, bx = clamp(x - tw / 2, 4, L.PW - tw - 4), by = y - 78; ctx.globalAlpha = Math.min(1, o.bubbleT); rr(bx, by, tw, 27, 12); ctx.fillStyle = '#fff1d6'; ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 5, by + 26); ctx.lineTo(x, by + 33); ctx.lineTo(x + 5, by + 26); ctx.fill(); ctx.fillStyle = '#1a1430'; ctx.fillText(o.bubble, bx + 9, by + 18); ctx.globalAlpha = 1; }
    }
  }
  raf = requestAnimationFrame(frame);
  screen._destroy = () => { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); offs.forEach(f => f()); offJoin(); };
  setTimeout(() => room.hubMove(me.u, me.v, me.tu, me.tv), 300);
}

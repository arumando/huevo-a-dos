// Huevo a Dos dentro de la plataforma: modos de un teléfono, anfitrión e invitado.
import { K, compileLevel, newWorld, step, spawn, place, moveBird } from './engine.js';
import { createRenderer } from './render.js';
import { LEVELS, levelById, SCENARIOS } from './levels.js';
import { createRemoteBird, acceptInput, followRemote, createSnapBuffer, pushSnap, sample, r1 } from './sync.js';
import { h, now, clamp, fmtTime, DEBUG, setKids } from '../../core/util.js';
import { sfx, unlock } from '../../core/audio.js';
import { svgIcon } from '../../ui/icons.js';
import { celebrate } from '../../ui/fx.js';
import { helpContent } from '../../ui/worlds.js';

const SENS = 1.15, TEAL = { body: '#3cc9b5', belly: '#b5f0e6', hat: 'ninguno', eyes: 'normal' };

export function mount(root, ctx) {
  const { session } = ctx, role = session.role;
  const isHost = role === 'host', isGuest = role === 'guest', isLocal = role === 'local';
  let lvDef = levelById(session.opts.level) || LEVELS[0], lv = compileLevel(lvDef), mode = session.opts.mode === 'extremo' ? 'extremo' : 'normal';
  let w = newWorld(lv, mode);
  if (session.opts.resume && !isGuest) applyResume(session.opts.resume);
  const parts = [];
  let ready = !isGuest, paused = false, waiting = false, destroyed = false, raf = 0, last = now(), acc = 0, uiT = 0, hintT = isLocal ? 6 : 0;

  // ---------- DOM ----------
  const cv = h('canvas', { class: 'hv-canvas', 'aria-label': 'Huevo a Dos: dos pájaros cargan un huevo con una cuerda' });
  const hAlt = h('span', null, '0 m'), hDeaths = h('span', null, '0'), hTime = h('span', null, '0:00'), pill = h('div', { class: 'pill', hidden: isLocal });
  const banT = h('b'), banS = h('span'), banner = h('div', { class: 'hv-banner', hidden: true }, banT, banS);
  const overlay = h('div', { class: 'overlay', hidden: true });
  const btnHeart = h('button', { class: 'fab-heart', hidden: isLocal, 'aria-label': 'Mandar un corazón', onclick: () => { unlock(); heartFx(myBird()); session.send('heart', {}); ctx.progress.stat('hearts', 1); } }, svgIcon('heart', 30));
  const openHelp = () => ctx.ui.sheet('Cómo se juega: Huevo a Dos', () => helpContent('huevo'), { ephemeral: true });
  const hud = h('div', { class: 'hv-hud' },
    h('div', { class: 'hud-row' },
      stat('Altura', hAlt), stat('Rotos', hDeaths), stat('Tiempo', hTime),
      h('button', { class: 'hud-btn', 'aria-label': 'Cómo se juega', onclick: () => openHelp() }, svgIcon('help')),
      h('button', { class: 'hud-btn', 'aria-label': 'Pausa y menú', onclick: openMenu }, svgIcon('pause'))),
    pill);
  root.append(h('div', { class: 'hv-root' }, cv, hud, btnHeart, banner, overlay));
  function stat(l, v) { return h('div', { class: 'stat' }, h('span', { class: 'lbl' }, l), v); }
  const R = createRenderer(cv); R.resize();
  const onResize = () => R.resize(); addEventListener('resize', onResize);

  // Si los dos eligieron el mismo color, el pájaro de la pareja se ve con un color que contraste.
  const myAv = ctx.store.profile.avatar, partnerAv = () => { const p = session.partner ? session.partner.avatar : TEAL; return p.body === myAv.body ? { ...p, ...(myAv.body === TEAL.body ? { body: '#ff7a59', belly: '#ffc2ad' } : { body: TEAL.body, belly: TEAL.belly }) } : p; };
  const avA = () => (isLocal ? myAv : isHost ? myAv : partnerAv()), avB = () => (isLocal ? (myAv.body === TEAL.body ? { ...TEAL, body: '#ff7a59', belly: '#ffc2ad' } : TEAL) : isHost ? partnerAv() : myAv);
  const myBird = () => (isGuest ? w.B : w.A);

  // ---------- red ----------
  const remote = createRemoteBird(), snaps = createSnapBuffer();
  let myRs = -1, lastSnapSent = 0, lastInSent = 0, lastInKey = '', lastMeta = '';
  const toLocal = t => session.toLocalTime(t);
  if (isHost) {
    session.on('in', m => acceptInput(remote, m, toLocal));
    session.on('hello', () => sendFull());
    session.on('req', m => { if (m && m.k === 'restart') restartLevel(); else if (m && m.k === 'next') nextLevel(); else if (m && m.k === 'retry') loadLevel(lvDef.id); });
    session.onEvent('rejoin', () => { sendFull(); if (waiting) { waiting = false; hideOverlay(); spawnKeep(); showBanner('¡Tu pareja volvió!', '', 1600); } });
    session.onEvent('partner-left', disc => { waiting = true; showWaiting(disc ? 'Tu pareja se desconectó' : 'Tu pareja salió del juego', 'La subida queda en pausa. Si vuelve a entrar, siguen desde la última bandera.'); });
  }
  if (isGuest) {
    session.on('s', m => { if (pushSnap(snaps, m, toLocal) && Array.isArray(m.cr)) w.crumble = m.cr.map(s => ({ s, at: 0 })); });
    session.on('full', m => applyFull(m));
    session.on('ev', m => onHostEvent(m));
    session.onEvent('host-left', disc => { if (disc) showWaiting('Tu pareja se desconectó', 'Esperando a que vuelva…'); });
    session.onEvent('partner-back', () => { if (!overlay.hidden && !ready) return; hideOverlay(); });
    session.onEvent('partner-back', () => { session.send('hello', {}); });
    session.send('hello', {});
    showWaiting('Conectando con tu pareja…', '');
  }
  session.on('heart', () => heartFx(isGuest ? w.A : w.B));

  function sendFull() {
    session.send('full', { level: lvDef.id, mode, cp: w.cp, deaths: w.deaths, time: r1(w.time), st: w.st, rs: w.rs, bp: [r1(w.B.x), r1(w.B.y)], a: [r1(w.A.x), r1(w.A.y)], e: [r1(w.egg.x), r1(w.egg.y)], wt: w.t });
  }
  function applyFull(m) {
    if (!m || typeof m.level !== 'string') return;
    if (m.level !== lvDef.id || m.mode !== mode) { lvDef = levelById(m.level) || lvDef; lv = compileLevel(lvDef); mode = m.mode === 'extremo' ? 'extremo' : 'normal'; w = newWorld(lv, mode); snaps.buf.length = 0; snaps.lastT = -1; }
    Object.assign(w, { cp: +m.cp || 0, deaths: +m.deaths || 0, time: +m.time || 0, st: ['play', 'crack', 'win'].includes(m.st) ? m.st : 'play', rs: +m.rs || 0, t: +m.wt || 0 });
    if (Array.isArray(m.bp)) place(w.B, m.bp[0], m.bp[1]); myRs = w.rs;
    if (Array.isArray(m.a)) place(w.A, m.a[0], m.a[1]);
    if (Array.isArray(m.e)) Object.assign(w.egg, { x: m.e[0], y: m.e[1] });
    ready = true; hideOverlay(); if (w.st === 'win') showWin();
  }
  function onHostEvent(m) {
    if (!m || !ready) return;
    if (m.k === 'crack') { w.st = 'crack'; w.deaths = +m.deaths || w.deaths + 1; crackFx(m.x, m.y); }
    else if (m.k === 'respawn') { w.st = 'play'; w.rs = m.rs; w.cp = +m.cp || 0; if (Array.isArray(m.bp)) place(w.B, m.bp[0], m.bp[1]); myRs = m.rs; snaps.buf.length = 0; disp.has = false; }
    else if (m.k === 'cp') { w.cp = m.i; cpFx(); }
    else if (m.k === 'win') { w.st = 'win'; w.time = +m.time || w.time; w.deaths = +m.deaths || 0; winFx(); }
    else if (m.k === 'load') applyFull(m.full);
  }
  function hostEvent(m) { if (isHost) session.send('ev', m); }

  // ---------- control táctil ----------
  const ptrs = new Map();
  cv.addEventListener('pointerdown', e => { unlock(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} const r = cv.getBoundingClientRect(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, who: isLocal ? (e.clientX - r.left < r.width / 2 ? 'A' : 'B') : isHost ? 'A' : 'B' }); });
  cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const b = w[p.who]; b.tx += (e.clientX - p.x) / R.sc * SENS; b.ty -= (e.clientY - p.y) / R.sc * SENS; p.x = e.clientX; p.y = e.clientY; });
  const endP = e => ptrs.delete(e.pointerId); cv.addEventListener('pointerup', endP); cv.addEventListener('pointercancel', endP);
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  const keys = new Set(); const kd = e => keys.add(e.key.toLowerCase()), ku = e => keys.delete(e.key.toLowerCase());
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  function keyInput(dt) {
    const v = 360 * dt, pad = (b, u, d, l, r) => { if (keys.has(u)) b.ty += v; if (keys.has(d)) b.ty -= v; if (keys.has(l)) b.tx -= v; if (keys.has(r)) b.tx += v; };
    if (isLocal) { pad(w.A, 'w', 's', 'a', 'd'); pad(w.B, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'); }
    else { const b = myBird(); pad(b, 'w', 's', 'a', 'd'); pad(b, 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'); }
  }

  // ---------- simulación ----------
  let gacc = 0, lastLive = now(), rsWait = 0; const disp = { has: false };
  function hostStep(dt) {
    if (isHost) followRemote(w, w.B, remote, dt);
    step(w, dt, { moveA: true, moveB: isLocal });
    for (const ev of w.events) {
      if (ev.k === 'crack') { crackFx(ev.x, ev.y); hostEvent({ k: 'crack', x: r1(ev.x), y: r1(ev.y), deaths: w.deaths }); if (DEBUG) (window.__cracks = window.__cracks || []).push({ why: ev.why, t: Math.round(w.time * 10) / 10, egg: [r1(w.egg.vx), r1(w.egg.vy)], A: [r1(w.A.vx), r1(w.A.vy)], B: [r1(w.B.vx), r1(w.B.vy)], Bpos: [r1(w.B.x), r1(w.B.y)], R: [r1(remote.x), r1(remote.y), r1(remote.vx), r1(remote.vy), Math.round(now() - remote.tl)] }); }
      else if (ev.k === 'cp') { cpFx(); hostEvent({ k: 'cp', i: ev.i }); saveLive(); }
      else if (ev.k === 'win') { hostEvent({ k: 'win', time: r1(w.time), deaths: w.deaths }); winFx(); }
      else if (ev.k === 'respawn') hostEvent({ k: 'respawn', rs: w.rs, cp: w.cp, bp: [r1(w.B.x), r1(w.B.y)] });
      else if (ev.k === 'bounce') bounceFx(ev.v);
    }
    w.events.length = 0;
  }
  function guestFrame(dt) {
    const smp = sample(snaps, dt);
    if (smp) {
      // Suavizado visual: si llega un dato que corrige la posición, se acerca en ~50 ms en lugar de saltar.
      w.t = smp.wt; const e = w.egg, A = w.A, k = 1 - Math.exp(-dt * 22), first = !disp.has;
      const blend = (o, x, y, vx, vy) => { if (first || Math.hypot(x - o.x, y - o.y) > 90) { o.x = x; o.y = y; } else { o.x += vx * dt; o.y += vy * dt; o.x += (x - o.x) * k; o.y += (y - o.y) * k; } o.vx = vx; o.vy = vy; };
      blend(e, smp.e[0], smp.e[1], smp.e[2], smp.e[3]); e.rot = smp.e[4]; blend(A, smp.a[0], smp.a[1], smp.a[2], smp.a[3]); disp.has = true;
      if (smp.src.rs > myRs) { if (!rsWait) rsWait = now(); else if (now() - rsWait > 1500) { session.send('hello', {}); rsWait = 0; } } else rsWait = 0;
    }
    gacc += dt; while (gacc >= K.DT) { moveBird(w, w.B, w.A, K.DT); gacc -= K.DT; }
    sendInput();
  }
  function sendInput() {
    const t = now(), iv = session.via() === 'p2p' ? 33 : 50, B = w.B, key = r1(B.x) + ',' + r1(B.y) + ',' + myRs;
    const moving = Math.hypot(B.vx, B.vy) > 2;
    if ((t - lastInSent >= iv && (moving || key !== lastInKey)) || t - lastInSent > 250) {
      session.send('in', { t, b: [r1(B.x), r1(B.y), r1(B.vx), r1(B.vy)], rs: myRs }, { fast: true });
      lastInSent = t; lastInKey = key;
    }
  }
  function sendSnap() {
    const t = now(), sp = o => Math.hypot(o.vx, o.vy);
    const idle = w.st !== 'play' || (sp(w.egg) < 3 && sp(w.A) < 3 && sp(w.B) < 3);
    const iv = idle ? 200 : session.via() === 'p2p' ? 33 : 50;
    if (t - lastSnapSent < iv) return;
    lastSnapSent = t; const e = w.egg, A = w.A;
    const m = { t, e: [r1(e.x), r1(e.y), r1(e.vx), r1(e.vy), Math.round(e.rot * 100) / 100], a: [r1(A.x), r1(A.y), r1(A.vx), r1(A.vy)], wt: Math.round(w.t * 1000) / 1000, st: w.st, rs: w.rs };
    if (lv.crumbles.length) m.cr = w.crumble.map(c => c.s);
    session.send('s', m, { fast: true });
  }

  // ---------- efectos ----------
  function crackFx(x, y) {
    sfx.crack(); ctx.progress.stat('eggs', 1);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * Math.random()), v = 140 + Math.random() * 180; parts.push({ k: 'shard', x, y, vx: Math.cos(a) * v * (Math.random() < .5 ? -1 : 1), vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - .5) * 14, life: 1.3, s: 4 + Math.random() * 5 }); }
    parts.push({ k: 'yolk', x, y, life: 1.4, vx: 0, vy: 0 });
    showBanner('¡Crack!', mode === 'extremo' ? 'De vuelta hasta abajo…' : 'Otra vez desde la bandera', 1300);
  }
  function cpFx() { sfx.ok(); showBanner('Bandera alcanzada', 'Si se rompe, siguen desde aquí', 1600); }
  let lastBounce = 0;
  function bounceFx(v) { const t = now(); if (t - lastBounce < 90) return; lastBounce = t; }
  function heartFx(b) { sfx.heart(); parts.push({ k: 'heart', x: b.x, y: b.y + 10, vx: (Math.random() - .5) * 30, vy: 70, life: 1.6 }); }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.k === 'shard') { p.vy -= K.G * 0.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; } else if (p.k === 'heart' || p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt; } }
  }
  let banTimer = 0;
  function showBanner(t, s, ms) { banT.textContent = t; banS.textContent = s || ''; banner.hidden = false; clearTimeout(banTimer); banTimer = setTimeout(() => { banner.hidden = true; }, ms); }

  // ---------- progreso ----------
  function applyResume(r) {
    if (!r || r.level !== lvDef.id) return;
    w.cp = mode === 'normal' ? clamp(+r.cp || 0, 0, lv.cps.length - 1) : 0; w.deaths = +r.deaths || 0; w.time = +r.time || 0; spawn(w);
  }
  function saveLive() {
    if (isGuest) return; lastLive = now();
    ctx.store.updateShared(s => { s.live = { game: 'huevo', level: lvDef.id, mode, cp: w.cp, deaths: w.deaths, time: r1(w.time), at: Date.now() }; });
  }
  function medalsFor() { const par = lvDef.par || 300; return 1 + (w.deaths <= 1 ? 1 : 0) + (w.time <= par ? 1 : 0); }
  let rewarded = '';
  function winFx() {
    sfx.win(); celebrate('big'); w.st = 'win';
    for (let i = 0; i < 24; i++) parts.push({ k: 'heart', x: 120 + Math.random() * 120, y: w.egg.y + Math.random() * 40, vx: (Math.random() - .5) * 120, vy: 60 + Math.random() * 120, life: 2 + Math.random() });
    const key = session.id + lvDef.id + w.rs;
    let gained = { xp: 0, coins: 0 };
    if (rewarded !== key) {
      rewarded = key; const medals = medalsFor(), idx = LEVELS.indexOf(lvDef);
      ctx.store.updateShared(s => {
        const L = s.huevo.levels[lvDef.id] || (s.huevo.levels[lvDef.id] = {});
        L.done = true; L.medals = Math.max(L.medals || 0, medals); L.plays = (L.plays || 0) + 1;
        L.bestTime = Math.min(L.bestTime || 1e9, Math.round(w.time * 10) / 10); L.minEggs = Math.min(L.minEggs ?? 1e9, w.deaths);
        if (mode === 'extremo') L.extremo = true;
        if (!isGuest) s.live = { game: null, at: Date.now() };
      });
      gained = ctx.progress.reward({ xp: 60 + idx * 12 + (mode === 'extremo' ? 60 : 0), coins: 10 + medals * 6 + (mode === 'extremo' ? 20 : 0) });
      ctx.progress.stat('nidos', 1); ctx.progress.mission('nidos', 1);
      if (w.deaths === 0) ctx.progress.unlock('sin-romper');
      if (mode === 'extremo') ctx.progress.unlock('eggstremo');
      ctx.progress.unlock('primer-nido');
      if (lvDef.scenario !== 'acantilado') ctx.progress.unlock('explorador-' + lvDef.scenario);
      ctx.progress.record({ id: session.id + '.' + lvDef.id, game: 'huevo', title: lvDef.name, result: 'win', detail: fmtTime(w.time) + ' · ' + w.deaths + ' rotos' + (mode === 'extremo' ? ' · Eggstremo' : '') });
    }
    showWin(gained);
  }

  // ---------- pantallas superpuestas ----------
  function setOverlay(...kids) { setKids(overlay, h('div', { class: 'card' }, ...kids)); overlay.hidden = false; }
  function hideOverlay() { overlay.hidden = true; setKids(overlay, ); paused = false; }
  function showWaiting(title, sub) {
    setOverlay(h('h2', null, title), sub && h('p', { class: 'note' }, sub), h('p', { class: 'waiting' }, h('span', { class: 'dot' }), 'Esperando…'),
      isHost && h('button', { class: 'btn', onclick: () => ctx.reinvite() }, 'Invitar de nuevo'),
      h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir'));
  }
  function nextLevelDef() { const i = LEVELS.indexOf(lvDef); return LEVELS[i + 1] || null; }
  function showWin(g = {}) {
    const medals = medalsFor(), nx = nextLevelDef();
    setOverlay(
      h('p', { class: 'eyebrow' }, lvDef.name), h('h2', null, '¡Lo lograron!'),
      h('div', { class: 'medals', 'aria-label': medals + ' de 3 medallas' }, [1, 2, 3].map(i => h('span', { class: i <= medals ? 'on' : '' }, '★'))),
      h('div', { class: 'stats' }, h('div', null, h('span', { class: 'lbl' }, 'Tiempo'), h('b', null, fmtTime(w.time))), h('div', null, h('span', { class: 'lbl' }, 'Huevos rotos'), h('b', null, w.deaths))),
      (g.coins || g.xp) && h('p', { class: 'reward' }, `+${g.xp} XP · +${g.coins} monedas`),
      h('p', { class: 'note' }, 'Medallas: llegar al nido, romper 1 huevo o menos, y terminar en menos de ' + fmtTime(lvDef.par || 300) + '.'),
      nx && h('button', { class: 'btn primary', onclick: () => { if (isGuest) { session.send('req', { k: 'next' }); ctx.ui.toast('Le pediste a tu pareja el siguiente nivel'); } else nextLevel(); } }, 'Siguiente: ' + nx.name),
      h('button', { class: 'btn', onclick: () => { if (isGuest) session.send('req', { k: 'retry' }); else loadLevel(lvDef.id); } }, 'Repetir nivel'),
      h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir'));
  }
  function openMenu() {
    paused = isLocal;
    setOverlay(h('h2', null, 'Pausa'), h('p', { class: 'note' }, lvDef.name + (mode === 'extremo' ? ' · Eggstremo' : ' · Normal') + (isLocal ? '' : ' · El juego sigue corriendo para tu pareja.')),
      h('button', { class: 'btn primary', onclick: hideOverlay }, svgIcon('play', 18), 'Seguir jugando'),
      h('button', { class: 'btn', onclick: () => { hideOverlay(); openHelp(); } }, svgIcon('help', 18), 'Cómo se juega'),
      h('button', { class: 'btn', onclick: () => { hideOverlay(); if (isGuest) { session.send('req', { k: 'restart' }); ctx.ui.toast('Le pediste a tu pareja reiniciar el nivel'); } else restartLevel(); } }, isGuest ? 'Pedir reiniciar el nivel' : 'Reiniciar el nivel'),
      h('button', { class: 'btn ghost', onclick: () => ctx.exit() }, 'Salir al mundo'));
  }
  function loadLevel(id) {
    lvDef = levelById(id) || lvDef; lv = compileLevel(lvDef); w = newWorld(lv, mode); w.rs = Math.floor(Math.random() * 1e6);
    parts.length = 0; hideOverlay(); acc = 0;
    hostEvent({ k: 'load', full: { level: lvDef.id, mode, cp: 0, deaths: 0, time: 0, st: 'play', rs: w.rs, bp: [r1(w.B.x), r1(w.B.y)], a: [r1(w.A.x), r1(w.A.y)], e: [r1(w.egg.x), r1(w.egg.y)], wt: 0 } });
    showBanner(lvDef.name, SCENARIOS.find(s => s.id === lvDef.scenario)?.name || '', 2200);
    saveLive();
  }
  function restartLevel() { loadLevel(lvDef.id); }
  function nextLevel() { const nx = nextLevelDef(); if (nx) loadLevel(nx.id); }
  function spawnKeep() { spawn(w); hostEvent({ k: 'respawn', rs: w.rs, cp: w.cp, bp: [r1(w.B.x), r1(w.B.y)] }); }

  function updateHud() {
    hAlt.textContent = Math.round(Math.max(0, w.egg.y) / 10) + ' / ' + lv.altMax + ' m';
    hDeaths.textContent = w.deaths; hTime.textContent = fmtTime(w.time);
    if (!isLocal) {
      const p = session.partner, rtt = session.rtt();
      pill.className = 'pill ' + (p ? 'ok' : 'bad');
      pill.textContent = p ? (session.via() === 'p2p' ? 'Conexión directa' : 'Por servidor') + (rtt ? ' · ' + Math.round(rtt) + ' ms' : '') : 'Tu pareja no está conectada';
    }
  }
  const view = () => ({ lv, t: w.t, A: w.A, B: w.B, egg: w.egg, st: w.st, cp: w.cp, mode, crumble: w.crumble.map(c => c.s), parts, avA: avA(), avB: avB(), me: isLocal ? '' : isHost ? 'A' : 'B', hint: hintT > 0 ? Math.min(1, hintT / 2) : 0 });

  // ---------- bucle ----------
  function frame() {
    if (destroyed) return; raf = requestAnimationFrame(frame);
    const t = now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!paused) keyInput(dt);
    if (!isGuest) {
      if (!paused && !waiting) { acc += dt; while (acc >= K.DT) { hostStep(K.DT); acc -= K.DT; } } else acc = 0;
      if (isHost && !waiting) sendSnap();
      if (w.st === 'play' && t - lastLive > 20000) saveLive();
    } else if (ready) guestFrame(dt);
    if (hintT > 0 && w.st === 'play') hintT -= dt;
    stepParts(dt);
    R.follow(w.egg.y, lv.top, dt);
    R.draw(view(), t);
    uiT -= dt; if (uiT <= 0) { uiT = 0.2; updateHud(); }
  }
  if (!ctx.store.profile.seenHelp?.huevo) { openHelp(); ctx.store.updateProfile(p => { p.seenHelp = { ...(p.seenHelp || {}), huevo: 1 }; }); }
  if (!isGuest) showBanner(lvDef.name, isLocal ? 'Un dedo de cada lado: el izquierdo mueve un pájaro y el derecho al otro' : 'Arrastra el dedo en cualquier parte para mover tu pájaro', 2800);
  if (isHost) sendFull();
  const onHide = () => { if (!isGuest && w.st === 'play') saveLive(); }; addEventListener('pagehide', onHide);
  raf = requestAnimationFrame(frame);
  if (DEBUG) window.__S = { get egg() { return w.egg; }, get A() { return w.A; }, get B() { return w.B; }, get st() { return w.st; }, get deaths() { return w.deaths; }, get rs() { return w.rs; }, get D() { return snaps.D; }, get via() { return session.via(); }, get level() { return lvDef.id; }, get remoteRs() { return remote.rs; }, setCp(i) { w.cp = i; spawn(w); saveLive(); }, get myRs() { return myRs; }, get cp() { return w.cp; }, load: id => loadLevel(id) };

  return {
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); clearTimeout(banTimer);
      removeEventListener('resize', onResize); removeEventListener('pagehide', onHide); removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      if (!isGuest && w.st === 'play') saveLive();
      if (DEBUG) delete window.__S;
    }
  };
}

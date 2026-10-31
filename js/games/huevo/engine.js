// Motor físico de Huevo a Dos. Es puro (no dibuja ni usa la red): lo usan el anfitrión, el modo de un teléfono y las pruebas.
// Mundo: ancho 360, la y crece hacia arriba. Las físicas originales (pájaros, cuerda, huevo) se conservan tal cual.
export const K = { W: 360, G: 900, ER: 13, BR: 13, ROPE_MAX: 190, ROPE_MIN: 46, BSPEED: 420, BACC: 2300, CRACK_ROPE: 520, CRACK_WALL: 470, DT: 1 / 120 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const MAT = { stone: { f: 0.03, e: 0.3, crack: 1 }, ice: { f: 0.0015, e: 0.25, crack: 1 }, wood: { f: 0.05, e: 0.3, crack: 1 }, cloud: { f: 0.04, e: 0.55, crack: 1.35 }, crystal: { f: 0.02, e: 0.35, crack: 1 }, rock: { f: 0.035, e: 0.3, crack: 1 } };

// Convierte la definición compacta de un nivel en estructuras listas para simular.
export function compileLevel(L) {
  const lv = { ...L, walls: [], spikes: [], saws: [], movers: [], faders: [], crumbles: [], hidden: [], winds: [], lava: [], fireballs: [], slopes: [], bridges: [] };
  const top = L.top;
  const W = (x, y, w, h, mat) => lv.walls.push({ x, y, w, h, mat: mat || L.mat || 'stone' });
  W(-80, -400, 520, 400); W(-80, -400, 80, top + 800); W(360, -400, 80, top + 800); W(-80, top + 180, 520, 300);
  for (const a of L.walls || []) W(a[0], a[1], a[2], a[3], a[4]);
  for (const a of L.spikes || []) lv.spikes.push({ x: a[0], y: a[1], w: a[2], h: a[3], dir: a[4] || 'u' });
  for (const a of L.saws || []) lv.saws.push({ cx: a[0], cy: a[1], r: a[2], ax: a[3], ay: a[4], per: a[5], ph: a[6] || 0 });
  for (const a of L.movers || []) lv.movers.push({ x: a[0], y: a[1], w: a[2], h: a[3], ax: a[4], ay: a[5], per: a[6], ph: a[7] || 0, mat: a[8] || L.mat || 'stone' });
  for (const a of L.faders || []) lv.faders.push({ x: a[0], y: a[1], w: a[2], h: a[3], on: a[4], off: a[5], ph: a[6] || 0, mat: a[7] || 'rock' });
  for (const a of L.crumbles || []) lv.crumbles.push({ x: a[0], y: a[1], w: a[2], h: a[3], mat: a[4] || L.mat || 'stone' });
  for (const a of L.hidden || []) lv.hidden.push({ x: a[0], y: a[1], w: a[2], h: a[3], mat: a[4] || 'crystal' });
  for (const a of L.winds || []) lv.winds.push({ x: a[0], y: a[1], w: a[2], h: a[3], fx: a[4], fy: a[5], per: a[6] || 3, ph: a[7] || 0 });
  for (const a of L.lava || []) lv.lava.push({ x: a[0], y: a[1], w: a[2], h: a[3] });
  for (const a of L.fireballs || []) lv.fireballs.push({ cx: a[0], cy: a[1], h: a[2], per: a[3], ph: a[4] || 0, r: 11 });
  for (const a of L.slopes || []) lv.slopes.push({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], mat: a[4] || L.mat || 'stone' });
  for (const a of L.bridges || []) lv.bridges.push({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], sag: a[4] || 20, n: a[5] || 7 });
  const n = L.nest; lv.nestBox = { x0: n.x - 34, x1: n.x + 34, y0: n.y + K.ER - 7, y1: n.y + K.ER + 30 };
  if (!L.noNestWall) W(n.x - 50, n.y - 20, 100, 20, L.nestMat || L.mat);
  lv.cps = (L.cps || [0]).map(c => (Array.isArray(c) ? { y: c[0], x: c[1] } : { y: c, x: 180 }));
  lv.altMax = Math.round((n.y + K.ER) / 10);
  return lv;
}

const bird = (x, y) => ({ x, y, vx: 0, vy: 0, tx: x, ty: y });
export function newWorld(lv, mode = 'normal') {
  const w = { lv, mode, t: 0, time: 0, st: 'play', cp: 0, deaths: 0, rs: 0, hold: 0, crackT: 0, onRope: 0,
    A: bird(120, 70), B: bird(240, 70), egg: { x: 180, y: 86, vx: 0, vy: 0, rot: 0 },
    crumble: lv.crumbles.map(() => ({ s: 0, at: 0 })), events: [] };
  spawn(w); w.rs = 0;
  return w;
}
export function place(b, x, y) { b.x = b.tx = x; b.y = b.ty = y; b.vx = b.vy = 0; }
export function spawn(w) {
  const c = w.lv.cps[w.cp] || w.lv.cps[0], y = c.y + 70;
  place(w.A, c.x - 60, y); place(w.B, c.x + 60, y);
  Object.assign(w.egg, { x: c.x, y: y + K.ER + 3, vx: 0, vy: 0, rot: 0 });
  w.rs++; w.crackT = 0; w.hold = 0;
}

// ---------- elementos dinámicos en función del tiempo del mundo ----------
const osc = (per, ph, t) => Math.sin(TAU * (t / per + ph));
const doscdt = (per, ph, t) => (TAU / per) * Math.cos(TAU * (t / per + ph));
export function sawPos(s, t) { const k = osc(s.per, s.ph, t); return [s.cx + s.ax * k, s.cy + s.ay * k]; }
export function moverRect(m, t) { const k = osc(m.per, m.ph, t), d = doscdt(m.per, m.ph, t); return { x: m.x + m.ax * k, y: m.y + m.ay * k, w: m.w, h: m.h, vx: m.ax * d, vy: m.ay * d, mat: m.mat }; }
export function faderOn(f, t) { const p = f.on + f.off, u = (((t / p + f.ph) % 1) + 1) % 1 * p; return u < f.on; }
export function faderWarn(f, t) { const p = f.on + f.off, u = (((t / p + f.ph) % 1) + 1) % 1 * p; return u < f.on && u > f.on - 0.7; }
export function fireballPos(fb, t) { const u = (((t / fb.per + fb.ph) % 1) + 1) % 1; return [fb.cx, fb.cy + fb.h * Math.sin(Math.PI * u)]; }
export function windAt(wd, t) { const g = 0.55 + 0.45 * osc(wd.per, wd.ph, t); return [wd.fx * g, wd.fy * g]; }
export function bridgeSegs(b, t) {
  const pts = [];
  for (let i = 0; i <= b.n; i++) {
    const u = i / b.n, sw = 1 + 0.12 * Math.sin(2 * t + i * 0.7);
    pts.push([b.x1 + (b.x2 - b.x1) * u, b.y1 + (b.y2 - b.y1) * u - b.sag * Math.sin(Math.PI * u) * sw]);
  }
  const segs = [];
  for (let i = 0; i < b.n; i++) segs.push({ x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1], vx: 0, vy: -b.sag * Math.sin(Math.PI * (i + 0.5) / b.n) * 0.24 * Math.cos(2 * t + i * 0.7), mat: 'wood' });
  return segs;
}

// Sólidos rectangulares activos cerca de una altura y.
function* rects(w, y) {
  const lv = w.lv, t = w.t;
  for (const r of lv.walls) if (y > r.y - 80 && y < r.y + r.h + 80) yield r;
  for (const m of lv.movers) { const r = moverRect(m, t); if (y > r.y - 80 && y < r.y + r.h + 80) yield r; }
  for (const f of lv.faders) if (faderOn(f, t) && y > f.y - 80 && y < f.y + f.h + 80) yield f;
  for (let i = 0; i < lv.crumbles.length; i++) { const c = lv.crumbles[i]; if (w.crumble[i].s < 2 && y > c.y - 80 && y < c.y + c.h + 80) { c._i = i; yield c; } }
  for (const r of lv.hidden) if (y > r.y - 80 && y < r.y + r.h + 80) yield r;
}
function* segs(w, y) {
  for (const s of w.lv.slopes) if (y > Math.min(s.y1, s.y2) - 80 && y < Math.max(s.y1, s.y2) + 80) yield s;
  for (const b of w.lv.bridges) if (y > Math.min(b.y1, b.y2) - b.sag - 80 && y < Math.max(b.y1, b.y2) + 80) yield* bridgeSegs(b, w.t);
}

function rectHit(o, r, w) {
  const cx = clamp(o.x, w.x, w.x + w.w), cy = clamp(o.y, w.y, w.y + w.h);
  const dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 < 1e-9) {
    const l = o.x - w.x, rr = w.x + w.w - o.x, b = o.y - w.y, t = w.y + w.h - o.y, m = Math.min(l, rr, b, t);
    if (m === t) return { nx: 0, ny: 1, pen: t + r }; if (m === b) return { nx: 0, ny: -1, pen: b + r };
    if (m === l) return { nx: -1, ny: 0, pen: l + r }; return { nx: 1, ny: 0, pen: rr + r };
  }
  const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d };
}
function segHit(o, r, s) {
  const abx = s.x2 - s.x1, aby = s.y2 - s.y1, L2 = abx * abx + aby * aby || 1;
  const u = clamp(((o.x - s.x1) * abx + (o.y - s.y1) * aby) / L2, 0, 1);
  const px = s.x1 + abx * u, py = s.y1 + aby * u, dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy), R = r + 3;
  if (d >= R) return null;
  if (d < 1e-6) { const L = Math.sqrt(L2); let nx = -aby / L, ny = abx / L; if (ny < 0) { nx = -nx; ny = -ny; } return { nx, ny, pen: R }; }
  return { nx: dx / d, ny: dy / d, pen: R - d };
}

// ---------- pájaros ----------
export function moveBird(w, b, other, dt, windScale = 0.25) {
  let dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
  if (d > 60) { b.tx = b.x + dx / d * 60; b.ty = b.y + dy / d * 60; dx = b.tx - b.x; dy = b.ty - b.y; d = 60; }
  let wx = dx * 9, wy = dy * 9; const wl = Math.hypot(wx, wy);
  if (wl > K.BSPEED) { wx *= K.BSPEED / wl; wy *= K.BSPEED / wl; }
  let ax = wx - b.vx, ay = wy - b.vy; const al = Math.hypot(ax, ay), amax = K.BACC * dt;
  if (al > amax) { ax *= amax / al; ay *= amax / al; }
  b.vx += ax; b.vy += ay;
  const ox = b.x, oy = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt;
  for (const wd of w.lv.winds) if (b.x > wd.x && b.x < wd.x + wd.w && b.y > wd.y && b.y < wd.y + wd.h) { const [fx, fy] = windAt(wd, w.t); b.x += fx * windScale * dt * 0.35; b.y += fy * windScale * dt * 0.35; }
  if (other) constrainRope(b, other);
  collideBird(w, b);
  b.vx = (b.x - ox) / dt; b.vy = (b.y - oy) / dt;
  const vl = Math.hypot(b.vx, b.vy), vmax = K.BSPEED * 1.3; if (vl > vmax) { b.vx *= vmax / vl; b.vy *= vmax / vl; }
}
export function constrainRope(b, other) {
  const rx = b.x - other.x, ry = b.y - other.y, rd = Math.hypot(rx, ry);
  if (rd > K.ROPE_MAX) { b.x = other.x + rx / rd * K.ROPE_MAX; b.y = other.y + ry / rd * K.ROPE_MAX; }
  else if (rd < K.ROPE_MIN && rd > 1e-6) { b.x = other.x + rx / rd * K.ROPE_MIN; b.y = other.y + ry / rd * K.ROPE_MIN; }
}
export function collideBird(w, b) {
  for (const r of rects(w, b.y)) { const h = rectHit(b, K.BR, r); if (h) { b.x += h.nx * h.pen; b.y += h.ny * h.pen; } }
  for (const s of segs(w, b.y)) { const h = segHit(b, K.BR, s); if (h) { b.x += h.nx * h.pen; b.y += h.ny * h.pen; } }
}

// ---------- huevo ----------
function ropeHit(w, e) {
  const a = w.A, b = w.B, abx = b.x - a.x, aby = b.y - a.y, L2 = abx * abx + aby * aby || 1;
  const t = clamp(((e.x - a.x) * abx + (e.y - a.y) * aby) / L2, 0, 1);
  const px = a.x + abx * t, py = a.y + aby * t, R = K.ER + 2, dx = e.x - px, dy = e.y - py, d = Math.hypot(dx, dy);
  if (d >= R) return false;
  let nx, ny;
  if (d < 1e-6) { const L = Math.sqrt(L2); nx = -aby / L; ny = abx / L; if (ny < 0) { nx = -nx; ny = -ny; } } else { nx = dx / d; ny = dy / d; }
  e.x = px + nx * R; e.y = py + ny * R;
  const rvx = a.vx * (1 - t) + b.vx * t, rvy = a.vy * (1 - t) + b.vy * t;
  let rx = e.vx - rvx, ry = e.vy - rvy; const vn = rx * nx + ry * ny;
  if (vn < 0) {
    if (-vn > K.CRACK_ROPE) { crack(w, 'cuerda'); return true; }
    if (-vn > 170) w.events.push({ k: 'bounce', v: -vn });
    rx -= 1.25 * vn * nx; ry -= 1.25 * vn * ny;
  }
  const tx = -ny, ty = nx, vt = rx * tx + ry * ty; rx -= tx * vt * 0.012; ry -= ty * vt * 0.012;
  e.vx = rvx + rx; e.vy = rvy + ry; w.onRope = 0.15;
  return false;
}
function solidResponse(w, e, h, cvx, cvy, mat) {
  const m = MAT[mat] || MAT.stone;
  e.x += h.nx * h.pen; e.y += h.ny * h.pen;
  let rx = e.vx - cvx, ry = e.vy - cvy; const vn = rx * h.nx + ry * h.ny;
  if (vn < 0) {
    if (-vn > K.CRACK_WALL * m.crack) { crack(w, 'golpe'); return true; }
    if (-vn > 150) w.events.push({ k: 'bounce', v: -vn });
    rx -= (1 + m.e) * vn * h.nx; ry -= (1 + m.e) * vn * h.ny;
    const tx = -h.ny, ty = h.nx, vt = rx * tx + ry * ty; rx -= tx * vt * m.f; ry -= ty * vt * m.f;
    e.vx = rvxAdd(cvx, rx); e.vy = rvxAdd(cvy, ry);
  }
  return false;
}
const rvxAdd = (a, b) => a + b;
export function crack(w, why) {
  if (w.st !== 'play') return;
  w.st = 'crack'; w.crackT = 0; w.deaths++;
  w.events.push({ k: 'crack', x: w.egg.x, y: w.egg.y, why });
}
function stepEgg(w, dt) {
  const e = w.egg, lv = w.lv, t = w.t;
  let gx = 0, gy = -K.G;
  for (const wd of lv.winds) if (e.x > wd.x && e.x < wd.x + wd.w && e.y > wd.y && e.y < wd.y + wd.h) { const [fx, fy] = windAt(wd, t); gx += fx; gy += fy; }
  e.vx += gx * dt; e.vy += gy * dt; e.vx *= 1 - 0.15 * dt; e.vy *= 1 - 0.02 * dt;
  e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vx / K.ER * dt * 0.8;
  if (ropeHit(w, e)) return;
  for (const r of rects(w, e.y)) {
    const h = rectHit(e, K.ER, r); if (!h) continue;
    if (r._i !== undefined && w.crumble[r._i].s === 0) { w.crumble[r._i] = { s: 1, at: w.t }; w.events.push({ k: 'crumble', i: r._i }); }
    if (solidResponse(w, e, h, r.vx || 0, r.vy || 0, r.mat)) return;
  }
  for (const s of segs(w, e.y)) { const h = segHit(e, K.ER, s); if (h && solidResponse(w, e, h, s.vx || 0, s.vy || 0, s.mat)) return; }
  for (const s of lv.spikes) if (e.y > s.y - 40 && e.y < s.y + s.h + 40 && rectHit(e, K.ER - 2, s)) return crack(w, 'pinchos');
  for (const s of lv.lava) if (e.y > s.y - 40 && e.y < s.y + s.h + 40 && rectHit(e, K.ER - 2, s)) return crack(w, 'lava');
  for (const s of lv.saws) { const [x, y] = sawPos(s, t); if (Math.hypot(e.x - x, e.y - y) < s.r + K.ER - 4) return crack(w, 'sierra'); }
  for (const f of lv.fireballs) { const [x, y] = fireballPos(f, t); if (Math.hypot(e.x - x, e.y - y) < f.r + K.ER - 3) return crack(w, 'fuego'); }
  const cp = lv.cps[w.cp];
  if (e.y < cp.y - 260) return crack(w, 'caida');
  if (w.mode === 'normal') for (let i = w.cp + 1; i < lv.cps.length; i++) if (e.y > lv.cps[i].y + 40) { w.cp = i; w.events.push({ k: 'cp', i }); }
  const nb = lv.nestBox, sp = Math.hypot(e.vx, e.vy);
  if (e.x > nb.x0 && e.x < nb.x1 && e.y > nb.y0 && e.y < nb.y1 && sp < 80) { w.hold += dt; if (w.hold > 0.6) { w.st = 'win'; w.events.push({ k: 'win' }); } }
  else w.hold = 0;
}
function stepCrumbles(w) {
  for (let i = 0; i < w.crumble.length; i++) {
    const c = w.crumble[i];
    if (c.s === 1 && w.t - c.at > 0.7) { c.s = 2; c.at = w.t; }
    else if (c.s === 2 && w.t - c.at > 4) { c.s = 0; }
  }
}

// Un paso fijo de simulación. moveA/moveB indican qué pájaros simula este teléfono.
export function step(w, dt, { moveA = true, moveB = true } = {}) {
  w.t += dt;
  if (moveA) moveBird(w, w.A, w.B, dt);
  if (moveB) moveBird(w, w.B, w.A, dt);
  stepCrumbles(w);
  if (w.onRope > 0) w.onRope -= dt;
  if (w.st === 'play') { w.time += dt; stepEgg(w, dt); }
  else if (w.st === 'crack') { w.crackT += dt; if (w.crackT > 1.4) { if (w.mode === 'extremo') w.cp = 0; spawn(w); w.st = 'play'; w.events.push({ k: 'respawn' }); } }
}

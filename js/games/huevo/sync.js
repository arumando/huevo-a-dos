// Sincronización de Huevo a Dos.
// - El anfitrión simula la física (autoridad) y manda "fotos" del huevo y su pájaro.
// - El invitado dibuja esas fotos con un pequeño búfer adaptativo e interpolación suave (Hermite),
//   así no hay saltos aunque la red tenga variaciones. Su propio pájaro se mueve al instante.
// - El anfitrión predice dónde está el pájaro del invitado (posición + velocidad + edad del dato)
//   y lo sigue con aceleración limitada, para que la cuerda no dé tirones que rompan el huevo.
import { K, collideBird } from './engine.js';
import { now, clamp } from '../../core/util.js';

// ---------- lado anfitrión: seguir al pájaro remoto ----------
export function createRemoteBird() {
  return { has: false, x: 0, y: 0, vx: 0, vy: 0, tl: 0, arr: 0, lat: 0, t: -1, rs: -1 };
}
export function acceptInput(R, m, toLocal) {
  if (!m || !Array.isArray(m.b) || m.b.length < 4 || !m.b.every(Number.isFinite) || !Number.isFinite(m.t)) return;
  if (m.t <= R.t) return; // llegó desordenado: más viejo que el último
  const tl = toLocal(m.t), arr = now();
  R.t = m.t; R.arr = arr; R.tl = tl == null ? arr : Math.min(arr, tl); R.lat = clamp(arr - R.tl, 0, 300);
  [R.x, R.y, R.vx, R.vy] = m.b; R.rs = Number.isFinite(m.rs) ? m.rs : -1; R.has = true;
}
export function followRemote(w, b, R, dt) {
  if (!R.has || R.rs !== w.rs) { b.vx = b.vy = 0; return; }
  // Se predice dónde está ahora el pájaro remoto: dato + velocidad × (latencia de red + tiempo desde que llegó).
  // Si deja de llegar información (pico de red), la velocidad se apaga en vez de seguir de largo.
  const stale = (now() - R.arr) / 1000, fade = stale < 0.25 ? 1 : Math.max(0, 1 - (stale - 0.25) / 0.25);
  const horizon = Math.min(0.45, R.lat / 1000 + Math.min(stale, 0.25));
  const px = R.x + R.vx * horizon * fade, py = R.y + R.vy * horizon * fade;
  const ex = px - b.x, ey = py - b.y, err = Math.hypot(ex, ey);
  if (err > 160) { b.x = px; b.y = py; b.vx = R.vx * fade; b.vy = R.vy * fade; return; }
  // Con datos frescos y error pequeño: seguimiento firme. Si hay que alcanzarlo tras un pico: con los límites de un pájaro normal.
  const firm = err < 25 && stale < 0.3, gain = firm ? 10 : 5, vmax = K.BSPEED * (firm ? 1.3 : 1.1), amax = K.BACC * (firm ? 1.6 : 1.1) * dt;
  let dvx = R.vx * fade + ex * gain, dvy = R.vy * fade + ey * gain;
  const dl = Math.hypot(dvx, dvy); if (dl > vmax) { dvx *= vmax / dl; dvy *= vmax / dl; }
  let ax = dvx - b.vx, ay = dvy - b.vy; const al = Math.hypot(ax, ay);
  if (al > amax) { ax *= amax / al; ay *= amax / al; }
  b.vx += ax; b.vy += ay; b.x += b.vx * dt; b.y += b.vy * dt;
  collideBird(w, b);
}

// ---------- lado invitado: búfer de fotos e interpolación ----------
export function createSnapBuffer() {
  return { buf: [], lastT: -1, late: [], D: 90, target: 90, interval: 50, lastArr: 0, count: 0 };
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
export function pushSnap(S, m, toLocal) {
  if (!m || !Number.isFinite(m.t) || m.t <= S.lastT || !Array.isArray(m.e) || !Array.isArray(m.a)) return false;
  const arr = now(), tlc = toLocal(m.t), tl = tlc == null ? arr : tlc;
  if (S.lastArr) S.interval += (clamp(arr - S.lastArr, 10, 300) - S.interval) * 0.05;
  S.lastArr = arr; S.lastT = m.t; S.count++;
  // Retraso de cada foto (red + diferencia de relojes). El búfer cubre el 97 % de los casos recientes.
  S.late.push(arr - tl); if (S.late.length > 90) S.late.shift();
  S.target = clamp(pct(S.late, 0.98) + S.interval * 0.5 + 8, 30, 340);
  S.buf.push({ tl, e: m.e, a: m.a, wt: m.wt, st: m.st, rs: m.rs, cr: m.cr });
  while (S.buf.length > 2 && S.buf[1].tl < arr - 1500) S.buf.shift();
  return true;
}
const herm = (p0, v0, p1, v1, u, dt) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * v0 * dt + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * v1 * dt; };
const hermV = (p0, v0, p1, v1, u, dt) => { const u2 = u * u; return ((6 * u2 - 6 * u) * p0 + (3 * u2 - 4 * u + 1) * v0 * dt + (-6 * u2 + 6 * u) * p1 + (3 * u2 - 2 * u) * v1 * dt) / dt; };
// Devuelve el estado a dibujar ahora (búfer al 98 % de los retrasos recientes; sin datos, extrapola hasta 200 ms): {e:[x,y,vx,vy,rot], a:[x,y,vx,vy], wt}
export function sample(S, frameDt) {
  const b = S.buf; if (!b.length) return null;
  // Sube rápido cuando hay picos, baja despacio cuando la red mejora.
  S.D += (S.target - S.D) * Math.min(1, frameDt * (S.target > S.D ? 4 : 0.4));
  const rt = now() - S.D;
  let i = b.length - 1;
  while (i > 0 && b[i].tl > rt) i--;
  const s0 = b[i], s1 = b[i + 1];
  if (!s1 || rt < s0.tl) {
    const ex = clamp((rt - s0.tl) / 1000, 0, 0.2);
    return { e: [s0.e[0] + s0.e[2] * ex, s0.e[1] + s0.e[3] * ex, s0.e[2], s0.e[3], s0.e[4]], a: [s0.a[0] + s0.a[2] * ex, s0.a[1] + s0.a[3] * ex, s0.a[2], s0.a[3]], wt: s0.wt + ex, src: s0, extra: true };
  }
  const dt = Math.max(0.001, (s1.tl - s0.tl) / 1000), u = clamp((rt - s0.tl) / (s1.tl - s0.tl), 0, 1);
  const H = (p, k) => herm(s0[p][k], s0[p][k + 2], s1[p][k], s1[p][k + 2], u, dt), HV = (p, k) => hermV(s0[p][k], s0[p][k + 2], s1[p][k], s1[p][k + 2], u, dt);
  // si el huevo rebotó entre dos fotos, la curva de Hermite puede pasarse; en ese caso, interpolación lineal
  const bounced = Math.sign(s0.e[3]) !== Math.sign(s1.e[3]) && Math.abs(s0.e[3] - s1.e[3]) > 150;
  const ex = bounced ? s0.e[0] + (s1.e[0] - s0.e[0]) * u : H('e', 0), ey = bounced ? s0.e[1] + (s1.e[1] - s0.e[1]) * u : H('e', 1);
  return { e: [ex, ey, HV('e', 0), HV('e', 1), s0.e[4] + (s1.e[4] - s0.e[4]) * u], a: [H('a', 0), H('a', 1), HV('a', 0), HV('a', 1)], wt: s0.wt + (s1.wt - s0.wt) * u, src: u < 0.5 ? s0 : s1 };
}
export const r1 = v => Math.round(v * 10) / 10;

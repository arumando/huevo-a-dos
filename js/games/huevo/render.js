// Dibujo de Huevo a Dos con temas por escenario. No conoce la red: recibe una "vista" del mundo.
import { K, sawPos, moverRect, faderOn, faderWarn, fireballPos, windAt, bridgeSegs } from './engine.js';
import { drawBirdAvatar } from '../../ui/avatar.js';

export const THEMES = {
  acantilado: { sky: ['#d9746a', '#3b2a63', '#2b1f4d', '#0f0b22'], wall: '#7a6690', edge: '#4b3c5e', top: '#4a3466', spike: '#efe6d8', amb: 'stars', hills: '#3a2552', sign: '#fff1d6', nest: 'ramitas' },
  bosque: { sky: ['#8fd3a8', '#2f6f63', '#1d4a45', '#0d2422'], wall: '#7a5236', edge: '#4a2f1d', top: '#5fae4e', spike: '#d9e8c4', amb: 'hojas', hills: '#24503f', sign: '#f1ffe8', nest: 'hojas' },
  hielo: { sky: ['#dff3ff', '#8cc4ea', '#5a8fcf', '#1c3770'], wall: '#cfe9f7', edge: '#7fb2d6', top: '#ffffff', spike: '#eaf7ff', amb: 'nieve', hills: '#9cc6e6', sign: '#13305e', nest: 'nieve' },
  cavernas: { sky: ['#2a2238', '#1a1526', '#120f1c', '#07060c'], wall: '#4d4558', edge: '#2a2433', top: '#6a5f78', spike: '#cfc6dc', amb: 'polvo', hills: '#1c1726', sign: '#e9defa', nest: 'cristal', dark: true },
  volcan: { sky: ['#ff8a3d', '#8a2a1f', '#4a1414', '#1a0707'], wall: '#3b2a2a', edge: '#1e1313', top: '#6b3b2a', spike: '#ffd2b0', amb: 'brasas', hills: '#2a1010', sign: '#ffe6cf', nest: 'obsidiana' },
  cielo: { sky: ['#ffc98a', '#4f9be8', '#3d7fd6', '#1c3f99'], wall: '#ffffff', edge: '#8fb0e0', top: '#ffffff', spike: '#ffd56b', amb: 'nubes', hills: '#a9c9f2', sign: '#fff8e8', nest: 'dorado' }
};
const MATC = { ice: ['#d6f1ff', '#86c0e6'], wood: ['#9a6a43', '#5b3a22'], cloud: ['#ffffff', '#cfdcf2'], crystal: ['#8fe3ff', '#3a8fb8'], rock: ['#5a4646', '#2a1e1e'] };

export function createRenderer(cv) {
  const ctx = cv.getContext('2d');
  const R = { dpr: 1, cw: 0, ch: 0, sc: 1, offX: 0, viewH: 600, camY: -30, ambient: [] };
  for (let i = 0; i < 70; i++) R.ambient.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), p: Math.random() * 10 });
  R.resize = () => {
    R.dpr = Math.min(2, devicePixelRatio || 1); R.cw = cv.clientWidth; R.ch = cv.clientHeight;
    cv.width = Math.round(R.cw * R.dpr); cv.height = Math.round(R.ch * R.dpr);
    R.sc = Math.min(R.cw / K.W, R.ch / 520); R.offX = (R.cw - K.W * R.sc) / 2; R.viewH = R.ch / R.sc;
  };
  R.follow = (y, top, dt) => { const tgt = Math.max(-30, Math.min(y - R.viewH * 0.38, top + 140 - R.viewH)); R.camY += (tgt - R.camY) * Math.min(1, dt * 4); };
  R.toWorld = (dxPx, dyPx) => [dxPx / R.sc, -dyPx / R.sc];

  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = s => ((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k); return `rgb(${c(16) | 0},${c(8) | 0},${c(0) | 0})`; }

  function sky(th, k, now) {
    const g = ctx.createLinearGradient(0, 0, 0, R.ch);
    g.addColorStop(0, mix(th.sky[1], th.sky[3], k)); g.addColorStop(1, mix(th.sky[0], th.sky[2], k));
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.cw, R.ch);
    const t = now / 1000;
    for (const a of R.ambient) {
      let x = a.x * R.cw, y;
      if (th.amb === 'stars') { y = ((a.y * R.ch * 2 + R.camY * R.sc * 0.12) % (R.ch * 2)) - R.ch * 0.5; ctx.globalAlpha = (0.25 + 0.6 * k) * (0.7 + 0.3 * Math.sin(t * 1.6 + a.p)); ctx.fillStyle = '#fff1d6'; dot(x, y, a.s); }
      else if (th.amb === 'nieve') { y = ((a.y * R.ch + t * 40 * a.s + R.camY * R.sc * 0.3) % R.ch); x += Math.sin(t + a.p) * 12; ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff'; dot(x, R.ch - y, a.s * 1.6); }
      else if (th.amb === 'hojas') { y = ((a.y * R.ch + t * 30 * a.s + R.camY * R.sc * 0.3) % R.ch); x += Math.sin(t * 0.8 + a.p) * 30; ctx.globalAlpha = 0.6; ctx.fillStyle = a.p > 5 ? '#9ed36a' : '#e0b450'; ctx.save(); ctx.translate(x, R.ch - y); ctx.rotate(t + a.p); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore(); }
      else if (th.amb === 'brasas') { y = ((a.y * R.ch + t * 50 * a.s - R.camY * R.sc * 0.2) % R.ch); x += Math.sin(t * 2 + a.p) * 8; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + a.p); ctx.fillStyle = a.p > 5 ? '#ffb347' : '#ff5a2a'; dot(x, y, a.s * 1.4); }
      else if (th.amb === 'polvo') { y = (a.y * R.ch + R.camY * R.sc * 0.2) % R.ch; ctx.globalAlpha = 0.15 + 0.15 * Math.sin(t + a.p); ctx.fillStyle = '#cfc6dc'; dot(x + Math.sin(t * 0.3 + a.p) * 10, y, a.s); }
      else if (th.amb === 'nubes' && a.p < 2.5) { y = ((a.y * R.ch * 1.5 + R.camY * R.sc * 0.25) % (R.ch * 1.5)) - R.ch * 0.25; x = ((a.x * R.cw + t * 8 * a.s) % (R.cw + 160)) - 80; ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffffff'; cloudBlob(x, y, 30 * a.s); }
    }
    ctx.globalAlpha = 1;
    const base = R.ch + R.camY * R.sc * 0.3;
    if (base - 160 < R.ch) { ctx.fillStyle = th.hills; ctx.beginPath(); ctx.moveTo(0, base); for (let i = 0; i <= 8; i++) ctx.lineTo(R.cw * i / 8, base - 70 - ((i * 53) % 90)); ctx.lineTo(R.cw, R.ch + 400); ctx.lineTo(0, R.ch + 400); ctx.fill(); }
  }
  const dot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  function cloudBlob(x, y, s) { ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.arc(x + s, y + 4, s * 0.8, 0, 7); ctx.arc(x - s, y + 5, s * 0.7, 0, 7); ctx.fill(); }

  function block(r, th, t, extra = {}) {
    const mat = r.mat || 'stone', y = -(r.y + r.h);
    const c = MATC[mat] || [th.wall, th.edge];
    if (mat === 'cloud') {
      const n = Math.max(2, Math.round(r.w / 22)), rad = Math.min(Math.max(r.h * 0.7, 10), 18), path = () => { ctx.beginPath(); for (let i = 0; i < n; i++) { const cx = r.x + (i + 0.5) * r.w / n, cy = y + r.h / 2 + (i % 2 ? 2 : -2); ctx.moveTo(cx + rad, cy); ctx.arc(cx, cy, rad, 0, 7); } ctx.rect(r.x + 4, y + 2, r.w - 8, r.h - 4); };
      ctx.save(); ctx.translate(0, 4); path(); ctx.fillStyle = 'rgba(30,60,140,.28)'; ctx.fill(); ctx.restore();
      path(); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.fillStyle = '#e3eeff'; ctx.fillRect(r.x + 6, y + r.h * 0.55, r.w - 12, r.h * 0.35); return;
    }
    rr(r.x, y, r.w, r.h, mat === 'ice' ? 4 : 7); ctx.fillStyle = c[0]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c[1]; ctx.stroke();
    if (mat === 'wood') { ctx.strokeStyle = c[1]; ctx.lineWidth = 1; for (let x = r.x + 14; x < r.x + r.w - 4; x += 16) { ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y + r.h - 2); ctx.stroke(); } }
    else if (mat === 'ice') { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(r.x + 4, y + 3, r.w * 0.4, 3); }
    else if (mat === 'crystal') { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(r.x + 6, y + r.h); ctx.lineTo(r.x + 14, y); ctx.lineTo(r.x + 22, y + r.h); ctx.fill(); }
    else if (mat === 'stone' && (r.h < 400 || r.w < 200)) { ctx.fillStyle = th.top; ctx.globalAlpha = 0.55; ctx.fillRect(r.x + 4, y + 3, r.w - 8, 4); ctx.globalAlpha = 1; }
    if (extra.mover) { ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let x = r.x + 8; x < r.x + r.w - 6; x += 18) dot(x, y + r.h / 2, 2); }
  }

  function nest(lv, th, now) {
    const n = lv.nest, y = -n.y;
    const g = ctx.createRadialGradient(n.x, y - 20, 4, n.x, y - 20, 90); g.addColorStop(0, 'rgba(255,207,92,.45)'); g.addColorStop(1, 'rgba(255,207,92,0)'); ctx.fillStyle = g; ctx.fillRect(n.x - 90, y - 110, 180, 180);
    const style = th.nest;
    const cols = { ramitas: ['#8a5a35', '#6b4226'], hojas: ['#4f8f3a', '#2f6a2a'], nieve: ['#ffffff', '#a9d4f0'], cristal: ['#8fe3ff', '#c48fff'], obsidiana: ['#2a1a1f', '#ff7a3d'], dorado: ['#ffcf5c', '#ffb02e'] }[style] || ['#8a5a35', '#6b4226'];
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = cols[i % 2]; ctx.beginPath(); ctx.ellipse(n.x, y - 4, 44 - i * 2, 9 - (i % 3), (i - 3) * 0.05, 0, Math.PI); ctx.stroke(); }
    if (style === 'cristal' || style === 'dorado') { ctx.fillStyle = cols[1]; for (let i = -2; i <= 2; i++) { const s = Math.sin(now / 300 + i) * 2; ctx.beginPath(); ctx.moveTo(n.x + i * 16, y - 6); ctx.lineTo(n.x + i * 16 + 4, y - 16 - s); ctx.lineTo(n.x + i * 16 + 8, y - 6); ctx.fill(); } }
    if (style === 'obsidiana') { ctx.fillStyle = 'rgba(255,122,61,.6)'; dot(n.x - 20, y - 4, 2); dot(n.x + 24, y - 6, 2); }
  }

  function world(v, now) {
    const lv = v.lv, th = THEMES[lv.theme] || THEMES.acantilado, t = v.t;
    ctx.setTransform(R.dpr * R.sc, 0, 0, R.dpr * R.sc, R.dpr * R.offX, R.dpr * (R.ch + R.camY * R.sc));
    const y0 = R.camY - 80, y1 = R.camY + R.viewH + 80, vis = (a, b) => b > y0 && a < y1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 15px Nunito, system-ui, sans-serif';
    for (const [y, text] of lv.signs || []) if (vis(y, y)) { ctx.fillStyle = th.sign; ctx.globalAlpha = 0.6; ctx.fillText(text, 180, -y); }
    ctx.globalAlpha = 1;
    lv.cps.forEach((c, i) => { if (i === 0 || !vis(c.y - 40, c.y + 40)) return; const on = v.cp >= i && v.mode === 'normal', x = c.x < 180 ? c.x + 140 : c.x - 154; ctx.strokeStyle = '#e8d3a2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, -c.y + 20); ctx.lineTo(x, -c.y - 34); ctx.stroke(); ctx.fillStyle = on ? '#ffcf5c' : th.edge; ctx.beginPath(); ctx.moveTo(x + 1, -c.y - 34); ctx.lineTo(x + 24, -c.y - 27); ctx.lineTo(x + 1, -c.y - 20); ctx.fill(); });
    for (const wd of lv.winds) if (vis(wd.y, wd.y + wd.h)) { const [fx, fy] = windAt(wd, t), m = Math.hypot(fx, fy) || 1; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const u = ((t * 0.6 * m / 300 + i * 0.37) % 1), px = wd.x + ((i * 47) % wd.w), py = wd.y + ((i * 83) % wd.h); const sx = px + fx / m * u * wd.w * 0.6, sy = py + fy / m * u * wd.h * 0.6; if (sx < wd.x || sx > wd.x + wd.w || sy < wd.y || sy > wd.y + wd.h) continue; ctx.beginPath(); ctx.moveTo(sx, -sy); ctx.lineTo(sx - fx / m * 18, -(sy - fy / m * 18)); ctx.stroke(); } }
    if (vis(lv.nest.y - 60, lv.nest.y + 60)) nest(lv, th, now);
    for (const r of lv.walls) if (vis(r.y, r.y + r.h)) block(r, th, t);
    for (const m of lv.movers) { const r = moverRect(m, t); if (vis(r.y, r.y + r.h)) block(r, th, t, { mover: true }); }
    for (const f of lv.faders) if (vis(f.y, f.y + f.h)) { const on = faderOn(f, t); ctx.globalAlpha = on ? (faderWarn(f, t) ? 0.45 + 0.45 * Math.sin(now / 50) : 1) : 0.12; block(f, th, t); ctx.globalAlpha = 1; }
    lv.crumbles.forEach((c, i) => { const s = v.crumble?.[i] ?? 0; if (s === 2 || !vis(c.y, c.y + c.h)) return; ctx.save(); if (s === 1) ctx.translate(Math.sin(now / 25) * 1.5, 0); block(c, th, t); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c.x + c.w * 0.3, -(c.y + c.h)); ctx.lineTo(c.x + c.w * 0.4, -c.y); ctx.moveTo(c.x + c.w * 0.7, -(c.y + c.h)); ctx.lineTo(c.x + c.w * 0.6, -c.y); ctx.stroke(); ctx.restore(); });
    for (const hd of lv.hidden) if (vis(hd.y, hd.y + hd.h)) { const d = Math.min(...[v.egg, v.A, v.B].map(o => Math.hypot(o.x - (hd.x + hd.w / 2), o.y - (hd.y + hd.h / 2)))); const a = Math.max(0.04, Math.min(1, (170 - d) / 90)); ctx.globalAlpha = a; block(hd, th, t); ctx.globalAlpha = 1; }
    for (const s of lv.slopes) if (vis(Math.min(s.y1, s.y2), Math.max(s.y1, s.y2))) { const c = MATC[s.mat] || [th.wall, th.edge]; ctx.lineCap = 'round'; ctx.strokeStyle = c[1]; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x2, -s.y2); ctx.stroke(); ctx.strokeStyle = c[0]; ctx.lineWidth = 6; ctx.stroke(); }
    for (const b of lv.bridges) if (vis(Math.min(b.y1, b.y2) - b.sag, Math.max(b.y1, b.y2))) { const sg = bridgeSegs(b, t); ctx.strokeStyle = '#e8d3a2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x1, -b.y1 - 16); ctx.quadraticCurveTo((b.x1 + b.x2) / 2, -((b.y1 + b.y2) / 2 - b.sag * 0.6) - 16, b.x2, -b.y2 - 16); ctx.stroke(); for (const s of sg) { ctx.strokeStyle = '#5b3a22'; ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(s.x1 + 1, -s.y1); ctx.lineTo(s.x2 - 1, -s.y2); ctx.stroke(); ctx.strokeStyle = '#9a6a43'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#e8d3a2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x1, -s.y1); ctx.lineTo(s.x1, -s.y1 - 16); ctx.stroke(); } }
    for (const s of lv.lava) if (vis(s.y, s.y + s.h)) { const g = ctx.createLinearGradient(0, -(s.y + s.h), 0, -s.y); g.addColorStop(0, '#ffd166'); g.addColorStop(0.3, '#ff6a2a'); g.addColorStop(1, '#a3201a'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x, -s.y); for (let x = s.x; x <= s.x + s.w; x += 8) ctx.lineTo(x, -(s.y + s.h) + Math.sin(now / 300 + x * 0.15) * 2.5); ctx.lineTo(s.x + s.w, -s.y); ctx.fill(); }
    ctx.lineWidth = 1.2; ctx.strokeStyle = th.edge; ctx.fillStyle = th.spike;
    for (const s of lv.spikes) if (vis(s.y, s.y + s.h)) { ctx.beginPath(); if (s.dir === 'u' || s.dir === 'd') { const n = Math.max(1, Math.round(s.w / 12)), st = s.w / n; for (let i = 0; i < n; i++) { const x = s.x + i * st; if (s.dir === 'u') { ctx.moveTo(x, -s.y); ctx.lineTo(x + st / 2, -(s.y + s.h)); ctx.lineTo(x + st, -s.y); } else { ctx.moveTo(x, -(s.y + s.h)); ctx.lineTo(x + st / 2, -s.y); ctx.lineTo(x + st, -(s.y + s.h)); } } } else { const n = Math.max(1, Math.round(s.h / 12)), st = s.h / n; for (let i = 0; i < n; i++) { const y = s.y + i * st; if (s.dir === 'r') { ctx.moveTo(s.x, -y); ctx.lineTo(s.x + s.w, -(y + st / 2)); ctx.lineTo(s.x, -(y + st)); } else { ctx.moveTo(s.x + s.w, -y); ctx.lineTo(s.x, -(y + st / 2)); ctx.lineTo(s.x + s.w, -(y + st)); } } } ctx.fill(); ctx.stroke(); }
    for (const s of lv.saws) { const [x, y] = sawPos(s, t); if (!vis(y - 30, y + 30)) continue; ctx.save(); ctx.translate(x, -y); ctx.rotate(t * 9); ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? s.r - 5 : s.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = '#c9c4d6'; ctx.fill(); ctx.strokeStyle = '#5b5470'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#5b5470'; dot(0, 0, 5); ctx.restore(); }
    for (const f of lv.fireballs) { const [x, y] = fireballPos(f, t); if (!vis(y - 30, y + 30)) continue; const g = ctx.createRadialGradient(x, -y, 2, x, -y, f.r * 2); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.4, '#ff8a2a'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; dot(x, -y, f.r * 2); }
  }

  function egg(e) {
    ctx.save(); ctx.translate(e.x, -e.y); ctx.rotate(-e.rot);
    const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 16); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#e7cfa6');
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 14.5, 0, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(90,60,40,.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(150,100,60,.5)'; [[4, -5, 1.4], [-5, 2, 1.1], [3, 6, 1.2], [-2, -9, .9]].forEach(([x, y, r]) => dot(x, y, r));
    ctx.restore();
  }
  function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.45); ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.35); ctx.fill(); }

  let darkCv = null;
  function darkness(v) {
    if (!darkCv) darkCv = document.createElement('canvas');
    if (darkCv.width !== cv.width || darkCv.height !== cv.height) { darkCv.width = cv.width; darkCv.height = cv.height; }
    const d = darkCv.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.fillStyle = 'rgba(5,4,10,.93)'; d.fillRect(0, 0, darkCv.width, darkCv.height);
    d.globalCompositeOperation = 'destination-out';
    for (const [o, r] of [[v.egg, 120], [v.A, 85], [v.B, 85]]) { const x = (R.offX + o.x * R.sc) * R.dpr, y = (R.ch - (o.y - R.camY) * R.sc) * R.dpr, rad = r * R.sc * R.dpr; const g = d.createRadialGradient(x, y, rad * 0.25, x, y, rad); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (const h of v.lv.hidden) { const x = (R.offX + (h.x + h.w / 2) * R.sc) * R.dpr, y = (R.ch - (h.y + h.h / 2 - R.camY) * R.sc) * R.dpr, rad = 26 * R.sc * R.dpr; const g = d.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkCv, 0, 0);
  }

  // v: {lv, t, A, B, egg, st, cp, mode, crumble, parts, avA, avB, me, hint}
  R.draw = (v, now) => {
    const th = THEMES[v.lv.theme] || THEMES.acantilado;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    sky(th, Math.max(0, Math.min(1, R.camY / v.lv.top)), now);
    world(v, now);
    ctx.strokeStyle = '#e8d3a2'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(v.A.x, -v.A.y); ctx.lineTo(v.B.x, -v.B.y); ctx.stroke();
    if (v.st !== 'crack') egg(v.egg);
    drawBirdAvatar(ctx, v.A.x, -v.A.y, v.avA, { face: v.B.x >= v.A.x ? 1 : -1, flap: now / 70 + v.A.vy * 0.004, label: v.me === 'A' ? 'Tú' : '' });
    drawBirdAvatar(ctx, v.B.x, -v.B.y, v.avB, { face: v.A.x >= v.B.x ? 1 : -1, flap: now / 64 + v.B.vy * 0.004, label: v.me === 'B' ? 'Tú' : '' });
    for (const p of v.parts) {
      ctx.globalAlpha = Math.min(1, p.life);
      if (p.k === 'shard') { ctx.save(); ctx.translate(p.x, -p.y); ctx.rotate(p.r); ctx.fillStyle = '#fbe9c8'; ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.lineTo(p.s, -p.s * .6); ctx.lineTo(p.s * .4, p.s * .8); ctx.fill(); ctx.restore(); }
      else if (p.k === 'yolk') { const r = 9 + (1.4 - p.life) * 10; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(p.x, -p.y, r * 1.6, r * 0.9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffcf5c'; dot(p.x, -p.y, 7); }
      else if (p.k === 'heart') { ctx.fillStyle = '#ff7a59'; heart(p.x, -p.y, 10); }
      else if (p.k === 'spark') { ctx.fillStyle = p.c || '#ffcf5c'; dot(p.x, -p.y, 2.5); }
    }
    ctx.globalAlpha = 1;
    if (th.dark) darkness(v);
    if (v.hint) {
      ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0); ctx.globalAlpha = v.hint * 0.5; ctx.strokeStyle = '#f7f0fb'; ctx.setLineDash([6, 8]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.cw / 2, 90); ctx.lineTo(R.cw / 2, R.ch - 20); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '900 14px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = v.avA.body; ctx.fillText('dedo izquierdo', R.cw * 0.25, R.ch - 40); ctx.fillStyle = v.avB.body; ctx.fillText('dedo derecho', R.cw * 0.75, R.ch - 40); ctx.globalAlpha = 1;
    }
  };
  return R;
}

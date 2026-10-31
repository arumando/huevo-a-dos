// Ilustraciones de cada mundo, dibujadas en canvas (sin imágenes externas). t anima detalles sutiles.
import { drawBirdAvatar } from './avatar.js';

export function drawWorldArt(cv, id, t = 0) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 120;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  (SCENES[id] || SCENES.huevo)(c, W, H, t);
}
const lin = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rad = (c, x, y, r, a, b) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
const circle = (c, x, y, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
function hills(c, W, H, base, amp, col, seed) { c.fillStyle = col; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.02 + seed) * Math.cos(x * 0.011 + seed * 2))); c.lineTo(W, H); c.fill(); }
function cloud(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, 7); c.arc(x + s * 0.9, y + s * 0.2, s * 0.75, 0, 7); c.arc(x - s * 0.9, y + s * 0.25, s * 0.65, 0, 7); c.fill(); }
function stars(c, W, H, n, a) { for (let i = 0; i < n; i++) circle(c, (i * 97.3) % W, (i * 53.1) % (H * 0.6), (i % 3) * 0.4 + 0.6, `rgba(255,241,214,${a * (0.4 + (i % 5) / 8)})`); }

const SCENES = {
  huevo(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#3b2a6e'], [0.55, '#c9607a'], [1, '#ffb27a']]); c.fillRect(0, 0, W, H);
    stars(c, W, H, 18, 0.6);
    circle(c, W * 0.78, H * 0.58, H * 0.2, rad(c, W * 0.78, H * 0.58, H * 0.2, '#fff3c4', '#ffb46a'));
    cloud(c, W * 0.25 + Math.sin(t * 0.3) * 6, H * 0.22, H * 0.08, 'rgba(255,230,240,.35)');
    hills(c, W, H, H * 0.78, H * 0.2, '#7a3f6e', 1); hills(c, W, H, H * 0.88, H * 0.14, '#4a2a5e', 3);
    c.fillStyle = '#6b5590'; rr(c, -10, H * 0.32, W * 0.24, H, 10); c.fill(); c.fillStyle = '#8a74b0'; c.fillRect(-10, H * 0.32, W * 0.24, 5);
    c.strokeStyle = '#8a5a35'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(W * 0.1, H * 0.31, 22 - i * 3, 6, 0, 0, Math.PI); c.stroke(); }
    const bx = W * 0.52, by = H * 0.5 + Math.sin(t * 2) * 3, sp = Math.min(70, W * 0.18);
    c.strokeStyle = '#e8d3a2'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx - sp, by); c.lineTo(bx + sp, by); c.stroke();
    c.fillStyle = rad(c, bx - 3, by - 16, 14, '#fffaf0', '#e7cfa6'); c.beginPath(); c.ellipse(bx, by - 13, 9, 11, 0, 0, 7); c.fill();
    const sc = Math.min(1.2, H / 110);
    drawBirdAvatar(c, bx - sp, by, { body: '#ff7a59', belly: '#ffc2ad' }, { face: 1, flap: t * 8, scale: sc });
    drawBirdAvatar(c, bx + sp, by, { body: '#3cc9b5', belly: '#b5f0e6' }, { face: -1, flap: t * 8 + 1, scale: sc });
  },
  escape(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#3a2516'], [1, '#1d120a']]); c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let x = 0; x < W; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.82); c.stroke(); }
    c.fillStyle = '#2a170c'; c.fillRect(0, H * 0.82, W, H); c.fillStyle = 'rgba(255,207,92,.08)'; c.beginPath(); c.moveTo(W * 0.5 - 30, 0); c.lineTo(W * 0.5 + 30, 0); c.lineTo(W * 0.5 + 110, H); c.lineTo(W * 0.5 - 110, H); c.fill();
    const dx = W * 0.5 - H * 0.22, dw = H * 0.44, dy = H * 0.16, dh = H * 0.66;
    c.fillStyle = '#6b4224'; rr(c, dx - 6, dy - 6, dw + 12, dh + 6, 6); c.fill(); c.fillStyle = '#8a5a35'; c.fillRect(dx, dy, dw, dh);
    c.strokeStyle = '#6b4224'; c.lineWidth = 3; c.strokeRect(dx + 7, dy + 7, dw - 14, dh * 0.4); c.strokeRect(dx + 7, dy + dh * 0.5, dw - 14, dh * 0.42);
    circle(c, dx + dw - 12, dy + dh * 0.5, 4.5, '#ffcf5c'); c.fillStyle = '#1a0f08'; c.fillRect(dx + dw - 13.5, dy + dh * 0.5 + 6, 3, 7);
    circle(c, dx + dw - 12, dy + dh * 0.5 + 9, 9 + Math.sin(t * 3) * 2, 'rgba(255,207,92,.18)');
    const cx = W * 0.18, cy = H * 0.38, cr = H * 0.13;
    circle(c, cx, cy, cr + 3, '#c9a45c'); circle(c, cx, cy, cr, '#fff1d6');
    c.strokeStyle = '#1a1430'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t * 0.5 - 1.5) * cr * 0.7, cy + Math.sin(t * 0.5 - 1.5) * cr * 0.7); c.moveTo(cx, cy); c.lineTo(cx + cr * 0.5, cy); c.stroke();
    const sx = W * 0.75; c.fillStyle = '#4a2c16'; c.fillRect(sx, H * 0.2, W * 0.2, H * 0.62);
    ['#ff5470', '#4aa8ff', '#5fd38a', '#ffcf5c', '#a07cf0'].forEach((col, i) => { c.fillStyle = col; c.fillRect(sx + 4 + i * (W * 0.035), H * 0.25 + (i % 2) * 4, W * 0.028, H * 0.22 - (i % 2) * 4); });
    c.fillStyle = '#c9a45c'; c.font = `900 ${Math.round(H * 0.11)}px Nunito`; c.fillText('7 · 3 · ?', W * 0.06, H * 0.78);
  },
  bomba(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#2a2d38'], [1, '#14151c']]); c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.rect(0, H * 0.86, W, H); c.clip(); for (let x = -40; x < W + 40; x += 26) { c.fillStyle = '#ffcf4a'; c.beginPath(); c.moveTo(x, H); c.lineTo(x + 13, H); c.lineTo(x + 26, H * 0.86); c.lineTo(x + 13, H * 0.86); c.fill(); } c.restore();
    const px = W * 0.5 - H * 0.55, pw = H * 1.1, py = H * 0.12, ph = H * 0.66;
    c.fillStyle = '#3a3f4f'; rr(c, px, py, pw, ph, 10); c.fill(); c.strokeStyle = '#1b1d26'; c.lineWidth = 3; c.stroke();
    [[px + 7, py + 7], [px + pw - 7, py + 7], [px + 7, py + ph - 7], [px + pw - 7, py + ph - 7]].forEach(([x, y]) => circle(c, x, y, 2.5, '#8a90a8'));
    c.fillStyle = '#071510'; rr(c, px + pw * 0.08, py + ph * 0.14, pw * 0.42, ph * 0.3, 5); c.fill();
    c.fillStyle = '#ff4d5e'; c.font = `900 ${Math.round(ph * 0.22)}px ui-monospace, Menlo, monospace`; c.textBaseline = 'middle'; c.fillText(Math.sin(t * 4) > -0.6 ? '0:42' : '0 42', px + pw * 0.11, py + ph * 0.3); c.textBaseline = 'alphabetic';
    const gx = px + pw * 0.6, gy = py + ph * 0.12, cs = ph * 0.22;
    const lit = Math.floor(t * 1.5) % 9, cols = ['#ff4d5e', '#4ea8ff', '#4fd17a', '#ffcf4a'];
    for (let i = 0; i < 9; i++) { const x = gx + (i % 3) * (cs + 3), y = gy + Math.floor(i / 3) * (cs + 3); c.fillStyle = i === lit ? cols[Math.floor(t * 1.5) % 4] : '#1f222c'; rr(c, x, y, cs, cs, 3); c.fill(); if (i === lit) { c.shadowColor = c.fillStyle; c.shadowBlur = 12; c.fill(); c.shadowBlur = 0; } }
    ['#ff4d5e', '#4ea8ff', '#ffcf4a'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(px + pw * 0.1, py + ph * 0.62 + i * 8); c.bezierCurveTo(px + pw * 0.3, py + ph + 10, px + pw * 0.5, py + ph * 0.5, px + pw * 0.9, py + ph * 0.66 + i * 8); c.stroke(); });
    circle(c, px + pw - 10, py - 4, 4 + Math.sin(t * 12) * 2, '#ffcf4a'); circle(c, px + pw - 10, py - 4, 10, 'rgba(255,207,74,.25)');
  },
  detective(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#141b33'], [1, '#232044']]); c.fillRect(0, 0, W, H);
    circle(c, W * 0.86, H * 0.2, H * 0.1, '#f6ecd7'); circle(c, W * 0.86, H * 0.2, H * 0.22, 'rgba(246,236,215,.08)');
    c.fillStyle = '#6b4a2a'; rr(c, W * 0.12, H * 0.12, W * 0.6, H * 0.72, 6); c.fill(); c.fillStyle = '#a07a50'; rr(c, W * 0.14, H * 0.15, W * 0.56, H * 0.66, 4); c.fill();
    const pins = [[0.2, 0.22, -0.08], [0.4, 0.42, 0.06], [0.55, 0.2, -0.04], [0.26, 0.55, 0.05]];
    c.strokeStyle = '#ff4d5e'; c.lineWidth = 1.5; c.beginPath(); pins.forEach(([x, y], i) => { const X = W * x + 18, Y = H * y + 4; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
    pins.forEach(([x, y, r], i) => { c.save(); c.translate(W * x, H * y); c.rotate(r); c.fillStyle = '#f6ecd7'; c.fillRect(0, 0, 36, 28); c.fillStyle = ['#5b6a8a', '#8a5a35', '#4a6a4a', '#7a4a6a'][i]; c.fillRect(3, 3, 30, 17); c.restore(); circle(c, W * x + 18, H * y + 4, 2.5, '#ff4d5e'); });
    const mx = W * 0.75, my = H * 0.62 + Math.sin(t) * 3, mr = H * 0.13;
    c.strokeStyle = '#3a2516'; c.lineWidth = 6; c.beginPath(); c.moveTo(mx + mr * 0.7, my + mr * 0.7); c.lineTo(mx + mr * 1.6, my + mr * 1.6); c.stroke();
    circle(c, mx, my, mr + 3, '#c9a45c'); circle(c, mx, my, mr, 'rgba(180,220,255,.35)'); circle(c, mx - mr * 0.35, my - mr * 0.35, mr * 0.25, 'rgba(255,255,255,.5)');
  },
  aventura(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#ffd59a'], [0.45, '#7fd1d8'], [1, '#1d7f8f']]); c.fillRect(0, 0, W, H);
    circle(c, W * 0.18, H * 0.25, H * 0.12, rad(c, W * 0.18, H * 0.25, H * 0.12, '#fffbe0', '#ffd27a'));
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { c.beginPath(); for (let x = 0; x <= W; x += 8) c.lineTo(x, H * (0.62 + i * 0.09) + Math.sin(x * 0.05 + t * 2 + i) * 2); c.stroke(); }
    c.fillStyle = '#f0d08a'; c.beginPath(); c.ellipse(W * 0.6, H * 0.8, W * 0.32, H * 0.14, 0, 0, 7); c.fill(); c.fillStyle = '#4fa84a'; c.beginPath(); c.ellipse(W * 0.62, H * 0.74, W * 0.22, H * 0.08, 0, 0, 7); c.fill();
    const tx = W * 0.5, ty = H * 0.74; c.strokeStyle = '#7a5236'; c.lineWidth = 5; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx - 6, ty - H * 0.3, tx + 6, ty - H * 0.5); c.stroke();
    for (let i = 0; i < 6; i++) { c.save(); c.translate(tx + 6, ty - H * 0.5); c.rotate(i * 1.05 + Math.sin(t) * 0.06); c.fillStyle = i % 2 ? '#2f8a3a' : '#3fae5a'; c.beginPath(); c.ellipse(H * 0.13, 0, H * 0.14, H * 0.035, 0, 0, 7); c.fill(); c.restore(); }
    const kx = W * 0.72, ky = H * 0.66; c.fillStyle = '#8a5a35'; rr(c, kx, ky, H * 0.2, H * 0.13, 3); c.fill(); c.fillStyle = '#ffcf4a'; c.fillRect(kx, ky + H * 0.045, H * 0.2, 3); circle(c, kx + H * 0.1, ky + H * 0.06, 3, '#ffcf4a');
    c.strokeStyle = '#ff4d5e'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * 0.84, H * 0.76); c.lineTo(W * 0.9, H * 0.84); c.moveTo(W * 0.9, H * 0.76); c.lineTo(W * 0.84, H * 0.84); c.stroke();
  },
  mini(c, W, H, t) {
    c.fillStyle = lin(c, 0, H, [[0, '#2a1260'], [1, '#5a1f8a']]); c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(46,211,183,.35)'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const y = H * 0.62 + i * i * 1.6; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(W / 2 + i * 12, H * 0.62); c.lineTo(W / 2 + i * 60, H); c.stroke(); }
    const s = H * 0.24, fl = Math.sin(t * 1.5) * 4;
    c.save(); c.translate(W * 0.22, H * 0.38 + fl); c.rotate(-0.25); c.fillStyle = '#fbf6ff'; rr(c, -s / 2, -s / 2, s, s, 6); c.fill(); [[-0.25, -0.25], [0.25, 0.25], [0, 0], [0.25, -0.25], [-0.25, 0.25]].forEach(([a, b]) => circle(c, a * s, b * s, s * 0.08, '#2a1260')); c.restore();
    c.save(); c.translate(W * 0.5, H * 0.34 - fl); c.rotate(0.12); c.fillStyle = '#2ed3b7'; rr(c, -s * 0.38, -s * 0.55, s * 0.76, s * 1.1, 6); c.fill(); c.fillStyle = '#04302a'; c.font = `900 ${Math.round(s * 0.6)}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 0); c.restore();
    c.save(); c.translate(W * 0.76, H * 0.4 + fl); c.rotate(0.2); c.fillStyle = '#ff6b57'; rr(c, -s * 0.38, -s * 0.55, s * 0.76, s * 1.1, 6); c.fill(); c.fillStyle = '#ffcf4a'; c.font = `900 ${Math.round(s * 0.55)}px Nunito`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', 0, 0); c.restore();
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    for (let i = 0; i < 10; i++) { const a = (t * 0.8 + i) % 1; circle(c, (i * 71) % W, H * (0.1 + (i * 0.37) % 0.4), 1.5 + a, `rgba(255,207,74,${0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i))})`); }
  }
};

// Efectos de celebración (confeti, estrellas) sobre la pantalla. No intercepta toques.
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#ffcf4a', '#ff6b57', '#2ed3b7', '#9a6bff', '#4ea8ff', '#fbf6ff'];
let cv = null, parts = [], raf = 0;
function ensure() {
  if (cv) return;
  cv = document.createElement('canvas'); cv.className = 'fx-layer'; cv.setAttribute('aria-hidden', 'true');
  document.getElementById('app').append(cv);
}
function loop() {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= 1 / 60; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    c.save(); c.globalAlpha = Math.min(1, p.life * 1.5); c.translate(p.x * w, p.y); c.rotate(p.r); c.fillStyle = p.c;
    if (p.k === 'star') { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? p.s * 0.45 : p.s; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill(); }
    else c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    c.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; c.clearRect(0, 0, w, h); }
}
// big: confeti de victoria · small: destello corto (logro, nivel)
export function celebrate(kind = 'big') {
  if (reduce) return; ensure();
  const n = kind === 'big' ? 140 : 40, h = cv.clientHeight || 700;
  for (let i = 0; i < n; i++) parts.push({ x: kind === 'big' ? Math.random() : 0.3 + Math.random() * 0.4, y: kind === 'big' ? -20 - Math.random() * h * 0.3 : h * 0.35, vx: (Math.random() - 0.5) * (kind === 'big' ? 0.004 : 0.012) * 1, vy: kind === 'big' ? 2 + Math.random() * 3 : -4 - Math.random() * 5, g: kind === 'big' ? 0.04 : 0.18, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 6 + Math.random() * 8, c: COLORS[i % COLORS.length], life: kind === 'big' ? 3 + Math.random() : 1.4, k: Math.random() < 0.3 ? 'star' : 'paper' });
  parts.forEach(p => { p.vx = p.vx; }); if (!raf) raf = requestAnimationFrame(loop);
}

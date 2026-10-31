// Avatares: pájaros personalizables. Se dibujan igual en la plaza y dentro de Huevo a Dos.
export const COLORS = [
  { id: 'coral', body: '#ff7a59', belly: '#ffc2ad', cost: 0 }, { id: 'turquesa', body: '#3cc9b5', belly: '#b5f0e6', cost: 0 },
  { id: 'lila', body: '#a07cf0', belly: '#ddd0ff', cost: 0 }, { id: 'sol', body: '#ffc23d', belly: '#fff0b8', cost: 0 },
  { id: 'cielo', body: '#4aa8ff', belly: '#c8e6ff', cost: 30 }, { id: 'rosa', body: '#ff6fae', belly: '#ffd0e6', cost: 30 },
  { id: 'menta', body: '#5fd38a', belly: '#d2f7de', cost: 30 }, { id: 'noche', body: '#3a3f6b', belly: '#9fa6e0', cost: 60 },
  { id: 'cereza', body: '#e0303f', belly: '#ffb3b8', cost: 60 }, { id: 'nieve', body: '#f2f5ff', belly: '#c9d4f2', cost: 80 }
];
export const HATS = [
  { id: 'ninguno', name: 'Sin gorro', cost: 0 }, { id: 'flor', name: 'Flor', cost: 0 }, { id: 'gorra', name: 'Gorra', cost: 40 },
  { id: 'corona', name: 'Corona', cost: 120 }, { id: 'mono', name: 'Moño', cost: 40 }, { id: 'sombrero', name: 'Sombrero', cost: 80 },
  { id: 'vikingo', name: 'Vikingo', cost: 150 }, { id: 'aureola', name: 'Aureola', cost: 200 }
];
export const EYES = [
  { id: 'normal', name: 'Normales', cost: 0 }, { id: 'feliz', name: 'Felices', cost: 0 }, { id: 'lentes', name: 'Lentes', cost: 50 }, { id: 'estrellas', name: 'Estrellas', cost: 90 }
];
export const TRAILS = [
  { id: 'ninguno', name: 'Sin estela', cost: 0 }, { id: 'corazones', name: 'Corazones', cost: 70 }, { id: 'chispas', name: 'Chispas', cost: 70 }, { id: 'arcoiris', name: 'Arcoíris', cost: 160 }
];

// Utilidades de color para sombrear.
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } return `rgb(${r | 0},${g | 0},${b | 0})`; }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// Dibuja un pájaro centrado en (x, y) del contexto actual (coordenadas ya transformadas).
// o: { face: 1|-1, flap, scale, label, labelColor, blink: 0..1 }
export function drawBirdAvatar(ctx, x, y, av, o = {}) {
  av = av || {}; const face = o.face || 1, s = o.scale || 1, f = Math.sin(o.flap || 0) * 0.8, R = 13;
  const body = av.body || '#ff7a59', belly = av.belly || '#ffc2ad', dark = shade(body, -0.35), light = shade(body, 0.35);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // patitas y cola
  ctx.strokeStyle = '#e8932e'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, 11); ctx.lineTo(-5, 16); ctx.moveTo(4, 11); ctx.lineTo(5, 16); ctx.stroke();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-face * 10, 2); ctx.lineTo(-face * 20, -2); ctx.lineTo(-face * 19, 6); ctx.closePath(); ctx.fill();
  // alas (detrás del cuerpo)
  for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.3 - f); ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(-16, 0, 11, 5.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = shade(body, -0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-11, 0); ctx.stroke(); ctx.restore(); }
  // cuerpo con luz y contorno
  const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, R + 2); g.addColorStop(0, light); g.addColorStop(0.55, body); g.addColorStop(1, dark);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = shade(body, -0.45); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(face * 1, 5, 8, 6, 0, 0, 7); ctx.fillStyle = belly; ctx.fill();
  // copete
  if (!av.hat || av.hat === 'ninguno' || av.hat === 'flor') { ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(-2, -18, 3, -19); ctx.moveTo(2, -12); ctx.quadraticCurveTo(3, -17, 7, -16); ctx.stroke(); }
  // mejilla
  ctx.fillStyle = 'rgba(255,120,150,.45)'; ctx.beginPath(); ctx.ellipse(face * 8, 3, 3, 2, 0, 0, 7); ctx.fill();
  // ojos
  const ex = face * 5, blink = o.blink || 0;
  if (av.eyes === 'feliz' || blink > 0.5) { ctx.strokeStyle = '#1a1430'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(ex, -3, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (av.eyes === 'estrellas') { ctx.fillStyle = '#ffcf5c'; star(ctx, ex, -4, 4.2); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 1, -5, 0.8, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(ex, -4, 3.8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(ex + face * 0.9, -3.6, 2, 0, 7); ctx.fillStyle = '#1a1430'; ctx.fill(); ctx.beginPath(); ctx.arc(ex + face * 0.2, -4.6, 0.8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
  if (av.eyes === 'lentes') { ctx.strokeStyle = '#1a1430'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, -4, 4.4, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(ex - face * 9, -4, 3.6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - face * 4.4, -4); ctx.lineTo(ex - face * 5.4, -4); ctx.stroke(); }
  // pico de dos tonos
  ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(face * 11, -3); ctx.lineTo(face * 18.5, 0.5); ctx.lineTo(face * 11, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8932e'; ctx.beginPath(); ctx.moveTo(face * 11, 1); ctx.lineTo(face * 17, 1); ctx.lineTo(face * 11, 3.5); ctx.closePath(); ctx.fill();
  hat(ctx, av.hat, face);
  if (o.label) {
    ctx.font = '900 11px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(o.label).width + 14, ty = av.hat && av.hat !== 'ninguno' ? -36 : -30;
    roundRect(ctx, -tw / 2, ty - 9, tw, 18, 9); ctx.fillStyle = 'rgba(12,8,30,.78)'; ctx.fill();
    ctx.fillStyle = o.labelColor || '#f7f0fb'; ctx.fillText(o.label, 0, ty + 0.5); ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function hat(ctx, id, face) {
  switch (id) {
    case 'flor': ctx.fillStyle = '#ff6fae'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(-4 + Math.cos(a) * 3.5, -13 + Math.sin(a) * 3.5, 2.6, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.arc(-4, -13, 2, 0, 7); ctx.fill(); break;
    case 'gorra': ctx.fillStyle = '#3a6fd0'; ctx.beginPath(); ctx.arc(0, -9, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(face > 0 ? 2 : -16, -10, 14, 3); break;
    case 'corona': ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(-9, -20); ctx.lineTo(-4.5, -14); ctx.lineTo(0, -22); ctx.lineTo(4.5, -14); ctx.lineTo(9, -20); ctx.lineTo(9, -10); ctx.closePath(); ctx.fill(); break;
    case 'mono': ctx.fillStyle = '#ff4f7a'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-8, -18); ctx.lineTo(-8, -8); ctx.closePath(); ctx.moveTo(0, -13); ctx.lineTo(8, -18); ctx.lineTo(8, -8); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, -13, 2.4, 0, 7); ctx.fill(); break;
    case 'sombrero': ctx.fillStyle = '#2a2140'; ctx.fillRect(-14, -12, 28, 3); ctx.fillRect(-8, -24, 16, 13); ctx.fillStyle = '#ff7a59'; ctx.fillRect(-8, -15, 16, 3); break;
    case 'vikingo': ctx.fillStyle = '#9aa0b5'; ctx.beginPath(); ctx.arc(0, -9, 10, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.moveTo(-9, -12); ctx.quadraticCurveTo(-18, -16, -15, -26); ctx.lineTo(-7, -15); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, -12); ctx.quadraticCurveTo(18, -16, 15, -26); ctx.lineTo(7, -15); ctx.fill(); break;
    case 'aureola': ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -21, 9, 3, 0, 0, 7); ctx.stroke(); break;
  }
}

// Mini lienzo con el avatar, para tarjetas y listas.
export function avatarCanvas(av, size = 56, o = {}) {
  const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = c.height = size * dpr; c.style.width = c.style.height = size + 'px'; c.className = 'av-canvas';
  const x = c.getContext('2d'); x.scale(dpr, dpr); drawBirdAvatar(x, size / 2, size / 2 + size * 0.1, av, { scale: size / 52, face: o.face || 1, flap: 0.6 });
  return c;
}

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

// Dibuja un pájaro centrado en (x, y) del contexto actual (coordenadas ya transformadas).
export function drawBirdAvatar(ctx, x, y, av, o = {}) {
  av = av || {}; const face = o.face || 1, s = o.scale || 1, f = Math.sin(o.flap || 0) * 0.8, R = 13;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = av.belly || '#ffc2ad';
  for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.3 - f); ctx.beginPath(); ctx.ellipse(-16, 0, 11, 5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = av.body || '#ff7a59'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 5, 8, 6, 0, 0, 7); ctx.fillStyle = av.belly || '#ffc2ad'; ctx.fill();
  const ex = face * 5;
  if (av.eyes === 'feliz') { ctx.strokeStyle = '#1a1430'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(ex, -3, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  else if (av.eyes === 'estrellas') { ctx.fillStyle = '#ffcf5c'; star(ctx, ex, -4, 4); }
  else { ctx.beginPath(); ctx.arc(ex, -4, 3.6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.arc(ex + face, -4, 1.8, 0, 7); ctx.fillStyle = '#1a1430'; ctx.fill(); }
  if (av.eyes === 'lentes') { ctx.strokeStyle = '#1a1430'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, -4, 4.2, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(ex - face * 9, -4, 3.6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - face * 4.2, -4); ctx.lineTo(ex - face * 5.4, -4); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(face * 11, -2); ctx.lineTo(face * 18, 1); ctx.lineTo(face * 11, 3); ctx.fillStyle = '#ffcf5c'; ctx.fill();
  hat(ctx, av.hat, face);
  if (o.label) { ctx.font = '900 11px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.labelColor || '#f7f0fb'; ctx.fillText(o.label, 0, av.hat && av.hat !== 'ninguno' ? -34 : -24); }
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
  const x = c.getContext('2d'); x.scale(dpr, dpr); drawBirdAvatar(x, size / 2, size / 2 + 6, av, { scale: size / 50, face: o.face || 1, flap: 0.6 });
  return c;
}

// Ilustraciones de cada mundo, dibujadas en canvas (sin imágenes externas).
const PAL = {
  huevo: ['#3b2a63', '#d9746a', '#7a6690'], escape: ['#1d2a3f', '#3f6a8a', '#c9a45c'], bomba: ['#2a1414', '#6b2a2a', '#ff5470'],
  detective: ['#1c1a2a', '#3a3354', '#e8d3a2'], aventura: ['#0f3b46', '#2fa3a0', '#ffcf5c'], mini: ['#2a1a46', '#7a3fb0', '#3cc9b5']
};
export function drawWorldArt(cv, id, t = 0) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 120;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const p = PAL[id] || PAL.huevo, g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p[0]); g.addColorStop(1, p[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, s = Math.min(W, H * 2) / 300;
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const dot = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const egg = (x, y, k = 1) => { c.fillStyle = '#fff1d6'; c.beginPath(); c.ellipse(x, y, 12 * k, 15 * k, 0, 0, 7); c.fill(); };
  switch (id) {
    case 'huevo':
      c.fillStyle = p[2]; c.fillRect(-150, -10, 60, 120); c.fillRect(90, -40, 70, 150);
      c.strokeStyle = '#e8d3a2'; c.lineWidth = 3; c.beginPath(); c.moveTo(-45, 18); c.lineTo(45, 18); c.stroke();
      dot(-50, 18, 11, '#ff7a59'); dot(50, 18, 11, '#3cc9b5'); egg(0, 2 + Math.sin(t * 2) * 2);
      c.strokeStyle = '#8a5a35'; c.lineWidth = 3; c.beginPath(); c.ellipse(118, -46, 26, 6, 0, 0, Math.PI); c.stroke(); break;
    case 'escape':
      c.fillStyle = '#2a3a55'; c.fillRect(-150, -60, 300, 120);
      c.fillStyle = '#6b4a2a'; c.fillRect(-28, -48, 56, 96); c.fillStyle = p[2]; dot(18, 4, 4, p[2]);
      c.fillStyle = 'rgba(255,207,92,.25)'; c.beginPath(); c.moveTo(-28, 48); c.lineTo(28, 48); c.lineTo(70, 70); c.lineTo(-70, 70); c.fill();
      c.font = '900 16px Nunito'; c.fillStyle = '#c9a45c'; c.fillText('7 · 3 · ?', -110, -20); c.fillText('◆ ▲ ●', 60, -25); break;
    case 'bomba':
      dot(0, 10, 38, '#1a1a22'); c.fillStyle = '#3a3a48'; c.fillRect(-10, -36, 20, 12);
      c.strokeStyle = '#c9a45c'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -36); c.quadraticCurveTo(20, -60, 40, -50); c.stroke();
      dot(42, -50, 5 + Math.sin(t * 10) * 2, '#ffcf5c');
      ['#ff5470', '#3cc9b5', '#ffcf5c'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.moveTo(-30 + i * 6, 18 + i * 6); c.quadraticCurveTo(-80, 40 + i * 10, -120, 20 + i * 14); c.stroke(); });
      c.fillStyle = '#0c1a14'; c.fillRect(-20, 0, 40, 18); c.fillStyle = '#7dffb0'; c.font = '900 13px monospace'; c.fillText('0:42', -16, 14); break;
    case 'detective':
      c.fillStyle = '#e8d3a2'; c.save(); c.rotate(-0.12); c.fillRect(-110, -40, 90, 70); c.restore(); c.fillStyle = '#d6c08a'; c.save(); c.rotate(0.1); c.fillRect(-60, -30, 90, 70); c.restore();
      c.strokeStyle = '#ff5470'; c.lineWidth = 2; c.beginPath(); c.moveTo(-80, -10); c.lineTo(-10, 0); c.lineTo(80, -20); c.stroke();
      c.strokeStyle = '#fff1d6'; c.lineWidth = 6; c.beginPath(); c.arc(60, -10 + Math.sin(t) * 3, 22, 0, 7); c.stroke(); c.beginPath(); c.moveTo(76, 6); c.lineTo(100, 30); c.stroke(); break;
    case 'aventura':
      c.fillStyle = '#e8c27a'; c.beginPath(); c.ellipse(0, 40, 120, 26, 0, 0, 7); c.fill(); c.fillStyle = '#2f8a4a'; c.beginPath(); c.ellipse(10, 30, 80, 18, 0, 0, 7); c.fill();
      c.strokeStyle = '#7a5236'; c.lineWidth = 6; c.beginPath(); c.moveTo(-30, 30); c.quadraticCurveTo(-34, -10, -20, -40); c.stroke();
      c.fillStyle = '#3fae5a'; for (let i = 0; i < 5; i++) { c.save(); c.translate(-20, -40); c.rotate(i * 1.25 + Math.sin(t) * 0.05); c.beginPath(); c.ellipse(22, 0, 24, 6, 0, 0, 7); c.fill(); c.restore(); }
      c.fillStyle = p[2]; c.font = '900 22px Nunito'; c.fillText('✕', 50, 34); break;
    case 'mini':
      c.fillStyle = '#fff1d6'; c.save(); c.rotate(-0.2 + Math.sin(t) * 0.05); c.fillRect(-90, -30, 50, 50); c.restore();
      [[-72, -12], [-56, 4], [-64, -4]].forEach(([x, y]) => dot(x, y, 4, '#1a1430'));
      c.fillStyle = '#3cc9b5'; c.fillRect(-10, -36, 40, 56); c.fillStyle = '#ff7a59'; c.fillRect(40, -30, 40, 56);
      c.fillStyle = '#1a1430'; c.font = '900 22px Nunito'; c.fillText('?', 2, 0); c.fillText('★', 50, 6);
      c.strokeStyle = '#ffcf5c'; c.lineWidth = 3; c.beginPath(); c.moveTo(100, -30); c.lineTo(130, 0); c.moveTo(130, -30); c.lineTo(100, 0); c.stroke(); break;
  }
  c.restore();
}

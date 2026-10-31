// Sonidos sintetizados (sin archivos). Se activan tras el primer toque, como exige iOS.
let ac = null, on = true;
export function setSound(v) { on = !!v; }
export function soundOn() { return on; }
export function unlock() {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
}
export function tone(f, dur, type = 'sine', vol = 0.1, slide = 0, delay = 0) {
  if (!ac || !on) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
export function noise(dur, vol = 0.3) {
  if (!ac || !on) return;
  const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = ac.createBufferSource(), g = ac.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(ac.destination); s.start();
}
export const sfx = {
  tap: () => tone(520, 0.05, 'sine', 0.05),
  ok: () => { tone(660, 0.1, 'triangle', 0.08); tone(990, 0.16, 'triangle', 0.08, 0, 0.09); },
  bad: () => { tone(220, 0.25, 'sawtooth', 0.05, 0.6); },
  heart: () => { tone(880, 0.12, 'sine', 0.07); tone(1320, 0.18, 'sine', 0.07, 0, 0.1); },
  coin: () => { tone(1200, 0.06, 'square', 0.04); tone(1800, 0.1, 'square', 0.04, 0, 0.06); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, 0, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, 0, i * 0.16)),
  crack: () => { noise(0.28, 0.35); tone(300, 0.35, 'triangle', 0.08, 0.35); },
  tick: () => tone(1500, 0.03, 'square', 0.03),
  boom: () => { noise(0.9, 0.5); tone(90, 0.8, 'sawtooth', 0.12, 0.3); }
};

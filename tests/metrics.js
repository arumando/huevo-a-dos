// Métricas de sincronización a partir de grabaciones [t, eggX, eggY, ax, ay, bx, by, st]
function interp(rec, t, i0, i1) { // posición en t por interpolación lineal
  let lo = 0, hi = rec.length - 1;
  if (t <= rec[0][0]) return [rec[0][i0], rec[0][i1]];
  if (t >= rec[hi][0]) return [rec[hi][i0], rec[hi][i1]];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rec[m][0] <= t) lo = m; else hi = m; }
  const a = rec[lo], b = rec[hi], k = (t - a[0]) / Math.max(1, b[0] - a[0]);
  return [a[i0] + (b[i0] - a[i0]) * k, a[i1] + (b[i1] - a[i1]) * k];
}
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
function errSeries(view, truth, i0, i1, lagMs = 0) {
  return view.map(r => { const [x, y] = interp(truth, r[0] - lagMs, i0, i1); return Math.hypot(r[i0] - x, r[i1] - y); });
}
function analyze(host, guest, skipMs = 2500) {
  const t0 = Math.max(host[0][0], guest[0][0]) + skipMs, t1 = Math.min(host.at(-1)[0], guest.at(-1)[0]) - 200;
  const H = host.filter(r => r[0] >= t0 - 1000 && r[0] <= t1 + 1000), G = guest.filter(r => r[0] >= t0 && r[0] <= t1 && r[7] === 'play');
  // 1) error visual del huevo en el invitado respecto a la verdad del anfitrión en el mismo instante
  const e0 = errSeries(G, H, 1, 2, 0);
  // 2) retraso efectivo: el desfase que minimiza el error
  let best = [0, 1e9]; for (let L = 0; L <= 600; L += 10) { const m = mean(errSeries(G, H, 1, 2, L)); if (m < best[1]) best = [L, m]; }
  // 3) fluidez: segunda diferencia por cuadro (tirones), invitado vs anfitrión
  const jerk = rec => { const v = []; for (let i = 2; i < rec.length; i++) { const dt1 = rec[i][0] - rec[i - 1][0], dt0 = rec[i - 1][0] - rec[i - 2][0]; if (dt1 <= 0 || dt0 <= 0) continue; const vx1 = (rec[i][1] - rec[i - 1][1]) / dt1, vy1 = (rec[i][2] - rec[i - 1][2]) / dt1, vx0 = (rec[i - 1][1] - rec[i - 2][1]) / dt0, vy0 = (rec[i - 1][2] - rec[i - 2][2]) / dt0; v.push(Math.hypot(vx1 - vx0, vy1 - vy0) * 1000); } return v; };
  const jg = jerk(G), jh = jerk(H.filter(r => r[0] >= t0 && r[0] <= t1));
  const jumps = jg.filter(v => v > 120).length; // cambios bruscos de velocidad > 120 u/s entre cuadros
  // 4) pájaro del anfitrión visto por el invitado
  const ea = errSeries(G, H, 3, 4, 0);
  // 5) pájaro del invitado usado en la física del anfitrión vs su posición real
  const Hp = host.filter(r => r[0] >= t0 && r[0] <= t1 && r[7] === 'play'), Gt = guest;
  const eb = errSeries(Hp, Gt, 5, 6, 0);
  // 6) pájaro A visto por el invitado: retraso y tirones (su movimiento real es suave y conocido)
  let bestA = [0, 1e9]; for (let L = 0; L <= 600; L += 10) { const m = mean(errSeries(G, H, 3, 4, L)); if (m < bestA[1]) bestA = [L, m]; }
  const jerkA = rec => { const v = []; for (let i = 2; i < rec.length; i++) { const d1 = rec[i][0] - rec[i - 1][0], d0 = rec[i - 1][0] - rec[i - 2][0]; if (d1 <= 0 || d0 <= 0) continue; v.push(Math.hypot((rec[i][3] - rec[i - 1][3]) / d1 - (rec[i - 1][3] - rec[i - 2][3]) / d0, (rec[i][4] - rec[i - 1][4]) / d1 - (rec[i - 1][4] - rec[i - 2][4]) / d0) * 1000); } return v; };
  const jA = jerkA(G);
  return {
    frames: G.length,
    pajaroA_retraso_ms: bestA[0], pajaroA_tirones_p95: +pct(jA, .95).toFixed(0), pajaroA_saltos: jA.filter(v => v > 60).length,
    huevo_error_medio: +mean(e0).toFixed(1), huevo_error_p95: +pct(e0, .95).toFixed(1),
    retraso_visual_ms: best[0], error_residual: +best[1].toFixed(1),
    tirones_p95_invitado: +pct(jg, .95).toFixed(0), tirones_p95_anfitrion: +pct(jh, .95).toFixed(0), saltos: jumps,
    pajaroA_error_medio: +mean(ea).toFixed(1),
    pajaroB_en_fisica_error_medio: +mean(eb).toFixed(1), pajaroB_en_fisica_p95: +pct(eb, .95).toFixed(1)
  };
}
module.exports = { analyze };

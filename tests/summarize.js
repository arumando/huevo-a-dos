const f = JSON.parse(require('fs').readFileSync(process.argv[2]));
const g = {}; for (const [k, v] of Object.entries(f)) { const n = k.split('#')[0]; (g[n] = g[n] || []).push(v); }
const keys = ['huevos_rotos', 'pajaroA_retraso_ms', 'pajaroA_saltos', 'pajaroA_tirones_p95', 'retraso_visual_ms', 'saltos', 'tirones_p95_invitado', 'pajaroB_en_fisica_error_medio', 'pajaroB_en_fisica_p95', 'msgs_por_s'];
const rows = Object.entries(g).map(([n, arr]) => [n, ...keys.map(k => { const vals = arr.map(a => a[k]).filter(v => typeof v === 'number').filter(v => v !== undefined); return vals.length ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '-'; })]);
console.log(['cond', ...keys].join(' | ')); rows.forEach(r => console.log(r.join(' | ')));

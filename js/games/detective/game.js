// Detectives: cada quien tiene un expediente distinto. Lo comparten hablando y acusan juntos en la pizarra.
import { h, setKids } from '../../core/util.js';
import { sfx } from '../../core/audio.js';
import { shell, createSync, resultCard, finishMatch } from '../common.js';
import { svgIcon } from '../../ui/icons.js';
import { CASES } from './cases.js';

const ICON = {
  huellas: '<path d="M7 14c-2 0-3-2-3-4s1-4 3-4 3 2 3 4-1 4-3 4zM17 20c-2 0-3-2-3-4s1-4 3-4 3 2 3 4-1 4-3 4z"/>', caja: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
  ventana: '<rect x="4" y="3" width="16" height="18"/><path d="M12 3v18M4 12h16"/>', pay: '<path d="M3 14h18l-2 5H5z"/><path d="M5 14c2-4 12-4 14 0"/>',
  telefono: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', vitrina: '<rect x="4" y="4" width="16" height="16"/><path d="M8 12c2 3 6 3 8 0"/>',
  techo: '<path d="M2 12l10-8 10 8M5 10v10h14V10"/>', camara: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 7l2-3h4l2 3"/>',
  carta: '<rect x="3" y="5" width="18" height="14"/><path d="M3 5l9 8 9-8"/>', maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  generador: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M13 8l-3 4h4l-3 4"/>', radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="8" cy="14" r="3"/><path d="M14 12h4M14 16h4M7 8l10-5"/>',
  libreta: '<rect x="5" y="3" width="14" height="18"/><path d="M8 7h8M8 11h8M8 15h5"/>'
};
const svg = (k, size = 54) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('fill', 'none'); s.setAttribute('stroke', '#5b3a22'); s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = ICON[k] || ICON.libreta; return s; };
const KIND = { declaracion: 'Declaración', interrogatorio: 'Interrogatorio', evidencia: 'Evidencia', documento: 'Documento', foto: 'Fotografía' };

export function mount(root, ctx) {
  const ui = shell(root, ctx, 'Detectives'), S = ctx.session, me = S.role === 'guest' ? 'guest' : 'host';
  const startIdx = Math.max(0, CASES.findIndex(c => c.id === S.opts.level));
  let tab = 'caso', lastStatus = '', rewarded = '', lastFeedback = 0;
  const fresh = i => ({ idx: i, sel: { host: {}, guest: {} }, tries: 2, status: 'play', feedback: null, fb: 0, notes: {} });
  const sync = createSync(ctx, {
    init: () => fresh(startIdx),
    reduce(st, a, by) {
      const C = CASES[st.idx];
      if (a.k === 'next' && st.status !== 'play') return fresh(st.status === 'win' ? Math.min(CASES.length - 1, st.idx + 1) : st.idx);
      if (a.k === 'again' && st.status !== 'play') return fresh(st.idx);
      if (st.status !== 'play') return null;
      if (a.k === 'pick') { const q = C.questions.find(x => x.id === a.q); if (!q || !q.options.includes(a.v)) return null; return { ...st, sel: { ...st.sel, [by]: { ...st.sel[by], [a.q]: a.v } } }; }
      if (a.k === 'note' && typeof a.text === 'string') return { ...st, notes: { ...st.notes, [by]: a.text.slice(0, 300) } };
      if (a.k === 'accuse') {
        const agree = C.questions.every(q => st.sel.host[q.id] && st.sel.host[q.id] === st.sel.guest[q.id]);
        if (!agree && S.role !== 'local') return null;
        const pick = S.role === 'local' ? st.sel.host : st.sel.host;
        const right = C.questions.filter(q => pick[q.id] === C.answer[q.id]).length;
        if (right === C.questions.length) return { ...st, status: 'win' };
        const tries = st.tries - 1;
        return { ...st, tries, status: tries <= 0 ? 'lose' : 'play', feedback: right, fb: st.fb + 1 };
      }
      return null;
    },
    onState: render
  });
  const name = (C, id) => C.suspects.find(s => s.id === id)?.name || id;
  const myFile = () => (me === 'host' || S.role === 'local' ? 'A' : 'B');
  function render(st) {
    if (!st) return;
    const C = CASES[st.idx];
    ui.setTitle(C.name);
    if (st.fb > lastFeedback) { lastFeedback = st.fb; sfx.bad(); ctx.ui.toast(`Algo no cuadra: acertaron ${st.feedback} de 3. Les queda ${st.tries} intento.`); }
    if (st.status !== lastStatus) { lastStatus = st.status; if (st.status !== 'play') showEnd(st); else ui.hide(); }
    const t = (id, l, ic) => h('button', { 'aria-pressed': String(tab === id), onclick: () => { tab = id; render(sync.state); } }, svgIcon(ic, 16), l);
    let content;
    if (tab === 'caso') content = h('div', { class: 'list' }, h('div', { class: 'doc' }, h('h4', null, 'El caso'), h('p', null, C.intro)),
      h('span', { class: 'lbl' }, 'Sospechosos'), C.suspects.map(s => h('div', { class: 'li' }, h('div', { class: 'grow' }, h('b', null, s.name), h('span', { class: 'note' }, s.desc)))),
      h('p', { class: 'note' }, S.role === 'local' ? 'Modo de un teléfono: los dos expedientes están juntos.' : 'Tu pareja tiene otro expediente con pistas distintas. Léanse lo importante y decidan juntos en la pizarra.'));
    else if (tab === 'exp') {
      const files = S.role === 'local' ? [...C.files.A, ...C.files.B] : C.files[myFile()];
      content = h('div', { class: 'list' }, h('p', { class: 'note' }, 'Expediente ' + (myFile() === 'A' ? '1' : '2') + ' · solo lo ves tú'), files.map(f => h('div', { class: 'doc' },
        h('span', { class: 'lbl', style: { color: '#8a5a35' } }, KIND[f.kind] || f.kind), h('h4', null, f.title),
        f.icon && (f.kind === 'foto' || f.kind === 'evidencia') ? h('div', { style: { background: '#fff', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,.25)', display: 'grid', placeItems: 'center', transform: 'rotate(-1deg)' } }, svg(f.icon)) : null,
        h('p', null, f.text))));
    } else {
      const mine = st.sel[me] || {}, theirs = st.sel[me === 'host' ? 'guest' : 'host'] || {}, partner = S.partner?.name || 'tu pareja';
      const agree = C.questions.every(q => mine[q.id] && mine[q.id] === theirs[q.id]);
      content = h('div', { class: 'list' },
        h('p', { class: 'note' }, S.role === 'local' ? 'Elijan juntos una respuesta por pregunta y acusen.' : `Cada quien marca su respuesta. Cuando las tres coincidan, pueden acusar. Intentos: ${st.tries}.`),
        C.questions.map(q => h('div', { class: 'panel' }, h('b', null, q.text),
          h('div', { class: 'list' }, q.options.map(o => { const label = q.id === 'quien' ? name(C, o) : o, mineSel = mine[q.id] === o, theirSel = theirs[q.id] === o;
            return h('button', { class: 'btn small', style: { justifyContent: 'space-between', borderColor: mineSel ? 'var(--gold)' : '' }, 'aria-pressed': String(mineSel), onclick: () => { sfx.tap(); sync.dispatch({ k: 'pick', q: q.id, v: o }); } }, h('span', null, label), h('span', { class: 'note' }, [mineSel ? 'Tú' : '', theirSel && S.role !== 'local' ? partner : ''].filter(Boolean).join(' · '))); })))),
        h('button', { class: 'btn primary block', disabled: S.role === 'local' ? !C.questions.every(q => mine[q.id]) : !agree, onclick: () => sync.dispatch({ k: 'accuse' }) }, svgIcon('search', 18), agree || S.role === 'local' ? 'Acusar' : `Acusar (coinciden ${C.questions.filter(q => mine[q.id] && mine[q.id] === theirs[q.id]).length} de 3)`));
    }
    const mine = st.sel[me] || {}, theirs = st.sel[me === 'host' ? 'guest' : 'host'] || {}, match = C.questions.filter(q => mine[q.id] && mine[q.id] === theirs[q.id]).length;
    setKids(ui.body,
      h('div', { class: 'role' }, svgIcon('search', 20), h('span', null, S.role === 'local' ? 'Tienen los dos expedientes. Léanlos y decidan juntos.' : `Tienes el expediente ${myFile() === 'A' ? '1' : '2'}. Tu pareja tiene el otro: compártanse lo importante.`)),
      h('div', { class: 'tabs', role: 'group' }, t('caso', 'El caso', 'book'), t('exp', 'Mi expediente', 'search'), t('pizarra', S.role === 'local' ? 'Pizarra' : `Pizarra · ${match}/3`, 'check')), content);
  }
  function showEnd(st) {
    const C = CASES[st.idx], win = st.status === 'win', key = st.idx + ':' + st.tries;
    let reward = null;
    if (rewarded !== key) { rewarded = key; reward = finishMatch(ctx, { game: 'detective', level: C.id, win, title: 'Caso: ' + C.name, detail: win ? 'Caso resuelto' : 'Caso sin resolver', xp: 100 + st.idx * 30, coins: 30 + st.idx * 10, mission: 'caso', ach: win ? 'detectives' : [] }); }
    const sol = `${name(C, C.answer.quien)}: ${C.answer.como.toLowerCase()}. Motivo: ${C.answer.por.toLowerCase()}.`;
    resultCard(ui, { win, title: win ? '¡Caso cerrado!' : 'El culpable escapó', lines: [win ? sol : 'La solución era: ' + sol], reward,
      onNext: win && st.idx < CASES.length - 1 ? () => sync.dispatch({ k: 'next' }) : null, nextLabel: 'Siguiente caso', onAgain: () => sync.dispatch({ k: 'again' }), onExit: () => ctx.exit() });
  }
  return { destroy() { sync.destroy(); ui.destroy(); } };
}

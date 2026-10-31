// Hojas: chat, mi pájaro (tienda), logros/misiones/estadísticas/historial y ajustes.
import { h } from '../core/util.js';
import { ui, icon, copyText } from './shell.js';
import { setSound, sfx } from '../core/audio.js';
import { COLORS, HATS, EYES, TRAILS, avatarCanvas } from './avatar.js';
import { ACHIEVEMENTS } from '../core/progress.js';
import { levelOf } from '../net/room.js';

export const chatState = { log: [], unread: 0, open: null, bound: false };
const QUICK = ['¿Jugamos?', '¡Vamos!', 'Espérame tantito', 'Más despacio 😅', '¡Lo logramos!', 'Te quiero ❤️', '¿Me escuchas?', 'Ya casi'];

export function bindChat(app) {
  if (chatState.bound) return; chatState.bound = true;
  app.room.on('chat', m => {
    chatState.log.push(m); if (chatState.log.length > 80) chatState.log.shift();
    if (chatState.open) chatState.open.refresh();
    else if (!m.mine) { chatState.unread++; ui.toast((app.room.partner()?.name || 'Tu pareja') + ': ' + m.text); sfx.tap(); }
  });
  app.room.on('emote', m => { if (!m.mine && !chatState.open) ui.toast((app.room.partner()?.name || 'Tu pareja') + ' te manda ' + ({ corazon: 'un corazón ♥', beso: 'un beso 😘', risa: 'una risa', hola: 'un saludo' }[m.k] || 'algo')); });
}

export function openChat(app) {
  chatState.unread = 0;
  const input = h('input', { class: 'field', id: 'chatIn', maxlength: 200, placeholder: 'Escribe un mensaje', enterkeyhint: 'send' });
  const send = () => { if (input.value.trim()) { app.room.chat(input.value); input.value = ''; } };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  const s = ui.sheet('Chat', () => {
    const p = app.room.partner();
    const list = h('div', { class: 'msgs', 'aria-live': 'polite' }, chatState.log.length ? chatState.log.map(m => h('div', { class: 'msg' + (m.mine ? ' mine' : '') }, m.text)) : h('p', { class: 'note' }, p ? 'Escríbanse aquí. Los mensajes llegan al instante y no se guardan.' : 'Cuando tu pareja esté en la isla podrán escribirse aquí.'));
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    return [list,
      h('div', { class: 'quick' }, QUICK.map(q => h('button', { disabled: !p, onclick: () => app.room.chat(q) }, q))),
      h('div', { class: 'row' }, ['corazon', 'beso', 'risa', 'hola'].map(k => h('button', { class: 'btn small', disabled: !p, onclick: () => { app.room.emote(k); if (k === 'corazon') app.progress.stat('hearts', 1); } }, { corazon: '♥', beso: '😘', risa: 'Jaja', hola: 'Hola' }[k]))),
      h('div', { class: 'row' }, input, h('button', { class: 'btn primary small', style: { flex: '0 0 auto' }, disabled: !p, onclick: send }, 'Enviar'))];
  }, { onClose: () => { chatState.open = null; } });
  chatState.open = s;
}

export function openAvatar(app) {
  const st = app.store; let tab = 'color';
  const owned = id => !!st.profile.owned?.[id];
  const buy = (item, kind, apply) => {
    const key = kind + ':' + item.id;
    if (item.cost && !owned(key)) {
      if (!app.progress.spend(item.cost)) { ui.toast(`Te faltan ${item.cost - st.coins} monedas. Gánalas jugando.`); return; }
      st.updateProfile(p => { p.owned[key] = 1; }); sfx.coin(); app.progress.unlock('estilo');
    }
    st.updateProfile(p => apply(p.avatar)); app.room.publish(); s.refresh();
  };
  const price = (kind, it) => (it.cost && !owned(kind + ':' + it.id) ? h('span', { class: 'price' }, it.cost) : null);
  const s = ui.sheet('Mi pájaro', () => {
    const av = st.profile.avatar, t = (id, l) => h('button', { 'aria-pressed': String(tab === id), onclick: () => { tab = id; s.refresh(); } }, l);
    let grid;
    if (tab === 'color') grid = h('div', { class: 'swatches' }, COLORS.map(c => h('button', { class: 'sw', style: { background: c.body }, 'aria-label': c.id + (c.cost && !owned('color:' + c.id) ? ', cuesta ' + c.cost : ''), 'aria-pressed': String(av.body === c.body), onclick: () => buy(c, 'color', a => { a.body = c.body; a.belly = c.belly; }) }, price('color', c))));
    else { const list = tab === 'hat' ? HATS : tab === 'eyes' ? EYES : TRAILS, field = tab === 'hat' ? 'hat' : tab === 'eyes' ? 'eyes' : 'trail';
      grid = h('div', { class: 'opts' }, list.map(it => h('button', { class: 'opt', 'aria-pressed': String(av[field] === it.id), onclick: () => buy(it, field, a => { a[field] = it.id; }) }, field === 'trail' ? h('span', { style: { height: '44px', display: 'grid', placeItems: 'center', fontSize: '20px' } }, { ninguno: '—', corazones: '♥♥', chispas: '✦✦', arcoiris: '≋' }[it.id]) : avatarCanvas({ ...av, [field]: it.id }, 44), it.name, price(field, it)))); }
    return [h('div', { class: 'av-preview' }, avatarCanvas(av, 120)),
      h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, st.profile.name), h('span', { class: 'coins' }, st.coins)),
      h('div', { class: 'tabs', role: 'group' }, t('color', 'Colores'), t('hat', 'Gorros'), t('eyes', 'Ojos'), t('trail', 'Estelas')),
      grid, h('p', { class: 'note' }, 'Lo que compras es tuyo y se ve en la plaza y dentro de Huevo a Dos. Las estelas se ven en la plaza.')];
  });
}

export function openProgress(app) {
  let tab = 'mis';
  const st = app.store, pr = app.progress;
  const s = ui.sheet('Logros y progreso', () => {
    const t = (id, l) => h('button', { 'aria-pressed': String(tab === id), onclick: () => { tab = id; s.refresh(); } }, l);
    let content;
    if (tab === 'mis') content = h('div', { class: 'list' }, pr.activeMissions().map(m => h('div', { class: 'li' + (m.claimed ? ' off' : '') },
      h('div', { class: 'grow' }, h('b', null, m.text), h('span', { class: 'note' }, `+${m.xp} XP · +${m.coins} monedas · cada quien`), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(100 * m.progress / m.goal) + '%' } }))),
      m.claimed ? h('span', { class: 'note' }, 'Reclamada') : h('button', { class: 'btn small primary', disabled: m.progress < m.goal, onclick: () => { pr.claim(m); sfx.coin(); s.refresh(); } }, m.progress >= m.goal ? 'Reclamar' : m.progress + '/' + m.goal))),
      h('p', { class: 'note' }, 'Las misiones cambian cada semana. Las cumplen juntos.'));
    else if (tab === 'ach') content = h('div', { class: 'list' }, ACHIEVEMENTS.map(a => { const got = st.shared.ach?.[a.id]; return h('div', { class: 'li' + (got ? '' : ' off') }, h('span', { class: 'ach-ico', 'aria-hidden': 'true' }, got ? '★' : '☆'), h('div', { class: 'grow' }, h('b', null, a.name), h('span', { class: 'note' }, a.desc)), h('span', { class: 'note' }, got ? new Date(got).toLocaleDateString('es') : '+' + a.coins)); }));
    else if (tab === 'stats') {
      const p = app.room.partner(), mine = st.shared.stats?.[st.profile.pid] || {}, theirs = p ? st.shared.stats?.[p.pid] || {} : {};
      const rows = [['Huevos al nido', 'nidos'], ['Huevos rotos', 'eggs'], ['Corazones enviados', 'hearts'], ['Partidas jugadas', 'games'], ['Victorias', 'wins'], ['Minijuegos', 'mini']];
      const lv = levelOf(st.profile.xp);
      content = h('div', { class: 'list' }, h('div', { class: 'stats' }, h('div', null, h('span', { class: 'lbl' }, 'Tu nivel'), h('b', null, lv.level)), h('div', null, h('span', { class: 'lbl' }, 'Tus monedas'), h('b', null, st.coins))),
        h('div', { class: 'tblwrap' }, h('table', { class: 'doc', style: { background: 'var(--dusk)', color: 'var(--ink)' } }, h('tr', null, h('th', null, ''), h('th', null, 'Tú'), h('th', null, p ? p.name : 'Pareja')), rows.map(([l, k]) => h('tr', null, h('td', null, l), h('td', null, mine[k] || 0), h('td', null, theirs[k] || 0))))),
        h('p', { class: 'note' }, 'Cada teléfono cuenta lo que vio. Niveles: ' + Object.values(st.shared.huevo?.levels || {}).filter(x => x.done).length + ' completados en Huevo a Dos.'));
    } else content = h('div', { class: 'list' }, (st.shared.history || []).length ? st.shared.history.map(m => h('div', { class: 'li' }, h('div', { class: 'grow' }, h('b', null, m.title), h('span', { class: 'note' }, (m.result === 'win' ? 'Ganaron' : m.result === 'lose' ? 'Perdieron' : m.result || '') + (m.detail ? ' · ' + m.detail : ''))), h('span', { class: 'note' }, new Date(m.at).toLocaleDateString('es', { day: 'numeric', month: 'short' })))) : h('p', { class: 'note' }, 'Aquí aparecerán sus partidas.'));
    return [h('div', { class: 'tabs', role: 'group' }, t('mis', 'Misiones'), t('ach', 'Logros'), t('stats', 'Estadísticas'), t('hist', 'Historial')), content];
  });
}

export function openSettings(app) {
  const st = app.store;
  const s = ui.sheet('Ajustes', () => {
    const name = h('input', { class: 'field', id: 'setName', maxlength: 20, value: st.profile.name });
    const back = h('textarea', { class: 'field', id: 'backupIn', rows: 3, placeholder: 'Pega aquí un código de respaldo' });
    const link = app.link;
    return [
      h('label', { class: 'lbl', for: 'setName' }, 'Tu nombre'),
      h('div', { class: 'row' }, name, h('button', { class: 'btn small', style: { flex: '0 0 auto' }, onclick: () => { const n = name.value.trim(); if (!n) return; st.updateProfile(p => { p.name = n.slice(0, 20); }); app.room.publish(); ui.toast('Nombre guardado'); } }, 'Guardar')),
      h('button', { class: 'btn', onclick: () => { const v = !(st.profile.settings?.sound !== false); st.updateProfile(p => { p.settings = { ...(p.settings || {}), sound: v }; }); setSound(v); s.refresh(); } }, 'Sonido: ' + (st.profile.settings?.sound !== false ? 'sí' : 'no')),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Nuestra sala'), h('b', { style: { fontSize: '22px', letterSpacing: '.12em' } }, app.room.code),
        h('p', { class: 'note' }, 'Quien abra el enlace entra a esta sala. Guárdalo: es la puerta de su isla.'),
        h('div', { class: 'row' }, h('button', { class: 'btn small coral', onclick: () => app.share() }, icon('share'), 'Mandar enlace'), h('button', { class: 'btn small', onclick: () => copyText(app.inviteUrl(), ok => ui.toast(ok ? 'Enlace copiado' : app.inviteUrl())) }, 'Copiar enlace'))),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Conexión'), h('p', { class: 'note' }, (link.connected ? 'Conectado al servidor' : 'Sin conexión al servidor') + ' · ' + (link.via === 'p2p' ? 'canal directo con tu pareja activo' : 'mensajes por el servidor') + (app.room.partner() && link.rtt(app.room.partner().sid) ? ' · ' + Math.round(link.rtt(app.room.partner().sid)) + ' ms' : ''))),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Respaldo del progreso'),
        h('p', { class: 'note' }, 'El progreso se guarda en los dos teléfonos y en el servidor. Si cambias de teléfono, copia este código y pégalo en el nuevo.'),
        h('button', { class: 'btn small', onclick: () => copyText(st.exportBackup(), ok => ui.toast(ok ? 'Código de respaldo copiado' : 'No se pudo copiar')) }, 'Copiar código de respaldo'),
        back, h('button', { class: 'btn small', onclick: () => { try { const r = st.importBackup(back.value); if (r && r !== app.room.code) app.room.join(r); ui.toast('Respaldo recuperado'); s.close(); app.home(); } catch (e) { ui.toast('Ese código no es válido. Cópialo completo.'); } } }, 'Recuperar desde el código')),
      h('div', { class: 'panel' }, h('span', { class: 'lbl' }, 'Otra sala'),
        h('p', { class: 'note' }, 'Crear una sala nueva te separa de la actual. El progreso de esta sala sigue guardado.'),
        h('button', { class: 'btn small', onclick: () => { import('../core/util.js').then(u => { app.room.leaveRoom(); app.room.join(u.code(6)); ui.toast('Sala nueva creada. Manda el enlace a tu pareja.'); s.close(); app.home(); }); } }, 'Crear sala nueva')),
      h('a', { class: 'note', href: 'clasico/', style: { color: 'var(--muted)' } }, 'Abrir Huevo a Dos clásico (versión original)')
    ];
  });
}

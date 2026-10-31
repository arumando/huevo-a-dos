// Pantallas, hojas inferiores, avisos, íconos y ajuste al teclado del teléfono.
import { h, $, setKids } from '../core/util.js';
import { sfx, unlock } from '../core/audio.js';
import { svgIcon } from './icons.js';

const MAP = { worlds: 'worlds', chat: 'chat', bird: 'bird', trophy: 'trophy', gear: 'gear', back: 'back', close: 'close', share: 'share', plaza: 'plaza' };
export const icon = (n, label, size = 22) => { const s = svgIcon(MAP[n] || n, size); return label ? [s, h('span', null, label)] : s; };

export const ui = {
  app: null, current: null, sheets: [],
  init() {
    this.app = $('#app'); this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' }); this.app.append(this.toasts);
    document.addEventListener('pointerdown', unlock, { passive: true });
    fitKeyboard();
  },
  show(el) {
    if (this.current && this.current !== el) { this.current._destroy?.(); this.current.remove(); }
    // Las hojas de ayuda pertenecen a la pantalla que se deja; las invitaciones se quedan.
    this.sheets.filter(s => s.ephemeral).forEach(s => s.close());
    const boot = $('#boot'); if (boot) boot.remove();
    el.classList.add('enter'); setTimeout(() => el.classList.remove('enter'), 300);
    this.current = el; this.app.insertBefore(el, this.toasts); return el;
  },
  // kind: '' | 'gold' | 'good' | 'bad'
  toast(text, kind = '') {
    const ic = { gold: 'star', good: 'check', bad: 'close' }[kind];
    // En un juego van arriba (abajo están los controles), salvo que haya una tarjeta de resultado: entonces abajo.
    const inGame = this.current?.classList.contains('game-root'), card = !!this.current?.querySelector('.overlay:not([hidden])');
    this.toasts.classList.toggle('top', !!inGame && !card);
    const t = h('div', { class: 'toast ' + kind, role: 'status' }, ic ? svgIcon(ic, 18) : null, h('span', null, text)); this.toasts.append(t);
    setTimeout(() => t.remove(), kind === 'gold' ? 3600 : 2800);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  },
  sheet(title, build, o = {}) {
    const close = () => { wrap.remove(); this.sheets = this.sheets.filter(s => s !== api); o.onClose?.(); };
    const body = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const wrap = h('div', { class: 'sheet-wrap', onclick: e => { if (e.target === wrap && !o.modal) close(); } }, body);
    const api = { el: body, close, refresh: () => render(), ephemeral: !!o.ephemeral };
    const render = () => setKids(body, h('div', { class: 'grab' }), h('div', { class: 'sheet-head' }, h('h3', null, title), !o.modal && h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: close }, svgIcon('close'))), ...[].concat(build(api)));
    render(); this.app.insertBefore(wrap, this.toasts); this.sheets.push(api); sfx.tap();
    return api;
  },
  closeSheets() { [...this.sheets].forEach(s => s.close()); }
};

// Teclado virtual: en iPhone, Safari desplaza la página al abrirse el teclado y todo "salta".
// Ajustamos la altura de la app al área visible y devolvemos la página a su sitio; el campo enfocado
// se centra dentro de su propio contenedor con scroll.
function fitKeyboard() {
  const vv = window.visualViewport; if (!vv) return;
  const top = () => parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0;
  const upd = () => {
    const kb = window.innerHeight - vv.height > 120;
    if (kb) document.documentElement.style.setProperty('--app-h', Math.round(vv.height - top()) + 'px');
    else document.documentElement.style.removeProperty('--app-h');
    if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0);
  };
  vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd);
  document.addEventListener('focusin', e => { if (e.target.matches('input,textarea')) setTimeout(() => { upd(); e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 250); });
  document.addEventListener('focusout', () => setTimeout(upd, 100));
}

// Copiar texto con alternativa si el portapapeles no está disponible.
export function copyText(text, onDone) {
  const fallback = () => { const ta = h('textarea', { class: 'field', readonly: true, style: { position: 'absolute', opacity: '0', pointerEvents: 'none' } }, text); ui.app.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); onDone?.(ok); };
  try { navigator.clipboard.writeText(text).then(() => onDone?.(true), fallback); } catch (e) { fallback(); }
}
// Compartir: hoja nativa del teléfono si existe (iPhone, Android); si no, copiar. Siempre confirma qué pasó.
export function shareLink(url, text) {
  if (navigator.share) {
    return navigator.share({ title: 'Isla Nido', text, url }).then(() => ui.toast('Invitación enviada', 'good'), err => { if (err && err.name !== 'AbortError') copyText(url, ok => ui.toast(ok ? 'Enlace copiado: pégalo en un mensaje' : url)); });
  }
  copyText(url, ok => ui.toast(ok ? 'Enlace copiado: pégalo en un mensaje para tu pareja' : 'Copia este enlace: ' + url, ok ? 'good' : ''));
}

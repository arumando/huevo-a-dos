// Pantallas, hojas inferiores, avisos e íconos compartidos por toda la interfaz.
import { h, $, setKids } from '../core/util.js';
import { sfx, unlock } from '../core/audio.js';

const ICONS = {
  worlds: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  bird: '<circle cx="11" cy="12" r="6"/><path d="M17 11l4 1-4 1M8 7l-3-3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM6 5H3a3 3 0 0 0 5 3M18 5h3a3 3 0 0 1-5 3M12 13v4M8 20h8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>',
  plaza: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>'
};
export const icon = (n, label) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n] || ''; return label ? [s, h('span', null, label)] : s; };

export const ui = {
  app: null, current: null, sheets: [],
  init() { this.app = $('#app'); this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' }); this.app.append(this.toasts); document.addEventListener('pointerdown', unlock, { passive: true }); },
  show(el) {
    if (this.current && this.current !== el) { this.current._destroy?.(); this.current.remove(); }
    const boot = $('#boot'); if (boot) boot.remove();
    this.current = el; this.app.insertBefore(el, this.toasts); return el;
  },
  toast(text, kind = '') {
    const t = h('div', { class: 'toast ' + kind }, text); this.toasts.append(t);
    setTimeout(() => t.remove(), kind === 'gold' ? 3600 : 2600);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  },
  sheet(title, build, o = {}) {
    const close = () => { wrap.remove(); this.sheets = this.sheets.filter(s => s !== api); o.onClose?.(); };
    const body = h('div', { class: 'sheet', role: 'dialog', 'aria-label': title });
    const wrap = h('div', { class: 'sheet-wrap', onclick: e => { if (e.target === wrap && !o.modal) close(); } }, body);
    const api = { el: body, close, refresh: () => render() };
    const render = () => setKids(body, h('div', { class: 'grab' }), h('div', { class: 'sheet-head' }, h('h3', null, title), !o.modal && h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: close }, icon('close'))), ...[].concat(build(api)));
    render(); this.app.insertBefore(wrap, this.toasts); this.sheets.push(api); sfx.tap();
    return api;
  },
  closeSheets() { [...this.sheets].forEach(s => s.close()); }
};

// Copiar texto con alternativa si el portapapeles no está disponible.
export function copyText(text, onDone) {
  const fallback = () => { const ta = h('textarea', { class: 'field', readonly: true }, text); ui.app.append(ta); ta.select(); try { document.execCommand('copy'); onDone?.(true); } catch (e) { onDone?.(false); } ta.remove(); };
  try { navigator.clipboard.writeText(text).then(() => onDone?.(true), fallback); } catch (e) { fallback(); }
}
export function shareLink(url, text) {
  if (navigator.share) return navigator.share({ title: 'Isla Nido', text, url }).catch(() => {});
  copyText(url, ok => ui.toast(ok ? 'Enlace copiado. Pégalo en un mensaje para tu pareja.' : 'No se pudo copiar: ' + url));
}

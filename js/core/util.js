// Utilidades compartidas por toda la plataforma.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const now = () => performance.now();
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Constructor de DOM: h('button', {class: 'btn', onclick}, 'Texto', otroNodo)
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

// Reemplaza los hijos de un elemento ignorando null/false (igual que h()).
export function setKids(el, ...kids) { el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false).map(k => (k.nodeType ? k : document.createTextNode(String(k))))); return el; }

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function code(n = 6) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return Array.from(a, x => ALPHA[x % ALPHA.length]).join('');
}
export function uid(n = 12) {
  const a = new Uint32Array(n); crypto.getRandomValues(a);
  return Array.from(a, x => (x % 36).toString(36)).join('');
}

// Generador pseudoaleatorio con semilla (mulberry32), para que ambos teléfonos generen lo mismo.
export function rng(seed) {
  let s = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
  const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  return f;
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export const fmtTime = sec => { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };

// Almacenamiento local tolerante a fallos (modo privado, datos bloqueados).
export const local = {
  get(k, def = null) { try { const v = localStorage.getItem('nido.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('nido.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem('nido.' + k); } catch (e) {} }
};

export class Emitter {
  constructor() { this._h = new Map(); }
  on(ev, fn) { if (!this._h.has(ev)) this._h.set(ev, new Set()); this._h.get(ev).add(fn); return () => this.off(ev, fn); }
  off(ev, fn) { const s = this._h.get(ev); if (s) s.delete(fn); }
  emit(ev, ...args) { const s = this._h.get(ev); if (s) for (const fn of [...s]) { try { fn(...args); } catch (e) { console.error(e); } } }
}

// Parámetros de la URL (?debug, ?netsim=retraso,jitter,perdida)
export const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const DEBUG = params.has('debug');

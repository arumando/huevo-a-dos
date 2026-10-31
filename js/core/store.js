// Persistencia en tres capas:
//  - Progreso individual (perfil, avatar, monedas, XP): este teléfono + copia en el servidor (tema u/<id>).
//  - Progreso compartido de la pareja (niveles, logros, misiones, estadísticas, historial): ambos teléfonos + servidor (tema <sala>/save).
//  - Estado temporal de una partida (live): dentro del compartido, el más reciente gana.
// Las copias se fusionan sin conflictos: contadores con máximo, récords de tiempo con mínimo, conjuntos con unión.
import { Emitter, local, uid } from './util.js';

export const DEFAULT_AVATAR = { body: '#ff7a59', belly: '#ffc2ad', hat: 'ninguno', eyes: 'normal', trail: 'ninguno' };

function newProfile() {
  return { pid: uid(12), name: '', avatar: { ...DEFAULT_AVATAR }, settings: { sound: true }, room: '', xp: 0,
    wallet: { earned: 0, spent: 0 }, owned: { ninguno: 1 }, updatedAt: 0 };
}
export function emptyShared() {
  return { v: 1, huevo: { levels: {} }, games: {}, ach: {}, stats: {}, missions: {}, history: [], live: null, updatedAt: 0 };
}

// Fusión genérica por convención de nombres.
export function mergeShared(a, b) {
  const out = mergeObj(a || {}, b || {}, '');
  out.history = mergeHistory(a?.history, b?.history);
  const la = a?.live, lb = b?.live; out.live = !la ? lb || null : !lb ? la : ((lb.at || 0) > (la.at || 0) ? lb : la);
  out.updatedAt = Math.max(a?.updatedAt || 0, b?.updatedAt || 0);
  return out;
}
function mergeObj(a, b, key) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'history' || k === 'live') continue;
    const x = a[k], y = b[k];
    if (x === undefined) { out[k] = y; continue; }
    if (y === undefined) { out[k] = x; continue; }
    if (typeof x === 'number' && typeof y === 'number') out[k] = /^(best|min)/.test(k) ? Math.min(x, y) : Math.max(x, y);
    else if (typeof x === 'boolean' || typeof y === 'boolean') out[k] = !!x || !!y;
    else if (x && y && typeof x === 'object' && typeof y === 'object' && !Array.isArray(x)) out[k] = mergeObj(x, y, k);
    else out[k] = y;
  }
  return out;
}
function mergeHistory(a = [], b = []) {
  const m = new Map(); for (const it of [...(a || []), ...(b || [])]) if (it && it.id) m.set(it.id, it);
  return [...m.values()].sort((p, q) => (q.at || 0) - (p.at || 0)).slice(0, 40);
}
export function mergeProfile(a, b) {
  const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  return {
    ...newer,
    xp: Math.max(a.xp || 0, b.xp || 0),
    wallet: { earned: Math.max(a.wallet?.earned || 0, b.wallet?.earned || 0), spent: Math.max(a.wallet?.spent || 0, b.wallet?.spent || 0) },
    owned: { ...(a.owned || {}), ...(b.owned || {}) },
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0)
  };
}

export class Store extends Emitter {
  constructor() {
    super();
    this.link = null;
    // Lo guardado manda; los valores por defecto solo rellenan lo que falte (datos viejos o incompletos).
    const stored = local.get('profile') || {}, base = newProfile();
    this.profile = { ...base, ...stored, avatar: { ...base.avatar, ...(stored.avatar || {}) }, settings: { ...base.settings, ...(stored.settings || {}) },
      wallet: { ...base.wallet, ...(stored.wallet || {}) }, owned: { ...base.owned, ...(stored.owned || {}) }, updatedAt: stored.updatedAt || 0 };
    if (!this.profile.pid) this.profile.pid = base.pid;
    local.set('profile', this.profile);
    this.room = ''; this.shared = emptyShared();
    this._tP = 0; this._tS = 0;
  }
  attach(link) {
    this.link = link;
    link.on('cloud', (kind, data) => this._onCloud(kind, data));
    link.on('status', () => { if (link.connected) { this._pushProfile(); if (this.room) this._pushShared(); } });
  }
  get coins() { return (this.profile.wallet.earned || 0) - (this.profile.wallet.spent || 0); }

  setRoom(code) {
    this.room = code || '';
    this.shared = code ? mergeShared(emptyShared(), local.get('room.' + code) || {}) : emptyShared();
    this.updateProfile(p => { p.room = this.room; });
    this.emit('shared');
  }
  updateProfile(fn) {
    fn(this.profile); this.profile.updatedAt = Date.now();
    local.set('profile', this.profile); this.emit('profile');
    clearTimeout(this._tP); this._tP = setTimeout(() => this._pushProfile(), 1200);
  }
  updateShared(fn) {
    if (!this.room) return;
    fn(this.shared); this.shared.updatedAt = Date.now();
    local.set('room.' + this.room, this.shared); this.emit('shared');
    clearTimeout(this._tS); this._tS = setTimeout(() => this._pushShared(), 800);
  }
  _pushProfile() { if (this.link?.connected) this.link.saveUser(this.profile); }
  _pushShared() { if (this.link?.connected && this.room) this.link.saveRoom(this.shared); }

  _onCloud(kind, data) {
    if (!data || typeof data !== 'object') return;
    if (kind === 'user') {
      if (data.pid !== this.profile.pid) return;
      const m = mergeProfile(this.profile, data);
      if (JSON.stringify(m) !== JSON.stringify(this.profile)) { this.profile = m; local.set('profile', m); this.emit('profile'); }
      if (JSON.stringify(m) !== JSON.stringify(data)) this._pushProfile();
    } else if (kind === 'room' && this.room) {
      const m = mergeShared(this.shared, data);
      const changed = JSON.stringify(m) !== JSON.stringify(this.shared);
      if (changed) { this.shared = m; local.set('room.' + this.room, m); this.emit('shared'); }
      if (JSON.stringify(m) !== JSON.stringify(mergeShared(emptyShared(), data))) { clearTimeout(this._tS); this._tS = setTimeout(() => this._pushShared(), 600); }
    }
  }

  // Código de respaldo: todo el progreso en un texto que se puede copiar y pegar en otro teléfono.
  exportBackup() {
    const json = JSON.stringify({ p: this.profile, r: this.room, s: this.shared });
    return btoa(unescape(encodeURIComponent(json)));
  }
  importBackup(text) {
    const d = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    if (!d || !d.p || !d.p.pid) throw new Error('Código no válido');
    this.profile = mergeProfile(d.p, this.profile.pid === d.p.pid ? this.profile : d.p);
    this.profile.pid = d.p.pid; local.set('profile', this.profile);
    if (d.r) { local.set('room.' + d.r, mergeShared(local.get('room.' + d.r) || {}, d.s || {})); this.setRoom(d.r); }
    this.emit('profile'); this._pushProfile();
    return d.r;
  }
}

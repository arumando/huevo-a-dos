// Progresión: experiencia y monedas (individuales), logros, misiones cooperativas, estadísticas e historial (compartidos).
import { Emitter, rng } from './util.js';
import { levelOf } from '../net/room.js';

export const ACHIEVEMENTS = [
  { id: 'primer-nido', name: 'Primer nido', desc: 'Lleven un huevo al nido por primera vez.', coins: 20 },
  { id: 'sin-romper', name: 'Manos de seda', desc: 'Terminen un nivel de Huevo a Dos sin romper ningún huevo.', coins: 40 },
  { id: 'eggstremo', name: 'Eggstremos', desc: 'Terminen un nivel en modo Eggstremo.', coins: 60 },
  { id: 'explorador-bosque', name: 'Guardabosques', desc: 'Completen un nivel del bosque encantado.', coins: 25 },
  { id: 'explorador-hielo', name: 'Pies fríos', desc: 'Completen un nivel de la montaña helada.', coins: 25 },
  { id: 'explorador-cavernas', name: 'Linterna humana', desc: 'Completen un nivel de las cavernas.', coins: 25 },
  { id: 'explorador-volcan', name: 'A prueba de lava', desc: 'Completen un nivel del volcán.', coins: 30 },
  { id: 'explorador-cielo', name: 'Sobre las nubes', desc: 'Completen un nivel del cielo.', coins: 30 },
  { id: 'escapistas', name: 'Escapistas', desc: 'Salgan de una habitación del Escape Room.', coins: 30 },
  { id: 'artificieros', name: 'Nervios de acero', desc: 'Desactiven su primera bomba.', coins: 30 },
  { id: 'sin-errores', name: 'Sin un solo error', desc: 'Desactiven una bomba sin cometer errores.', coins: 40 },
  { id: 'detectives', name: 'Caso cerrado', desc: 'Resuelvan su primer caso de detectives.', coins: 30 },
  { id: 'aventureros', name: 'Aventureros', desc: 'Completen una aventura cooperativa.', coins: 30 },
  { id: 'minijugones', name: 'Jugones', desc: 'Jueguen 10 minijuegos.', coins: 25 },
  { id: 'cursis', name: 'Cursis', desc: 'Mándense 50 corazones entre los dos.', coins: 25 },
  { id: 'estilo', name: 'Con estilo', desc: 'Compren su primer accesorio para el avatar.', coins: 10 }
];
export const MISSIONS = [
  { key: 'nidos', goal: 3, text: 'Lleven 3 huevos al nido', xp: 80, coins: 30 },
  { key: 'bomba', goal: 2, text: 'Desactiven 2 bombas', xp: 70, coins: 30 },
  { key: 'mini', goal: 5, text: 'Jueguen 5 minijuegos', xp: 50, coins: 20 },
  { key: 'corazones', goal: 20, text: 'Mándense 20 corazones', xp: 40, coins: 15, sum: true },
  { key: 'escape', goal: 1, text: 'Escapen de una habitación', xp: 70, coins: 30 },
  { key: 'caso', goal: 1, text: 'Resuelvan un caso de detectives', xp: 70, coins: 30 },
  { key: 'aventura', goal: 1, text: 'Completen una aventura', xp: 70, coins: 30 }
];
export const weekKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-' + Math.ceil(((t - y0) / 864e5 + 1) / 7); };

export class Progress extends Emitter {
  constructor(store) { super(); this.store = store; }
  get pid() { return this.store.profile.pid; }
  get level() { return levelOf(this.store.profile.xp); }
  reward({ xp = 0, coins = 0 } = {}) {
    const before = this.level.level;
    this.store.updateProfile(p => { p.xp = (p.xp || 0) + xp; p.wallet.earned = (p.wallet.earned || 0) + coins; });
    const after = this.level.level;
    if (xp || coins) this.emit('reward', { xp, coins });
    if (after > before) this.emit('levelup', after);
    return { xp, coins, levelUp: after > before };
  }
  spend(coins) {
    if (this.store.coins < coins) return false;
    this.store.updateProfile(p => { p.wallet.spent = (p.wallet.spent || 0) + coins; }); return true;
  }
  stat(key, n = 1) {
    if (!this.store.room) return;
    this.store.updateShared(s => { const me = s.stats[this.pid] || (s.stats[this.pid] = {}); me[key] = (me[key] || 0) + n; });
    if (key === 'hearts') { this.mission('corazones', n); if (this.statTotal('hearts', true) >= 50) this.unlock('cursis'); }
    if (key === 'mini' && this.statTotal('mini') >= 10) this.unlock('minijugones');
  }
  // Total de pareja: "max" para cosas que viven juntos (ambos teléfonos cuentan el mismo evento), "suma" para cosas individuales.
  statTotal(key, sum = false) {
    const vals = Object.values(this.store.shared.stats || {}).map(o => +(o && o[key]) || 0);
    return sum ? vals.reduce((a, b) => a + b, 0) : Math.max(0, ...vals);
  }
  activeMissions() {
    const wk = weekKey(), r = rng('misiones-' + wk + '-' + this.store.room);
    return r.shuffle(MISSIONS).slice(0, 3).map(m => {
      const per = this.store.shared.missions?.[wk + ':' + m.key] || {};
      const vals = Object.values(per).map(Number).filter(Number.isFinite);
      const done = m.sum ? vals.reduce((a, b) => a + b, 0) : Math.max(0, ...vals);
      return { ...m, week: wk, progress: Math.min(m.goal, done), claimed: !!this.store.profile.claimed?.[wk + ':' + m.key] };
    });
  }
  mission(key, n = 1) {
    if (!this.store.room) return;
    const wk = weekKey();
    this.store.updateShared(s => { s.missions = s.missions || {}; const k = wk + ':' + key; const per = s.missions[k] || (s.missions[k] = {}); per[this.pid] = (per[this.pid] || 0) + n; });
    const m = this.activeMissions().find(x => x.key === key);
    if (m && m.progress >= m.goal && !m.claimed) this.emit('mission-ready', m);
  }
  claim(m) {
    if (m.progress < m.goal || m.claimed) return false;
    this.store.updateProfile(p => { p.claimed = p.claimed || {}; p.claimed[m.week + ':' + m.key] = 1; });
    this.reward({ xp: m.xp, coins: m.coins }); return true;
  }
  unlock(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a || !this.store.room) return;
    if (!this.store.shared.ach?.[id]) { this.store.updateShared(s => { s.ach[id] = Date.now(); }); }
    if (!this.store.profile.achPaid?.[id]) {
      this.store.updateProfile(p => { p.achPaid = p.achPaid || {}; p.achPaid[id] = 1; });
      this.reward({ coins: a.coins, xp: 30 }); this.emit('achievement', a);
    }
  }
  record(entry) {
    if (!this.store.room) return;
    this.store.updateShared(s => { s.history = [{ ...entry, at: Date.now() }, ...(s.history || []).filter(x => x.id !== entry.id)].slice(0, 40); });
  }
}

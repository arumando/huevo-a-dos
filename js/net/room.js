// Sala privada de la pareja: quién está, chat, emociones, invitaciones y sesiones de juego compartidas.
import { Emitter, uid, now } from '../core/util.js';

export class Room extends Emitter {
  constructor(link, store) {
    super();
    this.link = link; this.store = store; this.code = '';
    this.session = null; this.invites = new Map(); this.outgoing = null;
    link.on('peers', () => this._peersChanged());
    link.on('status', () => this.emit('status'));
    link.onMsg('chat', (d, from) => { if (d && typeof d.text === 'string') this.emit('chat', { from: this._pidOf(from), text: d.text.slice(0, 200), at: Date.now() }); });
    link.onMsg('emote', (d, from) => { if (d && typeof d.k === 'string') this.emit('emote', { from: this._pidOf(from), k: d.k }); });
    link.onMsg('hubpos', (d, from) => { if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) this.emit('hubpos', { from: this._pidOf(from), sid: from, x: d.x, y: d.y, tx: d.tx, ty: d.ty }); });
    link.onMsg('inv', (d, from) => this._onInvite(d, from));
    link.onMsg('inv-ok', (d, from) => this._onAccept(d, from));
    link.onMsg('inv-no', (d, from) => { if (this.outgoing && d?.s === this.outgoing.s) { this.outgoing = null; this.emit('declined'); } });
    // Si la pareja sale a propósito, los dos vuelven al mundo. Si se cae la conexión, el juego espera.
    link.onMsg('g-leave', (d, from) => { if (this.session && d?.s === this.session.id) { const s = this.session; this.endSession(false); this.emit('partner-exited', s); } });
    this._wasTogether = false;
  }
  get me() { const p = this.store.profile; return { pid: p.pid, name: p.name || 'Yo', avatar: p.avatar, isMe: true, online: true, sid: this.link.sid }; }
  join(code) {
    this.code = code; this.store.setRoom(code); this.link.join(code); this.publish();
    this.emit('status');
  }
  leaveRoom() { this.endSession(true); this.link.leave(); this.code = ''; this.store.setRoom(''); this.emit('status'); }
  publish(extra = {}) {
    const p = this.store.profile;
    this.link.setPresence({ name: p.name, av: p.avatar, lvl: levelOf(p.xp).level, where: this.session ? 'game:' + this.session.game : 'hub', ...extra });
  }
  _pidOf(sid) { const p = this.link.peers.get(sid); return p ? p.pid : null; }
  // La pareja: otro jugador (distinto pid) presente en la sala. Si tiene varias pestañas, la más reciente.
  partner() {
    let best = null;
    for (const p of this.link.peers.values()) {
      if (p.pid === this.store.profile.pid) continue;
      if (!best || (p.presence.ts || 0) > (best.presence.ts || 0)) best = p;
    }
    if (!best) return null;
    const pr = best.presence;
    return { pid: best.pid, sid: best.sid, name: typeof pr.name === 'string' && pr.name ? pr.name.slice(0, 20) : 'Tu pareja', avatar: sanitizeAvatar(pr.av), lvl: +pr.lvl || 1, where: String(pr.where || 'hub'), online: true };
  }
  get together() { return !!this.partner(); }
  get status() { return !this.link.connected ? 'offline' : !this.code ? 'none' : this.together ? 'together' : 'alone'; }
  _peersChanged() {
    const t = this.together;
    if (t !== this._wasTogether) {
      this._wasTogether = t; this.emit(t ? 'partner-joined' : 'partner-left');
      if (t && this.session && this.session.online) this.session._emit('partner-back');
    }
    if (this.session && this.session.role === 'host' && t && !this.session.partnerIn) this._reinvite();
    if (this.session && this.session.online && !t) this._partnerLeftGame(true);
    // La pareja recargó la página: sigue en la sala con otra sesión, pero ya no está en esta partida.
    else if (this.session && this.session.online && this.session.peerSid && !this.link.peers.has(this.session.peerSid)) this._partnerLeftGame(true);
    this.emit('players');
  }

  chat(text) { text = String(text).trim().slice(0, 200); if (!text) return; this.link.send('chat', { text }); this.emit('chat', { from: this.store.profile.pid, text, at: Date.now(), mine: true }); }
  emote(k) { this.link.send('emote', { k }); this.emit('emote', { from: this.store.profile.pid, k, mine: true }); }
  hubMove(x, y, tx, ty) { this.link.send('hubpos', { x, y, tx, ty }, { fast: true }); }

  // ---------- invitaciones ----------
  invite(game, opts = {}) {
    const p = this.partner(); if (!p) return false;
    this.outgoing = { s: uid(8), game, opts, at: now() };
    this.link.send('inv', this.outgoing);
    this.emit('invite-sent', this.outgoing);
    return true;
  }
  cancelInvite() { this.outgoing = null; }
  _onInvite(d, from) {
    if (!d || typeof d.s !== 'string' || typeof d.game !== 'string') return;
    const inv = { s: d.s, game: d.game, opts: d.opts && typeof d.opts === 'object' ? d.opts : {}, from, resume: !!d.resume };
    // Si ya estamos en esa misma sesión (reconexión), entramos sin preguntar.
    if (this.session && this.session.id === inv.s) { this.accept(inv); return; }
    this.invites.set(inv.s, inv); this.emit('invite', inv);
  }
  accept(inv) {
    this.invites.delete(inv.s);
    this.link.send('inv-ok', { s: inv.s }, { to: inv.from });
    if (!this.session || this.session.id !== inv.s) this._startSession({ id: inv.s, game: inv.game, opts: inv.opts, role: 'guest', peerSid: inv.from });
    else this.session.peerSid = inv.from;
  }
  decline(inv) { this.invites.delete(inv.s); this.link.send('inv-no', { s: inv.s }, { to: inv.from }); }
  _onAccept(d, from) {
    if (this.outgoing && d?.s === this.outgoing.s) {
      const o = this.outgoing; this.outgoing = null;
      this._startSession({ id: o.s, game: o.game, opts: o.opts, role: 'host', peerSid: from });
    } else if (this.session && this.session.role === 'host' && d?.s === this.session.id) {
      this.session.peerSid = from; this.session.partnerIn = true; this.session._emit('rejoin');
    }
  }
  _reinvite() {
    const s = this.session; if (now() - (s._lastInv || 0) < 3000) return;
    s._lastInv = now(); this.link.send('inv', { s: s.id, game: s.game, opts: s.opts, resume: true });
  }
  startLocal(game, opts = {}) { this._startSession({ id: uid(8), game, opts, role: 'local', peerSid: null }); }

  _startSession(cfg) {
    this.endSession(true);
    const room = this, link = this.link, subs = [], local = new Emitter();
    const s = this.session = {
      ...cfg, partnerIn: cfg.role !== 'local', online: cfg.role !== 'local',
      get partner() { return room.partner(); },
      me: this.me,
      send(type, data, o = {}) { if (s.online) link.send('g.' + type, { s: s.id, d: data }, { fast: !!o.fast, to: o.to }); },
      on(type, fn) { const off = link.onMsg('g.' + type, (m, from) => { if (m && m.s === s.id) fn(m.d, from); }); subs.push(off); return off; },
      onEvent(ev, fn) { return local.on(ev, fn); },
      _emit(ev, ...a) { local.emit(ev, ...a); },
      toLocalTime(t) { return s.peerSid ? link.toLocalTime(s.peerSid, t) : t; },
      rtt() { return s.peerSid ? link.rtt(s.peerSid) : 0; },
      via() { return link.via; },
      exit() { room.endSession(); },
      _subs: subs
    };
    this.publish(); this.emit('session', s);
  }
  endSession(notify = true) {
    const s = this.session; if (!s) return;
    if (s.online && notify) this.link.send('g-leave', { s: s.id });
    s._subs.forEach(off => off()); this.session = null; this.publish();
    this.emit('session-end', s);
  }
  _partnerLeftGame(disconnected) {
    const s = this.session; if (!s) return;
    if (s.role === 'host') { if (!s.partnerIn) return; s.partnerIn = false; s._emit('partner-left', disconnected); }
    else s._emit('host-left', disconnected);
  }
}

export function levelOf(xp) {
  let level = 1, need = 100, rest = xp || 0;
  while (rest >= need) { rest -= need; level++; need = Math.round(need * 1.25); }
  return { level, into: rest, need };
}
const HEX = /^#[0-9a-f]{6}$/i;
export function sanitizeAvatar(a) {
  a = a && typeof a === 'object' ? a : {};
  const s = v => (typeof v === 'string' ? v.slice(0, 20) : '');
  return { body: HEX.test(a.body) ? a.body : '#3cc9b5', belly: HEX.test(a.belly) ? a.belly : '#b5f0e6', hat: s(a.hat) || 'ninguno', eyes: s(a.eyes) || 'normal', trail: s(a.trail) || 'ninguno' };
}

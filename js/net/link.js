// Capa de transporte: MQTT (servidor público, siempre disponible) + WebRTC P2P (directo, menor latencia).
// Mensajes "fiables" (eventos) y "rápidos" (estados de alta frecuencia que pueden perderse).
// Si el canal directo P2P se abre, el tráfico pasa por ahí; si se cae, vuelve a MQTT sin perder la sala.
import { Emitter, uid, now, params } from '../core/util.js';

export const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const BASE = 'nido/v2';
const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const PRESENCE_EVERY = 3000, PEER_TIMEOUT = 9000;

// ?netsim=retraso,jitter,perdida  (pruebas: añade retraso de envío y pérdida a los mensajes rápidos)
function parseNetsim() {
  const v = params.get('netsim'); if (!v) return null;
  const [d, j, l] = v.split(',').map(Number);
  return { delay: d || 0, jitter: j || 0, loss: l || 0 };
}

export class Link extends Emitter {
  constructor({ pid, brokers } = {}) {
    super();
    this.pid = pid; this.sid = uid(8);
    this.brokers = window.__NIDO_BROKERS || brokers || BROKERS; this.bi = 0;
    this.client = null; this.up = false; this.room = '';
    this.peers = new Map(); this.myPresence = {};
    this.rtcOn = 'RTCPeerConnection' in window && !params.has('nortc');
    this.pc = null; this.dc = { fast: null, rel: null }; this.rtcPeer = null; this.via = 'mqtt'; this.rtcTries = 0; this.rtcTimer = 0;
    this.seenIds = new Set(); this.seenQ = []; this.seq = 0;
    this.clock = new Map(); // sid -> {off, rtt, samples}
    this.sim = parseNetsim(); this.simAt = 0;
    this.stats = { fast: 0, rel: 0, recv: 0, bytes: 0, since: now() };
    setInterval(() => this._tick(), 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (this.client && !this.client.connected) try { this.client.reconnect(); } catch (e) {} this._pubPresence(); } });
    addEventListener('pagehide', () => this._clearPresence());
  }

  // ---------- MQTT ----------
  connect() {
    return new Promise((resolve, reject) => {
      if (!window.mqtt) return reject(new Error('Falta la biblioteca MQTT'));
      this._open(resolve);
    });
  }
  _open(onFirst) {
    const c = window.mqtt.connect(this.brokers[this.bi], { clientId: 'nido_' + this.sid + '_' + this.bi, keepalive: 15, reconnectPeriod: 1500, connectTimeout: 6000, clean: true });
    this.client = c; let ok = false;
    const fail = setTimeout(() => { if (!ok) { try { c.end(true); } catch (e) {} this.bi = (this.bi + 1) % this.brokers.length; this._open(onFirst); } }, 7000);
    c.on('connect', () => {
      ok = true; clearTimeout(fail); this.up = true;
      c.subscribe(`${BASE}/u/${this.pid}`, { qos: 1 });
      if (this.room) c.subscribe(`${BASE}/${this.room}/#`, { qos: 1 });
      this._pubPresence(); this.emit('status');
      if (onFirst) { const f = onFirst; onFirst = null; f(); }
    });
    c.on('close', () => { if (this.up) { this.up = false; this.emit('status'); } });
    c.on('message', (t, buf, pk) => this._onMqtt(t, buf, pk));
  }
  get connected() { return this.up; }

  join(room) {
    if (this.room === room) return;
    this.leave();
    this.room = room;
    if (this.up) { this.client.subscribe(`${BASE}/${room}/#`, { qos: 1 }); this._pubPresence(); }
    this.emit('status');
  }
  leave() {
    if (!this.room) return;
    this._clearPresence();
    if (this.up) this.client.unsubscribe(`${BASE}/${this.room}/#`);
    this._rtcClose(true);
    this.room = ''; this.peers.clear(); this.clock.clear(); this.emit('peers'); this.emit('status');
  }
  setPresence(patch) { Object.assign(this.myPresence, patch); this._pubPresence(); }
  _pubPresence() {
    if (!this.up || !this.room) return;
    const p = { ...this.myPresence, pid: this.pid, sid: this.sid, ts: Date.now(), rtc: this.rtcOn ? 1 : 0 };
    this.client.publish(`${BASE}/${this.room}/p/${this.sid}`, JSON.stringify(p), { qos: 0, retain: true });
  }
  _clearPresence() { if (this.up && this.room) try { this.client.publish(`${BASE}/${this.room}/p/${this.sid}`, '', { qos: 0, retain: true }); } catch (e) {} }

  _onMqtt(topic, buf, pk) {
    this.stats.recv++; this.stats.bytes += buf.length;
    if (topic === `${BASE}/u/${this.pid}`) { const d = parse(buf); if (d) this.emit('cloud', 'user', d); return; }
    const pre = `${BASE}/${this.room}/`; if (!this.room || !topic.startsWith(pre)) return;
    const rest = topic.slice(pre.length);
    if (rest.startsWith('p/')) {
      const sid = rest.slice(2); if (sid === this.sid) return;
      const d = buf.length ? parse(buf) : null;
      if (!d || typeof d !== 'object') { if (this.peers.delete(sid)) { this._peerGone(sid); this.emit('peers'); } return; }
      if (pk && pk.retain && Date.now() - (+d.ts || 0) > 60000) return; // presencia vieja guardada en el servidor
      const isNew = !this.peers.has(sid);
      this.peers.set(sid, { sid, pid: String(d.pid || ''), presence: d, seen: now() });
      if (isNew) { this._pubPresence(); this._ping(); this._maybeRtc(); }
      this.emit('peers'); return;
    }
    if (rest === 'm' || rest === 'f') { const env = parse(buf); if (env) this._deliver(env); return; }
    if (rest === 'save') { const d = parse(buf); if (d) this.emit('cloud', 'room', d); return; }
    if (rest === 'sig/' + this.sid) { const d = parse(buf); if (d) this._onSignal(d); }
  }
  _tick() {
    const t = now(); let changed = false;
    for (const [sid, p] of this.peers) if (t - p.seen > PEER_TIMEOUT) { this.peers.delete(sid); this._peerGone(sid); changed = true; }
    if (changed) this.emit('peers');
    if (!this._lastPres || t - this._lastPres > PRESENCE_EVERY) { this._lastPres = t; this._pubPresence(); }
    if (this.peers.size && (!this._lastPing || t - this._lastPing > (this._pingCount < 6 ? 1500 : 5000))) this._ping();
  }
  _peerGone(sid) { this.clock.delete(sid); if (this.rtcPeer === sid) this._rtcClose(); }

  // ---------- mensajes ----------
  // send(tipo, datos, {fast: true} para estados frecuentes, {to: sid} para uno solo)
  send(type, data, opts = {}) {
    const env = { from: this.sid, type, data };
    if (opts.to) env.to = opts.to;
    if (!opts.fast) env.id = this.sid + '.' + (++this.seq);
    const s = JSON.stringify(env);
    if (opts.fast) this.stats.fast++; else this.stats.rel++;
    const go = () => this._route(s, !!opts.fast);
    if (!this.sim) return go();
    if (opts.fast && Math.random() < this.sim.loss) return;
    const d = this.sim.delay + Math.random() * this.sim.jitter;
    if (opts.fast) return void setTimeout(go, d);
    // los fiables salen en orden, aunque se retrasen
    this.simAt = Math.max(this.simAt, now() + d); (this.simQ = this.simQ || []).push({ at: this.simAt, go });
    if (!this.simT) { const pump = () => { this.simT = 0; while (this.simQ.length && this.simQ[0].at <= now()) this.simQ.shift().go(); if (this.simQ.length) this.simT = setTimeout(pump, this.simQ[0].at - now()); }; this.simT = setTimeout(pump, this.simAt - now()); }
  }
  _route(s, fast) {
    const ch = fast ? this.dc.fast : this.dc.rel;
    if (ch && ch.readyState === 'open') { try { ch.send(s); return; } catch (e) {} }
    if (this.up && this.room) this.client.publish(`${BASE}/${this.room}/${fast ? 'f' : 'm'}`, s, { qos: fast ? 0 : 1 });
  }
  _deliver(env) {
    if (!env || env.from === this.sid || (env.to && env.to !== this.sid) || typeof env.type !== 'string') return;
    if (env.id) {
      if (this.seenIds.has(env.id)) return;
      this.seenIds.add(env.id); this.seenQ.push(env.id); if (this.seenQ.length > 800) this.seenIds.delete(this.seenQ.shift());
    }
    const p = this.peers.get(env.from); if (p) p.seen = now();
    if (env.type === '_ping') return this.send('_pong', { t0: env.data.t0, t1: now() }, { to: env.from, fast: true });
    if (env.type === '_pong') return this._onPong(env.from, env.data);
    this.emit('msg:' + env.type, env.data, env.from);
  }
  onMsg(type, fn) { return this.on('msg:' + type, fn); }

  // ---------- reloj: diferencia entre el reloj del otro teléfono y el mío ----------
  _ping() { this._lastPing = now(); this._pingCount = (this._pingCount || 0) + 1; this.send('_ping', { t0: now() }, { fast: true }); }
  _onPong(sid, d) {
    if (!d || !Number.isFinite(d.t0) || !Number.isFinite(d.t1)) return;
    const t = now(), rtt = t - d.t0, off = d.t1 + rtt / 2 - t;
    const c = this.clock.get(sid) || { samples: [] };
    c.samples.push({ rtt, off }); if (c.samples.length > 8) c.samples.shift();
    const best = c.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    c.off = best.off; c.rtt = rtt; c.minRtt = best.rtt; this.clock.set(sid, c);
    this.emit('clock', sid);
  }
  toLocalTime(sid, t) { const c = this.clock.get(sid); return c ? t - c.off : null; }
  rtt(sid) { const c = this.clock.get(sid); return c ? c.rtt : null; }

  // ---------- WebRTC: canal directo entre los dos teléfonos ----------
  _maybeRtc() {
    if (!this.rtcOn || this.pc) return;
    const other = [...this.peers.values()].find(p => p.presence.rtc);
    if (!other || this.rtcTries > 6) return;
    if (this.sid < other.sid) this._rtcStart(other.sid, true);
  }
  _signal(to, d) { if (this.up && this.room) this.client.publish(`${BASE}/${this.room}/sig/${to}`, JSON.stringify({ ...d, from: this.sid }), { qos: 1 }); }
  _newPc(peer) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc = pc; this.rtcPeer = peer; this.pendingIce = []; this.rtcTries++;
    pc.onicecandidate = e => { if (e.candidate) this._signal(peer, { k: 'ice', c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState) || pc.connectionState === 'disconnected') this._rtcClose(); };
    pc.ondatachannel = e => this._bindDc(e.channel);
    clearTimeout(this.rtcTimer);
    this.rtcTimer = setTimeout(() => { if (this.via !== 'p2p') this._rtcClose(); }, 12000);
    return pc;
  }
  async _rtcStart(peer) {
    const pc = this._newPc(peer);
    this._bindDc(pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }));
    this._bindDc(pc.createDataChannel('rel', { ordered: true }));
    try { await pc.setLocalDescription(await pc.createOffer()); this._signal(peer, { k: 'offer', sdp: pc.localDescription.sdp }); } catch (e) { this._rtcClose(); }
  }
  async _onSignal(d) {
    if (!this.rtcOn || typeof d.from !== 'string') return;
    try {
      if (d.k === 'offer') {
        this._rtcClose(true); const pc = this._newPc(d.from);
        await pc.setRemoteDescription({ type: 'offer', sdp: String(d.sdp) });
        for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        await pc.setLocalDescription(await pc.createAnswer());
        this._signal(d.from, { k: 'answer', sdp: pc.localDescription.sdp });
      } else if (d.k === 'answer' && this.pc && this.rtcPeer === d.from) {
        await this.pc.setRemoteDescription({ type: 'answer', sdp: String(d.sdp) });
        for (const c of this.pendingIce.splice(0)) await this.pc.addIceCandidate(c).catch(() => {});
      } else if (d.k === 'ice' && this.pc && this.rtcPeer === d.from) {
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(d.c).catch(() => {}); else this.pendingIce.push(d.c);
      }
    } catch (e) { this._rtcClose(); }
  }
  _bindDc(ch) {
    if (ch.label !== 'fast' && ch.label !== 'rel') return;
    this.dc[ch.label] = ch;
    ch.onopen = () => { if (this.dc.fast?.readyState === 'open' && this.dc.rel?.readyState === 'open') { this.via = 'p2p'; this.rtcTries = 0; this._pingCount = 0; this.emit('status'); } };
    ch.onclose = () => { if (this.via === 'p2p') this._rtcClose(); };
    ch.onmessage = e => { this.stats.recv++; this.stats.bytes += e.data.length || 0; const env = parse(e.data); if (env) this._deliver(env); };
  }
  _rtcClose(quiet) {
    clearTimeout(this.rtcTimer);
    const was = this.via === 'p2p';
    if (this.pc) { try { this.pc.close(); } catch (e) {} }
    this.pc = null; this.rtcPeer = null; this.dc = { fast: null, rel: null }; this.via = 'mqtt';
    if (was) this.emit('status');
    if (!quiet && this.room) setTimeout(() => this._maybeRtc(), 5000);
  }

  // ---------- guardado en el servidor (mensajes retenidos) ----------
  saveRoom(obj) { if (this.up && this.room) this.client.publish(`${BASE}/${this.room}/save`, JSON.stringify(obj), { qos: 1, retain: true }); }
  saveUser(obj) { if (this.up) this.client.publish(`${BASE}/u/${this.pid}`, JSON.stringify(obj), { qos: 1, retain: true }); }
}

function parse(x) { try { return JSON.parse(typeof x === 'string' ? x : x.toString()); } catch (e) { return null; } }

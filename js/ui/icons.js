// Íconos de la plataforma: todos en la misma rejilla de 24 px, trazo de 2 px y puntas redondeadas.
const P = {
  plaza: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  worlds: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
  bird: '<path d="M7 14a6 6 0 1 1 11-3.5"/><path d="M18 10.5l3 1-3 1M4 18c2 1 5 1 7-1"/><circle cx="13" cy="9" r="1" fill="currentColor"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM6 5H3a3 3 0 0 0 5 3M18 5h3a3 3 0 0 1-5 3M12 13v4M8 20h8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
  play: '<path d="M7 5l12 7-12 7z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>', star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  heart: '<path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-1.5-5-4-5.7"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 5.5"/><path d="M20 4v7h-7"/>', sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>', gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16M15 4l-3 16"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13c0 4 3 7 7 7s7-3 7-7M8 11h8"/>', barrel: '<ellipse cx="12" cy="5" rx="6" ry="2"/><path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5M6 10c3 1 9 1 12 0M6 15c3 1 9 1 12 0"/>',
  door: '<path d="M6 21V4h12v17M3 21h18"/><circle cx="15" cy="12" r="1" fill="currentColor"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  egg: '<path d="M12 3c4 0 7 6 7 10a7 7 0 0 1-14 0c0-4 3-10 7-10z"/>', bomb: '<circle cx="11" cy="14" r="7"/><path d="M15 8l2-2M17 6l1.5-1.5M18.5 4.5l1 1"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6"/>', map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c0-1 1-2 2.5-2s2.5.8 2.5 2-1 1.7-2.5 2-2.5 1-2.5 2 1 2 2.5 2 2.5-1 2.5-2"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>', arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>', arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>', arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  backspace: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M12 9l6 6M18 9l-6 6"/>', send: '<path d="M4 12l16-8-6 16-3-7z"/>', wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>', book: '<path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4zM20 4h-6M20 4v15h-6"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>'
};
export function svgIcon(name, size = 22, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = P[name] || P.help; return s;
}
export const ICON_NAMES = Object.keys(P);

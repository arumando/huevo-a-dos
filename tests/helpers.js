// Utilidades de prueba: dos "teléfonos" (contextos de iPhone 13) apuntando a un broker local.
const { chromium, devices } = require('playwright');
async function phone(browser, { port = 8888, url, errors = [], dev = process.env.DEV || 'iPhone 13' } = {}) {
  const ctx = await browser.newContext({ ...devices[dev] });
  await ctx.addInitScript(p => { window.__NIDO_BROKERS = ['ws://localhost:' + p]; }, port);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/WebSocket|favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
  if (url) await page.goto(url);
  return page;
}
async function enter(page, name) {
  await page.waitForSelector('#nameIn', { timeout: 15000 });
  await page.fill('#nameIn', name); await page.click('text=Entrar a la isla');
  await page.waitForSelector('.plaza canvas', { timeout: 10000 });
}
// Auditoría de una pantalla: elementos interactivos que se mueven al pulsarlos, miden menos de 44 px o están tapados.
async function auditPage(A, cdp, screen, dn, problems) {
      await A.waitForTimeout(450);
      const els = await A.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, out = [];
        document.querySelectorAll('[data-ux]').forEach(e => e.removeAttribute('data-ux'));
        // Si hay una hoja o una capa abierta, solo cuenta lo que está en ella (lo de atrás está tapado a propósito).
        const top = [...document.querySelectorAll('.sheet-wrap')].pop() || [...document.querySelectorAll('.overlay:not([hidden])')].pop() || document;
        const all = [...top.querySelectorAll('button, a[href], input, textarea, [role="button"]')];
        all.forEach((el, i) => {
          const r = el.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > vw || cy > vh) return;
          // ¿el centro está dentro del área visible de su contenedor con scroll?
          let p = el.parentElement, clipped = false; while (p) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) { const pr = p.getBoundingClientRect(); if (cy < pr.top + 4 || cy > pr.bottom - 4 || cx < pr.left || cx > pr.right) { clipped = true; break; } } p = p.parentElement; }
          if (clipped) return;
          el.dataset.ux = i; out.push({ i, label: (el.getAttribute('aria-label') || el.textContent || el.placeholder || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 28), r: [r.left, r.top, r.width, r.height], cx, cy, inline: el.tagName === 'A' });
        });
        return out;
      });
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      for (const e of els) {
        const covered = await A.evaluate(([x, y, i]) => { const t = document.elementFromPoint(x, y); if (!t) return 'nada'; if (t.closest(`[data-ux="${i}"]`)) return ''; const c = t.closest('button,a,input,textarea,canvas,.overlay,.sheet-wrap,.toast') || t; return (c.className || c.tagName).toString().slice(0, 30); }, [e.cx, e.cy, e.i]);
        if (covered && covered !== 'toast' && !/toast/.test(covered)) problems.push(`${dn} · ${screen} · «${e.label}» está tapado por ${covered}`);
        const small = Math.min(e.r[2], e.r[3]);
        if (small < 43.5 && !e.inline) problems.push(`${dn} · ${screen} · «${e.label}» mide ${Math.round(e.r[2])}×${Math.round(e.r[3])}`);
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-ux="${e.i}"]` });
        if (nodeId) { await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] }); const r2 = await A.evaluate(i => { const r = document.querySelector(`[data-ux="${i}"]`).getBoundingClientRect(); return [r.left, r.top]; }, e.i); await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); const d = Math.hypot(r2[0] - e.r[0], r2[1] - e.r[1]); if (d > 1.5) problems.push(`${dn} · ${screen} · «${e.label}» se mueve ${d.toFixed(0)} px al pulsarlo`); }
      }
      return els.length;
}
module.exports = { chromium, devices, phone, enter, auditPage };

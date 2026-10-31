// Utilidades de prueba: dos "teléfonos" (contextos de iPhone 13) apuntando a un broker local.
const { chromium, devices } = require('playwright');
async function phone(browser, { port = 8888, url, errors = [] } = {}) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
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
module.exports = { chromium, devices, phone, enter };

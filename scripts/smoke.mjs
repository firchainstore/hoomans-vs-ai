// Prueba de humo: arranca el build en Chromium sin interfaz y verifica que no hay errores de ejecución.
//   npm run build && npm run smoke            → menús + 5 s de cada misión y de Oleadas
//   npm run build && npm run smoke -- --full  → además un bot invulnerable juega cada misión hasta ganarla (~6 min)
// Requiere Playwright (npm i -D playwright && npx playwright install chromium) si no está instalado globalmente.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const FULL = process.argv.includes('--full');
const PORT = 4173, URL = `http://localhost:${PORT}/`;
const missions = JSON.parse(readFileSync('src/data/missions.json', 'utf8')).map((m) => m.id);
const shots = 'scripts/shots';
mkdirSync(shots, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(name, b = browser) {
  const page = await b.newPage({ viewport: { width: 915, height: 412 } });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console: ${m.text()}`));
  await page.goto(URL);
  await page.waitForFunction(() => window.__GAME__?.scene.isActive('Menu'), null, { timeout: 15000 });
  return page;
}
const start = (page, data) => page.evaluate((d) => {
  const g = window.__GAME__;
  g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key));
  g.scene.start('Game', d);
}, data);

// Bot: invulnerable, persigue/apunta al enemigo más cercano y va a los terminales sin hackear.
const installBot = (page) => page.evaluate(() => {
  const s = window.__GAME__.scene.getScene('Game');
  s.sticks.update = function () {
    s.invuln = 1;
    let best = null, bd = Infinity;
    for (const e of s.enemies.getChildren()) {
      if (!e.active) continue;
      const d = Math.hypot(e.x - s.player.x, e.y - s.player.y);
      if (d < bd) { bd = d; best = e; }
    }
    let goal = best && bd > 220 ? best : null;
    const o = s.mission?.objective;
    if (o?.type === 'hack') {
      const i = s.director.hackProgress.findIndex((p) => p < 1);
      if (i >= 0) goal = Math.hypot(o.terminals[i].x - s.player.x, o.terminals[i].y - s.player.y) > 30 ? o.terminals[i] : null;
    }
    if (o?.type === 'defend' && s.convoy) goal = Math.hypot(s.convoy.x - s.player.x, s.convoy.y - s.player.y) > 150 ? s.convoy : null;
    if (goal) this.move.set(goal.x - s.player.x, goal.y - s.player.y).normalize(); else this.move.set(0, 0);
    this.firing = !!best && bd < 600;
    if (best) this.aim.set(best.x - s.player.x, best.y - s.player.y).normalize();
  };
});

try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(URL)).ok) break; } catch { await sleep(250); } }
  browser = await chromium.launch();

  // 1) Menús
  const page = await open('menus');
  await page.screenshot({ path: `${shots}/menu.png` });
  for (const key of ['Missions', 'Workshop', 'Store', 'Settings']) {
    await page.evaluate((k) => { const g = window.__GAME__; g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key)); g.scene.start(k); }, key);
    await sleep(400);
    await page.screenshot({ path: `${shots}/${key.toLowerCase()}.png` });
  }
  // 2) Cada modo arranca y corre sin errores
  const runs = [...missions.map((id) => ({ mode: 'mission', missionId: id })), { mode: 'endless' }];
  for (const data of runs) {
    const name = data.missionId ?? 'endless';
    await start(page, data);
    await page.mouse.move(700, 150); await page.mouse.down();
    await page.keyboard.down('d');
    await sleep(FULL ? 1500 : 5000);
    await page.keyboard.up('d'); await page.mouse.up();
    const ok = await page.evaluate(() => window.__GAME__.scene.isActive('Game'));
    if (!ok) errors.push(`[${name}] la escena de juego no está activa`);
    await page.screenshot({ path: `${shots}/${name}.png` });
    console.log(`arranca: ${name}`);
  }
  // 3) Oleadas: morir → continuar con anuncio falso → morir otra vez → récord guardado
  const die = () => page.evaluate(() => { const s = window.__GAME__.scene.getScene('Game'); s.invuln = 0; s.hurtPlayer(99999); });
  const state = () => page.evaluate(() => { const g = window.__GAME__, s = g.scene.getScene('Game');
    return { result: g.scene.isActive('Result'), hp: s.hp, ended: s.ended, save: JSON.parse(localStorage.getItem('hvai_save') ?? '{}') }; });
  await die(); await sleep(1300);
  if (!(await state()).result) errors.push('no aparece la oferta de continuar');
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 10 * (box.height / 540));
  await sleep(1600);
  let st = await state();
  if (st.result || st.ended || st.hp <= 0) errors.push(`continuar no revive: ${JSON.stringify({ ...st, save: 0 })}`);
  await die(); await sleep(1300);
  st = await state();
  if (!st.result || !(st.save.bestWave >= 1)) errors.push('el récord de Oleadas no se guardó');
  console.log('continuar + récord: comprobado');
  await start(page, { mode: 'endless' }); await sleep(500);
  // 4) Pausa
  await page.evaluate(() => window.__GAME__.scene.getScene('Game').pauseGame());
  await sleep(300);
  if (!(await page.evaluate(() => window.__GAME__.scene.isActive('Pause')))) errors.push('la pausa no se abre');
  await page.close();

  // 5) Partidas completas con bot (en paralelo, una pestaña por misión)
  if (FULL) {
    // Un navegador por misión y de 2 en 2: las pestañas en segundo plano se ralentizan y falsean los tiempos.
    const queue = [...missions];
    const worker = async () => { for (let id; (id = queue.shift());) await botRun(id); };
    const botRun = async (id) => {
      const b = await chromium.launch();
      const p = await open(id, b);
      await start(p, { mode: 'mission', missionId: id });
      await sleep(300);
      await installBot(p);
      const t0 = Date.now();
      try {
        await p.waitForFunction(() => window.__GAME__.scene.isActive('Result'), null, { timeout: 280000, polling: 500 });
        const r = await p.evaluate(() => ({ ...window.__GAME__.scene.getScene('Result').d, fps: Math.round(window.__GAME__.loop.actualFps), save: JSON.parse(localStorage.getItem('hvai_save')) }));
        const secs = Math.round((Date.now() - t0) / 1000);
        console.log(`bot ${id}: ${r.won ? 'GANADA' : 'PERDIDA'} en ${secs}s, monedas ${r.coins}, ${r.fps} fps`);
        if (!r.won) errors.push(`[${id}] el bot invulnerable no ganó`);
        if (!r.save.completed.includes(id) || r.save.coins !== r.coins) errors.push(`[${id}] el guardado no refleja la victoria`);
        await p.screenshot({ path: `${shots}/${id}_result.png` });
      } catch (e) {
        await p.screenshot({ path: `${shots}/${id}_timeout.png` });
        errors.push(`[${id}] no terminó: ${e.message.split('\n')[0]}`);
      }
      await b.close();
    };
    await Promise.all([worker(), worker()]);
  }
} finally {
  await browser?.close();
  server.kill();
}
if (errors.length) { console.error('ERRORES:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('Prueba de humo OK');

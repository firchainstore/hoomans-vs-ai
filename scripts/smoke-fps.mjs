// Prueba del shooter en primera persona (fps.html) en Chromium sin interfaz.
//   npm run build && npm run smoke:fps            → menús + cada misión arranca sin errores
//   npm run build && npm run smoke:fps -- --full  → un bot invulnerable juega y gana las 6 misiones
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const FULL = process.argv.includes('--full'), PORT = 4175, URL = `http://localhost:${PORT}/fps.html`;
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const missions = JSON.parse(readFileSync('src/data/missions.json', 'utf8')).map((m) => m.id).filter((id) => !only || only.includes(id));
const shots = 'scripts/shots'; mkdirSync(shots, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
const errors = [], sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function open(browser, name) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console: ${m.text()}`));
  await page.goto(URL); await page.waitForFunction(() => window.__FPS, null, { timeout: 30000 });
  return page;
}
const play = (page, id, speed) => page.evaluate(([i, s]) => { const f = window.__FPS; window.__RESULT = null; f.G.bot = true; f.G.speed = s; f.start(i); }, [id, speed]);

try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(URL)).ok) break; } catch { await sleep(250); } }
  const browser = await chromium.launch({ args: GL });
  if (!only) {
  const page = await open(browser, 'menus');
  await sleep(1500); await page.screenshot({ path: `${shots}/fps_menu.png` });
  for (const a of ['missions', 'menu', 'workshop']) { await page.click(`[data-a="${a}"]`); await sleep(300); await page.screenshot({ path: `${shots}/fps_${a}.png` }); }
  for (const id of [...missions, 'endless']) {
    await play(page, id, 2); await sleep(FULL ? 2500 : 6000);
    const st = await page.evaluate(() => ({ playing: window.__FPS.G.playing, n: window.__FPS.enemies.length }));
    if (!st.playing) errors.push(`[${id}] la partida no está en marcha`);
    await page.screenshot({ path: `${shots}/fps_${id}.png` }); console.log(`arranca: ${id} (${st.n} máquinas)`);
  }
  }
  await browser.close();
  if (FULL) {
    const queue = [...missions];
    const worker = async () => { for (let id; (id = queue.shift());) {
      const b = await chromium.launch({ args: GL }), p = await open(b, id), t0 = Date.now();
      await play(p, id, 30); // 30 pasos de simulación por fotograma: el render por software es muy lento
      try {
        await p.waitForFunction(() => window.__RESULT, null, { timeout: 400000, polling: 1000 });
        const r = await p.evaluate(() => ({ ...window.__RESULT, save: JSON.parse(localStorage.getItem('hvai_save')) }));
        console.log(`bot ${id}: ${r.won ? 'GANADA' : 'PERDIDA'} en ${Math.round((Date.now() - t0) / 1000)} s reales, monedas ${r.coins}`);
        if (!r.won) errors.push(`[${id}] el bot no ganó`); else if (!r.save.completed.includes(id)) errors.push(`[${id}] no se guardó la victoria`);
      } catch (e) { errors.push(`[${id}] no terminó: ${e.message.split('\n')[0]}`); }
      await p.screenshot({ path: `${shots}/fps_${id}_end.png` }); await b.close();
    } };
    await Promise.all([worker(), worker()]);
  }
} finally { try { process.kill(-server.pid); } catch { /* ya cerrado */ } }
if (errors.length) { console.error('ERRORES:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('Prueba FPS OK');

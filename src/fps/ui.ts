// Menús en HTML (más nítidos y baratos que dibujarlos en 3D). Todos los textos salen de i18n.
import cfg from '../config/game.config.json';
import { buyUpgrade, buyWeapon, equipWeapon, missionUnlocked, upgradeCost } from '../core/Economy';
import { CAMPAIGNS, UPGRADES, WEAPONS, missionDef } from '../core/data';
import { nextLang, setLang, t } from '../i18n/i18n';
import { saves } from '../services';
import { audio } from './audio';
import { TOUCH } from './gfx';

export const $ = (id: string) => document.getElementById(id)!;
const scr = $('screen');
const handlers: Record<string, (arg: string) => void> = {};
/** Registra qué hace un botón con data-a="accion" (y data-v="valor" opcional). */
export const on = (action: string, fn: (arg: string) => void) => (handlers[action] = fn);
scr.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
  if (!b || (b as HTMLButtonElement).disabled) return;
  audio.unlock(); audio.ui(); handlers[b.dataset.a!]?.(b.dataset.v ?? '');
});
const btn = (action: string, label: string, cls = '', v = '', enabled = true) => `<button class="b ${cls}" data-a="${action}" data-v="${v}" ${enabled ? '' : 'disabled'}>${label}</button>`;
export function show(html: string | null) { scr.style.display = html === null ? 'none' : 'flex'; if (html !== null) { scr.innerHTML = html; scr.scrollTop = 0; } }
const coins = () => `<span class="tag">◆ ${saves.data.coins}</span>`;
const title = () => { const [a, ...rest] = cfg.name.toUpperCase().split(' '); return `<h1>${a}<br><span>${rest.join(' ')}</span></h1>`; };

export function mainMenu() {
  const s = saves.data, best = s.bestScore ? ` · ${t('menu.best', { n: s.bestWave, s: s.bestScore })}` : '';
  show(`${title()}<p>${t('menu.tagline')}</p><div class="col">
    ${btn('missions', t('menu.campaign'), 'p')}${btn('play', t('menu.endless') + best, '', 'endless')}${btn('workshop', t('menu.workshop') + coins())}
    <div class="row">${btn('sound', t(s.settings.sound ? 'settings.sound_on' : 'settings.sound_off'), 's')}${btn('lang', t('settings.language'), 's')}</div></div>
    <div class="dim">${t(TOUCH ? 'fps.help_touch' : 'fps.help_pc')} · v${cfg.version}</div>`);
}
export function missionsMenu() {
  const camp = CAMPAIGNS.find((c) => c.active)!, s = saves.data;
  const cards = camp.missions.map((id, i) => {
    const m = missionDef(id), open = missionUnlocked(s, camp, id), done = s.completed.includes(id);
    const body = `<b>${i + 1}. ${t(m.nameKey)}</b><small>${open ? t(m.briefKey) : t('missions.locked')}</small><em>${done ? '✔ ' + t('missions.done') : '◆ ' + m.reward}</em>`;
    return open ? `<button class="card ${done ? 'done' : ''}" data-a="play" data-v="${id}">${body}</button>` : `<div class="card lock">${body}</div>`;
  }).join('');
  const soon = CAMPAIGNS.filter((c) => !c.active).map((c) => `🔒 ${t(c.nameKey)} — ${t('missions.soon')}`).join(' · ');
  show(`<h2>${t(camp.nameKey)}</h2><div class="grid">${cards}</div><div class="dim">${soon}</div><div class="row" style="margin-top:14px">${btn('menu', '‹ ' + t('result.menu'), 's')}</div>`);
}
export function workshopMenu() {
  const s = saves.data;
  const ups = UPGRADES.map((u) => { const lvl = s.upgrades[u.id] ?? 0, cost = upgradeCost(u, lvl);
    return `<div class="line"><div>${t(u.nameKey)}<small>${'■'.repeat(lvl)}${'□'.repeat(u.maxLevel - lvl)}</small></div>${btn('buyUp', cost === null ? t('workshop.max') : '◆ ' + cost, 's', u.id, cost !== null && s.coins >= cost)}</div>`; }).join('');
  const weps = WEAPONS.map((w) => { const own = s.weapons.includes(w.id), eq = s.equipped === w.id;
    return `<div class="line" ${eq ? 'style="border-color:#ffb347"' : ''}><div>${t(w.nameKey)}<small>${t(w.descKey)}</small></div>${btn(own ? 'equip' : 'buyW', eq ? t('workshop.equipped') : own ? t('workshop.equip') : '◆ ' + w.cost, 's', w.id, !eq && (own || s.coins >= w.cost))}</div>`; }).join('');
  show(`<h2>${t('workshop.title')}${coins()}</h2><div class="dim" style="margin:0 0 6px">${t('workshop.upgrades')}</div>${ups}<div class="dim" style="margin:10px 0 6px">${t('workshop.weapons')}</div>${weps}<div class="row" style="margin-top:10px">${btn('menu', '‹ ' + t('result.menu'), 's')}</div>`);
}
export function pauseMenu() { show(`<h2>${t('pause.title')}</h2><div class="col">${btn('resume', t('pause.resume'), 'p')}${btn('restart', t('pause.restart'))}${btn('quit', t('pause.quit'))}</div>`); }
export function continuePrompt(adFree: boolean) {
  show(`<h2><span>${t('result.down')}</span></h2><p>${t('result.continue_q')}</p><div class="col">${btn('continue', t('result.continue') + (adFree ? '' : ' ' + t('result.ad_tag')), 'p')}${btn('giveup', t('result.no_thanks'))}</div>`);
}
export interface Summary { won: boolean; endless: boolean; missionName: string; coins: number; wave: number; score: number; record: boolean; canDouble: boolean; adFree: boolean; hasNext: boolean }
export function resultScreen(r: Summary) {
  const head = r.endless ? t('result.endless_over') : t(r.won ? 'result.won' : 'result.lost');
  const sub = r.endless ? t('result.endless_stats', { n: r.wave, s: r.score }) + (r.record ? ' · ' + t('result.record') : '') : r.missionName;
  show(`<h2>${r.won ? `<span>${head}</span>` : head}</h2><p>${sub}</p><div class="big" id="rcoins">${t('result.coins', { n: r.coins })}</div><div class="col">
    ${r.canDouble ? btn('double', t('result.double') + (r.adFree ? '' : ' ' + t('result.ad_tag'))) : ''}${btn(r.hasNext ? 'next' : 'restart', t(r.hasNext ? 'result.next' : 'result.retry'), 'p')}${btn('menu', t('result.menu'))}</div>`);
}

// Acciones que no dependen de la partida
on('menu', mainMenu); on('missions', missionsMenu); on('workshop', workshopMenu);
on('sound', () => { const s = saves.data.settings; s.sound = !s.sound; audio.setOn(s.sound); saves.save(); mainMenu(); });
on('lang', () => { const s = saves.data.settings; s.lang = nextLang(); setLang(s.lang); saves.save(); mainMenu(); });
const shop = (fn: (id: string) => boolean) => (id: string) => { if (fn(id)) { saves.save(); audio.coin(); } workshopMenu(); };
on('buyUp', shop((id) => buyUpgrade(saves.data, UPGRADES.find((u) => u.id === id)!)));
on('buyW', shop((id) => { const w = WEAPONS.find((x) => x.id === id)!; return buyWeapon(saves.data, w) && equipWeapon(saves.data, id); }));
on('equip', shop((id) => equipWeapon(saves.data, id)));

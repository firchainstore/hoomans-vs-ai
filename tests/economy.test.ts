import { describe, expect, it } from 'vitest';
import * as E from '../src/core/Economy';
import { SaveManager, defaultSave } from '../src/core/SaveManager';
import { BALANCE, CAMPAIGNS, PRODUCTS, UPGRADES, WEAPONS, productDef, weaponDef } from '../src/core/data';
import { memoryStorage } from './helpers';

describe('Economy', () => {
  it('el coste de mejoras crece y se detiene en el nivel máximo', () => {
    const u = UPGRADES[0];
    const costs = Array.from({ length: u.maxLevel }, (_, i) => E.upgradeCost(u, i)!);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
    expect(E.upgradeCost(u, u.maxLevel)).toBeNull();
  });
  it('comprar mejora descuenta monedas y sube estadísticas', () => {
    const s = defaultSave();
    expect(E.buyUpgrade(s, UPGRADES[0])).toBe(false);
    s.coins = 1000;
    for (const u of UPGRADES) expect(E.buyUpgrade(s, u)).toBe(true);
    expect(s.coins).toBeLessThan(1000);
    const st = E.playerStats(s, UPGRADES, BALANCE.player);
    expect(st.damageMult).toBeGreaterThan(1);
    expect(st.maxHp).toBeGreaterThan(BALANCE.player.hp);
    expect(st.speed).toBeGreaterThan(BALANCE.player.speed);
  });
  it('armas: comprar, no duplicar, equipar solo las que se tienen', () => {
    const s = defaultSave();
    const w = weaponDef('scatter');
    expect(E.equipWeapon(s, 'scatter')).toBe(false);
    s.coins = w.cost;
    expect(E.buyWeapon(s, w)).toBe(true);
    expect(E.buyWeapon(s, w)).toBe(false);
    expect(s.coins).toBe(0);
    expect(E.equipWeapon(s, 'scatter')).toBe(true);
    expect(WEAPONS.length).toBeGreaterThanOrEqual(3);
  });
  it('misiones en orden; la campaña de las máquinas está inactiva', () => {
    const s = defaultSave();
    const [res, mac] = CAMPAIGNS;
    expect(E.missionUnlocked(s, res, 'm1')).toBe(true);
    expect(E.missionUnlocked(s, res, 'm2')).toBe(false);
    E.completeMission(s, 'm1'); E.completeMission(s, 'm1');
    expect(s.completed).toEqual(['m1']);
    expect(E.missionUnlocked(s, res, 'm2')).toBe(true);
    expect(mac.active).toBe(false);
    expect(E.missionUnlocked(s, mac, 'x1')).toBe(false);
  });
  it('compras idempotentes (restaurar no duplica monedas)', () => {
    const s = defaultSave();
    const p = productDef('starter_pack');
    E.applyPurchase(s, p); E.applyPurchase(s, p);
    expect(s.coins).toBe(p.grants.coins);
    expect(s.weapons).toContain('smg');
    E.applyPurchase(s, productDef('remove_ads'));
    expect(s.purchases.removeAds).toBe(true);
    expect(PRODUCTS).toHaveLength(2);
  });
  it('récord de Oleadas', () => {
    const s = defaultSave();
    expect(E.recordEndless(s, 4, 900)).toBe(true);
    expect(E.recordEndless(s, 6, 500)).toBe(false);
    expect([s.bestWave, s.bestScore]).toEqual([6, 900]);
  });
});

describe('SaveManager', () => {
  it('guarda y recarga', () => {
    const st = memoryStorage();
    const a = new SaveManager(st, 'k');
    a.data.coins = 77; a.data.settings.lang = 'en'; a.save();
    const b = new SaveManager(st, 'k');
    expect(b.data.coins).toBe(77);
    expect(b.data.settings.lang).toBe('en');
  });
  it('tolera datos corruptos y campos faltantes', () => {
    const st = memoryStorage();
    st.setItem('k', '{no json');
    expect(new SaveManager(st, 'k').data.coins).toBe(0);
    st.setItem('k', JSON.stringify({ coins: 5, settings: {} }));
    const s = new SaveManager(st, 'k').data;
    expect(s.coins).toBe(5);
    expect(s.settings.sound).toBe(true);
    expect(s.weapons).toEqual(['blaster']);
  });
  it('reset conserva ajustes y compras', () => {
    const m = new SaveManager(memoryStorage(), 'k');
    m.data.coins = 9; m.data.purchases.removeAds = true; m.data.settings.sound = false;
    m.reset();
    expect(m.data.coins).toBe(0);
    expect(m.data.purchases.removeAds).toBe(true);
    expect(m.data.settings.sound).toBe(false);
  });
});

// Progresión: mejoras, armas, desbloqueo de misiones y compras. Funciones puras sobre SaveData.
import type { CampaignDef, ProductDef, SaveData, UpgradeDef, WeaponDef } from './types';

export interface PlayerStats { maxHp: number; speed: number; damageMult: number }

export function upgradeCost(def: UpgradeDef, level: number): number | null {
  if (level >= def.maxLevel) return null;
  return Math.round(def.baseCost * Math.pow(def.costGrowth, level) / 5) * 5;
}

export function buyUpgrade(save: SaveData, def: UpgradeDef): boolean {
  const level = save.upgrades[def.id] ?? 0;
  const cost = upgradeCost(def, level);
  if (cost === null || save.coins < cost) return false;
  save.coins -= cost;
  save.upgrades[def.id] = level + 1;
  return true;
}

export function buyWeapon(save: SaveData, def: WeaponDef): boolean {
  if (save.weapons.includes(def.id) || save.coins < def.cost) return false;
  save.coins -= def.cost;
  save.weapons.push(def.id);
  return true;
}

export function equipWeapon(save: SaveData, id: string): boolean {
  if (!save.weapons.includes(id)) return false;
  save.equipped = id;
  return true;
}

export function playerStats(save: SaveData, upgrades: UpgradeDef[], base: { hp: number; speed: number }): PlayerStats {
  const stats = { maxHp: base.hp, speed: base.speed, damageMult: 1 };
  for (const u of upgrades) {
    const bonus = (save.upgrades[u.id] ?? 0) * u.perLevel;
    if (u.stat === 'maxHp') stats.maxHp += bonus;
    else if (u.stat === 'speedMult') stats.speed *= 1 + bonus;
    else stats.damageMult += bonus;
  }
  return stats;
}

/** Las misiones se desbloquean en orden dentro de una campaña activa. */
export function missionUnlocked(save: SaveData, campaign: CampaignDef, missionId: string): boolean {
  const i = campaign.missions.indexOf(missionId);
  if (!campaign.active || i < 0) return false;
  return i === 0 || save.completed.includes(campaign.missions[i - 1]);
}

export function completeMission(save: SaveData, missionId: string) {
  if (!save.completed.includes(missionId)) save.completed.push(missionId);
}

export function recordEndless(save: SaveData, wave: number, score: number): boolean {
  const isRecord = score > save.bestScore;
  save.bestWave = Math.max(save.bestWave, wave);
  save.bestScore = Math.max(save.bestScore, score);
  return isRecord;
}

/** Aplica lo que concede un producto. Idempotente: restaurar compras no duplica monedas. */
export function applyPurchase(save: SaveData, product: ProductDef) {
  const first = !save.purchases.owned.includes(product.id);
  if (first) save.purchases.owned.push(product.id);
  const g = product.grants;
  if (g.removeAds) save.purchases.removeAds = true;
  for (const w of g.weapons ?? []) if (!save.weapons.includes(w)) save.weapons.push(w);
  for (const s of g.skins ?? []) if (!save.skins.includes(s)) save.skins.push(s);
  if (first && g.coins) save.coins += g.coins;
}

// Único punto de acceso a los datos JSON, ya tipados.
import enemiesJson from '../data/enemies.json';
import weaponsJson from '../data/weapons.json';
import upgradesJson from '../data/upgrades.json';
import missionsJson from '../data/missions.json';
import campaignsJson from '../data/campaigns.json';
import skinsJson from '../data/skins.json';
import productsJson from '../data/products.json';
import balanceJson from '../data/balance.json';
import type { CampaignDef, EnemyDef, MissionDef, ProductDef, SkinDef, UpgradeDef, WeaponDef } from './types';

export const ENEMIES = enemiesJson as EnemyDef[];
export const WEAPONS = weaponsJson as WeaponDef[];
export const UPGRADES = upgradesJson as UpgradeDef[];
export const MISSIONS = missionsJson as MissionDef[];
export const CAMPAIGNS = campaignsJson as unknown as CampaignDef[];
export const SKINS = skinsJson as SkinDef[];
export const PRODUCTS = productsJson as ProductDef[];
export const BALANCE = balanceJson;

function byId<T extends { id: string }>(list: T[], id: string, kind: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`${kind} desconocido: ${id}`);
  return found;
}
export const enemyDef = (id: string) => byId(ENEMIES, id, 'enemigo');
export const weaponDef = (id: string) => byId(WEAPONS, id, 'arma');
export const missionDef = (id: string) => byId(MISSIONS, id, 'misión');
export const skinDef = (id: string) => byId(SKINS, id, 'skin');
export const productDef = (id: string) => byId(PRODUCTS, id, 'producto');
export const hex = (s: string) => parseInt(s, 16);

// Tipos de los datos (src/data/*.json) y del guardado. Sin dependencias de Phaser.
export interface Vec2 { x: number; y: number }

export interface AttackDef {
  pattern: 'aimed' | 'radial';
  count: number; spreadDeg: number; cooldown: number; bulletSpeed: number; damage: number;
}
export interface EnemyDef {
  id: string; nameKey: string; shape: string; color: string;
  hp: number; speed: number; radius: number; contactDamage: number; coins: number;
  behavior: 'chase' | 'shooter' | 'turret';
  range?: number; boss?: boolean; enrageAt?: number;
  attacks?: AttackDef[];
  dash?: { cooldown: number; speed: number; duration: number };
  summon?: { enemy: string; count: number; cooldown: number };
  /** Solo modo Oleadas: coste en el presupuesto y oleada mínima. Sin "cost" no aparece. */
  cost?: number; minWave?: number;
}
export interface WeaponDef {
  id: string; nameKey: string; descKey: string; cost: number; damage: number; fireRate: number;
  bulletSpeed: number; spreadDeg: number; pellets: number; pierce: number; range: number; color: string;
  /** Balas por cargador (solo versión en primera persona). */
  mag?: number;
}
export interface UpgradeDef {
  id: string; nameKey: string; stat: 'damageMult' | 'maxHp' | 'speedMult';
  perLevel: number; maxLevel: number; baseCost: number; costGrowth: number;
}
/** color = mochila; jacket = chaqueta; hair = pelo o gorro; head = 'cap' | 'beanie' | 'bun' | 'hair'. */
export interface SkinDef { id: string; nameKey: string; color: string; jacket: string; hair: string; head: string }
export interface ProductDef {
  id: string; type: string; nameKey: string; descKey: string; fakePrice: string;
  grants: { removeAds?: boolean; weapons?: string[]; skins?: string[]; coins?: number };
}

export type SpawnWhere = 'ring' | 'objective' | Vec2;
export interface SpawnDef { at: number; enemy: string; count: number; every?: number; until?: number; where?: SpawnWhere }
export type ObjectiveDef =
  | { type: 'eliminate' }
  | { type: 'survive'; seconds: number }
  | { type: 'defend'; convoy: { hp: number; speed: number; from: Vec2; to: Vec2 } }
  | { type: 'hack'; secondsEach: number; radius: number; terminals: Vec2[] }
  | { type: 'boss'; enemy: string };
/** theme = aspecto del escenario 3D: street | scrapyard | bridge | campus | ruins | core. */
export interface ArenaDef { w: number; h: number; tint: string; theme?: string }
export interface MissionDef {
  id: string; campaign: string; nameKey: string; briefKey: string; reward: number;
  arena: ArenaDef; playerStart?: Vec2; objective: ObjectiveDef;
  spawns: SpawnDef[]; hints?: { at: number; key: string }[];
}
export interface CampaignDef { id: string; nameKey: string; active: boolean; missions: string[] }

export interface SpawnRequest { enemy: string; count: number; where: SpawnWhere; hpMult?: number }
export interface HudInfo { key: string; params?: Record<string, string | number> }
export type RunStatus = 'running' | 'won' | 'lost';

/** Interfaz común de MissionDirector y EndlessDirector: la escena de juego solo conoce esto. */
export interface Director {
  status: RunStatus;
  elapsed: number;
  /** alive = enemigos vivos ahora. Devuelve lo que hay que generar este frame. */
  update(dt: number, alive: number): SpawnRequest[];
  onEnemyKilled(enemyId: string): void;
  fail(): void;
  resume(): void;
  hud(): HudInfo;
}

export interface SaveData {
  v: number;
  coins: number;
  upgrades: Record<string, number>;
  weapons: string[]; equipped: string;
  skins: string[]; skin: string;
  completed: string[];
  bestWave: number; bestScore: number;
  settings: { lang: string; sound: boolean };
  purchases: { removeAds: boolean; owned: string[] };
}

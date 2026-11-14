import type { Director, EnemyDef, HudInfo, RunStatus, SpawnRequest } from './types';

export interface WaveGroup { enemy: string; count: number }
export interface EndlessConfig { pauseBetweenWaves: number; hpGrowthPerWave: number; bossEvery: number }

/**
 * Composición de la oleada n (1..∞) con un "presupuesto" que crece: cada enemigo tiene un coste
 * (enemies.json: cost/minWave). Determinista si se le pasa un rng con semilla.
 */
export function generateWave(n: number, enemies: EnemyDef[], rng: () => number, bossEvery = 10): WaveGroup[] {
  const pool = enemies.filter((e) => e.cost !== undefined && !e.boss && (e.minWave ?? 1) <= n);
  const counts = new Map<string, number>();
  let budget = 5 + n * 3;
  while (pool.length && budget > 0) {
    const affordable = pool.filter((e) => e.cost! <= budget);
    if (!affordable.length) break;
    const pick = affordable[Math.floor(rng() * affordable.length)];
    counts.set(pick.id, (counts.get(pick.id) ?? 0) + 1);
    budget -= pick.cost!;
  }
  const groups = [...counts].map(([enemy, count]) => ({ enemy, count }));
  if (n % bossEvery === 0) {
    const bosses = enemies.filter((e) => e.boss && e.speed > 0);
    if (bosses.length) groups.push({ enemy: bosses[(n / bossEvery - 1) % bosses.length].id, count: 1 });
  }
  return groups;
}

/** Director del modo Oleadas: oleada → limpiar → pausa → siguiente. Nunca "gana". */
export class EndlessDirector implements Director {
  status: RunStatus = 'running';
  elapsed = 0;
  wave = 0;
  score = 0;
  private pause = 1.5;
  private waiting = true;

  constructor(private enemies: EnemyDef[], private cfg: EndlessConfig, private rng: () => number = Math.random) {}

  update(dt: number, alive: number): SpawnRequest[] {
    if (this.status !== 'running') return [];
    this.elapsed += dt;
    if (!this.waiting) {
      if (alive > 0) return [];
      this.waiting = true;
      this.pause = this.cfg.pauseBetweenWaves;
      this.score += this.wave * 50;
    }
    this.pause -= dt;
    if (this.pause > 0) return [];
    this.waiting = false;
    this.wave++;
    const hpMult = 1 + (this.wave - 1) * this.cfg.hpGrowthPerWave;
    return generateWave(this.wave, this.enemies, this.rng, this.cfg.bossEvery)
      .map((g) => ({ enemy: g.enemy, count: g.count, where: 'ring' as const, hpMult }));
  }

  onEnemyKilled(enemyId: string) {
    const def = this.enemies.find((e) => e.id === enemyId);
    this.score += (def?.coins ?? 1) * 10;
  }
  fail() { this.status = 'lost'; }
  resume() { this.status = 'running'; }
  hud(): HudInfo { return { key: 'hud.wave', params: { n: Math.max(1, this.wave), s: this.score } }; }
}
